"""Orquestração do gerador de anúncios — independente do módulo de avaliações."""

from __future__ import annotations

import json
import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import models, schemas
from app.anuncios_artes import renderizar_arte, BASE_DIR, FORMATOS, UPLOADS_DIR
from app.ia_anuncios_artes import gerar_arte_ia, ArteIaIndisponivel, montar_dados_arte_prompt
from app.anuncios_validacao import validar_pre_geracao, validar_pos_geracao, dados_imovel_de_anuncio
from app import ia_anuncios
from app import imovel_anuncio_storage

UPLOADS_ROOT = BASE_DIR / "uploads"


def _imovel_response(imovel: models.ImovelAnuncio) -> schemas.ImovelAnuncioResponse:
    url = f"/uploads/{imovel.foto_fachada_caminho}" if imovel.foto_fachada_caminho else None
    return schemas.ImovelAnuncioResponse(
        id=imovel.id,
        titulo=imovel.titulo,
        tipo=imovel.tipo,
        finalidade=imovel.finalidade,
        preco=imovel.preco,
        preco_numero=imovel.preco_numero,
        bairro=imovel.bairro,
        cidade=imovel.cidade,
        estado=imovel.estado,
        endereco=imovel.endereco,
        area_imovel=imovel.area_imovel,
        quartos=imovel.quartos,
        suites=imovel.suites,
        banheiros=imovel.banheiros,
        vagas=imovel.vagas,
        caracteristicas=imovel.caracteristicas,
        descricao=imovel.descricao,
        titulo_anuncio=imovel.titulo_anuncio,
        foto_fachada_url=url,
        criado_em=imovel.criado_em,
        atualizado_em=imovel.atualizado_em,
    )


def _obter_imovel(db: Session, imovel_id: int, imobiliaria_id: int) -> models.ImovelAnuncio:
    imovel = (
        db.query(models.ImovelAnuncio)
        .filter(models.ImovelAnuncio.id == imovel_id, models.ImovelAnuncio.imobiliaria_id == imobiliaria_id)
        .first()
    )
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado.")
    return imovel


def _parse_preco_numero(preco: str | None) -> float | None:
    if not preco:
        return None
    s = re.sub(r"[^\d,.]", "", preco)
    if not s:
        return None
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
    elif "," in s:
        partes = s.split(",")
        s = s.replace(",", ".") if len(partes[-1]) <= 2 else s.replace(",", "")
    try:
        n = float(s)
        return n if n > 0 else None
    except ValueError:
        return None


def listar_imoveis(db: Session, imobiliaria_id: int) -> list[schemas.ImovelAnuncioResponse]:
    rows = (
        db.query(models.ImovelAnuncio)
        .filter(models.ImovelAnuncio.imobiliaria_id == imobiliaria_id)
        .order_by(models.ImovelAnuncio.atualizado_em.desc())
        .limit(100)
        .all()
    )
    return [_imovel_response(r) for r in rows]


def criar_imovel(db: Session, data: schemas.ImovelAnuncioCreate, usuario: models.Usuario) -> schemas.ImovelAnuncioResponse:
    preco_num = data.preco_numero or _parse_preco_numero(data.preco)
    imovel = models.ImovelAnuncio(
        imobiliaria_id=usuario.imobiliaria_id,
        usuario_id=usuario.id,
        titulo=data.titulo,
        tipo=data.tipo,
        finalidade=data.finalidade,
        preco=data.preco,
        preco_numero=preco_num,
        bairro=data.bairro,
        cidade=data.cidade,
        estado=data.estado,
        endereco=data.endereco,
        area_imovel=data.area_imovel,
        quartos=data.quartos,
        suites=data.suites,
        banheiros=data.banheiros,
        vagas=data.vagas,
        caracteristicas=data.caracteristicas,
        descricao=data.descricao,
        titulo_anuncio=data.titulo_anuncio,
    )
    db.add(imovel)
    db.commit()
    db.refresh(imovel)
    return _imovel_response(imovel)


def atualizar_imovel(
    db: Session, imovel_id: int, imobiliaria_id: int, data: schemas.ImovelAnuncioUpdate,
) -> schemas.ImovelAnuncioResponse:
    imovel = _obter_imovel(db, imovel_id, imobiliaria_id)
    for field in data.model_fields:
        val = getattr(data, field)
        if val is not None:
            setattr(imovel, field, val)
    if data.preco and not data.preco_numero:
        imovel.preco_numero = _parse_preco_numero(data.preco)
    db.commit()
    db.refresh(imovel)
    return _imovel_response(imovel)


def excluir_imovel(db: Session, imovel_id: int, imobiliaria_id: int) -> None:
    imovel = _obter_imovel(db, imovel_id, imobiliaria_id)
    db.delete(imovel)
    db.commit()


async def upload_fachada(
    db: Session, imovel_id: int, imobiliaria_id: int, arquivo: UploadFile,
) -> schemas.ImovelAnuncioResponse:
    imovel = _obter_imovel(db, imovel_id, imobiliaria_id)
    if not arquivo.content_type or not arquivo.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Envie um arquivo de imagem.")
    conteudo = await arquivo.read()
    if len(conteudo) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagem maior que 15 MB.")
    try:
        rel, nome = imovel_anuncio_storage.salvar_foto_fachada(
            imobiliaria_id, imovel_id, arquivo.filename or "fachada.jpg", conteudo,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    imovel.foto_fachada_caminho = rel
    imovel.foto_fachada_nome = nome
    db.commit()
    db.refresh(imovel)
    return _imovel_response(imovel)


async def analisar_fachada_imovel(db: Session, imovel_id: int, imobiliaria_id: int) -> schemas.AnaliseFachadaResponse:
    imovel = _obter_imovel(db, imovel_id, imobiliaria_id)
    if not imovel.foto_fachada_caminho:
        raise HTTPException(status_code=400, detail="Envie a foto de fachada antes de analisar.")
    path = UPLOADS_ROOT / imovel.foto_fachada_caminho
    if not path.exists():
        raise HTTPException(status_code=404, detail="Arquivo de fachada não encontrado.")
    resultado = ia_anuncios.analisar_fachada(path.read_bytes())
    imovel.analise_fachada_json = resultado.model_dump_json()
    if resultado.tipo_sugerido and not imovel.tipo:
        imovel.tipo = resultado.tipo_sugerido
    if resultado.titulo_sugerido:
        imovel.titulo_anuncio = resultado.titulo_sugerido
    if resultado.caracteristicas_sugeridas:
        imovel.caracteristicas = resultado.caracteristicas_sugeridas
    if resultado.descricao_visual:
        imovel.descricao = resultado.descricao_visual
    db.commit()
    return resultado


def _formatar_preco(dados: dict) -> str:
    if dados.get("preco"):
        return str(dados["preco"])
    pn = dados.get("preco_numero")
    if pn:
        return f"R$ {float(pn):,.0f}".replace(",", ".")
    return "Consulte"


def _material_response(m: models.AnuncioMaterial) -> schemas.AnuncioMaterialResponse:
    alertas = json.loads(m.alertas_json) if m.alertas_json else []
    return schemas.AnuncioMaterialResponse(
        id=m.id, canal=m.canal, variante=m.variante, titulo=m.titulo, corpo=m.corpo,
        cta=m.cta, hashtags=m.hashtags, alertas=alertas, status=m.status,
        versao=m.versao, editado_manualmente=bool(m.editado_manualmente), criado_em=m.criado_em,
    )


def _arte_response(a: models.AnuncioArte) -> schemas.AnuncioArteResponse:
    return schemas.AnuncioArteResponse(
        id=a.id, formato=a.formato, foto_origem_id=a.foto_origem_id,
        url=f"/uploads/{a.caminho_relativo}" if a.caminho_relativo else None,
        largura=a.largura, altura=a.altura, status=a.status, erro=a.erro,
        gerado_por_ia=bool(a.gerado_por_ia), criado_em=a.criado_em,
    )


def _specs_arte_texto(dados: dict) -> str:
    parts = []
    if dados.get("area_imovel"):
        a = dados["area_imovel"]
        parts.append(f"{int(a) if float(a) == int(a) else a} m²")
    if dados.get("quartos"):
        parts.append(f"{dados['quartos']} quartos")
    if dados.get("banheiros"):
        parts.append(f"{dados['banheiros']} banh.")
    if dados.get("vagas"):
        parts.append(f"{dados['vagas']} vagas")
    return " · ".join(parts) or "Consulte detalhes"


def _geracao_response(g: models.AnuncioGeracao) -> schemas.AnuncioGeracaoResponse:
    alertas = json.loads(g.alertas_json) if g.alertas_json else []
    return schemas.AnuncioGeracaoResponse(
        id=g.id, imovel_anuncio_id=g.imovel_anuncio_id, status=g.status,
        publico_alvo=g.publico_alvo, alertas=alertas, gerado_por_ia=bool(g.gerado_por_ia),
        modelo_ia=g.modelo_ia, prompt_versao=g.prompt_versao,
        materiais=[_material_response(m) for m in g.materiais],
        artes=[_arte_response(a) for a in g.artes], criado_em=g.criado_em,
    )


def validar(db: Session, req: schemas.AnuncioValidarRequest, imobiliaria_id: int) -> schemas.AnuncioValidacaoResponse:
    imovel = _obter_imovel(db, req.imovel_anuncio_id, imobiliaria_id)
    r = validar_pre_geracao(imovel, overrides=req.config.overrides, gerar_artes=req.config.gerar_artes)
    return schemas.AnuncioValidacaoResponse(**r.to_dict())


def sugerir_hashtags(
    db: Session, req: schemas.HashtagSugerirRequest, imobiliaria_id: int,
) -> schemas.HashtagSugerirResponse:
    imovel = _obter_imovel(db, req.imovel_anuncio_id, imobiliaria_id)
    canal = req.canal if req.canal in ("instagram", "facebook") else "instagram"
    dados = dados_imovel_de_anuncio(imovel)
    dados["finalidade"] = imovel.finalidade or "venda"
    return ia_anuncios.sugerir_hashtags_ia(dados, canal)


def _subtitulo_arte(dados: dict) -> str:
    partes = [dados.get("tipo_imovel")]
    specs = []
    if dados.get("quartos"):
        specs.append(f"{dados['quartos']} quartos")
    if dados.get("suites"):
        specs.append(f"{dados['suites']} suítes")
    if dados.get("area_imovel"):
        specs.append(f"{int(dados['area_imovel'])} m²")
    if specs:
        partes.append(" · ".join(specs))
    fin = "à venda" if dados.get("finalidade") == "venda" else "para locação"
    return f"{' '.join(p for p in partes if p)} {fin}.".strip()


def _gerar_artes(db, geracao, imovel, config, imobiliaria, dados) -> list[str]:
    erros = []
    if not config.gerar_artes:
        return erros
    if not imovel.foto_fachada_caminho:
        erros.append("Sem foto de fachada para artes.")
        return erros

    foto_path = UPLOADS_ROOT / imovel.foto_fachada_caminho
    logo_rel = imobiliaria.marca_dagua_caminho if imobiliaria and imobiliaria.marca_dagua_caminho else None
    logo_path = UPLOADS_ROOT / logo_rel if logo_rel else None
    local = ", ".join(p for p in [dados.get("bairro"), dados.get("cidade")] if p) or "Localização informada"
    headline = (
        dados.get("titulo_anuncio")
        or imovel.titulo_anuncio
        or f"{dados.get('tipo_imovel', 'Imóvel')} em {dados.get('bairro') or 'destaque'}"
    )
    mensagem = config.mensagem_arte or _subtitulo_arte(dados)

    specs_txt = _specs_arte_texto(dados)
    preco_fmt = _formatar_preco(dados)
    foto_bytes = foto_path.read_bytes() if foto_path.exists() else None

    for formato in config.formatos_arte or ["feed", "stories"]:
        arte = models.AnuncioArte(geracao_id=geracao.id, formato=formato, foto_origem_id=imovel.id, status="processando")
        db.add(arte)
        db.flush()
        try:
            gerado_ia = False
            if config.gerar_artes_ia and foto_bytes:
                try:
                    prompt_ctx = montar_dados_arte_prompt(
                        formato=formato,
                        dados_imovel=dados,
                        headline=headline,
                        preco=preco_fmt,
                        config=config,
                        imobiliaria=imobiliaria,
                    )
                    logo_bytes = logo_path.read_bytes() if config.exibir_logo_arte and logo_path and logo_path.exists() else None
                    ia_res = gerar_arte_ia(foto_bytes, prompt_ctx, logo_bytes=logo_bytes)
                    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
                    dest = UPLOADS_DIR / f"arte_{uuid.uuid4().hex[:12]}.jpg"
                    dest.write_bytes(ia_res.jpeg_bytes)
                    w, h = FORMATOS[formato]
                    gerado_ia = True
                except ArteIaIndisponivel as exc:
                    erros.append(f"Arte {formato}: {exc}")
                    dest, w, h = renderizar_arte(
                        foto_path=foto_path,
                        formato=formato,
                        headline=headline,
                        subtitulo=_subtitulo_arte(dados),
                        mensagem=mensagem,
                        preco=preco_fmt,
                        localizacao=local,
                        endereco=dados.get("endereco") or "",
                        finalidade=dados.get("finalidade") or "venda",
                        tipo_imovel=dados.get("tipo_imovel") or "Imóvel",
                        area_m2=dados.get("area_imovel"),
                        quartos=dados.get("quartos"),
                        banheiros=dados.get("banheiros"),
                        vagas=dados.get("vagas"),
                        cta=config.cta or "Agende sua visita",
                        nome_imobiliaria=config.nome_imobiliaria or (imobiliaria.nome if imobiliaria else ""),
                        cor_destaque=config.cor_destaque or (imobiliaria.cor_destaque_laudo if imobiliaria else "#F59E0B"),
                        contato=config.contato or "",
                        logo_path=logo_path if config.exibir_logo_arte else None,
                        exibir_logo=config.exibir_logo_arte,
                        exibir_nome_imobiliaria=config.exibir_nome_imobiliaria_arte,
                    )
            else:
                dest, w, h = renderizar_arte(
                    foto_path=foto_path,
                    formato=formato,
                    headline=headline,
                    subtitulo=_subtitulo_arte(dados),
                    mensagem=mensagem,
                    preco=preco_fmt,
                    localizacao=local,
                    endereco=dados.get("endereco") or "",
                    finalidade=dados.get("finalidade") or "venda",
                    tipo_imovel=dados.get("tipo_imovel") or "Imóvel",
                    area_m2=dados.get("area_imovel"),
                    quartos=dados.get("quartos"),
                    banheiros=dados.get("banheiros"),
                    vagas=dados.get("vagas"),
                    cta=config.cta or "Agende sua visita",
                    nome_imobiliaria=config.nome_imobiliaria or (imobiliaria.nome if imobiliaria else ""),
                    cor_destaque=config.cor_destaque or (imobiliaria.cor_destaque_laudo if imobiliaria else "#F59E0B"),
                    contato=config.contato or "",
                    logo_path=logo_path if config.exibir_logo_arte else None,
                    exibir_logo=config.exibir_logo_arte,
                    exibir_nome_imobiliaria=config.exibir_nome_imobiliaria_arte,
                )
            arte.caminho_relativo = dest.relative_to(UPLOADS_ROOT).as_posix().replace("\\", "/")
            arte.largura, arte.altura, arte.status = w, h, "ok"
            arte.gerado_por_ia = 1 if gerado_ia else 0
        except Exception as exc:
            arte.status, arte.erro = "falha", str(exc)[:500]
            erros.append(str(exc))
    return erros


def criar_geracao(db: Session, req: schemas.AnuncioGeracaoCreateRequest, usuario: models.Usuario) -> schemas.AnuncioGeracaoResponse:
    imovel = _obter_imovel(db, req.imovel_anuncio_id, usuario.imobiliaria_id)
    imobiliaria = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == usuario.imobiliaria_id).first()
    config = req.config
    if imobiliaria:
        if not config.nome_imobiliaria:
            config = config.model_copy(update={"nome_imobiliaria": imobiliaria.nome})
        if not config.cor_destaque:
            config = config.model_copy(update={"cor_destaque": imobiliaria.cor_destaque_laudo or "#F59E0B"})

    validacao = validar_pre_geracao(imovel, overrides=config.overrides, gerar_artes=config.gerar_artes)
    if not validacao.pode_gerar_textos:
        raise HTTPException(status_code=400, detail={"mensagem": "Dados insuficientes.", "validacao": validacao.to_dict()})

    dados = dados_imovel_de_anuncio(imovel, config.overrides)
    dados["preco"] = _formatar_preco(dados)
    dados["finalidade"] = config.finalidade or imovel.finalidade

    geracao = models.AnuncioGeracao(
        imobiliaria_id=usuario.imobiliaria_id,
        usuario_id=usuario.id,
        imovel_anuncio_id=imovel.id,
        status="processando",
        config_json=config.model_dump_json(),
        prompt_versao=ia_anuncios.PROMPT_VERSAO,
    )
    db.add(geracao)
    db.flush()

    erros = list(validacao.alertas)
    try:
        ia_resp = ia_anuncios.gerar_anuncios_ia(config, dados)
        erros.extend(ia_resp.alertas_gerais or [])
        erros.extend(validar_pos_geracao({"canais": {m.canal: m.conteudo_json or {} for m in ia_resp.materiais}}, dados))
        geracao.publico_alvo = ia_resp.publico_alvo
        geracao.gerado_por_ia = 1 if ia_resp.gerado_por_ia else 0
        geracao.modelo_ia = ia_resp.modelo
        for mat in ia_resp.materiais:
            db.add(models.AnuncioMaterial(
                geracao_id=geracao.id, canal=mat.canal, variante=mat.variante,
                titulo=mat.titulo, corpo=mat.corpo, cta=mat.cta, hashtags=mat.hashtags,
                conteudo_json=json.dumps(mat.conteudo_json or {}, ensure_ascii=False),
                alertas_json=json.dumps(mat.alertas, ensure_ascii=False),
                status="alerta" if mat.alertas else "ok",
            ))
        erros.extend(_gerar_artes(db, geracao, imovel, config, imobiliaria, dados))
        geracao.alertas_json = json.dumps(erros, ensure_ascii=False)
        geracao.status = "falha_parcial" if erros and geracao.materiais else ("falha" if not geracao.materiais else "concluido")
    except Exception as exc:
        geracao.status = "falha"
        geracao.alertas_json = json.dumps([str(exc)], ensure_ascii=False)

    db.commit()
    db.refresh(geracao)
    return _geracao_response(geracao)


def listar_geracoes(db: Session, imobiliaria_id: int) -> list[schemas.AnuncioGeracaoResumoResponse]:
    rows = (
        db.query(models.AnuncioGeracao, models.ImovelAnuncio)
        .outerjoin(models.ImovelAnuncio, models.ImovelAnuncio.id == models.AnuncioGeracao.imovel_anuncio_id)
        .filter(models.AnuncioGeracao.imobiliaria_id == imobiliaria_id)
        .order_by(models.AnuncioGeracao.criado_em.desc())
        .limit(50)
        .all()
    )
    return [
        schemas.AnuncioGeracaoResumoResponse(
            id=g.id, imovel_anuncio_id=g.imovel_anuncio_id, status=g.status,
            tipo_imovel=i.tipo if i else None, bairro=i.bairro if i else None,
            titulo=i.titulo or i.titulo_anuncio if i else None, criado_em=g.criado_em,
        )
        for g, i in rows
    ]


def obter_geracao(db: Session, geracao_id: int, imobiliaria_id: int) -> schemas.AnuncioGeracaoResponse:
    g = db.query(models.AnuncioGeracao).filter(
        models.AnuncioGeracao.id == geracao_id, models.AnuncioGeracao.imobiliaria_id == imobiliaria_id,
    ).first()
    if not g:
        raise HTTPException(status_code=404, detail="Geração não encontrada.")
    return _geracao_response(g)


def _salvar_historico(material: models.AnuncioMaterial) -> None:
    hist = json.loads(material.historico_json) if material.historico_json else []
    hist.append({"versao": material.versao, "corpo": material.corpo, "titulo": material.titulo})
    material.historico_json = json.dumps(hist[-10:], ensure_ascii=False)


def atualizar_material(db, material_id, imobiliaria_id, patch) -> schemas.AnuncioMaterialResponse:
    m = db.query(models.AnuncioMaterial).join(models.AnuncioGeracao).filter(
        models.AnuncioMaterial.id == material_id, models.AnuncioGeracao.imobiliaria_id == imobiliaria_id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Material não encontrado.")
    _salvar_historico(m)
    for f in ("titulo", "corpo", "cta", "hashtags"):
        v = getattr(patch, f)
        if v is not None:
            setattr(m, f, v)
    m.versao += 1
    m.editado_manualmente = 1
    db.commit()
    db.refresh(m)
    return _material_response(m)


def regenerar_material(db, geracao_id, imobiliaria_id, req) -> schemas.AnuncioMaterialResponse:
    g = db.query(models.AnuncioGeracao).filter(
        models.AnuncioGeracao.id == geracao_id, models.AnuncioGeracao.imobiliaria_id == imobiliaria_id,
    ).first()
    if not g or not g.imovel_anuncio_id:
        raise HTTPException(status_code=404, detail="Geração não encontrada.")
    m = next((x for x in g.materiais if x.canal == req.canal and x.variante == req.variante), None)
    if not m:
        raise HTTPException(status_code=404, detail="Material não encontrado.")
    imovel = _obter_imovel(db, g.imovel_anuncio_id, imobiliaria_id)
    config = schemas.AnuncioGeracaoConfig.model_validate_json(g.config_json or "{}")
    config = config.model_copy(update={"canais": [req.canal]})
    dados = dados_imovel_de_anuncio(imovel, config.overrides)
    dados["preco"] = _formatar_preco(dados)
    _salvar_historico(m)
    ia_resp = ia_anuncios.gerar_anuncios_ia(config, dados)
    novo = next((x for x in ia_resp.materiais if x.canal == req.canal), ia_resp.materiais[0] if ia_resp.materiais else None)
    if not novo:
        raise HTTPException(status_code=502, detail="IA não retornou material.")
    m.titulo, m.corpo, m.cta, m.hashtags = novo.titulo, novo.corpo, novo.cta, novo.hashtags
    m.versao += 1
    db.commit()
    db.refresh(m)
    return _material_response(m)


def regenerar_arte(db, geracao_id, imobiliaria_id, req) -> schemas.AnuncioArteResponse:
    g = db.query(models.AnuncioGeracao).filter(
        models.AnuncioGeracao.id == geracao_id, models.AnuncioGeracao.imobiliaria_id == imobiliaria_id,
    ).first()
    if not g or not g.imovel_anuncio_id:
        raise HTTPException(status_code=404, detail="Geração não encontrada.")
    imovel = _obter_imovel(db, g.imovel_anuncio_id, imobiliaria_id)
    imobiliaria = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == imobiliaria_id).first()
    config = schemas.AnuncioGeracaoConfig.model_validate_json(g.config_json or "{}")
    config = config.model_copy(update={"gerar_artes": True, "formatos_arte": [req.formato]})
    dados = dados_imovel_de_anuncio(imovel, config.overrides)
    dados["preco"] = _formatar_preco(dados)
    old = next((a for a in g.artes if a.formato == req.formato), None)
    if old:
        db.delete(old)
        db.flush()
    _gerar_artes(db, g, imovel, config, imobiliaria, dados)
    db.commit()
    db.refresh(g)
    nova = next((a for a in g.artes if a.formato == req.formato), None)
    if not nova:
        raise HTTPException(status_code=500, detail="Falha ao regenerar arte.")
    return _arte_response(nova)


def _estrategia_material(material: models.AnuncioMaterial) -> str:
    try:
        data = json.loads(material.conteudo_json or "{}")
        return data.get("estrategia") or material.variante
    except json.JSONDecodeError:
        return material.variante


def registrar_evento(
    db: Session, imobiliaria_id: int, req: schemas.AnuncioEventoCreateRequest,
) -> None:
    material = None
    geracao_id = req.geracao_id
    canal = None
    variante = None
    estrategia = None

    if req.material_id:
        material = db.query(models.AnuncioMaterial).join(models.AnuncioGeracao).filter(
            models.AnuncioMaterial.id == req.material_id,
            models.AnuncioGeracao.imobiliaria_id == imobiliaria_id,
        ).first()
        if not material:
            raise HTTPException(status_code=404, detail="Material não encontrado.")
        geracao_id = material.geracao_id
        canal = material.canal
        variante = material.variante
        estrategia = _estrategia_material(material)

    db.add(models.AnuncioEvento(
        imobiliaria_id=imobiliaria_id,
        geracao_id=geracao_id,
        material_id=req.material_id,
        arte_id=req.arte_id,
        tipo=req.tipo,
        canal=canal,
        variante=variante,
        estrategia=estrategia,
        lead_id=req.lead_id,
        conversa_id=req.conversa_id,
    ))
    db.commit()


def escolher_material(db: Session, material_id: int, imobiliaria_id: int) -> schemas.AnuncioMaterialResponse:
    registrar_evento(db, imobiliaria_id, schemas.AnuncioEventoCreateRequest(
        tipo="versao_escolhida", material_id=material_id,
    ))
    m = db.query(models.AnuncioMaterial).join(models.AnuncioGeracao).filter(
        models.AnuncioMaterial.id == material_id,
        models.AnuncioGeracao.imobiliaria_id == imobiliaria_id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Material não encontrado.")
    return _material_response(m)


def obter_desempenho(db: Session, imobiliaria_id: int) -> schemas.AnuncioDesempenhoResponse:
    total_ger = db.query(models.AnuncioGeracao).filter(
        models.AnuncioGeracao.imobiliaria_id == imobiliaria_id,
    ).count()
    eventos = db.query(models.AnuncioEvento).filter(
        models.AnuncioEvento.imobiliaria_id == imobiliaria_id,
    ).all()

    stats: dict[str, dict[str, dict[str, int]]] = {}
    for ev in eventos:
        canal = ev.canal or "geral"
        var = ev.variante or "principal"
        estr = ev.estrategia or var
        stats.setdefault(canal, {}).setdefault(var, {"estrategia": estr, "escolhas": 0, "copias": 0, "conversas": 0, "visitas": 0})
        bucket = stats[canal][var]
        if ev.tipo == "versao_escolhida":
            bucket["escolhas"] += 1
        elif ev.tipo == "copia_copiada":
            bucket["copias"] += 1
        elif ev.tipo == "conversa_iniciada":
            bucket["conversas"] += 1
        elif ev.tipo == "visita_agendada":
            bucket["visitas"] += 1

    canais_resp = []
    for canal, vars_map in sorted(stats.items()):
        variantes = [
            schemas.AnuncioDesempenhoVariante(
                variante=var,
                estrategia=data["estrategia"],
                escolhas=data["escolhas"],
                copias=data["copias"],
                conversas=data["conversas"],
                visitas=data["visitas"],
            )
            for var, data in sorted(vars_map.items())
        ]
        canais_resp.append(schemas.AnuncioDesempenhoCanal(canal=canal, variantes=variantes))

    return schemas.AnuncioDesempenhoResponse(
        total_geracoes=total_ger,
        total_eventos=len(eventos),
        canais=canais_resp,
    )
