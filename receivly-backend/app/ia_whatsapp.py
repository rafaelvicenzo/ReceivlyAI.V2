"""
Módulo isolado de IA da conversa de WhatsApp — mesma ideia do ia_juridico.py:
o resto do backend só chama `gerar_resposta`, sem saber qual provedor está por trás.
"""

import json
import re

from pydantic import BaseModel
from openai import OpenAI

from app.config import settings

_cliente_openai: OpenAI | None = None


def _get_cliente_openai() -> OpenAI | None:
    global _cliente_openai
    if not settings.openai_api_key:
        return None
    if _cliente_openai is None:
        _cliente_openai = OpenAI(api_key=settings.openai_api_key)
    return _cliente_openai


class DadosExtraidos(BaseModel):
    orcamento: str | None = None
    bairro: str | None = None
    quartos: str | None = None
    motivacao: str | None = None  # "Moradia" | "Investimento"


class RespostaIA(BaseModel):
    resposta: str
    dados_extraidos: DadosExtraidos
    encaminhar_corretor: bool
    motivo_encaminhamento: str | None = None
    gerado_por_ia: bool


PROMPT_SISTEMA = """Você é a assistente virtual de atendimento via WhatsApp de uma
imobiliária brasileira. Seu papel é conversar com o lead (cliente em potencial),
de forma natural, cordial e objetiva, para entender o que ele procura.

Ao longo da conversa, tente descobrir: orçamento, bairro de interesse, número de
quartos desejado, e se o objetivo é morar no imóvel ou investir.

Você DEVE encaminhar a conversa para um corretor humano (encaminhar_corretor=true)
quando: o lead pedir explicitamente para falar com uma pessoa/corretor; a pergunta
envolver questões jurídicas, fiscais ou de documentação (ex: imposto, inventário,
financiamento complexo); ou o lead já tiver fornecido dados suficientes para
agendar uma visita.

Responda SEMPRE em português do Brasil, e SOMENTE com um JSON válido, sem texto
antes ou depois, no formato exato:

{
  "resposta": "a mensagem que a IA vai enviar ao lead agora",
  "dados_extraidos": {"orcamento": "...", "bairro": "...", "quartos": "...", "motivacao": "Moradia|Investimento"},
  "encaminhar_corretor": true|false,
  "motivo_encaminhamento": "explicação curta, ou null se não for encaminhar"
}

Em "dados_extraidos", inclua apenas os campos que você conseguiu identificar até
agora nesta conversa (mantenha os que já tinham sido identificados antes, some com
o que apareceu na nova mensagem). Use null para o que ainda não sabe.
"""


def _extrair_json(texto: str) -> dict:
    texto = texto.strip()
    texto = re.sub(r"^```(json)?", "", texto).strip()
    texto = re.sub(r"```$", "", texto).strip()
    return json.loads(texto)


def gerar_resposta(
    historico_mensagens: list[dict], dados_ja_conhecidos: DadosExtraidos
) -> RespostaIA:
    """
    historico_mensagens: lista de {"remetente": "lead"|"ia"|"corretor", "texto": "..."}
    dados_ja_conhecidos: o que já foi extraído nesta conversa até agora
    """
    cliente = _get_cliente_openai()

    if cliente is None:
        return _resposta_local_fallback(historico_mensagens, dados_ja_conhecidos)

    mensagens_formatadas = [{"role": "system", "content": PROMPT_SISTEMA}]
    mensagens_formatadas.append({
        "role": "system",
        "content": f"Dados já conhecidos do lead até agora: {dados_ja_conhecidos.model_dump_json()}",
    })
    for m in historico_mensagens:
        role = "assistant" if m["remetente"] in ("ia", "corretor") else "user"
        mensagens_formatadas.append({"role": role, "content": m["texto"]})

    resposta = cliente.chat.completions.create(
        model=settings.openai_model_whatsapp,
        messages=mensagens_formatadas,
        temperature=0.6,
        response_format={"type": "json_object"},
    )

    dados_json = _extrair_json(resposta.choices[0].message.content)

    return RespostaIA(
        resposta=dados_json["resposta"],
        dados_extraidos=DadosExtraidos(**dados_json.get("dados_extraidos", {})),
        encaminhar_corretor=dados_json.get("encaminhar_corretor", False),
        motivo_encaminhamento=dados_json.get("motivo_encaminhamento"),
        gerado_por_ia=True,
    )


def _resposta_local_fallback(
    historico_mensagens: list[dict], dados_ja_conhecidos: DadosExtraidos
) -> RespostaIA:
    """Usado enquanto OPENAI_API_KEY não estiver configurada. Devolve uma resposta
    genérica, só pra você testar o fluxo (mensagem chega → IA responde → salva no
    banco → aparece na tela) sem gastar nada e sem precisar da chave ainda."""
    return RespostaIA(
        resposta=(
            "Oi! Recebi sua mensagem 🙂 (modo de demonstração ativo — configure a "
            "OPENAI_API_KEY no .env do backend para respostas reais da IA)."
        ),
        dados_extraidos=dados_ja_conhecidos,
        encaminhar_corretor=False,
        motivo_encaminhamento=None,
        gerado_por_ia=False,
    )
