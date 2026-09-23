import json

from anthropic import Anthropic
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app import models, schemas, auth

router = APIRouter(prefix="/anuncios", tags=["Gerador de Anúncios"])

_cliente_anthropic = None


def get_cliente_anthropic() -> Anthropic | None:
    """Retorna o cliente da Anthropic, ou None se ainda não houver chave
    configurada — nesse caso o endpoint usa um gerador local (sem custo) no lugar."""
    global _cliente_anthropic
    if not settings.anthropic_api_key:
        return None
    if _cliente_anthropic is None:
        _cliente_anthropic = Anthropic(api_key=settings.anthropic_api_key)
    return _cliente_anthropic


def gerar_textos_localmente(dados: schemas.GerarAnuncioRequest) -> schemas.GerarAnuncioResponse:
    """Gerador simples baseado em template, sem chamar nenhuma IA. Usado enquanto
    a ANTHROPIC_API_KEY não estiver configurada, pra você desenvolver sem custo."""
    tom_intro = {
        "Profissional": "Imóvel de alto padrão disponível para negociação imediata.",
        "Emocional": "Imagine chegar em casa e sentir que finalmente encontrou o seu lugar.",
        "Super Persuasivo": "Oportunidade única — imóveis assim não ficam disponíveis por muito tempo.",
        "Conectado": "Perto de tudo o que importa para o seu dia a dia.",
    }.get(dados.tom_de_voz, "Confira esta oportunidade.")

    suites_txt = f", {dados.suites} suíte(s)" if dados.suites else ""
    vagas_txt = f" e {dados.vagas} vaga(s) de garagem" if dados.vagas else ""
    base = f"{dados.tipo_imovel} em {dados.bairro or 'ótima localização'}{suites_txt}{vagas_txt}. {dados.descricao or 'Ambientes amplos e bem iluminados.'}"

    portal = (
        f"{dados.tom_de_voz.upper()} · {dados.tipo_imovel.upper()} — {dados.bairro or 'Localização nobre'}\n\n"
        f"{tom_intro}\n\n{base}\n\nValor: {dados.preco or 'sob consulta'}.\n"
        f"Agende sua visita e converse agora mesmo com um de nossos corretores."
    )
    instagram = (
        f"✨ {dados.tipo_imovel} à venda em {dados.bairro or 'localização privilegiada'}!\n\n"
        f"{tom_intro}\n"
        + (f"🛏️ {dados.suites} suíte(s)\n" if dados.suites else "")
        + (f"🚗 {dados.vagas} vaga(s)\n" if dados.vagas else "")
        + f"💰 {dados.preco or 'Consulte valores'}\n\n"
        f"Arraste para o lado e veja todas as fotos ➡️\nComenta \"EU QUERO\" que a gente te chama no direct! 📩"
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
    return schemas.GerarAnuncioResponse(portal=portal, instagram=instagram, whatsapp=whatsapp)


PROMPT_SISTEMA = """Você é um redator especializado em marketing imobiliário no Brasil.
Gere textos de divulgação para um imóvel em três formatos diferentes, sempre em
português do Brasil e no tom de voz solicitado.

Responda SOMENTE com um JSON válido, sem nenhum texto antes ou depois, no formato:
{"portal": "...", "instagram": "...", "whatsapp": "..."}

- "portal": texto formal e completo para um portal imobiliário (ex: título + descrição), pode usar quebras de linha.
- "instagram": texto curto, com emojis, pensado para legenda de post/carrossel.
- "whatsapp": mensagem direta em primeira pessoa, como se um corretor estivesse enviando pro cliente, pode usar *negrito* no padrão do WhatsApp.
"""


@router.post("/gerar", response_model=schemas.GerarAnuncioResponse)
def gerar_anuncio(
    dados: schemas.GerarAnuncioRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    cliente: Anthropic | None = Depends(get_cliente_anthropic),
):
    if cliente is None:
        # Sem ANTHROPIC_API_KEY configurada ainda: usa o gerador local, sem custo.
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

    resposta = cliente.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        system=PROMPT_SISTEMA,
        messages=[{"role": "user", "content": prompt_usuario}],
    )

    texto_bruto = "".join(
        bloco.text for bloco in resposta.content if bloco.type == "text"
    ).strip()

    try:
        dados_json = json.loads(texto_bruto)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="A IA retornou um formato inesperado. Tente novamente.",
        )

    return schemas.GerarAnuncioResponse(**dados_json)
