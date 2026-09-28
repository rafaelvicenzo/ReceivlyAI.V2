"""
Pesquisa de imóveis comparáveis de verdade, usando a ferramenta de busca na web
nativa da OpenAI (Responses API, tool "web_search"). O modelo pesquisa em
portais imobiliários brasileiros e devolve os dados já estruturados — não há
scraping próprio aqui, então não dependemos do HTML de cada site.
"""

import json
import re

from openai import OpenAI

from app.config import settings
from app import schemas

_cliente_openai: OpenAI | None = None


def _get_cliente_openai() -> OpenAI | None:
    global _cliente_openai
    if not settings.openai_api_key:
        return None
    if _cliente_openai is None:
        _cliente_openai = OpenAI(api_key=settings.openai_api_key)
    return _cliente_openai


PROMPT_SISTEMA = """Você é um assistente de pesquisa de mercado imobiliário no Brasil.
Use a ferramenta de busca na web para encontrar ANÚNCIOS REAIS de imóveis à venda
ou para locação em portais confiáveis (ex: Zap Imóveis, VivaReal, OLX, QuintoAndar,
Imovelweb), que sirvam como comparáveis para uma avaliação imobiliária.

Depois de pesquisar, responda SOMENTE com um JSON válido, sem texto antes ou
depois, no formato exato:

{"resultados": [
  {"endereco": "...", "bairro": "...", "cidade": "...", "area": 0, "quartos": 0,
   "vagas": 0, "valor": 0, "fonte": "nome do portal", "link": "URL real do anúncio"}
]}

Regras importantes:
- Só inclua imóveis que você encontrou de verdade na busca — nunca invente um anúncio.
- "valor" é o preço anunciado, em número (sem "R$" nem pontos), em reais.
- "link" deve ser a URL real do anúncio encontrado na busca.
- Se não encontrar imóveis suficientes, devolva menos itens — nunca invente pra completar a quantidade pedida.
"""


def _extrair_json(texto: str) -> dict:
    texto = texto.strip()
    texto = re.sub(r"^```(json)?", "", texto).strip()
    texto = re.sub(r"```$", "", texto).strip()
    return json.loads(texto)


def pesquisar_comparaveis(criterios: schemas.PesquisaComparaveisRequest) -> list[schemas.PesquisaResultadoItem]:
    cliente = _get_cliente_openai()

    if cliente is None:
        return _resultados_locais_fallback(criterios)

    prompt_usuario = f"""Encontre até {criterios.quantidade} imóveis comparáveis com estas características:
- Tipo: {criterios.tipo}
- Bairro: {criterios.bairro}
- Cidade: {criterios.cidade}
- Área aproximada: entre {criterios.area_min or "sem mínimo"} e {criterios.area_max or "sem máximo"} m²
- Raio de busca: {criterios.raio_km or 2} km do bairro informado
"""

    resposta = cliente.responses.create(
        model=settings.openai_model_pesquisa,
        tools=[{"type": "web_search"}],
        input=[
            {"role": "system", "content": PROMPT_SISTEMA},
            {"role": "user", "content": prompt_usuario},
        ],
    )

    dados_json = _extrair_json(resposta.output_text)
    itens = dados_json.get("resultados", [])
    return [schemas.PesquisaResultadoItem(**item, gerado_por_ia=True) for item in itens]


def _resultados_locais_fallback(criterios: schemas.PesquisaComparaveisRequest) -> list[schemas.PesquisaResultadoItem]:
    """Usado enquanto OPENAI_API_KEY não estiver configurada — dados de exemplo,
    só pra testar o fluxo (não são anúncios reais)."""
    exemplos = [
        {"endereco": "Rua Exemplo, 100", "area": 118, "quartos": 3, "vagas": 2, "valor": 705000, "fonte": "Exemplo (modo demonstração)", "link": ""},
        {"endereco": "Rua Exemplo, 200", "area": 122, "quartos": 3, "vagas": 2, "valor": 735000, "fonte": "Exemplo (modo demonstração)", "link": ""},
        {"endereco": "Rua Exemplo, 300", "area": 128, "quartos": 3, "vagas": 2, "valor": 765000, "fonte": "Exemplo (modo demonstração)", "link": ""},
    ]
    return [
        schemas.PesquisaResultadoItem(
            **item, bairro=criterios.bairro, cidade=criterios.cidade, gerado_por_ia=False
        )
        for item in exemplos[: criterios.quantidade]
    ]
