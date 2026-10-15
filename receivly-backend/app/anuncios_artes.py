"""Fallback local: foto em tela cheia + gradiente suave + texto centralizado."""

from __future__ import annotations

import textwrap
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads" / "anuncios"

FORMATOS = {
    "feed": (1080, 1080),
    "stories": (1080, 1920),
}


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = ["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf"] if bold else ["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"]
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _paste_cover(img: Image.Image, foto: Image.Image, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    tw, th = x1 - x0, y1 - y0
    fw, fh = foto.size
    scale = max(tw / fw, th / fh)
    nw, nh = int(fw * scale), int(fh * scale)
    foto = foto.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    img.paste(foto.crop((left, top, left + tw, top + th)), (x0, y0))


def _gradiente_inferior(img: Image.Image, inicio_ratio: float, intensidade: float = 0.88) -> Image.Image:
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    y0 = int(h * inicio_ratio)
    span = max(h - y0, 1)
    for y in range(y0, h):
        t = (y - y0) / span
        alpha = int(255 * intensidade * (t ** 1.4))
        draw.line([(0, y), (w, y)], fill=(0, 0, 0, alpha))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def _texto_centralizado(draw, y, texto, font, fill, largura, max_lines=2):
    lines = textwrap.wrap(texto or "", width=28 if largura <= 1080 else 32)[:max_lines]
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text(((largura - tw) // 2, y), line, font=font, fill=fill)
        y += th + 8
    return y


def renderizar_arte(
    *,
    foto_path: Path,
    formato: str,
    headline: str,
    subtitulo: str,
    preco: str,
    localizacao: str,
    cta: str,
    mensagem: str = "",
    cor_destaque: str,
    contato: str = "",
    endereco: str = "",
    finalidade: str = "venda",
    tipo_imovel: str = "Imóvel",
    area_m2: float | None = None,
    quartos: int | None = None,
    banheiros: int | None = None,
    vagas: int | None = None,
    logo_path: Path | None = None,
    exibir_logo: bool = False,
    exibir_nome_imobiliaria: bool = False,
    nome_imobiliaria: str = "",
) -> tuple[Path, int, int]:
    if formato not in FORMATOS:
        raise ValueError(f"Formato inválido: {formato}")

    largura, altura = FORMATOS[formato]
    grad_start = 0.58 if formato == "feed" else 0.52

    img = Image.new("RGB", (largura, altura), (18, 18, 18))
    if foto_path.exists():
        foto = Image.open(foto_path).convert("RGB")
        _paste_cover(img, foto, (0, 0, largura, altura))
        img = _gradiente_inferior(img, grad_start, 0.82)
    draw = ImageDraw.Draw(img)

    if exibir_logo and logo_path and logo_path.exists():
        try:
            logo = Image.open(logo_path).convert("RGBA")
            ratio = min(64 / logo.width, 64 / logo.height, 1.0)
            logo = logo.resize((int(logo.width * ratio), int(logo.height * ratio)), Image.Resampling.LANCZOS)
            img.paste(logo, (24, 24), logo)
        except OSError:
            pass

    hl = (headline or mensagem or f"{tipo_imovel} em destaque").strip()
    specs_parts = []
    if area_m2:
        n = int(area_m2) if float(area_m2) == int(area_m2) else area_m2
        specs_parts.append(f"{n} m²")
    if quartos:
        specs_parts.append(f"{quartos} quartos")
    if banheiros:
        specs_parts.append(f"{banheiros} banh.")
    elif vagas:
        specs_parts.append(f"{vagas} vagas")
    specs_line = "  ·  ".join(specs_parts)
    addr = endereco or localizacao

    if formato == "feed":
        y = int(altura * 0.62)
        hl_font = _font(36, bold=True)
        price_font = _font(30, bold=True)
        sub_font = _font(16)
        cta_font = _font(15, bold=True)
    else:
        y = int(altura * 0.68)
        hl_font = _font(42, bold=True)
        price_font = _font(36, bold=True)
        sub_font = _font(18)
        cta_font = _font(17, bold=True)

    y = _texto_centralizado(draw, y, hl.upper(), hl_font, (255, 255, 255), largura, 3)

    pb = draw.textbbox((0, 0), preco or "Consulte", font=price_font)
    pw = pb[2] - pb[0]
    draw.text(((largura - pw) // 2, y + 4), preco or "Consulte", font=price_font, fill=(255, 255, 255))
    y += (pb[3] - pb[1]) + 16

    if addr:
        y = _texto_centralizado(draw, y, addr, sub_font, (220, 225, 230), largura, 2)

    if specs_line:
        sb = draw.textbbox((0, 0), specs_line, font=sub_font)
        sw = sb[2] - sb[0]
        draw.text(((largura - sw) // 2, y + 4), specs_line, font=sub_font, fill=(200, 205, 210))
        y += (sb[3] - sb[1]) + 20

    cta_txt = (cta or "Agende sua visita").upper()
    cb = draw.textbbox((0, 0), cta_txt, font=cta_font)
    cw, ch = cb[2] - cb[0], cb[3] - cb[1]
    pad_x, pad_y = 28, 14
    btn_w, btn_h = cw + pad_x * 2, ch + pad_y * 2
    btn_x = (largura - btn_w) // 2
    btn_y = min(y + 8, altura - btn_h - 48)
    draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=btn_h // 2, fill=(255, 255, 255))
    draw.text((btn_x + pad_x, btn_y + pad_y - 2), cta_txt, font=cta_font, fill=(20, 30, 40))

    if contato:
        cf = _font(13)
        cb2 = draw.textbbox((0, 0), contato, font=cf)
        draw.text(((largura - (cb2[2] - cb2[0])) // 2, btn_y + btn_h + 12), contato, font=cf, fill=(210, 215, 220))

    pasta = UPLOADS_DIR
    pasta.mkdir(parents=True, exist_ok=True)
    dest = pasta / f"arte_{uuid.uuid4().hex[:12]}.jpg"
    img.save(dest, "JPEG", quality=94, optimize=True)
    return dest, largura, altura
