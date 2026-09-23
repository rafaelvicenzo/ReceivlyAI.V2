"""
Comunicação com a WhatsApp Cloud API (Meta). Isolado aqui pelo mesmo motivo dos
outros adaptadores de IA: se um dia vocês trocarem de provedor (ex: Twilio),
só esse arquivo muda.
"""

import httpx

from app.config import settings


def credenciais_configuradas() -> bool:
    return bool(settings.whatsapp_access_token and settings.whatsapp_phone_number_id)


def enviar_mensagem(telefone: str, texto: str) -> bool:
    """Envia uma mensagem de texto para o número do lead através do número real
    conectado na WhatsApp Cloud API. Retorna True se enviou, False se as
    credenciais não estão configuradas ainda (modo demonstração) ou se falhou."""

    if not credenciais_configuradas():
        return False

    url = (
        f"https://graph.facebook.com/{settings.whatsapp_api_version}"
        f"/{settings.whatsapp_phone_number_id}/messages"
    )
    headers = {"Authorization": f"Bearer {settings.whatsapp_access_token}"}
    payload = {
        "messaging_product": "whatsapp",
        "to": telefone,
        "type": "text",
        "text": {"body": texto},
    }

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=15)
        resp.raise_for_status()
        return True
    except httpx.HTTPError:
        return False
