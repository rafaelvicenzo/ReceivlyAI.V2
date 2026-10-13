"""Script rápido para testar modelos Gemini (rodar: python scripts/test_gemini_api.py)."""
import httpx
from app.config import settings

key = settings.gemini_api_key
model = "gemini-3.5-flash"

r = httpx.post(
    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    params={"key": key},
    json={
        "contents": [{"role": "user", "parts": [{"text": "Responda apenas: OK"}]}],
    },
    timeout=60,
)
print("chat", r.status_code, r.text[:150])
