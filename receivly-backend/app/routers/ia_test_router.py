"""Status da configuração de IA (Gemini)."""

from fastapi import APIRouter, Depends

from app import auth, gemini_client, models
from app.config import settings

router = APIRouter(prefix="/ia", tags=["IA"])


@router.get("/status")
def status_ia(_usuario: models.Usuario = Depends(auth.obter_usuario_atual)):
    key = settings.gemini_api_key or ""
    return {
        "provedor": "gemini",
        "gemini": {
            "configurado": gemini_client.disponivel(),
            "chave_prefixo": f"{key[:8]}..." if len(key) >= 8 else None,
            "modelo_padrao": settings.gemini_model,
            "modelo_pesquisa": settings.gemini_model_pesquisa,
            "modelo_whatsapp": settings.gemini_model_whatsapp,
        },
        "groq": {"configurado": bool(settings.groq_api_key), "modelo": settings.groq_model},
    }
