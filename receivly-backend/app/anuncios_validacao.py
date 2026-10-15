"""Validação determinística — módulo de anúncios (independente de avaliações)."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from app import models

CANAIS_SUPORTADOS = ("portal", "instagram", "facebook", "whatsapp", "patrocinado")


@dataclass
class CampoValidacao:
    campo: str
    nivel: str
    mensagem: str


@dataclass
class ResultadoValidacao:
    pode_gerar_textos: bool = True
    pode_gerar_artes: bool = True
    campos: list[CampoValidacao] = field(default_factory=list)
    alertas: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "pode_gerar_textos": self.pode_gerar_textos,
            "pode_gerar_artes": self.pode_gerar_artes,
            "campos": [{"campo": c.campo, "nivel": c.nivel, "mensagem": c.mensagem} for c in self.campos],
            "alertas": self.alertas,
        }


def _tem_texto(val: str | None) -> bool:
    return bool(val and str(val).strip())


def _tem_numero_positivo(val: float | int | None) -> bool:
    return val is not None and float(val) > 0


def dados_imovel_de_anuncio(imovel: models.ImovelAnuncio, overrides: dict | None = None) -> dict:
    overrides = overrides or {}
    return {
        "tipo_imovel": overrides.get("tipo_imovel") or imovel.tipo or "Apartamento",
        "finalidade": overrides.get("finalidade") or imovel.finalidade or "venda",
        "preco": overrides.get("preco") or imovel.preco,
        "preco_numero": overrides.get("preco_numero") or imovel.preco_numero,
        "bairro": overrides.get("bairro") or imovel.bairro,
        "cidade": overrides.get("cidade") or imovel.cidade,
        "estado": overrides.get("estado") or imovel.estado,
        "endereco": overrides.get("endereco") or imovel.endereco,
        "area_imovel": overrides.get("area_imovel", imovel.area_imovel),
        "quartos": overrides.get("quartos", imovel.quartos),
        "suites": overrides.get("suites", imovel.suites),
        "banheiros": overrides.get("banheiros", imovel.banheiros),
        "vagas": overrides.get("vagas", imovel.vagas),
        "caracteristicas": overrides.get("caracteristicas") or imovel.caracteristicas,
        "descricao": overrides.get("descricao") or imovel.descricao or imovel.caracteristicas,
        "titulo_anuncio": overrides.get("titulo_anuncio") or imovel.titulo_anuncio or imovel.titulo,
        "tem_fachada": bool(imovel.foto_fachada_caminho),
    }


def validar_pre_geracao(
    imovel: models.ImovelAnuncio,
    *,
    overrides: dict | None = None,
    gerar_artes: bool = True,
) -> ResultadoValidacao:
    dados = dados_imovel_de_anuncio(imovel, overrides)
    resultado = ResultadoValidacao()

    preco_informado = dados.get("preco_numero")
    if not _tem_numero_positivo(preco_informado) and not _tem_texto(dados.get("preco")):
        resultado.campos.append(CampoValidacao("preco", "obrigatorio", "Informe o preço do imóvel."))
        resultado.pode_gerar_textos = False

    if not _tem_texto(dados.get("bairro")) and not _tem_texto(dados.get("cidade")):
        resultado.campos.append(CampoValidacao("localizacao", "obrigatorio", "Informe bairro ou cidade."))
        resultado.pode_gerar_textos = False

    if not _tem_texto(dados.get("tipo_imovel")):
        resultado.campos.append(CampoValidacao("tipo_imovel", "obrigatorio", "Informe o tipo do imóvel."))
        resultado.pode_gerar_textos = False

    if not _tem_numero_positivo(dados.get("area_imovel")):
        resultado.campos.append(CampoValidacao("area_imovel", "recomendado", "Área não informada — texto menos específico."))

    if dados.get("quartos") is None and dados.get("suites") is None:
        resultado.campos.append(CampoValidacao("quartos", "recomendado", "Quartos/suítes não informados."))

    if not _tem_texto(dados.get("descricao")) and not _tem_texto(dados.get("caracteristicas")):
        resultado.campos.append(CampoValidacao("descricao", "recomendado", "Sem descrição — use a análise da fachada ou preencha manualmente."))

    if gerar_artes and not imovel.foto_fachada_caminho:
        resultado.pode_gerar_artes = False
        resultado.alertas.append("Envie a foto de fachada para gerar artes promocionais como no modelo de referência.")

    return resultado


def _normalizar_preco(valor: str | float | int | None) -> float | None:
    if valor is None:
        return None
    if isinstance(valor, (int, float)):
        return float(valor) if valor > 0 else None
    s = re.sub(r"[^\d,.]", "", str(valor))
    if not s:
        return None
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
    elif "," in s:
        partes = s.split(",")
        s = s.replace(",", ".") if len(partes[-1]) <= 2 else s.replace(",", "")
    try:
        n = float(s)
        return n if n > 0 else None
    except ValueError:
        return None


def validar_pos_geracao(conteudo: dict, dados_imovel: dict) -> list[str]:
    alertas: list[str] = []
    preco_ref = _normalizar_preco(dados_imovel.get("preco_numero") or dados_imovel.get("preco"))
    if not preco_ref:
        return alertas

    texto_completo = " ".join(
        str(v)
        for canal in (conteudo.get("canais") or {}).values()
        for v in (canal.get("corpo"), canal.get("titulo"), canal.get("texto_principal"))
        if v
    )
    cliches = ("imperdível", "imóvel dos seus sonhos", "oportunidade única", "não perca")
    for c in cliches:
        if c in texto_completo.lower():
            alertas.append(f'Expressão genérica detectada: "{c}". Considere revisar.')
    return alertas
