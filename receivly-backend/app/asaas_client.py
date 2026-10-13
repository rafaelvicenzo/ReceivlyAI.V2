"""Cliente HTTP para a API Asaas (PIX / cobranças)."""

from __future__ import annotations

from datetime import date, timedelta

import httpx

from app.config import settings


class AsaasError(Exception):
    pass


def _base_url() -> str:
    if settings.asaas_sandbox:
        return "https://sandbox.asaas.com/api/v3"
    return "https://api.asaas.com/api/v3"


def _headers() -> dict[str, str]:
    if not settings.asaas_api_key:
        raise AsaasError("ASAAS_API_KEY não configurada no .env")
    return {
        "access_token": settings.asaas_api_key,
        "Content-Type": "application/json",
    }


def disponivel() -> bool:
    return bool(settings.asaas_api_key)


def criar_cliente(nome: str, email: str) -> dict:
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            f"{_base_url()}/customers",
            headers=_headers(),
            json={"name": nome, "email": email},
        )
        if resp.status_code >= 400:
            raise AsaasError(resp.text or "Erro ao criar cliente Asaas")
        return resp.json()


def criar_cobranca_pix(
    customer_id: str,
    valor: float,
    descricao: str,
    *,
    external_reference: str | None = None,
) -> dict:
    due = (date.today() + timedelta(days=1)).isoformat()
    payload = {
        "customer": customer_id,
        "billingType": "PIX",
        "value": round(valor, 2),
        "dueDate": due,
        "description": descricao,
    }
    if external_reference:
        payload["externalReference"] = external_reference
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            f"{_base_url()}/payments",
            headers=_headers(),
            json=payload,
        )
        if resp.status_code >= 400:
            raise AsaasError(resp.text or "Erro ao criar cobrança Asaas")
        return resp.json()


def obter_pix_qrcode(payment_id: str) -> dict:
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(
            f"{_base_url()}/payments/{payment_id}/pixQrCode",
            headers=_headers(),
        )
        if resp.status_code >= 400:
            raise AsaasError(resp.text or "Erro ao obter QR Code PIX")
        return resp.json()
