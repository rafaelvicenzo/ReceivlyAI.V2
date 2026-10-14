"""Logo e template de laudo por imobiliária."""

import uuid
from pathlib import Path

from app import models, schemas

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads" / "branding"

EXTENSOES_TEMPLATE = {".pdf", ".doc", ".docx"}
EXTENSOES_LOGO = {".png", ".jpg", ".jpeg", ".webp", ".svg"}


def _url_relativa(caminho: str | None) -> str | None:
    if not caminho:
        return None
    return f"/uploads/{caminho}"


def branding_response(imobiliaria: models.Imobiliaria) -> schemas.BrandingResponse:
    return schemas.BrandingResponse(
        logo_laudo_url=_url_relativa(imobiliaria.marca_dagua_caminho),
        template_laudo_url=_url_relativa(imobiliaria.template_laudo_caminho),
        template_laudo_nome=imobiliaria.template_laudo_nome,
        exibir_logo_laudo=bool(imobiliaria.usar_marca_dagua and imobiliaria.marca_dagua_caminho),
        ocultar_cabecalho_laudo=bool(imobiliaria.ocultar_cabecalho_laudo),
        cor_destaque_laudo=(imobiliaria.cor_destaque_laudo or "#F59E0B").upper(),
    )


def salvar_logo_laudo(imobiliaria_id: int, nome_original: str, conteudo: bytes) -> str:
    ext = Path(nome_original).suffix.lower()
    if ext not in EXTENSOES_LOGO:
        raise ValueError("Envie uma imagem PNG, JPG, WEBP ou SVG para a logo.")

    pasta = UPLOADS_DIR / str(imobiliaria_id)
    pasta.mkdir(parents=True, exist_ok=True)

    nome_arquivo = f"logo_laudo{ext}"
    caminho = pasta / nome_arquivo
    caminho.write_bytes(conteudo)

    return f"branding/{imobiliaria_id}/{nome_arquivo}"


def salvar_template_laudo(imobiliaria_id: int, nome_original: str, conteudo: bytes) -> tuple[str, str]:
    ext = Path(nome_original).suffix.lower()
    if ext not in EXTENSOES_TEMPLATE:
        raise ValueError("Envie um arquivo PDF, DOC ou DOCX como template do laudo.")

    pasta = UPLOADS_DIR / str(imobiliaria_id)
    pasta.mkdir(parents=True, exist_ok=True)

    nome_salvo = f"template_{uuid.uuid4().hex[:8]}{ext}"
    caminho = pasta / nome_salvo
    caminho.write_bytes(conteudo)

    return f"branding/{imobiliaria_id}/{nome_salvo}", nome_original
