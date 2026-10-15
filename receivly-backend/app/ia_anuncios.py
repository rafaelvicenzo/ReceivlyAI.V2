"""
Gerador de anúncios imobiliários — prompt central versionado, Gemini/Groq, fallback local.
"""

from __future__ import annotations

import json
import re
import unicodedata
from typing import Any

from groq import Groq

from app import schemas
from app.config import settings
from app import gemini_client

PROMPT_VERSAO = "2.2"

ABORDAGENS = {
    "A": "direta",
    "B": "beneficios",
    "C": "gancho_criativo",
}

ABORDAGENS_LABEL = {
    "A": "Direta",
    "B": "Benefícios",
    "C": "Gancho criativo",
}

PROMPT_SISTEMA = """Você é um copywriter imobiliário brasileiro de alta conversão, especializado em anúncios para portais, Instagram, Facebook, WhatsApp e tráfego pago.

Produza textos envolventes, específicos e naturais usando SOMENTE dados confirmados do imóvel.

Regras editoriais:
- Estrutura: gancho forte → benefício concreto → detalhes essenciais → CTA claro.
- NUNCA repita o título dentro do corpo. Título e corpo devem ser complementares, não redundantes.
- Portal: título curto e atrativo; corpo descritivo com parágrafos distintos (sem repetir o título).
- Instagram/Facebook: use 2–5 emojis relevantes (🏠 📍 ✨ 🚗 etc.), tom visual e escaneável; inclua hashtags úteis.
- WhatsApp: tom humano, formatação com *negrito* e emojis moderados; convite à conversa.
- Patrocinado: ultra direto, proposta de valor + CTA.

Proibido inventar metragem, infraestrutura, vista, acabamento premium, proximidade ou condições comerciais não informadas.

Evite clichês vazios ("imóvel dos sonhos", "imperdível", "oportunidade única").

Não crie depoimentos, avaliações ou dados de mercado.

Quando faltar informação, inclua alerta no campo alertas do canal.

Retorne SOMENTE JSON válido no schema solicitado."""

CANAL_POLITICAS: dict[str, dict[str, Any]] = {
    "portal": {"palavras_ref": (100, 200), "descricao": "Título único + corpo descritivo (corpo NÃO repete o título)"},
    "instagram": {"palavras_ref": (50, 120), "descricao": "Gancho + legenda com emojis e hashtags relevantes"},
    "facebook": {"palavras_ref": (60, 130), "descricao": "Texto envolvente, emojis moderados, diferente do Instagram"},
    "whatsapp": {"palavras_ref": (30, 70), "descricao": "Mensagem conversacional com *negrito* e emojis"},
    "patrocinado": {"palavras_ref": (20, 60), "descricao": "Headline + texto curto + CTA"},
}

TON_LABELS = {
    "profissional_persuasivo": "Profissional e persuasivo",
    "sofisticado": "Sofisticado",
    "emocional_acolhedor": "Emocional e acolhedor",
    "moderno_descontraido": "Moderno e descontraído",
    "curto_direto": "Curto e direto",
}

_cliente_groq: Groq | None = None


def _get_cliente_groq() -> Groq | None:
    global _cliente_groq
    if not settings.groq_api_key:
        return None
    if _cliente_groq is None:
        _cliente_groq = Groq(api_key=settings.groq_api_key)
    return _cliente_groq


def _extrair_json(texto: str) -> dict:
    return gemini_client.extrair_json(texto)


def _montar_prompt_usuario(config: schemas.AnuncioGeracaoConfig, dados: dict) -> str:
    canais = config.canais or list(CANAL_POLITICAS.keys())
    politicas = {c: CANAL_POLITICAS[c] for c in canais if c in CANAL_POLITICAS}
    comprimento = config.comprimento or "auto"

    attrs = []
    for chave, label in [
        ("tipo_imovel", "Tipo"),
        ("finalidade", "Finalidade"),
        ("preco", "Preço"),
        ("bairro", "Bairro"),
        ("cidade", "Cidade"),
        ("estado", "UF"),
        ("endereco", "Endereço"),
        ("area_imovel", "Área (m²)"),
        ("quartos", "Quartos"),
        ("suites", "Suítes"),
        ("banheiros", "Banheiros"),
        ("vagas", "Vagas"),
        ("caracteristicas", "Características/diferenciais"),
        ("descricao", "Descrição complementar"),
    ]:
        val = dados.get(chave)
        if val is not None and str(val).strip() != "":
            attrs.append(f"- {label}: {val}")

    if config.cta:
        attrs.append(f"- CTA desejado: {config.cta}")
    if config.contato:
        attrs.append(f"- Contato autorizado: {config.contato}")
    if config.publico_alvo_hint:
        attrs.append(f"- Público-alvo sugerido pelo usuário: {config.publico_alvo_hint}")
    if config.hashtags_selecionadas:
        attrs.append(f"- Hashtags escolhidas pelo usuário (priorize no Instagram/Facebook): {' '.join(config.hashtags_selecionadas)}")

    schema_canais = {}
    for canal in canais:
        if canal == "patrocinado":
            schema_canais[canal] = {
                "titulo": "string",
                "texto_principal": "string",
                "cta": "string",
                "alertas": ["string"],
            }
        elif canal in ("instagram", "facebook"):
            schema_canais[canal] = {
                "gancho": "string",
                "corpo": "string",
                "cta": "string",
                "hashtags": ["string"],
                "alertas": ["string"],
            }
        elif canal == "portal":
            schema_canais[canal] = {
                "titulo": "string",
                "corpo": "string",
                "alertas": ["string"],
            }
        else:
            schema_canais[canal] = {"corpo": "string", "alertas": ["string"]}

    canais_abord = [c for c in (config.canais_abordagens or ["portal", "instagram", "whatsapp"]) if c in canais]
    variantes = {}
    if config.gerar_variantes:
        for c in canais_abord:
            if c == "portal":
                variantes[c] = {
                    "A": {"estrategia": "direta", "titulo": "string", "corpo": "string"},
                    "B": {"estrategia": "beneficios", "titulo": "string", "corpo": "string"},
                    "C": {"estrategia": "gancho_criativo", "titulo": "string", "corpo": "string"},
                }
            elif c in ("instagram", "facebook"):
                variantes[c] = {
                    "A": {"estrategia": "direta", "gancho": "string", "corpo": "string", "cta": "string", "hashtags": ["string"]},
                    "B": {"estrategia": "beneficios", "gancho": "string", "corpo": "string", "cta": "string", "hashtags": ["string"]},
                    "C": {"estrategia": "gancho_criativo", "gancho": "string", "corpo": "string", "cta": "string", "hashtags": ["string"]},
                }
            else:
                variantes[c] = {
                    "A": {"estrategia": "direta", "corpo": "string"},
                    "B": {"estrategia": "beneficios", "corpo": "string"},
                    "C": {"estrategia": "gancho_criativo", "corpo": "string"},
                }

    return f"""Imóvel (somente dados confirmados):
{chr(10).join(attrs)}

Configuração:
- Tom: {TON_LABELS.get(config.tom, config.tom)}
- Comprimento: {comprimento} (se auto, adapte às faixas de palavras por canal)
- Canais solicitados: {", ".join(canais)}
- Políticas por canal: {json.dumps(politicas, ensure_ascii=False)}
- Nome imobiliária: {config.nome_imobiliaria or "não informado"}

Retorne JSON exatamente neste formato:
{{
  "publico_alvo": "string",
  "alertas_gerais": ["string"],
  "canais": {json.dumps(schema_canais, ensure_ascii=False)},
  "variantes": {json.dumps(variantes, ensure_ascii=False) if variantes else "{}"}
}}

Para cada canal, respeite a faixa de palavras de referência quando comprimento=auto.
O campo titulo (portal/patrocinado) ou gancho (redes) deve ser distinto do corpo — jamais copie a mesma frase.
Use emojis nos canais sociais (instagram, facebook, whatsapp) para tornar o texto mais atraente visualmente.

IMPORTANTE — três abordagens por canal em "variantes":
- A (direta): objetiva, specs e CTA claros.
- B (beneficios): foco no estilo de vida e vantagens concretas.
- C (gancho_criativo): abertura criativa, pergunta ou storytelling curto.
Para os canais em variantes ({", ".join(canais_abord) if canais_abord else "nenhum"}), preencha SOMENTE "variantes" — não duplique em "canais".
WhatsApp: mensagens curtas (máx. 4 linhas úteis), prontas para colar.
"""


def _material_texto(canal_data: dict, canal: str) -> tuple[str, str | None, str | None, str | None]:
    if canal == "patrocinado":
        partes = [canal_data.get("titulo"), canal_data.get("texto_principal"), canal_data.get("cta")]
        corpo = "\n\n".join(p for p in partes if p)
        return corpo, canal_data.get("titulo"), canal_data.get("cta"), None
    if canal == "portal":
        return canal_data.get("corpo") or "", canal_data.get("titulo"), None, None
    if canal in ("instagram", "facebook"):
        partes = [canal_data.get("gancho"), canal_data.get("corpo"), canal_data.get("cta")]
        corpo = "\n\n".join(p for p in partes if p)
        tags = canal_data.get("hashtags") or []
        hashtags = " ".join(tags) if isinstance(tags, list) else str(tags)
        return corpo, canal_data.get("gancho"), canal_data.get("cta"), hashtags
    return canal_data.get("corpo") or "", None, None, None


def _material_de_variante(canal: str, letra: str, var_data: dict) -> schemas.AnuncioMaterialGerado:
    if canal in ("instagram", "facebook"):
        corpo, titulo, cta, hashtags = _material_texto(var_data, canal)
    elif canal == "portal":
        corpo = var_data.get("corpo") or ""
        titulo = var_data.get("titulo")
        cta = None
        hashtags = None
    else:
        corpo = var_data.get("corpo") or ""
        titulo = var_data.get("titulo")
        cta = var_data.get("cta")
        hashtags = None
    return schemas.AnuncioMaterialGerado(
        canal=canal,
        variante=letra,
        titulo=titulo,
        corpo=corpo.strip(),
        cta=cta,
        hashtags=hashtags,
        conteudo_json={**var_data, "estrategia": var_data.get("estrategia") or ABORDAGENS.get(letra, letra)},
    )


def _resposta_de_json(dados_json: dict, config: schemas.AnuncioGeracaoConfig, *, gerado_por_ia: bool, modelo: str) -> schemas.AnuncioGeracaoIAResponse:
    materiais: list[schemas.AnuncioMaterialGerado] = []
    variantes_data = dados_json.get("variantes") or {}
    canais_com_variantes = set(variantes_data.keys())

    canais_data = dados_json.get("canais") or {}
    for canal, canal_data in canais_data.items():
        if canal in canais_com_variantes:
            continue
        if not isinstance(canal_data, dict):
            continue
        corpo, titulo, cta, hashtags = _material_texto(canal_data, canal)
        alertas = canal_data.get("alertas") or []
        materiais.append(
            schemas.AnuncioMaterialGerado(
                canal=canal,
                variante="principal",
                titulo=titulo,
                corpo=corpo.strip(),
                cta=cta,
                hashtags=hashtags,
                alertas=alertas if isinstance(alertas, list) else [str(alertas)],
                conteudo_json=canal_data,
            )
        )

    for canal, vars_canal in variantes_data.items():
        if not isinstance(vars_canal, dict):
            continue
        for letra in ("A", "B", "C"):
            var_data = vars_canal.get(letra)
            if not isinstance(var_data, dict):
                continue
            materiais.append(_material_de_variante(canal, letra, var_data))

    if config.hashtags_selecionadas:
        aplicar_hashtags_em_materiais(materiais, config.hashtags_selecionadas)

    return schemas.AnuncioGeracaoIAResponse(
        publico_alvo=dados_json.get("publico_alvo"),
        alertas_gerais=dados_json.get("alertas_gerais") or [],
        materiais=materiais,
        gerado_por_ia=gerado_por_ia,
        modelo=modelo,
        prompt_versao=PROMPT_VERSAO,
    )


def _formatar_preco_local(dados: dict) -> str:
    preco = dados.get("preco")
    if preco and str(preco).strip():
        return str(preco).strip()
    if dados.get("valor_final"):
        return f"R$ {dados['valor_final']:,.0f}".replace(",", ".")
    return "Consulte o valor"


def _specs_linha(dados: dict) -> str:
    specs = []
    area = dados.get("area_imovel")
    quartos = dados.get("quartos")
    suites = dados.get("suites")
    vagas = dados.get("vagas")
    if area:
        specs.append(f"{int(area) if float(area).is_integer() else area} m²")
    if quartos:
        specs.append(f"{quartos} quarto(s)")
    if suites:
        specs.append(f"{suites} suíte(s)")
    if vagas:
        specs.append(f"{vagas} vaga(s)")
    return " · ".join(specs)


def _abordagens_locais(canal: str, dados: dict, config: schemas.AnuncioGeracaoConfig) -> list[schemas.AnuncioMaterialGerado]:
    tipo = dados.get("tipo_imovel") or "Imóvel"
    bairro = dados.get("bairro") or ""
    cidade = dados.get("cidade") or ""
    local = ", ".join(p for p in [bairro, cidade] if p) or "região informada"
    preco = _formatar_preco_local(dados)
    specs_txt = _specs_linha(dados)
    diff = (dados.get("caracteristicas") or dados.get("descricao") or "").strip()
    titulo_custom = (dados.get("titulo_anuncio") or "").strip()
    finalidade = "à venda" if dados.get("finalidade") == "venda" else "para locação"
    cta = config.cta or "Agende sua visita"
    out: list[schemas.AnuncioMaterialGerado] = []

    if canal == "portal":
        variantes = {
            "A": (
                titulo_custom or f"{tipo} em {local}",
                (
                    f"{tipo} {finalidade} em {local}.\n\n"
                    f"{'📐 ' + specs_txt + chr(10) if specs_txt else ''}"
                    f"💰 Valor: {preco}\n\n"
                    f"{diff + chr(10) + chr(10) if diff else ''}"
                    f"{cta} — solicite fotos e condições."
                ),
            ),
            "B": (
                f"More com qualidade em {bairro or cidade or local}",
                (
                    f"Imagine viver em um {tipo.lower()} que une conforto e praticidade em {local}.\n\n"
                    f"{diff + ' ' if diff else ''}"
                    f"{'Com ' + specs_txt + ', ' if specs_txt else ''}"
                    f"você ganha mais leveza no dia a dia e um endereço que faz sentido para sua rotina.\n\n"
                    f"💰 {preco}\n\n{cta}."
                ),
            ),
            "C": (
                f"E se seu próximo endereço fosse em {bairro or local}?",
                (
                    f"Alguns imóveis só fazem sentido quando você visita — este {tipo.lower()} em {local} "
                    f"pode ser um deles.\n\n"
                    f"{specs_txt + ' · ' if specs_txt else ''}{preco}\n\n"
                    f"{cta} e descubra cada detalhe pessoalmente."
                ),
            ),
        }
        for letra, (titulo, corpo) in variantes.items():
            out.append(schemas.AnuncioMaterialGerado(
                canal="portal", variante=letra, titulo=titulo, corpo=corpo.strip(),
                conteudo_json={"estrategia": ABORDAGENS[letra]},
            ))
    elif canal == "instagram":
        variantes = {
            "A": (
                f"🏠 {tipo} {finalidade} · {local}\n\n"
                f"{'📐 ' + specs_txt + chr(10) if specs_txt else ''}"
                f"💰 {preco}\n\n📲 {cta}"
            ),
            "B": (
                f"✨ Mais conforto, menos complicação\n\n"
                f"{tipo} {finalidade} em {local} — "
                f"{diff[:120] + '. ' if diff else ''}"
                f"{'Ideal para quem valoriza ' + specs_txt + '. ' if specs_txt else ''}\n\n"
                f"💰 {preco} · {cta}"
            ),
            "C": (
                f"📍 Já pensou em acordar em {bairro or local}?\n\n"
                f"Este {tipo.lower()} pode ser a resposta — {specs_txt or 'confira os detalhes'}.\n"
                f"💰 {preco}\n\n👉 {cta} no direct!"
            ),
        }
        for letra, corpo in variantes.items():
            out.append(schemas.AnuncioMaterialGerado(
                canal="instagram", variante=letra, corpo=corpo, cta=cta,
                conteudo_json={"estrategia": ABORDAGENS[letra]},
            ))
    elif canal == "whatsapp":
        variantes = {
            "A": (
                f"Olá! Tenho um *{tipo.lower()}* {finalidade} em *{local}*.\n"
                f"{'📐 ' + specs_txt + ' · ' if specs_txt else ''}💰 *{preco}*\n"
                f"Posso enviar fotos?"
            ),
            "B": (
                f"Oi! 👋 Separei um {tipo.lower()} {finalidade} em *{local}* "
                f"com {specs_txt or 'ótimo custo-benefício'}.\n"
                f"*{preco}* — quer saber mais?"
            ),
            "C": (
                f"Ei! Vi que você busca imóvel na região — "
                f"tenho um {tipo.lower()} em *{local}* que vale a visita. 🏡\n"
                f"*{preco}* · te mando fotos?"
            ),
        }
        for letra, corpo in variantes.items():
            out.append(schemas.AnuncioMaterialGerado(
                canal="whatsapp", variante=letra, corpo=corpo, cta=cta,
                conteudo_json={"estrategia": ABORDAGENS[letra]},
            ))
    return out


def gerar_textos_localmente(config: schemas.AnuncioGeracaoConfig, dados: dict) -> schemas.AnuncioGeracaoIAResponse:
    tipo = dados.get("tipo_imovel") or "Imóvel"
    bairro = dados.get("bairro") or ""
    cidade = dados.get("cidade") or ""
    local = ", ".join(p for p in [bairro, cidade] if p) or "região informada"
    preco = _formatar_preco_local(dados)
    specs_txt = _specs_linha(dados)
    diff = (dados.get("caracteristicas") or dados.get("descricao") or "").strip()
    titulo_custom = (dados.get("titulo_anuncio") or "").strip()
    finalidade = "à venda" if dados.get("finalidade") == "venda" else "para locação"
    cta = config.cta or "Agende sua visita"

    canais_abord = [c for c in (config.canais_abordagens or ["portal", "instagram", "whatsapp"]) if c in (config.canais or [])]
    materiais: list[schemas.AnuncioMaterialGerado] = []

    for canal in config.canais or ["portal", "instagram", "whatsapp"]:
        if config.gerar_variantes and canal in canais_abord:
            materiais.extend(_abordagens_locais(canal, dados, config))
        elif canal == "facebook":
            corpo = (
                f"🏡 {tipo} {finalidade} em {local}\n\n"
                f"{diff[:200] + chr(10) + chr(10) if diff else ''}"
                f"{'📋 ' + specs_txt + chr(10) if specs_txt else ''}"
                f"💵 {preco}\n\n👉 {cta} — comente ou envie mensagem."
            )
            materiais.append(schemas.AnuncioMaterialGerado(canal="facebook", variante="principal", corpo=corpo, cta=cta))
        elif canal == "patrocinado":
            materiais.append(schemas.AnuncioMaterialGerado(
                canal="patrocinado", variante="principal",
                titulo=titulo_custom or f"{tipo} em {local}",
                corpo=f"{specs_txt + ' · ' if specs_txt else ''}{preco}", cta=cta,
            ))

    if config.hashtags_selecionadas:
        aplicar_hashtags_em_materiais(materiais, config.hashtags_selecionadas)

    return schemas.AnuncioGeracaoIAResponse(
        publico_alvo=f"Pessoas interessadas em {tipo.lower()} {finalidade} em {local}",
        alertas_gerais=[
            "⚠️ IA indisponível — texto gerado em modo local. Configure GEMINI_API_KEY ou GROQ_API_KEY no .env para copy com IA.",
        ],
        materiais=materiais,
        gerado_por_ia=False,
        modelo="local",
        prompt_versao=PROMPT_VERSAO,
    )


def gerar_anuncios_ia(config: schemas.AnuncioGeracaoConfig, dados: dict) -> schemas.AnuncioGeracaoIAResponse:
    prompt_usuario = _montar_prompt_usuario(config, dados)

    if gemini_client.disponivel():
        try:
            resp = gemini_client.gerar_texto(system=PROMPT_SISTEMA, user=prompt_usuario, json_mode=True, temperature=0.55)
            dados_json = _extrair_json(resp.texto)
            return _resposta_de_json(dados_json, config, gerado_por_ia=True, modelo=resp.modelo)
        except Exception:
            pass

    cliente = _get_cliente_groq()
    if cliente:
        try:
            resposta = cliente.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": PROMPT_SISTEMA},
                    {"role": "user", "content": prompt_usuario},
                ],
                temperature=0.55,
                response_format={"type": "json_object"},
            )
            dados_json = _extrair_json(resposta.choices[0].message.content or "{}")
            return _resposta_de_json(dados_json, config, gerado_por_ia=True, modelo=settings.groq_model)
        except Exception:
            pass

    return gerar_textos_localmente(config, dados)


def normalizar_hashtag(tag: str) -> str:
    t = (tag or "").strip()
    if not t:
        return ""
    if not t.startswith("#"):
        t = f"#{t}"
    slug = _slug_hashtag(t[1:])
    return f"#{slug}" if slug else ""


def _slug_hashtag(texto: str) -> str:
    s = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-zA-Z0-9]", "", s.lower())
    return s[:40]


def _hashtags_texto(tags: list[str]) -> str:
    vistos: set[str] = set()
    out: list[str] = []
    for tag in tags:
        norm = normalizar_hashtag(tag)
        if norm and norm not in vistos:
            vistos.add(norm)
            out.append(norm)
    return " ".join(out)


def aplicar_hashtags_em_materiais(
    materiais: list[schemas.AnuncioMaterialGerado],
    hashtags: list[str],
    *,
    canais: tuple[str, ...] = ("instagram", "facebook"),
) -> None:
    txt = _hashtags_texto(hashtags)
    if not txt:
        return
    for mat in materiais:
        if mat.canal not in canais:
            continue
        mat.hashtags = txt
        if txt not in (mat.corpo or ""):
            mat.corpo = (mat.corpo or "").rstrip() + f"\n\n{txt}"


PROMPT_HASHTAGS = """Você é especialista em hashtags para marketing imobiliário no Instagram e Facebook (Brasil).

Gere hashtags relevantes, em português ou inglês quando fizer sentido no nicho imobiliário, SEM inventar bairros ou características não informadas.

Regras:
- Cada tag deve começar com #
- Sem espaços dentro da tag (use CamelCase ou junto: #JardimLeblon)
- Misture tags amplas (#imoveis) com específicas (bairro, tipo, quartos)
- relevancia: alta | media | baixa
- motivo: frase curta explicando por que a tag faz sentido
- 4 a 6 categorias, 3 a 6 tags por categoria, total 18-30 tags

Retorne SOMENTE JSON:
{
  "categorias": [
    {
      "id": "localizacao",
      "label": "Localização",
      "tags": [{"tag": "#bairro", "relevancia": "alta", "motivo": "..."}]
    }
  ]
}"""


def _montar_prompt_hashtags(dados: dict, canal: str) -> str:
    linhas = []
    for chave, label in [
        ("tipo_imovel", "Tipo"),
        ("finalidade", "Finalidade"),
        ("bairro", "Bairro"),
        ("cidade", "Cidade"),
        ("estado", "UF"),
        ("area_imovel", "Área m²"),
        ("quartos", "Quartos"),
        ("suites", "Suítes"),
        ("vagas", "Vagas"),
        ("caracteristicas", "Diferenciais"),
    ]:
        val = dados.get(chave)
        if val is not None and str(val).strip():
            linhas.append(f"- {label}: {val}")
    return f"""Canal: {canal}
Imóvel:
{chr(10).join(linhas) or '- Dados limitados — use tags genéricas do nicho imobiliário'}

Gere sugestões de hashtags categorizadas para este anúncio."""


def _parse_hashtags_json(data: dict) -> list[schemas.HashtagCategoria]:
    categorias: list[schemas.HashtagCategoria] = []
    for cat in data.get("categorias") or []:
        if not isinstance(cat, dict):
            continue
        tags = []
        for item in cat.get("tags") or []:
            if not isinstance(item, dict):
                continue
            tag = normalizar_hashtag(item.get("tag") or "")
            if not tag:
                continue
            rel = str(item.get("relevancia") or "media").lower()
            if rel not in ("alta", "media", "baixa"):
                rel = "media"
            tags.append(schemas.HashtagItem(tag=tag, relevancia=rel, motivo=item.get("motivo")))
        if tags:
            categorias.append(
                schemas.HashtagCategoria(
                    id=str(cat.get("id") or cat.get("label") or "geral").lower().replace(" ", "_"),
                    label=str(cat.get("label") or "Geral"),
                    tags=tags,
                )
            )
    return categorias


def _texto_hashtag(val) -> str:
    if val is None or isinstance(val, (int, float)):
        return str(val).strip() if val is not None else ""
    if isinstance(val, str):
        return val.strip()
    return ""


def sugerir_hashtags_localmente(dados: dict, canal: str = "instagram") -> schemas.HashtagSugerirResponse:
    tipo = _texto_hashtag(dados.get("tipo_imovel")) or "Imovel"
    bairro = _texto_hashtag(dados.get("bairro"))
    cidade = _texto_hashtag(dados.get("cidade"))
    estado = _texto_hashtag(dados.get("estado"))
    quartos = dados.get("quartos")
    vagas = dados.get("vagas")
    finalidade = _texto_hashtag(dados.get("finalidade")) or "venda"
    eh_venda = finalidade == "venda"

    def item(tag: str, rel: str, motivo: str) -> schemas.HashtagItem:
        return schemas.HashtagItem(tag=normalizar_hashtag(tag), relevancia=rel, motivo=motivo)

    loc_tags: list[schemas.HashtagItem] = []
    if bairro:
        loc_tags.append(item(bairro, "alta", f"Bairro informado: {bairro}"))
    if cidade:
        loc_tags.append(item(cidade, "alta", f"Cidade do imóvel"))
        loc_tags.append(item(f"{cidade}Imoveis", "media", "Combina cidade + nicho"))
    if estado:
        loc_tags.append(item(estado, "media", "UF para alcance regional"))
    if not loc_tags:
        loc_tags.append(item("imoveisbrasil", "media", "Tag ampla — complete bairro/cidade no cadastro"))

    tipo_slug = _slug_hashtag(tipo) or "imovel"
    tipo_tags = [
        item(tipo_slug, "alta", f"Tipo: {tipo}"),
        item(f"{tipo_slug}{quartos}quartos" if quartos else "imoveis", "media", "Tipo + perfil" if quartos else "Nicho imobiliário"),
    ]
    if vagas:
        tipo_tags.append(item(f"{vagas}vagas", "media", f"{vagas} vaga(s) informada(s)"))

    fin_tags = [
        item("imoveisavenda" if eh_venda else "imoveisparalocacao", "alta", "Finalidade do anúncio"),
        item("casapropria" if eh_venda else "paralocar", "media", "Intenção do público"),
        item("mercadoimobiliario", "media", "Alcance do setor"),
    ]

    estilo_tags = [
        item("novolar", "media", "Apelo emocional"),
        item("lifestyle", "baixa", "Estilo de vida"),
        item("investimento", "baixa", "Interesse em patrimônio"),
    ]
    if quartos and int(quartos) >= 3:
        estilo_tags.append(item("familia", "media", "Perfil familiar"))

    eng_tags = [
        item("corretor", "media", "Profissional do setor"),
        item("imobiliaria", "media", "Marca do segmento"),
    ]
    if canal == "instagram":
        eng_tags.extend([
            item("instaimoveis", "media", "Comunidade no Instagram"),
            item("reelsimoveis", "baixa", "Formato em alta"),
        ])

    categorias = [
        schemas.HashtagCategoria(id="localizacao", label="Localização", tags=loc_tags),
        schemas.HashtagCategoria(id="tipo_imovel", label="Tipo e perfil", tags=tipo_tags),
        schemas.HashtagCategoria(id="finalidade", label="Finalidade", tags=fin_tags),
        schemas.HashtagCategoria(id="estilo_vida", label="Estilo de vida", tags=estilo_tags),
        schemas.HashtagCategoria(id="engajamento", label="Alcance e engajamento", tags=eng_tags),
    ]
    return schemas.HashtagSugerirResponse(
        categorias=categorias,
        gerado_por_ia=False,
        modelo="local",
        alertas=["Sugestões geradas localmente. Configure GEMINI_API_KEY ou GROQ_API_KEY para ideias com IA."],
    )


def sugerir_hashtags_ia(dados: dict, canal: str = "instagram") -> schemas.HashtagSugerirResponse:
    prompt = _montar_prompt_hashtags(dados, canal)

    if gemini_client.disponivel():
        try:
            resp = gemini_client.gerar_texto(system=PROMPT_HASHTAGS, user=prompt, json_mode=True, temperature=0.65)
            cats = _parse_hashtags_json(_extrair_json(resp.texto))
            if cats:
                return schemas.HashtagSugerirResponse(categorias=cats, gerado_por_ia=True, modelo=resp.modelo)
        except Exception:
            pass

    cliente = _get_cliente_groq()
    if cliente:
        try:
            resposta = cliente.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": PROMPT_HASHTAGS},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.65,
                response_format={"type": "json_object"},
            )
            cats = _parse_hashtags_json(_extrair_json(resposta.choices[0].message.content or "{}"))
            if cats:
                return schemas.HashtagSugerirResponse(categorias=cats, gerado_por_ia=True, modelo=settings.groq_model)
        except Exception:
            pass

    return sugerir_hashtags_localmente(dados, canal)


PROMPT_ANALISE_FACHADA = """Você analisa fotos de fachada/edificação para marketing imobiliário no Brasil.

Descreva SOMENTE o que é visível na imagem. Não invente metragem, preço, bairro, acabamento premium ou vista se não estiver claramente visível.

Retorne JSON:
{
  "tipo_sugerido": "Apartamento|Casa|Comercial|Terreno|Outro",
  "titulo_sugerido": "frase curta para capa do anúncio (ex: Morar com conforto e praticidade)",
  "descricao_visual": "2-4 frases descrevendo o que se vê: arquitetura, andares, fachada, entorno visível",
  "diferenciais_visiveis": ["item1", "item2"],
  "caracteristicas_sugeridas": "texto para campo de diferenciais, só com base no visível",
  "alertas": ["limitações da análise, se houver"]
}"""


def analisar_fachada(image_bytes: bytes) -> schemas.AnaliseFachadaResponse:
    if gemini_client.disponivel():
        try:
            resp = gemini_client.gerar_texto_com_imagem(
                system=PROMPT_ANALISE_FACHADA,
                user="Analise esta foto de fachada para apoiar a criação de um anúncio imobiliário.",
                image_bytes=image_bytes,
                json_mode=True,
            )
            data = _extrair_json(resp.texto)
            return schemas.AnaliseFachadaResponse(
                tipo_sugerido=data.get("tipo_sugerido"),
                titulo_sugerido=data.get("titulo_sugerido"),
                descricao_visual=data.get("descricao_visual"),
                diferenciais_visiveis=data.get("diferenciais_visiveis") or [],
                caracteristicas_sugeridas=data.get("caracteristicas_sugeridas"),
                alertas=data.get("alertas") or [],
                gerado_por_ia=True,
                modelo=resp.modelo,
            )
        except Exception:
            pass

    return schemas.AnaliseFachadaResponse(
        descricao_visual="Edificação residencial ou comercial com fachada visível na foto enviada.",
        caracteristicas_sugeridas="Imóvel com boa apresentação visual na fachada. Confirme metragem, quartos e localização no cadastro.",
        alertas=["Análise automática limitada — IA indisponível. Revise e complete os dados manualmente."],
        gerado_por_ia=False,
        modelo="local",
    )


# --- Compatibilidade legado ---

def gerar_anuncios(dados: schemas.GerarAnuncioRequest) -> schemas.GerarAnuncioResponse:
    config = schemas.AnuncioGeracaoConfig(
        canais=["portal", "instagram", "whatsapp"],
        tom="profissional_persuasivo",
        comprimento="auto",
    )
    imovel = {
        "tipo_imovel": dados.tipo_imovel,
        "bairro": dados.bairro,
        "preco": dados.preco,
        "suites": dados.suites,
        "vagas": dados.vagas,
        "descricao": dados.descricao,
        "caracteristicas": dados.descricao,
    }
    resp = gerar_anuncios_ia(config, imovel)
    portal = next((m.corpo for m in resp.materiais if m.canal == "portal"), "")
    instagram = next((m.corpo for m in resp.materiais if m.canal == "instagram"), "")
    whatsapp = next((m.corpo for m in resp.materiais if m.canal == "whatsapp"), "")
    return schemas.GerarAnuncioResponse(
        portal=portal,
        instagram=instagram,
        whatsapp=whatsapp,
        gerado_por_ia=resp.gerado_por_ia,
    )
