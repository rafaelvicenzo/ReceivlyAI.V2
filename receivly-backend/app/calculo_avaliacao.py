"""
Cálculo do Tratamento por Fatores (NBR 14.653), espelhando a lógica do front-end:
ajustes aditivos sobre o unitário base. O Fator Área usa Abunahman; os demais
podem vir da IA (salvos no comparável) ou ficam neutros (1,0).
"""

from __future__ import annotations

import json
import math

from app import models, schemas
from app.fatores_calculo import fator_area

T_STUDENT_80: tuple[float | None, ...] = (
    None,
    3.078, 1.886, 1.638, 1.533, 1.476, 1.440, 1.415, 1.397, 1.383,
    1.372, 1.363, 1.356, 1.350, 1.345, 1.341, 1.337, 1.333, 1.330, 1.328,
    1.325, 1.323, 1.321, 1.319, 1.318, 1.316, 1.315, 1.314, 1.313, 1.311, 1.310,
)

FATORES_KEYS = ("local", "area", "depreciacao", "padrao", "testada")


def _fator_area_valor(area_comparavel: float, area_imovel: float) -> float:
    fa, _ = fator_area(area_comparavel, area_imovel)
    return fa


def _justificativas_comparavel(comparavel: models.ComparavelAvaliacao) -> dict[str, str] | None:
    if not comparavel.justificativas_fatores:
        return None
    try:
        return json.loads(comparavel.justificativas_fatores)
    except json.JSONDecodeError:
        return None


def calcular_fatores(comparavel: models.ComparavelAvaliacao, area_imovel: float) -> schemas.FatoresCalculoResponse:
    area_comparavel = comparavel.area or area_imovel or 1
    if comparavel.fator_area is not None:
        fator_area_val = comparavel.fator_area
    else:
        fator_area_val = _fator_area_valor(area_comparavel, area_imovel) if area_imovel else 1.0

    fator_local = comparavel.fator_local if comparavel.fator_local is not None else 1.0
    fator_depreciacao = comparavel.fator_depreciacao if comparavel.fator_depreciacao is not None else 1.0
    fator_padrao = comparavel.fator_padrao if comparavel.fator_padrao is not None else 1.0
    fator_testada = comparavel.fator_testada if comparavel.fator_testada is not None else 1.0

    fator_total = fator_local * fator_area_val * fator_depreciacao * fator_padrao * fator_testada

    definidos = ["area"]
    if comparavel.fatores_calculados_por_ia:
        definidos.extend(["local", "depreciacao", "padrao", "testada"])

    return schemas.FatoresCalculoResponse(
        fator_local=fator_local,
        fator_area=fator_area_val,
        fator_depreciacao=fator_depreciacao,
        fator_padrao=fator_padrao,
        fator_testada=fator_testada,
        fator_total=fator_total,
        fatores_definidos=definidos,
        gerado_por_ia=bool(comparavel.fatores_calculados_por_ia),
        justificativas=_justificativas_comparavel(comparavel),
    )


def _fator_oferta(_comparavel: models.ComparavelAvaliacao) -> float:
    return 1.0


def _ajustes_unitario(base: float, fatores: schemas.FatoresCalculoResponse) -> dict[str, float]:
    return {
        "local": base * (fatores.fator_local - 1),
        "area": base * (fatores.fator_area - 1),
        "depreciacao": base * (fatores.fator_depreciacao - 1),
        "padrao": base * (fatores.fator_padrao - 1),
        "testada": base * (fatores.fator_testada - 1),
    }


def calcular_comparavel(comparavel: models.ComparavelAvaliacao, area_imovel: float) -> schemas.CalculoComparavelResponse:
    fatores = calcular_fatores(comparavel, area_imovel)
    area_comparavel = comparavel.area or 1
    valor_unitario_bruto = comparavel.valor / area_comparavel
    fator_oferta = _fator_oferta(comparavel)
    valor_unitario_base = valor_unitario_bruto * fator_oferta

    ajustes = _ajustes_unitario(valor_unitario_base, fatores)
    valor_unitario_homogeneizado = valor_unitario_base + sum(ajustes.values())
    resultado_ajustado = valor_unitario_homogeneizado * (area_imovel or area_comparavel)

    return schemas.CalculoComparavelResponse(
        comparavel=schemas.ComparavelResponse.model_validate(comparavel),
        valor_unitario_base=valor_unitario_base,
        fatores=fatores,
        valor_unitario_homogeneizado=valor_unitario_homogeneizado,
        resultado_ajustado=resultado_ajustado,
    )


def _t_student_80(gl: int) -> float:
    if gl < 1:
        return 0.0
    if gl <= 30:
        return T_STUDENT_80[gl] or 0.0
    return 1.282


def _media(arr: list[float]) -> float:
    return sum(arr) / len(arr) if arr else 0.0


def _desvio_padrao_amostral(arr: list[float]) -> float:
    if len(arr) < 2:
        return 0.0
    m = _media(arr)
    return math.sqrt(sum((v - m) ** 2 for v in arr) / (len(arr) - 1))


def _area_imovel_efetiva(avaliacao: models.Avaliacao) -> float:
    if avaliacao.area_imovel and avaliacao.area_imovel > 0:
        return float(avaliacao.area_imovel)
    areas = sorted(c.area for c in avaliacao.comparaveis if c.area and c.area > 0)
    if not areas:
        return 0.0
    return float(areas[len(areas) // 2])


def calcular_laudo_detalhado(avaliacao: models.Avaliacao) -> dict:
    """Memória de cálculo completa (seção K do laudo de referência)."""
    area_imovel = _area_imovel_efetiva(avaliacao)
    linhas: list[dict] = []

    for i, comparavel in enumerate(avaliacao.comparaveis, start=1):
        calc = calcular_comparavel(comparavel, area_imovel)
        area_c = comparavel.area or 1
        unitario_bruto = comparavel.valor / area_c
        fator_oferta = _fator_oferta(comparavel)
        base = unitario_bruto * fator_oferta
        ajustes = _ajustes_unitario(base, calc.fatores)
        fat = calc.fatores
        linhas.append({
            "n": i,
            "endereco": comparavel.endereco,
            "unitario_bruto": unitario_bruto,
            "fator_oferta": fator_oferta,
            "base": base,
            "fatores": {
                "local": fat.fator_local,
                "area": fat.fator_area,
                "depreciacao": fat.fator_depreciacao,
                "padrao": fat.fator_padrao,
                "testada": fat.fator_testada,
            },
            "ajustes": ajustes,
            "homogeneizado": calc.valor_unitario_homogeneizado,
            "saneado": True,
        })

    bases = [l["base"] for l in linhas]
    homogs = [l["homogeneizado"] for l in linhas]
    media_seca = _media(bases)
    media_homog = _media(homogs)
    limite_sup = media_homog * 1.3
    limite_inf = media_homog * 0.7

    for linha in linhas:
        h = linha["homogeneizado"]
        linha["saneado"] = limite_inf <= h <= limite_sup
        if not linha["saneado"]:
            if h > limite_sup:
                linha["motivo_exclusao"] = f"Acima do limite superior (+30%): {limite_sup:.2f}/m²"
            else:
                linha["motivo_exclusao"] = f"Abaixo do limite inferior (-30%): {limite_inf:.2f}/m²"

    saneados_vals = [l["homogeneizado"] for l in linhas if l["saneado"]]
    n = len(saneados_vals)
    media_saneada = _media(saneados_vals) if n > 0 else media_homog
    desvio = _desvio_padrao_amostral(saneados_vals)
    coef_variacao = (desvio / media_saneada) if media_saneada and n >= 2 else None
    t = round(_t_student_80(n - 1), 2) if n >= 2 else 0.0
    meia_largura = (t * desvio) / math.sqrt(n - 1) if n > 1 else 0.0
    maximo = media_saneada + meia_largura
    minimo = media_saneada - meia_largura
    intervalo = ((maximo - minimo) / media_saneada * 100) if media_saneada and n >= 2 else None

    return {
        "linhas": linhas,
        "area_imovel": area_imovel,
        "media_seca": media_seca,
        "media_homog": media_homog,
        "limite_sup": limite_sup,
        "limite_inf": limite_inf,
        "saneamento": {
            "n": n,
            "total": len(linhas),
            "excluidos": len(linhas) - n,
            "media_saneada": media_saneada,
            "desvio": desvio,
            "coef_variacao": coef_variacao,
            "t": t,
            "maximo": maximo,
            "minimo": minimo,
            "intervalo": intervalo,
            "intervalo_confiavel": n >= 2,
        },
        "unitario_final": media_saneada,
        "valor_calculado": media_saneada * area_imovel,
    }


def faixa_valor_laudo(laudo: dict) -> tuple[float, float]:
    san = laudo["saneamento"]
    area = laudo["area_imovel"] or 0.0
    central = laudo["valor_calculado"]
    if san["n"] >= 2 and san.get("intervalo"):
        return san["minimo"] * area, san["maximo"] * area
    return central, central


def calcular_resultado(avaliacao: models.Avaliacao) -> schemas.ResultadoAvaliacaoResponse:
    area_imovel = _area_imovel_efetiva(avaliacao)
    laudo = calcular_laudo_detalhado(avaliacao)
    calculos = [calcular_comparavel(c, area_imovel) for c in avaliacao.comparaveis]
    valor_estimado = laudo["valor_calculado"]
    valor_medio_m2 = laudo["unitario_final"]

    valor_minimo, valor_maximo = faixa_valor_laudo(laudo)

    return schemas.ResultadoAvaliacaoResponse(
        valor_estimado=valor_estimado,
        valor_minimo=valor_minimo,
        valor_maximo=valor_maximo,
        valor_medio_m2=valor_medio_m2,
        quantidade_comparaveis=len(calculos),
        area_imovel=area_imovel or avaliacao.area_imovel,
        calculos=calculos,
    )
