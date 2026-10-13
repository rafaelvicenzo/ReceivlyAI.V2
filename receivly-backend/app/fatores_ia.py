"""
Homogeneização por fatores (NBR 14.653).

1. A IA lê o anúncio do comparável (web_search) e extrai padrão, idade, conservação e testada.
2. Os fatores Área, Padrão, Depreciação e Testada são calculados por fórmulas determinísticas.
3. O fator Local continua estimado pela IA (micro-localização).
"""

from __future__ import annotations

import json

from app.config import settings
from app import gemini_client
from app import models, schemas
from app.fatores_calculo import (
    AtributosHomogeneizacao,
    calcular_fatores_formulas,
    normalizar_padrao,
)

PROMPT_EXTRACAO = """Você é perito avaliador imobiliário (NBR 14.653 / IBAPE).
Analise o IMÓVEL AVALIANDO e o ANÚNCIO COMPARÁVEL (dados reais da pesquisa web)
e extraia atributos para homogeneização por fatores.

Responda SOMENTE com JSON válido:

{
  "padrao_imovel": "normal",
  "idade_imovel": 20,
  "conservacao_imovel": 75,
  "testada_imovel": null,
  "padrao_comparavel": "normal",
  "idade_comparavel": 10,
  "conservacao_comparavel": 85,
  "testada_comparavel": null,
  "fator_local": 1.000,
  "justificativa_local": "..."
}

Regras:
- padrao_*: um de luxo | alto | normal | simples | economico | minimo | rustico
- conservacao_*: 0–100 (100=novo/ótimo, 70=regular, 50=mals conservado)
- idade_*: anos aparentes da edificação (número ou null se desconhecido)
- testada_*: largura da frente do lote em metros (null para apartamentos)
- fator_local: 0,850–1,150 — diferença de micro-localização entre os imóveis
- Baseie-se no texto do anúncio comparável; se não houver dado no anúncio, use null (não invente)
- NÃO invente idade, conservação ou testada se o anúncio não mencionar (use null)
"""


def _extrair_json(texto: str) -> dict:
    return gemini_client.extrair_json(texto)


def _extrair_fatores_ia(avaliacao: models.Avaliacao, comparavel: models.ComparavelAvaliacao) -> dict:
    if not gemini_client.disponivel():
        raise RuntimeError("GEMINI_API_KEY não configurada")

    contexto = _descrever_contexto(avaliacao, comparavel)
    resp = gemini_client.gerar_texto(
        system=PROMPT_EXTRACAO,
        user=contexto,
        json_mode=True,
        model=settings.gemini_model,
        temperature=0.15,
    )
    return _extrair_json(resp.texto)


def _attrs_de_avaliacao(avaliacao: models.Avaliacao) -> AtributosHomogeneizacao:
    return AtributosHomogeneizacao(
        padrao=normalizar_padrao(avaliacao.padrao_construtivo or "normal"),
        idade_anos=avaliacao.idade_anos,
        estado_conservacao=avaliacao.estado_conservacao,
        testada_m=avaliacao.testada_m,
        vida_util_anos=avaliacao.vida_util_anos or 60.0,
        testada_referencia_m=avaliacao.testada_referencia_m or 10.0,
    )


def _attrs_de_comparavel(comparavel: models.ComparavelAvaliacao) -> AtributosHomogeneizacao:
    return AtributosHomogeneizacao(
        padrao=normalizar_padrao(comparavel.padrao_construtivo or "normal"),
        idade_anos=comparavel.idade_anos,
        estado_conservacao=comparavel.estado_conservacao,
        testada_m=comparavel.testada_m,
    )


def _comparavel_tem_dados_anuncio(comparavel: models.ComparavelAvaliacao) -> bool:
    return bool(
        (comparavel.descricao_anuncio or "").strip()
        or (comparavel.link or "").strip()
    )


def _comparavel_e_demo(comparavel: models.ComparavelAvaliacao) -> bool:
    link = (comparavel.link or "").lower()
    texto = (comparavel.descricao_anuncio or comparavel.observacoes or "").lower()
    return (
        "/demo-" in link
        or "fictício" in texto
        or "demonstração" in texto
        or "anúncio fictício" in texto
    )


def _deve_usar_ia(comparavel: models.ComparavelAvaliacao) -> bool:
    if not settings.fatores_usar_ia:
        return False
    if settings.comparaveis_modo_demo:
        return False
    if _comparavel_e_demo(comparavel):
        return False
    return _comparavel_tem_dados_anuncio(comparavel)


def _mesclar_attrs(
    base: AtributosHomogeneizacao,
    extra: dict,
    prefixo: str,
) -> AtributosHomogeneizacao:
    padrao = extra.get(f"padrao_{prefixo}")
    idade = extra.get(f"idade_{prefixo}")
    conservacao = extra.get(f"conservacao_{prefixo}")
    testada = extra.get(f"testada_{prefixo}")

    return AtributosHomogeneizacao(
        padrao=normalizar_padrao(padrao) if padrao else base.padrao,
        idade_anos=float(idade) if idade is not None else base.idade_anos,
        estado_conservacao=float(conservacao) if conservacao is not None else base.estado_conservacao,
        testada_m=float(testada) if testada is not None else base.testada_m,
        vida_util_anos=base.vida_util_anos,
        testada_referencia_m=base.testada_referencia_m,
    )


def _descrever_contexto(avaliacao: models.Avaliacao, comparavel: models.ComparavelAvaliacao) -> str:
    desc_anuncio = comparavel.descricao_anuncio or comparavel.observacoes or ""
    return f"""IMÓVEL AVALIANDO:
Tipo: {avaliacao.tipo or "Apartamento"}
Endereço: {avaliacao.endereco}, {avaliacao.numero} — {avaliacao.bairro}, {avaliacao.cidade}/{avaliacao.estado}
Área: {avaliacao.area_imovel} m² | Terreno: {avaliacao.area_terreno or "—"} m²
Quartos: {avaliacao.quartos} | Vagas: {avaliacao.vagas}
Padrão cadastrado: {avaliacao.padrao_construtivo or "normal"}
Idade cadastrada: {avaliacao.idade_anos or "—"} anos
Conservação cadastrada: {avaliacao.estado_conservacao or "—"}%
Testada cadastrada: {avaliacao.testada_m or "—"} m
Características: {avaliacao.caracteristicas or "—"}
Observações: {avaliacao.observacoes or "—"}

ANÚNCIO COMPARÁVEL (web search):
Endereço: {comparavel.endereco} — {comparavel.bairro}, {comparavel.cidade}
Área: {comparavel.area} m² | Valor: R$ {comparavel.valor:,.0f}
Quartos: {comparavel.quartos} | Vagas: {comparavel.vagas}
Fonte/portal: {comparavel.fonte or "—"}
Link: {comparavel.link or "—"}
Padrão já extraído: {comparavel.padrao_construtivo or "—"}
Idade já extraída: {comparavel.idade_anos or "—"}
Conservação já extraída: {comparavel.estado_conservacao or "—"}
Testada já extraída: {comparavel.testada_m or "—"}
Descrição do anúncio:
{desc_anuncio}
"""


def _fatores_fallback(
    avaliacao: models.Avaliacao,
    comparavel: models.ComparavelAvaliacao,
    motivo: str,
) -> schemas.FatoresIAResponse:
    attrs_i = _attrs_de_avaliacao(avaliacao)
    attrs_c = _attrs_de_comparavel(comparavel)
    resultado = calcular_fatores_formulas(
        area_comparavel=comparavel.area or 0,
        area_imovel=avaliacao.area_imovel or 0,
        attrs_comparavel=attrs_c,
        attrs_imovel=attrs_i,
        tipo_imovel=avaliacao.tipo,
        fator_local=1.0,
        justificativa_local=f"{motivo} — fator local neutro (1,000).",
    )
    return schemas.FatoresIAResponse(
        fator_local=resultado["fator_local"],
        fator_depreciacao=resultado["fator_depreciacao"],
        fator_padrao=resultado["fator_padrao"],
        fator_testada=resultado["fator_testada"],
        justificativas=resultado["justificativas"],
        gerado_por_ia=False,
    )


def calcular_fatores_comparavel(
    avaliacao: models.Avaliacao,
    comparavel: models.ComparavelAvaliacao,
) -> schemas.FatoresIAResponse:
    attrs_imovel = _attrs_de_avaliacao(avaliacao)
    tem_anuncio = _comparavel_tem_dados_anuncio(comparavel)
    usar_ia = _deve_usar_ia(comparavel)

    if not usar_ia and not tem_anuncio:
        # Comparável manual: não usar idade/conservação inventadas pela IA
        comparavel.idade_anos = None
        comparavel.estado_conservacao = None

    attrs_comparavel = _attrs_de_comparavel(comparavel)

    fator_local = 1.0
    if _comparavel_e_demo(comparavel):
        just_local = "Comparável de demonstração — fatores por fórmula, local neutro (1,000)."
    elif not usar_ia:
        just_local = "Fatores calculados por fórmula (NBR 14.653) — fator local neutro (1,000)."
    elif not tem_anuncio:
        just_local = "Comparável manual sem descrição de anúncio — fator local neutro (1,000)."
    else:
        just_local = "Mesma região — fator local neutro (1,000)."
    gerado_ia = False

    if usar_ia:
        try:
            dados = _extrair_fatores_ia(avaliacao, comparavel)
            attrs_imovel = _mesclar_attrs(attrs_imovel, dados, "imovel")
            attrs_comparavel = _mesclar_attrs(attrs_comparavel, dados, "comparavel")

            comparavel.padrao_construtivo = attrs_comparavel.padrao
            comparavel.idade_anos = attrs_comparavel.idade_anos
            comparavel.estado_conservacao = attrs_comparavel.estado_conservacao
            comparavel.testada_m = attrs_comparavel.testada_m

            fator_local = max(0.85, min(1.15, float(dados.get("fator_local", 1.0))))
            just_local = dados.get("justificativa_local", just_local)
            gerado_ia = True
        except Exception as exc:
            just_local = f"Extração IA indisponível ({str(exc)[:80]}) — local neutro."

    resultado = calcular_fatores_formulas(
        area_comparavel=comparavel.area or 0,
        area_imovel=avaliacao.area_imovel or 0,
        attrs_comparavel=attrs_comparavel,
        attrs_imovel=attrs_imovel,
        tipo_imovel=avaliacao.tipo,
        fator_local=fator_local,
        justificativa_local=just_local,
    )

    comparavel.fator_area = resultado["fator_area"]

    return schemas.FatoresIAResponse(
        fator_local=resultado["fator_local"],
        fator_depreciacao=resultado["fator_depreciacao"],
        fator_padrao=resultado["fator_padrao"],
        fator_testada=resultado["fator_testada"],
        justificativas=resultado["justificativas"],
        gerado_por_ia=gerado_ia,
    )


def calcular_e_salvar_fatores(
    avaliacao: models.Avaliacao,
    db,
) -> list[schemas.ComparavelFatoresResponse]:
    resultados = []
    for comparavel in avaliacao.comparaveis:
        fatores = calcular_fatores_comparavel(avaliacao, comparavel)
        comparavel.fator_local = fatores.fator_local
        comparavel.fator_depreciacao = fatores.fator_depreciacao
        comparavel.fator_padrao = fatores.fator_padrao
        comparavel.fator_testada = fatores.fator_testada
        comparavel.fatores_calculados_por_ia = 1
        comparavel.justificativas_fatores = json.dumps(fatores.justificativas, ensure_ascii=False)
        if not fatores.gerado_por_ia:
            comparavel.fatores_editados_manualmente = 0
        resultados.append(
            schemas.ComparavelFatoresResponse(
                comparavel_id=comparavel.id,
                fatores=fatores,
            )
        )
    db.commit()
    return resultados
