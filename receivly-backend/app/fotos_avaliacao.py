"""
Compressão/otimização real das fotos da avaliação, feita no servidor com Pillow.
"""

import io
import uuid
from pathlib import Path

from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads" / "avaliacoes"

LARGURA_MAXIMA = 1600
QUALIDADE_JPEG = 72


def salvar_foto_otimizada(avaliacao_id: int, nome_original: str, conteudo: bytes) -> dict:
    pasta = UPLOADS_DIR / str(avaliacao_id)
    pasta.mkdir(parents=True, exist_ok=True)

    imagem = Image.open(io.BytesIO(conteudo))
    imagem = imagem.convert("RGB")

    if imagem.width > LARGURA_MAXIMA:
        proporcao = LARGURA_MAXIMA / imagem.width
        nova_altura = int(imagem.height * proporcao)
        imagem = imagem.resize((LARGURA_MAXIMA, nova_altura), Image.LANCZOS)

    nome_arquivo = f"{uuid.uuid4().hex}.jpg"
    caminho_completo = pasta / nome_arquivo
    imagem.save(caminho_completo, "JPEG", quality=QUALIDADE_JPEG, optimize=True)

    return {
        "nome_arquivo": nome_original,
        "tamanho_original": len(conteudo),
        "tamanho_otimizado": caminho_completo.stat().st_size,
        "caminho_relativo": f"avaliacoes/{avaliacao_id}/{nome_arquivo}",
    }


def remover_foto(caminho_relativo: str):
    caminho_completo = BASE_DIR / "uploads" / caminho_relativo
    if caminho_completo.exists():
        caminho_completo.unlink()
