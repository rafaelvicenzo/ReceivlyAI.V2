"""Anexo III — respostas aos quesitos (por avaliação)."""

from __future__ import annotations

import uuid
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads" / "quesitos_avaliacao"

EXTENSOES = {".pdf"}
TAMANHO_MAX_BYTES = 15 * 1024 * 1024


def url_quesitos(caminho_relativo: str | None) -> str | None:
    if not caminho_relativo:
        return None
    return f"/uploads/{caminho_relativo}"


def salvar_quesitos_pdf(avaliacao_id: int, nome_original: str, conteudo: bytes) -> tuple[str, str]:
    ext = Path(nome_original).suffix.lower()
    if ext not in EXTENSOES:
        raise ValueError("Envie um arquivo PDF das respostas aos quesitos.")
    if len(conteudo) > TAMANHO_MAX_BYTES:
        raise ValueError("Arquivo muito grande (máx. 15 MB).")

    pasta = UPLOADS_DIR / str(avaliacao_id)
    pasta.mkdir(parents=True, exist_ok=True)
    nome_salvo = f"quesitos_{uuid.uuid4().hex[:10]}{ext}"
    caminho = pasta / nome_salvo
    caminho.write_bytes(conteudo)

    return f"quesitos_avaliacao/{avaliacao_id}/{nome_salvo}", nome_original


def remover_quesitos_pdf(caminho_relativo: str | None) -> None:
    if not caminho_relativo:
        return
    caminho = BASE_DIR / "uploads" / caminho_relativo
    if caminho.exists():
        caminho.unlink()
