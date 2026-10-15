"""Geração de artes promocionais imobiliárias com Gemini (image output)."""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass

from PIL import Image, ImageOps

from app.anuncios_artes import FORMATOS
from app.config import settings

logger = logging.getLogger(__name__)

PROMPT_VERSAO_ARTE = "2.0"

PROMPT_SISTEMA_ARTE = """Você é um diretor de arte especializado em publicidade imobiliária de alto padrão e design para redes sociais brasileiras.

Sua tarefa é transformar a fotografia original de um imóvel em uma peça publicitária imobiliária profissional, visualmente atraente e pronta para divulgação.

## OBJETIVO

Criar uma arte publicitária que valorize o imóvel, desperte o interesse de potenciais compradores ou locatários e transmita profissionalismo e credibilidade.

## PRESERVAÇÃO DA FOTOGRAFIA

A imagem enviada é a fotografia real do imóvel e deve ser tratada como a fonte visual principal.

- Preserve fielmente a fachada, a arquitetura, as janelas, as portas, o telhado, as cores, os materiais e os elementos existentes.
- Não reconstrua, redesenhe, substitua ou modifique a aparência do imóvel.
- Não adicione piscinas, jardins, garagens, cômodos, pavimentos ou elementos arquitetônicos inexistentes na fotografia.
- Não altere a perspectiva nem distorça as proporções da propriedade.
- Não aplique filtros excessivos que modifiquem a aparência real do imóvel.
- Preserve a maior área possível da fotografia original, mantendo a propriedade como protagonista da composição.

## DIREÇÃO DE ARTE

Crie um anúncio com aparência de trabalho produzido por um designer profissional de uma imobiliária moderna.

- Utilize uma composição visual elegante, organizada e equilibrada.
- Priorize a fotografia do imóvel como elemento principal.
- Use tipografia moderna, forte e altamente legível.
- Aplique as cores da identidade visual fornecida pela imobiliária.
- Utilize áreas de contraste, faixas discretas, degradês sutis ou painéis gráficos para acomodar os textos sem esconder desnecessariamente a fachada.
- Crie uma hierarquia visual clara entre título, preço, localização e chamada para ação.
- Utilize margens consistentes e espaçamento adequado.
- Evite excesso de elementos decorativos, ícones, selos, sombras, contornos e informações.
- O resultado deve parecer uma peça publicitária real, não um template genérico ou uma montagem amadora.

## COMPOSIÇÃO DO TEXTO

Inclua somente as informações relevantes para a peça, priorizando:

1. Um título curto e atrativo.
2. O preço do imóvel, quando disponível.
3. O bairro ou a localização, quando disponíveis.
4. Até três características relevantes, quando disponíveis.
5. Uma chamada para ação curta.
6. A identificação da imobiliária, quando fornecida.

Reproduza os valores, nomes, números e informações exatamente como recebidos.

Todo texto inserido na imagem deve estar em português brasileiro, com ortografia correta, caracteres legíveis e sem palavras inventadas.

Não crie logotipos fictícios. Se um arquivo de logo for fornecido, utilize-o sem alterar sua identidade visual.

## RESTRIÇÕES

- Não invente informações sobre o imóvel.
- Não crie selos falsos de financiamento, valorização, exclusividade ou aprovação.
- Não adicione marcas d'água.
- Não inclua interfaces de aplicativos, molduras de celular ou simulações de publicação.
- Não duplique informações.
- Não esconda partes importantes da fachada com textos ou elementos gráficos.
- Não utilize composições exageradas, cores conflitantes ou tipografia difícil de ler.

## RESULTADO FINAL

Gere uma única imagem publicitária imobiliária de qualidade profissional, com composição refinada, fotografia fiel ao imóvel, informações organizadas e identidade visual consistente.

A peça deve estar pronta para publicação nas redes sociais, sem necessidade de correções visuais posteriores.

Prioridade máxima: fidelidade à fotografia original, legibilidade dos textos e aparência profissional.

Retorne SOMENTE a imagem final — sem texto explicativo fora da arte."""


class ArteIaIndisponivel(Exception):
    """IA de imagem indisponível ou não retornou arte."""


@dataclass
class ArteIaResultado:
    jpeg_bytes: bytes
    modelo: str
    prompt_versao: str = PROMPT_VERSAO_ARTE


@dataclass
class DadosArtePrompt:
    formato: str
    tipo_imovel: str = ""
    finalidade: str = ""
    preco: str = ""
    cidade: str = ""
    bairro: str = ""
    area: str = ""
    quartos: str = ""
    banheiros: str = ""
    vagas: str = ""
    diferenciais: str = ""
    nome_imobiliaria: str = ""
    contato: str = ""
    cores_marca: str = ""
    titulo: str = ""
    cta: str = ""
    exibir_logo: bool = False
    tem_logo_anexo: bool = False


def _campo(valor) -> str:
    if valor is None:
        return ""
    s = str(valor).strip()
    return s


def _finalidade_label(finalidade: str) -> str:
    return "Venda" if finalidade == "venda" else "Locação"


def _montar_prompt(dados: DadosArtePrompt) -> str:
    ratio = (
        "Formato: quadrado 1:1 (Instagram feed)."
        if dados.formato == "feed"
        else "Formato: vertical 9:16 (Instagram Stories). Deixe a parte superior respirando para a foto; concentre textos na faixa inferior com degradê sutil."
    )

    logo_instrucao = (
        "Um arquivo de logo da imobiliária foi anexado — utilize-o discretamente, sem distorcer."
        if dados.tem_logo_anexo
        else (
            "Não inclua logo — nenhum arquivo de logo foi fornecido."
            if not dados.exibir_logo
            else "Não invente logo — nenhum arquivo foi anexado."
        )
    )

    return f"""{PROMPT_SISTEMA_ARTE}

## INFORMAÇÕES DO ANÚNCIO

Utilize exclusivamente os dados abaixo. Campos vazios NÃO devem aparecer na arte. Não invente nem deduza informações ausentes.

- Tipo de imóvel: {_campo(dados.tipo_imovel) or "(não informado — omitir)"}
- Finalidade: {_campo(dados.finalidade) or "(não informado — omitir)"}
- Preço: {_campo(dados.preco) or "(não informado — omitir)"}
- Cidade: {_campo(dados.cidade) or "(não informado — omitir)"}
- Bairro: {_campo(dados.bairro) or "(não informado — omitir)"}
- Área: {_campo(dados.area) or "(não informado — omitir)"}
- Quartos: {_campo(dados.quartos) or "(não informado — omitir)"}
- Banheiros: {_campo(dados.banheiros) or "(não informado — omitir)"}
- Vagas: {_campo(dados.vagas) or "(não informado — omitir)"}
- Diferenciais: {_campo(dados.diferenciais) or "(não informado — omitir)"}
- Nome da imobiliária: {_campo(dados.nome_imobiliaria) or "(não informado — omitir)"}
- Contato: {_campo(dados.contato) or "(não informado — omitir)"}
- Cores da marca: {_campo(dados.cores_marca) or "#F59E0B"}
- Título publicitário: {_campo(dados.titulo) or "(não informado — omitir)"}
- Chamada para ação: {_campo(dados.cta) or "(não informado — omitir)"}

## FORMATO DE SAÍDA

{ratio}

{logo_instrucao}

Transforme a fotografia anexada seguindo todas as instruções acima."""


def _preparar_foto(conteudo: bytes) -> bytes:
    img = Image.open(io.BytesIO(conteudo))
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return buf.getvalue()


def _preparar_logo(conteudo: bytes) -> bytes:
    img = Image.open(io.BytesIO(conteudo)).convert("RGBA")
    img.thumbnail((512, 512), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _ajustar_formato(jpeg_bytes: bytes, formato: str) -> tuple[bytes, int, int]:
    alvo_w, alvo_h = FORMATOS[formato]
    img = Image.open(io.BytesIO(jpeg_bytes)).convert("RGB")
    fw, fh = img.size
    scale = max(alvo_w / fw, alvo_h / fh)
    nw, nh = int(fw * scale), int(fh * scale)
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - alvo_w) // 2
    top = (nh - alvo_h) // 2
    img = img.crop((left, top, left + alvo_w, top + alvo_h))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=93, optimize=True)
    return buf.getvalue(), alvo_w, alvo_h


def _extrair_imagem(resp) -> bytes | None:
    candidatos = resp.candidates or []
    partes = candidatos[0].content.parts if candidatos and candidatos[0].content else []
    for part in partes or []:
        inline = getattr(part, "inline_data", None)
        if inline and inline.data:
            img = Image.open(io.BytesIO(inline.data)).convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=92)
            return buf.getvalue()
    return None


def _dados_prompt_de_dict(dados: DadosArtePrompt | dict) -> DadosArtePrompt:
    if isinstance(dados, DadosArtePrompt):
        return dados
    return DadosArtePrompt(**dados)


def gerar_arte_ia(
    foto_bytes: bytes,
    dados: DadosArtePrompt | dict,
    *,
    logo_bytes: bytes | None = None,
) -> ArteIaResultado:
    if not settings.gemini_api_key:
        raise ArteIaIndisponivel("GEMINI_API_KEY não configurada.")

    ctx = _dados_prompt_de_dict(dados)
    if ctx.formato not in FORMATOS:
        raise ValueError(f"Formato inválido: {ctx.formato}")

    ctx.tem_logo_anexo = bool(logo_bytes and ctx.exibir_logo)

    import time
    from google import genai
    from google.genai import errors, types

    jpeg_entrada = _preparar_foto(foto_bytes)
    prompt = _montar_prompt(ctx)

    contents: list = [prompt, types.Part.from_bytes(data=jpeg_entrada, mime_type="image/jpeg")]
    if ctx.tem_logo_anexo and logo_bytes:
        logo_png = _preparar_logo(logo_bytes)
        contents.append(types.Part.from_bytes(data=logo_png, mime_type="image/png"))

    modelos = [
        (settings.gemini_model_anuncio_arte or "").strip() or settings.gemini_model_foto,
    ]
    fallback = (getattr(settings, "gemini_model_foto_fallback", None) or "").strip()
    if fallback and fallback not in modelos:
        modelos.append(fallback)

    client = genai.Client(api_key=settings.gemini_api_key)
    ultimo: Exception | None = None

    for modelo in modelos:
        for espera in (0, 4, 10):
            if espera:
                time.sleep(espera)
            try:
                resp = client.models.generate_content(
                    model=modelo,
                    contents=contents,
                    config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
                )
                raw = _extrair_imagem(resp)
                if raw:
                    jpeg, _, _ = _ajustar_formato(raw, ctx.formato)
                    return ArteIaResultado(jpeg_bytes=jpeg, modelo=modelo)
                ultimo = ArteIaIndisponivel("Modelo não retornou imagem.")
            except errors.ClientError as exc:
                if getattr(exc, "code", None) == 429:
                    ultimo = exc
                    continue
                raise ArteIaIndisponivel(f"Erro Gemini: {exc}") from exc
            except errors.ServerError as exc:
                ultimo = exc
                logger.warning("Arte anúncio: %s indisponível: %s", modelo, exc)

    raise ArteIaIndisponivel(
        "Serviço de IA para artes indisponível no momento. Usando composição local."
    ) from ultimo


def montar_dados_arte_prompt(
    *,
    formato: str,
    dados_imovel: dict,
    headline: str,
    preco: str,
    config,
    imobiliaria,
) -> DadosArtePrompt:
    area = dados_imovel.get("area_imovel")
    area_txt = ""
    if area is not None:
        area_txt = f"{int(area) if float(area) == int(area) else area} m²"

    def num_txt(key: str) -> str:
        v = dados_imovel.get(key)
        return str(v) if v is not None else ""

    cor = config.cor_destaque or (imobiliaria.cor_destaque_laudo if imobiliaria else None) or "#F59E0B"
    diff = _campo(dados_imovel.get("caracteristicas")) or _campo(dados_imovel.get("descricao"))

    return DadosArtePrompt(
        formato=formato,
        tipo_imovel=_campo(dados_imovel.get("tipo_imovel")) or "Imóvel",
        finalidade=_finalidade_label(dados_imovel.get("finalidade") or "venda"),
        preco=_campo(preco),
        cidade=_campo(dados_imovel.get("cidade")),
        bairro=_campo(dados_imovel.get("bairro")),
        area=area_txt,
        quartos=num_txt("quartos"),
        banheiros=num_txt("banheiros"),
        vagas=num_txt("vagas"),
        diferenciais=diff,
        nome_imobiliaria=_campo(config.nome_imobiliaria) or _campo(imobiliaria.nome if imobiliaria else ""),
        contato=_campo(config.contato),
        cores_marca=_campo(cor),
        titulo=_campo(headline),
        cta=_campo(config.cta) or "Agende sua visita",
        exibir_logo=bool(config.exibir_logo_arte),
    )
