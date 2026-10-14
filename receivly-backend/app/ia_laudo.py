"""Textos de laudo via Gemini Flash."""

from __future__ import annotations

from app import gemini_client, models
from app.config import settings

PROMPT_PERSPECTIVAS = """Você é perito avaliador imobiliário (NBR 14.653 / IBAPE).
Redija a seção F.2 PERSPECTIVAS FUTURAS de um laudo de avaliação em português formal.

Regras:
- 1 a 2 parágrafos, tom técnico e cauteloso
- Comente tendências do mercado local, demanda, oferta e fatores que podem influenciar valores
- NÃO prometa valorização nem previsões de preço específicas
- NÃO invente obras ou empreendimentos no entorno sem base
- Se a finalidade for LOCAÇÃO: comente estabilidade de aluguéis, competitividade, reajustes (IGPM/IPCA) e prazos contratuais
- Se a finalidade for VENDA: comente liquidez, ciclo de mercado e perspectivas macro da região
- Retorne SOMENTE o texto da seção, sem título "F.2" nem markdown
"""

FALLBACK_PERSPECTIVAS_LOCACAO = (
    "A perspectiva em longo prazo aponta para a estabilidade dos preços, e para garantir uma locação "
    "efetiva, é necessário realizar ajustes nos valores de forma a torná-los competitivos. Esses ajustes "
    "devem incluir previsões de aumento anual com valores fixos e/ou de acordo com o Índice Geral de "
    "Preços do Mercado (IGPM), alinhados com as práticas observadas no mercado. É importante destacar "
    "que, em contratos com prazos mais longos, dada a segurança que oferecem nas negociações, é esperado "
    "que os ajustes sejam mais moderados para garantir a estabilidade do contrato a longo prazo."
)

FALLBACK_PERSPECTIVAS_VENDA = (
    "A perspectiva em médio e longo prazo para o segmento analisado indica continuidade de demanda "
    "na região, condicionada à macroeconomia, à taxa de juros e ao ritmo de novos empreendimentos "
    "concorrentes. Eventuais oscilações de preços tendem a refletir o equilíbrio entre oferta e "
    "procura no mercado local, devendo o imóvel ser posicionado de forma competitiva para preservar "
    "liquidez nas negociações."
)


def _contexto_avaliacao(avaliacao: models.Avaliacao, extra: dict | None = None) -> str:
    extra = extra or {}
    finalidade = extra.get("finalidade") or "venda"
    finalidade_label = "locação mensal" if finalidade == "locacao" else "venda"
    return f"""IMÓVEL AVALIANDO:
Endereço: {avaliacao.endereco or "—"}, {avaliacao.numero or "s/n"}
Bairro: {avaliacao.bairro or "—"} | Cidade: {avaliacao.cidade or "—"}/{avaliacao.estado or "—"}
Tipo: {avaliacao.tipo or "Apartamento"} | Área: {avaliacao.area_imovel or "—"} m²
Finalidade do laudo: {finalidade_label}
Valor estimado na avaliação: {extra.get("valor_estimado") or "—"}
Comparáveis na amostra: {extra.get("qtd_comparaveis") or 0}
Características: {avaliacao.caracteristicas or "—"}
"""


def _fallback_perspectivas(finalidade: str) -> str:
    return FALLBACK_PERSPECTIVAS_LOCACAO if finalidade == "locacao" else FALLBACK_PERSPECTIVAS_VENDA


def gerar_perspectivas(
    avaliacao: models.Avaliacao,
    *,
    finalidade: str = "venda",
    texto_atual: str = "",
    valor_estimado: float | None = None,
    qtd_comparaveis: int = 0,
) -> str:
    extra = {
        "finalidade": finalidade,
        "valor_estimado": valor_estimado,
        "qtd_comparaveis": qtd_comparaveis,
    }
    if not gemini_client.disponivel():
        return _fallback_perspectivas(finalidade)

    ctx = _contexto_avaliacao(avaliacao, extra)
    user = ctx
    if texto_atual.strip():
        user += f"\n\nTEXTO ATUAL (revise/melhore mantendo o tom técnico):\n{texto_atual.strip()}"

    try:
        resp = gemini_client.gerar_texto(
            system=PROMPT_PERSPECTIVAS,
            user=user,
            model=settings.gemini_model,
            temperature=0.35,
        )
        texto = (resp.texto or "").strip()
        return texto or _fallback_perspectivas(finalidade)
    except Exception:
        return _fallback_perspectivas(finalidade)
