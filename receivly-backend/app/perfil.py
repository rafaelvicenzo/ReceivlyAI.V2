"""Perfis de acesso: admin (produto) vs cliente (imobiliária)."""

from __future__ import annotations

from app import models
from app.config import settings

PERFIL_ADMIN = "admin"
PERFIL_CLIENTE = "cliente"


def emails_admin_configurados() -> set[str]:
    raw = settings.admin_emails or ""
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def eh_admin(usuario: models.Usuario | None) -> bool:
    if not usuario:
        return False
    if (usuario.perfil or PERFIL_CLIENTE).lower() == PERFIL_ADMIN:
        return True
    return usuario.email.lower() in emails_admin_configurados()


def perfil_efetivo(usuario: models.Usuario) -> str:
    return PERFIL_ADMIN if eh_admin(usuario) else (usuario.perfil or PERFIL_CLIENTE)


def sincronizar_perfil_admin(usuario: models.Usuario, db) -> None:
    """Promove para admin se o e-mail estiver em ADMIN_EMAILS no .env."""
    if usuario.email.lower() in emails_admin_configurados():
        if (usuario.perfil or PERFIL_CLIENTE) != PERFIL_ADMIN:
            usuario.perfil = PERFIL_ADMIN
            db.commit()
            db.refresh(usuario)
