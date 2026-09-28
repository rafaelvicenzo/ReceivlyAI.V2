"""
Cálculo do Tratamento por Fatores (NBR 14.653), espelhando exatamente a mesma
lógica usada no front-end (calcularAjustes em ReceivlyApp.jsx), pra garantir que
o número mostrado na tela seja o mesmo que o backend calcularia de forma
independente.

O Fator Área usa a fórmula real informada pela avaliadora (Abunahman, "Curso
Básico de Engenharia Legal e de Avaliações"). Os demais fatores (Local,
Depreciação, Padrão, Testada) dependem de critério técnico dela — ficam
neutros (1,0) até serem configurados com a metodologia validada.
"""

from app import models, schemas


def calcular_fatores(comparavel: models.ComparavelAvaliacao, area_imovel: float) -> schemas.FatoresCalculoResponse:
    area_comparavel = comparavel.area or area_imovel or 1

    if area_imovel:
        diff_percentual = abs((area_comparavel - area_imovel) / area_imovel) * 100
    else:
        diff_percentual = 0

    expoente = 1 / 4 if diff_percentual < 30 else 1 / 8
    fator_area = (area_comparavel / area_imovel) ** expoente if area_imovel else 1.0

    fator_local = 1.0
    fator_depreciacao = 1.0
    fator_padrao = 1.0
    fator_testada = 1.0

    fator_total = fator_area * fator_local * fator_depreciacao * fator_padrao * fator_testada

    return schemas.FatoresCalculoResponse(
        fator_local=fator_local,
        fator_area=fator_area,
        fator_depreciacao=fator_depreciacao,
        fator_padrao=fator_padrao,
        fator_testada=fator_testada,
        fator_total=fator_total,
        fatores_definidos=["area"],
    )


def calcular_comparavel(comparavel: models.ComparavelAvaliacao, area_imovel: float) -> schemas.CalculoComparavelResponse:
    fatores = calcular_fatores(comparavel, area_imovel)
    valor_unitario_base = comparavel.valor / (comparavel.area or 1)
    valor_unitario_homogeneizado = valor_unitario_base * fatores.fator_total
    resultado_ajustado = valor_unitario_homogeneizado * (area_imovel or comparavel.area or 1)

    return schemas.CalculoComparavelResponse(
        comparavel=schemas.ComparavelResponse.model_validate(comparavel),
        valor_unitario_base=valor_unitario_base,
        fatores=fatores,
        valor_unitario_homogeneizado=valor_unitario_homogeneizado,
        resultado_ajustado=resultado_ajustado,
    )


def calcular_resultado(avaliacao: models.Avaliacao) -> schemas.ResultadoAvaliacaoResponse:
    area_imovel = avaliacao.area_imovel or 0
    calculos = [calcular_comparavel(c, area_imovel) for c in avaliacao.comparaveis]

    resultados = [c.resultado_ajustado for c in calculos]
    valor_estimado = sum(resultados) / len(resultados) if resultados else 0.0
    valor_minimo = min(resultados) if resultados else 0.0
    valor_maximo = max(resultados) if resultados else 0.0
    valor_medio_m2 = (valor_estimado / area_imovel) if area_imovel else 0.0

    return schemas.ResultadoAvaliacaoResponse(
        valor_estimado=valor_estimado,
        valor_minimo=valor_minimo,
        valor_maximo=valor_maximo,
        valor_medio_m2=valor_medio_m2,
        quantidade_comparaveis=len(calculos),
        area_imovel=avaliacao.area_imovel,
        calculos=calculos,
    )
