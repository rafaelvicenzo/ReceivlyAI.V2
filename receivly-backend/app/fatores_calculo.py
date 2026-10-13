"""
Cálculo determinístico dos fatores de homogeneização (NBR 14.653 / IBAPE).

- Fator Área: Abunahman — Fa = (Ac/Ai)^n, n=0,250 se |Δarea|≤30%, senão n=0,125
- Fator Padrão: relação entre coeficientes CUB/IBAPE do comparável e do imóvel
- Fator Depreciação: Ross-Heidecke simplificado (idade/vida útil + conservação)
- Fator Testada: Harper-Berrini — Ft = (a/r)^(1/4), com faixa r/2 ≤ a ≤ 2r
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass

# Coeficientes de padrão construtivo (referência Normal/Médio = 1,00)
COEFICIENTE_PADRAO: dict[str, float] = {
    "luxo": 1.30,
    "alto": 1.30,
    "normal": 1.00,
    "medio": 1.00,
    "médio": 1.00,
    "simples": 0.85,
    "economico": 0.80,
    "econômico": 0.80,
    "minimo": 0.50,
    "mínimo": 0.50,
    "rustico": 0.40,
    "rústico": 0.40,
}

ALIASES_PADRAO = {
    "premium": "luxo",
    "superior": "alto",
    "padrao": "normal",
    "padrão": "normal",
    "standard": "normal",
    "basico": "simples",
    "básico": "simples",
    "popular": "economico",
}

TIPOS_SEM_TESTADA = {"apartamento", "apto", "studio", "stúdio", "sala comercial", "sala"}


@dataclass
class AtributosHomogeneizacao:
    padrao: str = "normal"
    idade_anos: float | None = None
    estado_conservacao: float | None = None  # 0–100 (100 = novo/ótimo)
    testada_m: float | None = None
    vida_util_anos: float = 60.0
    testada_referencia_m: float = 10.0


def normalizar_padrao(valor: str | None) -> str:
    if not valor:
        return "normal"
    chave = valor.strip().lower()
    chave = ALIASES_PADRAO.get(chave, chave)
    if chave in COEFICIENTE_PADRAO:
        return chave
    for token in re.split(r"[\s,/\-]+", chave):
        token = ALIASES_PADRAO.get(token, token)
        if token in COEFICIENTE_PADRAO:
            return token
    return "normal"


def coeficiente_padrao(padrao: str | None) -> float:
    return COEFICIENTE_PADRAO.get(normalizar_padrao(padrao), 1.0)


def fator_area(area_comparavel: float, area_imovel: float) -> tuple[float, str]:
    """Fa = (Ac/Ai)^n — Abunahman."""
    if not area_imovel or area_imovel <= 0:
        return 1.0, "Área do imóvel não informada — fator neutro (1,000)."
    if not area_comparavel or area_comparavel <= 0:
        return 1.0, "Área do comparável não informada — fator neutro (1,000)."

    diff_pct = abs((area_comparavel - area_imovel) / area_imovel) * 100
    expoente = 0.250 if diff_pct <= 30 else 0.125
    fator = (area_comparavel / area_imovel) ** expoente
    return (
        round(fator, 4),
        f"Fa = ({area_comparavel:.0f}/{area_imovel:.0f})^{expoente:.3f} "
        f"(dif. area {diff_pct:.1f}% -> n={'0,250' if diff_pct <= 30 else '0,125'}).",
    )


def fator_padrao(padrao_comparavel: str | None, padrao_imovel: str | None) -> tuple[float, str]:
    """Relação entre coeficientes CUB/IBAPE: Fp = coef_imovel / coef_comparavel."""
    coef_c = coeficiente_padrao(padrao_comparavel)
    coef_i = coeficiente_padrao(padrao_imovel)
    fator = coef_i / coef_c if coef_c else 1.0
    fator = max(0.75, min(1.25, fator))
    return (
        round(fator, 4),
        f"Fp = {coef_i:.2f}/{coef_c:.2f} "
        f"({normalizar_padrao(padrao_imovel)} vs {normalizar_padrao(padrao_comparavel)}).",
    )


def _alpha_ross(idade: float, vida_util: float) -> float:
    """Coeficiente α de Ross pela relação idade/vida útil (t/T)."""
    if vida_util <= 0:
        vida_util = 60.0
    razao = min(max(idade / vida_util, 0.0), 1.0)
    if razao <= 0.25:
        return 0.037
    if razao <= 0.50:
        return 0.127
    if razao <= 0.75:
        return 0.277
    return 0.437


def depreciacao_ross_heidecke(
    idade: float | None,
    conservacao: float | None,
    vida_util: float = 60.0,
) -> tuple[float, str]:
    """
    Método Ross-Heidecke simplificado.
    d = α + (1-α)·(1 - c/100)  →  Fd = 1 - d  (valor remanescente)
    """
    idade = max(0.0, idade if idade is not None else 0.0)
    conservacao = conservacao if conservacao is not None else 70.0
    conservacao = max(0.0, min(100.0, conservacao))

    alpha = _alpha_ross(idade, vida_util)
    d = alpha + (1 - alpha) * (1 - conservacao / 100)
    fd = max(0.10, 1.0 - d)
    return (
        round(fd, 4),
        f"Ross-Heidecke: idade {idade:.0f}a / vida útil {vida_util:.0f}a (α={alpha:.3f}), "
        f"conservação {conservacao:.0f}% → Fd={fd:.3f}.",
    )


def _tem_dados_depreciacao(attrs: AtributosHomogeneizacao) -> bool:
    return attrs.idade_anos is not None or attrs.estado_conservacao is not None


def fator_depreciacao(
    attrs_comparavel: AtributosHomogeneizacao,
    attrs_imovel: AtributosHomogeneizacao,
) -> tuple[float, str]:
    if not _tem_dados_depreciacao(attrs_comparavel) or not _tem_dados_depreciacao(attrs_imovel):
        return (
            1.0,
            "Idade ou conservação não informados em ambos — fator neutro (1,000). "
            "Preencha nos comparáveis e no imóvel para aplicar Ross-Heidecke.",
        )

    fd_c, txt_c = depreciacao_ross_heidecke(
        attrs_comparavel.idade_anos,
        attrs_comparavel.estado_conservacao,
        attrs_comparavel.vida_util_anos,
    )
    fd_i, txt_i = depreciacao_ross_heidecke(
        attrs_imovel.idade_anos,
        attrs_imovel.estado_conservacao,
        attrs_imovel.vida_util_anos,
    )
    fator = fd_i / fd_c if fd_c else 1.0
    fator = max(0.75, min(1.25, fator))
    return round(fator, 4), f"Comparável: {txt_c} Imóvel: {txt_i} Fator = {fd_i:.3f}/{fd_c:.3f}."


def _ft_harper_berrini(testada: float, referencia: float) -> tuple[float, str]:
    """Ft = (a/r)^(1/4) dentro da faixa r/2 ≤ a ≤ 2r; fora disso, neutro ou teto."""
    if testada <= 0 or referencia <= 0:
        return 1.0, "Testada não informada — fator neutro (1,000)."

    limite_inf = referencia / 2
    limite_sup = referencia * 2

    if testada < limite_inf or testada > limite_sup:
        if testada > limite_sup:
            ft = 1.19
            return ft, f"Testada {testada:.1f}m > 2× referência ({referencia:.1f}m) — teto Ft=1,190."
        return 1.0, f"Testada {testada:.1f}m fora da faixa [{limite_inf:.1f}–{limite_sup:.1f}]m — neutro."

    ft = (testada / referencia) ** 0.25
    return round(ft, 4), f"Harper-Berrini: Ft = ({testada:.1f}/{referencia:.1f})^0,25 = {ft:.3f}."


def fator_testada(
    attrs_comparavel: AtributosHomogeneizacao,
    attrs_imovel: AtributosHomogeneizacao,
    tipo_imovel: str | None,
) -> tuple[float, str]:
    tipo = (tipo_imovel or "").strip().lower()
    if tipo in TIPOS_SEM_TESTADA:
        return 1.0, "Apartamento/unidade — fator testada não aplicável (1,000)."

    ref = attrs_imovel.testada_referencia_m or 10.0
    ft_c, txt_c = _ft_harper_berrini(attrs_comparavel.testada_m or 0, ref)
    ft_i, txt_i = _ft_harper_berrini(attrs_imovel.testada_m or 0, ref)

    if attrs_comparavel.testada_m and attrs_imovel.testada_m:
        fator = ft_i / ft_c if ft_c else 1.0
        fator = max(0.75, min(1.25, fator))
        return round(fator, 4), f"Comparável: {txt_c} Imóvel: {txt_i} Fator = {ft_i:.3f}/{ft_c:.3f}."

    if attrs_comparavel.testada_m:
        return ft_c, txt_c

    return 1.0, "Testada do imóvel/comparável não informada — fator neutro (1,000)."


def calcular_fatores_formulas(
    area_comparavel: float,
    area_imovel: float,
    attrs_comparavel: AtributosHomogeneizacao,
    attrs_imovel: AtributosHomogeneizacao,
    tipo_imovel: str | None,
    fator_local: float = 1.0,
    justificativa_local: str = "Mesma região — fator local neutro (1,000).",
) -> dict:
    fa, j_area = fator_area(area_comparavel, area_imovel)
    fp, j_padrao = fator_padrao(attrs_comparavel.padrao, attrs_imovel.padrao)
    fdep, j_dep = fator_depreciacao(attrs_comparavel, attrs_imovel)
    ftest, j_test = fator_testada(attrs_comparavel, attrs_imovel, tipo_imovel)

    return {
        "fator_local": round(fator_local, 4),
        "fator_area": fa,
        "fator_depreciacao": fdep,
        "fator_padrao": fp,
        "fator_testada": ftest,
        "justificativas": {
            "local": justificativa_local,
            "area": j_area,
            "depreciacao": j_dep,
            "padrao": j_padrao,
            "testada": j_test,
        },
    }
