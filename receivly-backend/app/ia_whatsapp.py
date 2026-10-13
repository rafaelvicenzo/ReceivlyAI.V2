"""
Módulo isolado de IA da conversa de WhatsApp — Gemini Flash.
"""

import re

from pydantic import BaseModel

from app.config import settings
from app import gemini_client


class DadosExtraidos(BaseModel):
    orcamento: str | None = None
    bairro: str | None = None
    tipo_imovel: str | None = None
    quartos: str | None = None
    vagas: str | None = None
    motivacao: str | None = None


class RespostaIA(BaseModel):
    resposta: str
    dados_extraidos: DadosExtraidos
    encaminhar_corretor: bool
    motivo_encaminhamento: str | None = None
    gerado_por_ia: bool
    provedor: str | None = None


PROMPT_SISTEMA = """Você é a assistente virtual de atendimento via WhatsApp de uma
imobiliária brasileira. Seu papel é conversar com o lead (cliente em potencial),
de forma natural, cordial e objetiva, para entender o que ele procura.

Ao longo da conversa, tente descobrir: orçamento, bairro de interesse, tipo de imóvel
(apartamento, casa, etc.), número de quartos, vagas de garagem, e se o objetivo é
morar no imóvel ou investir.

Você DEVE encaminhar a conversa para um corretor humano (encaminhar_corretor=true)
quando: o lead pedir explicitamente para falar com uma pessoa/corretor; a pergunta
envolver questões jurídicas, fiscais ou de documentação (ex: imposto, inventário,
financiamento complexo); ou o lead já tiver fornecido dados suficientes para
agendar uma visita.

Responda SEMPRE em português do Brasil, e SOMENTE com um JSON válido, sem texto
antes ou depois, no formato exato:

{
  "resposta": "a mensagem que a IA vai enviar ao lead agora",
  "dados_extraidos": {"orcamento": "...", "bairro": "...", "tipo_imovel": "...", "quartos": "...", "vagas": "...", "motivacao": "Moradia|Investimento"},
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
    return gemini_client.extrair_json(texto)


def _montar_historico_texto(historico_mensagens: list[dict], dados_ja_conhecidos: DadosExtraidos) -> str:
    linhas = [f"Dados já conhecidos do lead: {dados_ja_conhecidos.model_dump_json()}", "", "Histórico:"]
    for m in historico_mensagens:
        quem = "Lead" if m["remetente"] == "lead" else "Assistente"
        linhas.append(f"{quem}: {m['texto']}")
    return "\n".join(linhas)


def gerar_resposta(
    historico_mensagens: list[dict], dados_ja_conhecidos: DadosExtraidos
) -> RespostaIA:
    if not gemini_client.disponivel():
        return _resposta_local_fallback(dados_ja_conhecidos)

    try:
        resp = gemini_client.gerar_texto(
            system=PROMPT_SISTEMA,
            user=_montar_historico_texto(historico_mensagens, dados_ja_conhecidos),
            json_mode=True,
            model=settings.gemini_model_whatsapp,
            temperature=0.6,
        )
        dados_json = _extrair_json(resp.texto)
        return RespostaIA(
            resposta=dados_json["resposta"],
            dados_extraidos=DadosExtraidos(**dados_json.get("dados_extraidos", {})),
            encaminhar_corretor=dados_json.get("encaminhar_corretor", False),
            motivo_encaminhamento=dados_json.get("motivo_encaminhamento"),
            gerado_por_ia=True,
            provedor="gemini",
        )
    except Exception:
        return _resposta_local_fallback(dados_ja_conhecidos)


def _resposta_local_fallback(dados_ja_conhecidos: DadosExtraidos) -> RespostaIA:
    return RespostaIA(
        resposta=(
            "Oi! Recebi sua mensagem 🙂 (modo de demonstração — configure "
            "GEMINI_API_KEY no receivly-backend/.env e reinicie o servidor)."
        ),
        dados_extraidos=dados_ja_conhecidos,
        encaminhar_corretor=False,
        motivo_encaminhamento=None,
        gerado_por_ia=False,
        provedor="fallback",
    )
