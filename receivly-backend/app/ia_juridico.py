"""
Módulo isolado de IA do Analisador Jurídico.

A ideia é manter TODA a lógica de "qual provedor de IA usar" trancada aqui
dentro. O resto do backend (router, banco de dados) só conhece a função
`analisar_documento`, que devolve sempre o mesmo formato
(`schemas.AnaliseJuridicaResultado`) — não importa se por trás está a OpenAI,
outro provedor, ou o fallback local. Pra trocar de provedor no futuro, só
esse arquivo muda.
"""

import base64
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


PROMPT_SISTEMA = """Você é um assistente jurídico especializado em análise de documentos
imobiliários brasileiros (matrícula de imóvel, certidões de ônus reais, certidões de
ações judiciais, certidões de débitos). Você NÃO substitui um advogado — seu papel é
apontar riscos para que um profissional humano revise depois.

Leia o documento anexado e responda SOMENTE com um JSON válido, sem nenhum texto
antes ou depois, no formato exato:

{
  "risco": "Alto" | "Médio" | "Baixo",
  "resumo": "um parágrafo curto resumindo a situação do imóvel",
  "achados": [
    {"titulo": "...", "descricao": "...", "gravidade": "Alto" | "Médio" | "Baixo"}
  ]
}

Classifique como "Alto" risco: ônus reais ativos (hipoteca, penhora), ações judiciais
em andamento envolvendo o imóvel ou o proprietário, ou qualquer indício de disputa de
propriedade. "Médio": pendências regularizáveis (IPTU atrasado, documentação incompleta).
"Baixo": nenhuma pendência relevante encontrada. Se o documento não tiver informação
suficiente para avaliar algum ponto, diga isso explicitamente em "achados", não invente
dados que não estão no documento.
"""


def _extrair_json(texto: str) -> dict:
    texto = texto.strip()
    # remove eventuais cercas de código (```json ... ```) que o modelo às vezes adiciona
    texto = re.sub(r"^```(json)?", "", texto).strip()
    texto = re.sub(r"```$", "", texto).strip()
    return json.loads(texto)


def analisar_documento(
    pdf_bytes: bytes, nome_arquivo: str, nome_imovel: str | None
) -> schemas.AnaliseJuridicaResultado:
    cliente = _get_cliente_openai()

    if cliente is None:
        return _analise_local_fallback(nome_arquivo, nome_imovel)

    pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

    resposta = cliente.responses.create(
        model=settings.openai_model,
        input=[
            {
                "role": "system",
                "content": [{"type": "input_text", "text": PROMPT_SISTEMA}],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": f"Nome do imóvel/referência: {nome_imovel or 'não informado'}. "
                        f"Analise o documento anexado.",
                    },
                    {
                        "type": "input_file",
                        "filename": nome_arquivo,
                        "file_data": f"data:application/pdf;base64,{pdf_base64}",
                    },
                ],
            },
        ],
    )

    dados_json = _extrair_json(resposta.output_text)

    return schemas.AnaliseJuridicaResultado(
        risco=dados_json["risco"],
        resumo=dados_json["resumo"],
        achados=[schemas.AchadoRisco(**a) for a in dados_json["achados"]],
        gerado_por_ia=True,
    )


def _analise_local_fallback(
    nome_arquivo: str, nome_imovel: str | None
) -> schemas.AnaliseJuridicaResultado:
    """Usado enquanto OPENAI_API_KEY não estiver configurada. Não lê o documento de
    verdade — devolve uma análise de exemplo, só pra você testar o fluxo completo
    (upload → banco de dados → tela) sem gastar nada."""
    return schemas.AnaliseJuridicaResultado(
        risco="Médio",
        resumo=(
            f"Análise simulada de '{nome_arquivo}' — configure a OPENAI_API_KEY no "
            f".env para uma leitura real do documento. Este resultado não reflete "
            f"o conteúdo real do arquivo enviado."
        ),
        achados=[
            schemas.AchadoRisco(
                titulo="Modo de demonstração ativo",
                descricao="Nenhuma IA foi chamada. Configure OPENAI_API_KEY no arquivo .env do backend para análises reais.",
                gravidade="Médio",
            ),
            schemas.AchadoRisco(
                titulo="Exemplo de achado — IPTU",
                descricao="Em uma análise real, pendências de IPTU apareceriam aqui.",
                gravidade="Baixo",
            ),
        ],
        gerado_por_ia=False,
    )
