"""
Pesquisa de imóveis comparáveis via Gemini + Google Search (busca real na web).
"""

from __future__ import annotations

from dataclasses import dataclass

from app.config import settings
from app import schemas, gemini_client

PROMPT_SISTEMA = """Você é um assistente de pesquisa de mercado imobiliário no Brasil.

Use a busca na web para encontrar ANÚNCIOS REAIS à venda em portais como Viva Real,
QuintoAndar, Zap Imóveis, Imovelweb e OLX.

Depois de pesquisar, responda SOMENTE com JSON válido (sem markdown), neste formato:

{"resultados": [
  {"endereco": "...", "bairro": "...", "cidade": "...", "area": 0, "quartos": 0,
   "vagas": 0, "valor": 0, "fonte": "nome do portal", "link": "URL do anúncio",
   "descricao_anuncio": "...", "padrao_construtivo": "normal",
   "idade_anos": null, "estado_conservacao": null, "testada_m": null}
]}

Regras:
- Só inclua imóveis encontrados de verdade na busca.
- "valor" em reais, número puro (sem R$).
- "link" deve ser URL real do anúncio.
- Se não achar o suficiente, devolva menos itens — nunca invente.
"""


@dataclass
class PesquisaMeta:
    provedor: str
    modelo: str | None = None
    duracao_ms: int | None = None
    erro: str | None = None


def _localizacao_referencia(criterios: schemas.PesquisaComparaveisRequest) -> str:
    partes = []
    if criterios.endereco:
        linha = criterios.endereco
        if criterios.numero:
            linha += f", nº {criterios.numero}"
        if criterios.complemento:
            linha += f" ({criterios.complemento})"
        partes.append(linha)
    if criterios.bairro:
        partes.append(f"bairro {criterios.bairro}")
    if criterios.cidade:
        cidade = criterios.cidade
        if criterios.estado:
            cidade += f"/{criterios.estado}"
        partes.append(cidade)
    return ", ".join(partes) if partes else "local não informado"


def _prompt_usuario(criterios: schemas.PesquisaComparaveisRequest) -> str:
    local = _localizacao_referencia(criterios)
    tipo = (criterios.tipo or "imóvel").lower()
    raio = criterios.raio_km or 2

    perfil = []
    if criterios.quartos:
        perfil.append(f"{criterios.quartos} quartos")
    if criterios.vagas:
        perfil.append(f"{criterios.vagas} vaga(s)")
    if criterios.banheiros:
        perfil.append(f"{criterios.banheiros} banheiro(s)")
    perfil_txt = f" Perfil desejado: {', '.join(perfil)}." if perfil else ""

    area_txt = ""
    if criterios.area_min or criterios.area_max:
        area_txt = (
            f" Área entre {criterios.area_min or 'qualquer'} e "
            f"{criterios.area_max or 'qualquer'} m²."
        )
    elif criterios.area_imovel:
        area_txt = f" Área de referência: cerca de {criterios.area_imovel} m² (±20%)."

    return (
        f"Consegue encontrar {tipo}s à venda perto de {local}? "
        f"Busque imóveis num raio de até {raio} km desse endereço."
        f"{area_txt}{perfil_txt} "
        f"Traga até {criterios.quantidade} anúncios ativos com preço, área, endereço "
        f"e link direto do portal (Viva Real, QuintoAndar, etc.)."
    )


def _parse_resultados(dados_json: dict) -> list[schemas.PesquisaResultadoItem]:
    itens = dados_json.get("resultados", [])
    return [schemas.PesquisaResultadoItem(**item, gerado_por_ia=True) for item in itens]


def enriquecer_criterios(
    avaliacao,
    criterios: schemas.PesquisaComparaveisRequest,
) -> schemas.PesquisaComparaveisRequest:
    """Completa critérios com os dados do imóvel já cadastrado na avaliação."""
    area = avaliacao.area_imovel
    return criterios.model_copy(
        update={
            "endereco": criterios.endereco or avaliacao.endereco,
            "numero": criterios.numero or avaliacao.numero,
            "complemento": criterios.complemento or avaliacao.complemento,
            "bairro": criterios.bairro or avaliacao.bairro or "",
            "cidade": criterios.cidade or avaliacao.cidade or "",
            "estado": criterios.estado or avaliacao.estado,
            "tipo": criterios.tipo or avaliacao.tipo or "Apartamento",
            "quartos": criterios.quartos if criterios.quartos is not None else avaliacao.quartos,
            "vagas": criterios.vagas if criterios.vagas is not None else avaliacao.vagas,
            "banheiros": criterios.banheiros if criterios.banheiros is not None else avaliacao.banheiros,
            "area_imovel": criterios.area_imovel if criterios.area_imovel is not None else area,
            "area_min": criterios.area_min if criterios.area_min is not None else (area * 0.8 if area else None),
            "area_max": criterios.area_max if criterios.area_max is not None else (area * 1.2 if area else None),
        }
    )


def pesquisar_comparaveis_gemini(
    criterios: schemas.PesquisaComparaveisRequest,
) -> tuple[list[schemas.PesquisaResultadoItem], PesquisaMeta]:
    resp = gemini_client.gerar_texto(
        system=PROMPT_SISTEMA,
        user=_prompt_usuario(criterios),
        usar_busca=True,
        model=settings.gemini_model_pesquisa,
        temperature=0.2,
    )
    dados = gemini_client.extrair_json(resp.texto)
    return _parse_resultados(dados), PesquisaMeta(
        provedor="gemini",
        modelo=resp.modelo,
        duracao_ms=resp.duracao_ms,
    )


def pesquisar_comparaveis(
    criterios: schemas.PesquisaComparaveisRequest,
    *,
    provedor: str | None = None,
) -> tuple[list[schemas.PesquisaResultadoItem], PesquisaMeta]:
    if not gemini_client.disponivel():
        raise RuntimeError(
            "GEMINI_API_KEY não configurada. Coloque sua chave em receivly-backend/.env"
        )

    return pesquisar_comparaveis_gemini(criterios)
