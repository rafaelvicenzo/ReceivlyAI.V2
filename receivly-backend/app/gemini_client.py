"""
Cliente Gemini via REST API (google-genai / v1beta).

- Chat / JSON: generateContent
- Busca web (comparáveis): interactions + tool google_search
  (modelos 2.x usavam google_search_retrieval — obsoleto para contas novas)

Modelos recomendados para contas novas: gemini-3.5-flash ou gemini-3.8-flash.
gemini-2.0-flash / 2.5-flash retornam 404 para usuários novos.
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass

import httpx

from app.config import settings

_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


@dataclass
class GeminiResposta:
    texto: str
    modelo: str
    duracao_ms: int


def disponivel() -> bool:
    return bool(settings.gemini_api_key)


def extrair_json(texto: str) -> dict:
    texto = (texto or "").strip()
    texto = re.sub(r"^```(json)?", "", texto).strip()
    texto = re.sub(r"```$", "", texto).strip()
    match = re.search(r"\{.*\}", texto, re.DOTALL)
    if match:
        texto = match.group(0)
    return json.loads(texto)


def _headers() -> dict[str, str]:
    return {"x-goog-api-key": settings.gemini_api_key, "Content-Type": "application/json"}


def _extrair_erro_api(resp: httpx.Response) -> str:
    try:
        data = resp.json()
        return data.get("error", {}).get("message") or resp.text[:500]
    except Exception:
        return resp.text[:500]


def _mensagem_429(usar_busca: bool) -> str:
    if usar_busca:
        return (
            "A busca na web pela API Gemini precisa de billing ativo no Google AI Studio "
            "(https://aistudio.google.com). O chat em gemini.google.com é gratuito e separado da API — "
            "por isso funciona lá e aqui retorna erro. Ative billing no projeto da sua chave API."
        )
    return (
        "Cota do Gemini esgotada. Aguarde alguns minutos ou veja https://ai.dev/rate-limit"
    )


def _post_com_retry(url: str, *, json_body: dict, usar_busca: bool, timeout: float = 180) -> httpx.Response:
    ultimo: httpx.Response | None = None
    for tentativa in range(3):
        resp = httpx.post(url, headers=_headers(), json=json_body, timeout=timeout)
        ultimo = resp
        if resp.status_code == 429:
            if tentativa < 2:
                time.sleep(10 * (tentativa + 1))
                continue
            raise RuntimeError(_mensagem_429(usar_busca))
        if resp.status_code >= 400:
            raise RuntimeError(f"Gemini API ({resp.status_code}): {_extrair_erro_api(resp)}")
        return resp
    raise RuntimeError(_mensagem_429(usar_busca) if ultimo and ultimo.status_code == 429 else "Erro Gemini")


def _texto_de_generate_content(data: dict) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini retornou resposta vazia")
    parts = candidates[0].get("content", {}).get("parts") or []
    texto = "".join(p.get("text", "") for p in parts if isinstance(p, dict))
    if not texto.strip():
        raise RuntimeError("Gemini retornou resposta vazia")
    return texto


def _texto_de_interaction(data: dict) -> str:
    if data.get("output_text"):
        return str(data["output_text"])

    for step in data.get("steps") or []:
        if step.get("type") != "model_output":
            continue
        for block in step.get("content") or []:
            if block.get("type") == "text" and block.get("text"):
                return str(block["text"])

    # fallback: interaction aninhado
    interaction = data.get("interaction") or {}
    if interaction.get("output_text"):
        return str(interaction["output_text"])

    raise RuntimeError("Gemini (busca web) não retornou texto — tente novamente em instantes")


def _generate_content(
    model_name: str,
    system: str,
    user: str,
    *,
    json_mode: bool,
) -> str:
    body: dict = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
    }
    if json_mode:
        body["generationConfig"] = {"responseMimeType": "application/json"}

    url = f"{_API_BASE}/models/{model_name}:generateContent"
    resp = _post_com_retry(url, json_body=body, usar_busca=False, timeout=120)
    return _texto_de_generate_content(resp.json())


def _generate_content_com_busca(model_name: str, system: str, user: str) -> str:
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "tools": [{"google_search": {}}],
    }
    url = f"{_API_BASE}/models/{model_name}:generateContent"
    resp = _post_com_retry(url, json_body=body, usar_busca=True, timeout=180)
    return _texto_de_generate_content(resp.json())


def _interactions_com_busca(model_name: str, system: str, user: str) -> str:
    prompt = f"{system.strip()}\n\n---\n\n{user.strip()}"
    body = {
        "model": model_name,
        "input": prompt,
        "tools": [{"type": "google_search"}],
    }
    url = f"{_API_BASE}/interactions"
    resp = _post_com_retry(url, json_body=body, usar_busca=True, timeout=180)
    return _texto_de_interaction(resp.json())


def gerar_texto_com_imagem(
    *,
    system: str,
    user: str,
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    json_mode: bool = True,
    model: str | None = None,
) -> GeminiResposta:
    import base64

    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY não configurada")

    model_name = model or settings.gemini_model
    inicio = time.perf_counter()
    body: dict = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{
            "role": "user",
            "parts": [
                {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode("ascii")}},
                {"text": user},
            ],
        }],
    }
    if json_mode:
        body["generationConfig"] = {"responseMimeType": "application/json"}

    url = f"{_API_BASE}/models/{model_name}:generateContent"
    resp = _post_com_retry(url, json_body=body, usar_busca=False, timeout=120)
    texto = _texto_de_generate_content(resp.json())
    duracao_ms = int((time.perf_counter() - inicio) * 1000)
    return GeminiResposta(texto=texto, modelo=model_name, duracao_ms=duracao_ms)


def gerar_texto(
    *,
    system: str,
    user: str,
    usar_busca: bool = False,
    json_mode: bool = False,
    model: str | None = None,
    temperature: float = 0.4,
) -> GeminiResposta:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY não configurada")

    model_name = model or settings.gemini_model
    inicio = time.perf_counter()

    if usar_busca:
        user_com_json = user + "\n\nIMPORTANTE: responda SOMENTE com JSON válido, sem markdown."
        try:
            texto = _generate_content_com_busca(model_name, system, user_com_json)
        except RuntimeError as exc:
            # Interactions API como fallback (mesma cota de grounding)
            if "429" not in str(exc) and "quota" not in str(exc).lower() and "busca na web" not in str(exc).lower():
                texto = _interactions_com_busca(model_name, system, user_com_json)
            else:
                raise
    else:
        texto = _generate_content(model_name, system, user, json_mode=json_mode)

    duracao_ms = int((time.perf_counter() - inicio) * 1000)
    return GeminiResposta(texto=texto, modelo=model_name, duracao_ms=duracao_ms)
