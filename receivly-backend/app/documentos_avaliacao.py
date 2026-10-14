"""Anexos de documentos do imóvel (matrícula, contrato, RIC, etc.)."""

from __future__ import annotations

import uuid
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads" / "documentos_avaliacao"

EXTENSOES = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"}
TAMANHO_MAX_BYTES = 15 * 1024 * 1024


def salvar_documento(avaliacao_id: int, nome_original: str, conteudo: bytes) -> dict:
    ext = Path(nome_original).suffix.lower()
    if ext not in EXTENSOES:
        raise ValueError(f"Formato não suportado. Use: {', '.join(sorted(EXTENSOES))}")
    if len(conteudo) > TAMANHO_MAX_BYTES:
        raise ValueError("Arquivo muito grande (máx. 15 MB).")

    pasta = UPLOADS_DIR / str(avaliacao_id)
    pasta.mkdir(parents=True, exist_ok=True)
    nome_salvo = f"{uuid.uuid4().hex}{ext}"
    caminho = pasta / nome_salvo
    caminho.write_bytes(conteudo)

    return {
        "nome_arquivo": nome_original,
        "tamanho_bytes": len(conteudo),
        "caminho_relativo": f"documentos_avaliacao/{avaliacao_id}/{nome_salvo}",
    }


def remover_documento(caminho_relativo: str) -> None:
    caminho = BASE_DIR / "uploads" / caminho_relativo
    if caminho.exists():
        caminho.unlink()
