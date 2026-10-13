"""Status e liberação de plano por imobiliária."""

from __future__ import annotations

import datetime

from fastapi import HTTPException

from app import models
from app.config import settings
from app.perfil import eh_admin


def registrar_conta_nova(imobiliaria: models.Imobiliaria) -> None:
    imobiliaria.plano_status = "inativo"
    imobiliaria.plano_valido_ate = None
    imobiliaria.creditos_avaliacao = 0


def ativar_plano(imobiliaria: models.Imobiliaria) -> None:
    imobiliaria.plano_status = "ativo"
    imobiliaria.plano_valido_ate = datetime.datetime.utcnow() + datetime.timedelta(days=settings.plano_dias)


def plano_esta_ativo(
    imobiliaria: models.Imobiliaria,
    usuario: models.Usuario | None = None,
) -> bool:
    if eh_admin(usuario):
        return True
    if imobiliaria.plano_status != "ativo":
        return False
    if not imobiliaria.plano_valido_ate:
        return True
    return imobiliaria.plano_valido_ate >= datetime.datetime.utcnow()


def snapshot_plano(
    imobiliaria: models.Imobiliaria,
    *,
    avaliacoes_usadas_mes: int = 0,
    foto_tours_usadas_mes: int = 0,
    usuario: models.Usuario | None = None,
) -> dict:
    admin = eh_admin(usuario)
    limite = settings.fair_use_max_appraisals_per_month
    limite_fotos = settings.fair_use_max_foto_tours_per_month
    creditos = imobiliaria.creditos_avaliacao or 0
    ativo = plano_esta_ativo(imobiliaria, usuario)

    if admin:
        return {
            "status": "admin",
            "ativo": True,
            "eh_admin": True,
            "valido_ate": None,
            "valor_mensal": settings.plano_valor_reais,
            "avaliacoes_usadas_mes": avaliacoes_usadas_mes,
            "avaliacoes_limite_mes": limite,
            "foto_tours_usadas_mes": foto_tours_usadas_mes,
            "foto_tours_limite_mes": limite_fotos,
            "creditos_avaliacao": creditos,
            "credito_pacote_qtd": settings.credito_pacote_qtd,
            "credito_pacote_valor": settings.credito_pacote_valor,
            "pode_criar_avaliacao": True,
            "pode_usar_foto_tours": True,
        }

    return {
        "status": imobiliaria.plano_status or "inativo",
        "ativo": ativo,
        "eh_admin": False,
        "valido_ate": imobiliaria.plano_valido_ate.isoformat() if imobiliaria.plano_valido_ate else None,
        "valor_mensal": settings.plano_valor_reais,
        "avaliacoes_usadas_mes": avaliacoes_usadas_mes,
        "avaliacoes_limite_mes": limite,
        "foto_tours_usadas_mes": foto_tours_usadas_mes,
        "foto_tours_limite_mes": limite_fotos,
        "creditos_avaliacao": creditos,
        "credito_pacote_qtd": settings.credito_pacote_qtd,
        "credito_pacote_valor": settings.credito_pacote_valor,
        "pode_criar_avaliacao": ativo and (avaliacoes_usadas_mes < limite or creditos > 0),
        "pode_usar_foto_tours": ativo and foto_tours_usadas_mes < limite_fotos,
    }


def assert_plano_ativo(
    imobiliaria: models.Imobiliaria,
    usuario: models.Usuario | None = None,
) -> None:
    if plano_esta_ativo(imobiliaria, usuario):
        return
    raise HTTPException(
        status_code=402,
        detail="Plano inativo. Assine em Assinatura (menu lateral) para usar o Receivly.",
    )
