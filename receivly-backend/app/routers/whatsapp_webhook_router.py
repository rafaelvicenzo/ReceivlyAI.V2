from fastapi import APIRouter, Request, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app import models
from app.routers.whatsapp_router import processar_mensagem_recebida

router = APIRouter(prefix="/whatsapp", tags=["IA para WhatsApp"])


@router.get("/webhook")
async def verificar_webhook(request: Request):
    """A Meta chama essa rota UMA VEZ, quando você configura o webhook no painel
    deles, só pra confirmar que você é dono desse endereço."""
    params = request.query_params
    if (
        params.get("hub.mode") == "subscribe"
        and params.get("hub.verify_token") == settings.whatsapp_verify_token
    ):
        return Response(content=params.get("hub.challenge", ""), media_type="text/plain")
    return Response(status_code=403)


@router.post("/webhook")
async def receber_webhook(request: Request):
    """A Meta chama essa rota toda vez que uma mensagem real chega no número
    conectado. Isso é PÚBLICO (sem JWT) porque quem chama é a Meta, não um
    usuário logado no Receivly — por isso resolvemos a imobiliária de outro
    jeito (veja o TODO abaixo)."""
    payload = await request.json()

    db: Session = SessionLocal()
    try:
        entradas = payload.get("entry", [])
        for entrada in entradas:
            for mudanca in entrada.get("changes", []):
                valor = mudanca.get("value", {})
                contatos = {c["wa_id"]: c.get("profile", {}).get("name", "Lead do WhatsApp") for c in valor.get("contacts", [])}

                for mensagem in valor.get("messages", []):
                    if mensagem.get("type") != "text":
                        continue  # por enquanto só tratamos mensagens de texto

                    telefone = mensagem["from"]
                    texto = mensagem["text"]["body"]
                    nome = contatos.get(telefone, "Lead do WhatsApp")

                    # TODO (multi-tenant): hoje assume que existe uma imobiliária só.
                    # Quando tiver mais de uma imobiliária usando o produto, troque
                    # essa busca por um mapeamento phone_number_id -> imobiliaria_id
                    # (salvo na tabela Imobiliaria quando ela conecta o número dela).
                    imobiliaria = db.query(models.Imobiliaria).first()
                    if imobiliaria is None:
                        continue

                    processar_mensagem_recebida(
                        db, imobiliaria.id, telefone, nome, texto, enviar_via_whatsapp=True
                    )
    finally:
        db.close()

    return Response(status_code=200)
