"""
Módulo isolado de IA do Gerador de Anúncios — mesma ideia do ia_juridico.py:
o router só chama `gerar_anuncios`, sem saber se por trás está a Groq ou o fallback local.
"""

import json
import re

from groq import Groq

from app.config import settings
from app import schemas

_cliente_groq: Groq | None = None

PROMPT_SISTEMA = """Você é um redator especializado em marketing imobiliário no Brasil.
Gere textos de divulgação para um imóvel em três formatos diferentes, sempre em
português do Brasil e no tom de voz solicitado.

Responda SOMENTE com um JSON válido, sem nenhum texto antes ou depois, no formato:
{"portal": "...", "instagram": "...", "whatsapp": "..."}

- "portal": texto formal e completo para um portal imobiliário (ex: título + descrição), pode usar quebras de linha.
- "instagram": texto curto, com emojis, pensado para legenda de post/carrossel.
- "whatsapp": mensagem direta em primeira pessoa, como se um corretor estivesse enviando pro cliente, pode usar *negrito* no padrão do WhatsApp.

IMPORTANTE: o tom de voz (Profissional, Emocional, etc.) deve influenciar apenas o ESTILO
da redação — NUNCA inclua o nome do tom, rótulos como "SUPER PERSUASIVO", tipo de imóvel
em caixa alta ou cabeçalhos meta no texto final. Comece direto com o conteúdo do anúncio.
"""


def _get_cliente_groq() -> Groq | None:
    global _cliente_groq
    if not settings.groq_api_key:
        return None
    if _cliente_groq is None:
        _cliente_groq = Groq(api_key=settings.groq_api_key)
    return _cliente_groq


def _extrair_json(texto: str) -> dict:
    texto = texto.strip()
    texto = re.sub(r"^```(json)?", "", texto).strip()
    texto = re.sub(r"```$", "", texto).strip()
    return json.loads(texto)


def gerar_textos_localmente(dados: schemas.GerarAnuncioRequest) -> schemas.GerarAnuncioResponse:
    """Gerador baseado em template, sem chamar nenhuma IA. Usado quando a Groq
    não está configurada ou quando a API falha."""
    tom_intro = {
        "Profissional": "Imóvel de alto padrão disponível para negociação imediata.",
        "Emocional": "Imagine chegar em casa e sentir que finalmente encontrou o seu lugar.",
        "Super Persuasivo": "Oportunidade única — imóveis assim não ficam disponíveis por muito tempo.",
        "Conectado": "Perto de tudo o que importa para o seu dia a dia.",
    }.get(dados.tom_de_voz, "Confira esta oportunidade.")

    suites_txt = f", {dados.suites} suíte(s)" if dados.suites else ""
    vagas_txt = f" e {dados.vagas} vaga(s) de garagem" if dados.vagas else ""
    base = (
        f"{dados.tipo_imovel} em {dados.bairro or 'ótima localização'}{suites_txt}{vagas_txt}. "
        f"{dados.descricao or 'Ambientes amplos e bem iluminados.'}"
    )

    portal = (
        f"{tom_intro}\n\n{base}\n\nValor: {dados.preco or 'sob consulta'}.\n"
        f"Agende sua visita e converse agora mesmo com um de nossos corretores."
    )
    instagram = (
        f"✨ {dados.tipo_imovel} à venda em {dados.bairro or 'localização privilegiada'}!\n\n"
        f"{tom_intro}\n"
        + (f"🛏️ {dados.suites} suíte(s)\n" if dados.suites else "")
        + (f"🚗 {dados.vagas} vaga(s)\n" if dados.vagas else "")
        + f"💰 {dados.preco or 'Consulte valores'}\n\n"
        f'Arraste para o lado e veja todas as fotos ➡️\nComenta "EU QUERO" que a gente te chama no direct! 📩'
    )
    whatsapp = (
        f"Olá! 👋 Encontrei um imóvel que combina com o que você procura:\n\n"
        f"🏠 *{dados.tipo_imovel}* em *{dados.bairro or 'ótima região'}*\n"
        + (f"🛏️ {dados.suites} suíte(s)\n" if dados.suites else "")
        + (f"🚗 {dados.vagas} vaga(s)\n" if dados.vagas else "")
        + f"💰 *{dados.preco or 'Sob consulta'}*\n\n"
        f"{dados.descricao or 'Ambientes amplos e bem cuidados.'}\n\n"
        f"Posso te enviar mais fotos e agendar uma visita essa semana?"
    )
    return schemas.GerarAnuncioResponse(
        portal=portal,
        instagram=instagram,
        whatsapp=whatsapp,
        gerado_por_ia=False,
    )


def gerar_anuncios(dados: schemas.GerarAnuncioRequest) -> schemas.GerarAnuncioResponse:
    cliente = _get_cliente_groq()
    if cliente is None:
        return gerar_textos_localmente(dados)

    prompt_usuario = f"""Características do imóvel:
- Tipo: {dados.tipo_imovel}
- Bairro: {dados.bairro}
- Preço: {dados.preco}
- Suítes: {dados.suites}
- Vagas de garagem: {dados.vagas}
- Descrição bruta fornecida pelo corretor: {dados.descricao}
- Tom de voz desejado: {dados.tom_de_voz}
"""

    try:
        resposta = cliente.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": PROMPT_SISTEMA},
                {"role": "user", "content": prompt_usuario},
            ],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        dados_json = _extrair_json(resposta.choices[0].message.content or "{}")
        return schemas.GerarAnuncioResponse(
            portal=dados_json["portal"],
            instagram=dados_json["instagram"],
            whatsapp=dados_json["whatsapp"],
            gerado_por_ia=True,
        )
    except Exception:
        return gerar_textos_localmente(dados)
