"""Upload e armazenamento de fotos de fachada — módulo de anúncios."""

from __future__ import annotations

import io
import uuid
from pathlib import Path

from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads" / "imoveis_anuncio"

LARGURA_MAXIMA = 1920
QUALIDADE_JPEG = 85
EXTENSOES = {".jpg", ".jpeg", ".png", ".webp"}


def salvar_foto_fachada(imobiliaria_id: int, imovel_id: int, nome_original: str, conteudo: bytes) -> tuple[str, str]:
    ext = Path(nome_original).suffix.lower()
    if ext not in EXTENSOES:
        raise ValueError("Envie uma imagem JPG, PNG ou WEBP.")

    imagem = Image.open(io.BytesIO(conteudo))
    imagem = imagem.convert("RGB")
    if imagem.width > LARGURA_MAXIMA:
        ratio = LARGURA_MAXIMA / imagem.width
        imagem = imagem.resize((LARGURA_MAXIMA, int(imagem.height * ratio)), Image.Resampling.LANCZOS)

    pasta = UPLOADS_DIR / str(imobiliaria_id) / str(imovel_id)
    pasta.mkdir(parents=True, exist_ok=True)
    nome_arquivo = f"fachada_{uuid.uuid4().hex[:12]}.jpg"
    caminho = pasta / nome_arquivo
    imagem.save(caminho, "JPEG", quality=QUALIDADE_JPEG, optimize=True)
    rel = f"imoveis_anuncio/{imobiliaria_id}/{imovel_id}/{nome_arquivo}"
    return rel, nome_original
