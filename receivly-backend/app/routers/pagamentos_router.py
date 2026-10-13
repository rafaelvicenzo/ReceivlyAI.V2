"""Cobrança Asaas e webhook de confirmação."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app import asaas_client, auth, models, plano, schemas, usage_limits
from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/pagamentos", tags=["Pagamentos"])


def _imobiliaria_usuario(usuario: models.Usuario, db: Session) -> models.Imobiliaria:
    imob = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == usuario.imobiliaria_id).first()
    if not imob:
        raise HTTPException(status_code=404, detail="Imobiliária não encontrada.")
    return imob


def _garantir_cliente_asaas(imob: models.Imobiliaria, usuario: models.Usuario, db: Session) -> None:
    if imob.asaas_customer_id:
        return
    cliente = asaas_client.criar_cliente(
        nome=imob.nome or usuario.nome,
        email=usuario.email,
    )
    imob.asaas_customer_id = cliente.get("id")
    db.commit()
    db.refresh(imob)


def _registrar_pagamento_pendente(
    db: Session,
    imobiliaria_id: int,
    payment_id: str,
    tipo: str,
    creditos_qtd: int = 0,
) -> None:
    db.add(
        models.PagamentoPendente(
            imobiliaria_id=imobiliaria_id,
            asaas_payment_id=payment_id,
            tipo=tipo,
            creditos_qtd=creditos_qtd,
        )
    )
    db.commit()


def _checkout_pix(
    db: Session,
    imob: models.Imobiliaria,
    usuario: models.Usuario,
    *,
    valor: float,
    descricao: str,
    tipo: str,
    creditos_qtd: int = 0,
) -> schemas.CheckoutResponse:
    if not asaas_client.disponivel():
        raise HTTPException(status_code=503, detail="Pagamentos não configurados. Defina ASAAS_API_KEY no servidor.")

    _garantir_cliente_asaas(imob, usuario, db)

    ref = f"receivly:{tipo}:{imob.id}"
    if tipo == "creditos":
        ref = f"receivly:creditos:{creditos_qtd}:{imob.id}"

    cobranca = asaas_client.criar_cobranca_pix(
        customer_id=imob.asaas_customer_id,
        valor=valor,
        descricao=descricao,
        external_reference=ref,
    )
    payment_id = cobranca.get("id") or ""
    if payment_id:
        _registrar_pagamento_pendente(db, imob.id, payment_id, tipo, creditos_qtd)

    pix = asaas_client.obter_pix_qrcode(payment_id) if payment_id else {}

    return schemas.CheckoutResponse(
        payment_id=payment_id,
        invoice_url=cobranca.get("invoiceUrl"),
        pix_copia_cola=pix.get("payload"),
        pix_qr_base64=pix.get("encodedImage"),
        valor=valor,
        tipo=tipo,
        creditos_qtd=creditos_qtd,
    )


@router.get("/plano", response_model=schemas.PlanoStatusResponse)
def status_plano(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    imob = _imobiliaria_usuario(usuario_atual, db)
    usadas = usage_limits.count_monthly_appraisals(db, imob.id)
    fotos_usadas = usage_limits.count_monthly_foto_tours(db, imob.id)
    data = plano.snapshot_plano(
        imob,
        avaliacoes_usadas_mes=usadas,
        foto_tours_usadas_mes=fotos_usadas,
        usuario=usuario_atual,
    )
    data["asaas_configurado"] = asaas_client.disponivel()
    return schemas.PlanoStatusResponse(**data)


@router.post("/checkout", response_model=schemas.CheckoutResponse)
def criar_checkout_plano(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    imob = _imobiliaria_usuario(usuario_atual, db)
    return _checkout_pix(
        db,
        imob,
        usuario_atual,
        valor=settings.plano_valor_reais,
        descricao=f"Receivly Pro — plano mensal ({imob.nome})",
        tipo="plano",
    )


@router.post("/checkout-creditos", response_model=schemas.CheckoutResponse)
def criar_checkout_creditos(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    imob = _imobiliaria_usuario(usuario_atual, db)
    plano.assert_plano_ativo(imob, usuario_atual)
    qtd = settings.credito_pacote_qtd
    valor = settings.credito_pacote_valor
    return _checkout_pix(
        db,
        imob,
        usuario_atual,
        valor=valor,
        descricao=f"Receivly — {qtd} avaliações extras ({imob.nome})",
        tipo="creditos",
        creditos_qtd=qtd,
    )


@router.post("/webhook")
async def webhook_asaas(request: Request, db: Session = Depends(get_db)):
    if settings.asaas_webhook_token:
        token_recebido = request.headers.get("asaas-access-token") or request.headers.get("x-asaas-token")
        if token_recebido != settings.asaas_webhook_token:
            raise HTTPException(status_code=401, detail="Webhook não autorizado.")

    payload = await request.json()
    evento = payload.get("event") or ""
    pagamento = payload.get("payment") or {}

    if evento not in ("PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"):
        return {"ok": True, "ignorado": evento}

    payment_id = pagamento.get("id")
    if not payment_id:
        return {"ok": True, "sem_pagamento": True}

    pendente = (
        db.query(models.PagamentoPendente)
        .filter(models.PagamentoPendente.asaas_payment_id == payment_id)
        .first()
    )

    if pendente:
        imob = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == pendente.imobiliaria_id).first()
        if imob:
            if pendente.tipo == "creditos":
                imob.creditos_avaliacao = (imob.creditos_avaliacao or 0) + (pendente.creditos_qtd or 0)
            else:
                plano.ativar_plano(imob)
            db.delete(pendente)
            db.commit()
            return {"ok": True, "tipo": pendente.tipo, "imobiliaria_id": imob.id}

    customer_id = pagamento.get("customer")
    if not customer_id:
        return {"ok": True, "sem_cliente": True}

    imob = db.query(models.Imobiliaria).filter(models.Imobiliaria.asaas_customer_id == customer_id).first()
    if not imob:
        return {"ok": True, "imobiliaria_nao_encontrada": True}

    ext = (pagamento.get("externalReference") or "").lower()
    if "creditos" in ext:
        imob.creditos_avaliacao = (imob.creditos_avaliacao or 0) + settings.credito_pacote_qtd
    else:
        plano.ativar_plano(imob)
    db.commit()
    return {"ok": True, "fallback": True, "imobiliaria_id": imob.id}
