"""Estilização (staging virtual) de fotos de imóveis com Gemini.

Cada estilo agora controla a MOBÍLIA do ambiente:
- Organizado: mobília totalmente organizada (mantém a existente ou adiciona).
- Limpo:      remove toda a mobília e objetos, deixando o ambiente vazio.
- Charmoso:   adiciona mobília charmosa e aconchegante.
- Luxuoso:    adiciona mobília de alto padrão, fotorrealista.

Requer: pip install google-genai pillow
E settings.gemini_model_foto deve ser um modelo com SAÍDA de imagem
(ex.: gemini-2.5-flash-image ou um mais recente da linha "image").
"""

from __future__ import annotations

import io
import logging

from PIL import Image, ImageOps

from app.config import settings

logger = logging.getLogger(__name__)

# Descrições curtas (úteis para mostrar como dica na interface).
ESTILOS = {
    "Organizado": "Mobília totalmente organizada e harmônica com o ambiente.",
    "Limpo": "Remove toda a mobília e deixa o ambiente vazio.",
    "Charmoso": "Adiciona mobília charmosa e deixa o ambiente aconchegante.",
    "Luxuoso": "Adiciona mobília de alto padrão, com aparência realista.",
}


class EstilizacaoIndisponivel(Exception):
    """A IA não conseguiu gerar a imagem (chave ausente, erro da API ou sem imagem na resposta)."""


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_REGRAS_COMUNS = """
You are a professional real-estate virtual staging tool. Edit the attached photo of a property.

STRICT RULES (apply to every edit):
- Keep the architecture EXACTLY as it is: walls, ceiling, floor material and color, windows, doors, \
the view outside, built-in fixtures, light switches, outlets, ceiling lights, camera angle, perspective and framing.
- Do not resize, crop, rotate or change the aspect ratio of the scene.
- Keep the original lighting direction, color temperature and shadows. Any new object must receive \
light and cast shadows consistent with the existing light (e.g. window light, reflections on a polished floor).
- Never block doors, windows or walkways. Respect real-world scale and proportions of furniture.
- The result must look like a real photograph taken by a professional real-estate photographer: \
photorealistic, sharp, natural, no CGI or illustration look.
- Do not add text, logos, watermarks, people, pets or any artifacts.
- Return only the edited image.
""".strip()

_PROMPTS = {
    "Organizado": """
First identify the room type (living room, bedroom, kitchen, etc.).
Task: ORGANIZED furniture layout.
- If the room already has furniture: keep the SAME pieces, but arrange everything perfectly — \
aligned, symmetrical where it makes sense, proportionally placed, good circulation space, \
no clutter, no loose items, cables hidden, surfaces clear, rugs straight, cushions and linens neat.
- If the room is empty: add a simple, functional and neutral set of furniture appropriate for this room type, \
placed in a clean, balanced, well-organized layout that makes the best use of the space.
- Neutral and cohesive colors. The room should feel tidy, spacious and inviting.
""".strip(),
    "Limpo": """
Task: REMOVE ALL FURNITURE AND OBJECTS.
- Remove every piece of furniture, rugs, curtains/loose drapes, lamps, plants, decorations, \
appliances that are not built in, boxes, personal items, trash and clutter.
- Keep only what is part of the building itself (walls, floor, ceiling, windows, doors, \
built-in cabinetry, fixed light fixtures, fixed blinds, air conditioners).
- Realistically reconstruct the floor, walls and baseboards that were hidden behind the removed items, \
continuing patterns, textures, reflections and shadows naturally.
- The final result is a completely empty, clean, bright apartment with nothing inside it.
""".strip(),
    "Charmoso": """
First identify the room type (living room, bedroom, kitchen, etc.).
Task: CHARMING, COZY STAGING.
- Furnish the room (replace or complement any existing furniture) with charming, warm, welcoming furniture \
appropriate to the room type: e.g. a comfortable sofa with cushions and a throw, a soft rug, \
a wooden coffee table, a plant, tasteful framed art, a floor or table lamp, light curtains \
(or a bed with layered linens, nightstands and lamps for bedrooms).
- Style: cozy and inviting, warm natural materials (wood, linen, cotton), soft earthy or pastel palette, \
subtle decorative details. Not excessive — keep it realistic and uncluttered.
- Keep the room feeling bright and appealing for a real-estate listing.
""".strip(),
    "Luxuoso": """
First identify the room type (living room, bedroom, kitchen, etc.).
Task: LUXURY HIGH-END STAGING, as realistic as possible.
- Furnish the room (replace any existing furniture) with luxury, designer-quality furniture \
appropriate to the room type: e.g. a large premium sofa in velvet/leather/bouclé, \
marble or brass coffee table, statement lighting, a high-quality large rug, \
elegant sideboard, sophisticated art, fresh flowers, premium textiles, \
(or a king-size bed with a tall upholstered headboard, premium bedding, designer nightstands and lamps).
- Palette: refined and sophisticated (neutrals with rich accents such as gold/brass, deep green, navy, walnut).
- Materials must look real: correct fabric textures, wood grain, marble veining, metal reflections, \
and realistic reflections on the polished floor and contact shadows under every piece.
- Furniture must be sized correctly for the room and look like a real, professionally staged luxury apartment, \
never exaggerated or fake.
""".strip(),
}


ESTILO_PERSONALIZADO = "Personalizado"
PROMPT_PERSONALIZADO_MAX_CHARS = 2000


def _montar_prompt(estilo: str) -> str:
    return f"{_REGRAS_COMUNS}\n\n{_PROMPTS[estilo]}"


def _montar_prompt_personalizado(instrucoes: str) -> str:
    texto = (instrucoes or "").strip()
    if not texto:
        raise ValueError("Descreva o que deseja na foto personalizada.")
    if len(texto) > PROMPT_PERSONALIZADO_MAX_CHARS:
        raise ValueError(f"Prompt muito longo (máx. {PROMPT_PERSONALIZADO_MAX_CHARS} caracteres).")
    return (
        f"{_REGRAS_COMUNS}\n\n"
        "Additional instructions from the real-estate agent (follow carefully, in any language):\n"
        f"{texto}"
    )


# ---------------------------------------------------------------------------
# Utilidades de imagem
# ---------------------------------------------------------------------------

_LADO_MAX = 2048


def _preparar_entrada(conteudo: bytes) -> tuple[bytes, Image.Image]:
    """Normaliza a imagem (orientação EXIF, RGB, tamanho) e devolve JPEG + objeto PIL."""
    img = Image.open(io.BytesIO(conteudo))
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((_LADO_MAX, _LADO_MAX), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return buf.getvalue(), img


def _para_jpeg(dados: bytes) -> bytes:
    """Converte o que o modelo devolveu (png/webp/jpeg) para JPEG."""
    img = Image.open(io.BytesIO(dados)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------

def estilizar_foto(
    conteudo: bytes,
    estilo: str,
    *,
    prompt_personalizado: str | None = None,
) -> tuple[bytes, bool, str, str | None]:
    """Retorna (jpeg_bytes, usou_gemini, estilo_efetivo, prompt_usado).

    Levanta EstilizacaoIndisponivel se a IA falhar.
    """
    prompt_usado: str | None = None
    if prompt_personalizado and prompt_personalizado.strip():
        prompt = _montar_prompt_personalizado(prompt_personalizado)
        estilo_efetivo = ESTILO_PERSONALIZADO
        prompt_usado = prompt_personalizado.strip()
    elif estilo in ESTILOS:
        prompt = _montar_prompt(estilo)
        estilo_efetivo = estilo
    else:
        raise ValueError(f"Estilo inválido. Use: {', '.join(ESTILOS)} ou envie um prompt personalizado.")

    if not settings.gemini_api_key:
        raise EstilizacaoIndisponivel("GEMINI_API_KEY não configurada.")

    jpeg_entrada, _ = _preparar_entrada(conteudo)
    return _estilizar_gemini(jpeg_entrada, prompt), True, estilo_efetivo, prompt_usado


def _extrair_imagem(resp) -> bytes | None:
    candidatos = resp.candidates or []
    partes = candidatos[0].content.parts if candidatos and candidatos[0].content else []
    for part in partes or []:
        inline = getattr(part, "inline_data", None)
        if inline and inline.data:
            return _para_jpeg(inline.data)
    texto = " ".join(p.text for p in (partes or []) if getattr(p, "text", None))
    logger.warning("Photo Tours: modelo respondeu sem imagem: %s", texto[:200] or "(vazia)")
    return None


def _estilizar_gemini(jpeg_entrada: bytes, prompt: str) -> bytes:
    import time

    from google import genai
    from google.genai import errors, types

    client = genai.Client(api_key=settings.gemini_api_key)

    # Modelo principal + (opcional) um modelo reserva em settings.gemini_model_foto_fallback
    modelos = [settings.gemini_model_foto]
    reserva = getattr(settings, "gemini_model_foto_fallback", None)
    if reserva and reserva not in modelos:
        modelos.append(reserva)

    esperas = [0, 3, 8, 15]  # segundos antes de cada tentativa (4 tentativas por modelo)
    ultimo_erro: Exception | None = None

    for modelo in modelos:
        for tentativa, espera in enumerate(esperas, start=1):
            if espera:
                time.sleep(espera)
            try:
                resp = client.models.generate_content(
                    model=modelo,
                    contents=[
                        prompt,
                        types.Part.from_bytes(data=jpeg_entrada, mime_type="image/jpeg"),
                    ],
                    config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
                )
                imagem = _extrair_imagem(resp)
                if imagem:
                    return imagem
                ultimo_erro = EstilizacaoIndisponivel("O modelo não retornou imagem.")
            except errors.ServerError as exc:  # 5xx (503 alta demanda etc.): vale tentar de novo
                ultimo_erro = exc
                logger.warning("Photo Tours: %s indisponível (tentativa %s): %s", modelo, tentativa, exc)
            except errors.ClientError as exc:
                if getattr(exc, "code", None) == 429:  # limite de taxa/cota: também tenta de novo
                    ultimo_erro = exc
                    logger.warning("Photo Tours: 429 em %s (tentativa %s)", modelo, tentativa)
                    continue
                # 400/401/403/404: erro de configuração, repetir não adianta
                logger.exception("Photo Tours: erro de configuração em %s", modelo)
                raise EstilizacaoIndisponivel(f"Erro na API do Gemini: {exc}") from exc

    raise EstilizacaoIndisponivel(
        "O serviço de IA está com alta demanda no momento. Tente novamente em instantes."
    ) from ultimo_erro