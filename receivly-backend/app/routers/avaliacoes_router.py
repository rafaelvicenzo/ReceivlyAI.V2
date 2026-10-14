from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
import json

from app import models, schemas, auth, calculo_avaliacao, fotos_avaliacao, documentos_avaliacao, quesitos_avaliacao, pesquisa_mercado, localizacao, fatores_ia, branding_avaliacao, geracao_laudo, usage_limits, ia_laudo, gemini_client
from app.comparaveis_demo import pesquisar_comparaveis_demo
from app.config import settings
from app.perfil import eh_admin

router = APIRouter(prefix="/avaliacoes", tags=["Avaliação Imobiliária"])

TAMANHO_MAXIMO_FOTO_MB = 15
TAMANHO_MAXIMO_DOCUMENTO_MB = 15


def _url_foto(foto: models.FotoAvaliacao) -> str:
    return f"/uploads/{foto.caminho_relativo}"


def _foto_response(foto: models.FotoAvaliacao) -> schemas.FotoResponse:
    return schemas.FotoResponse(
        id=foto.id,
        nome_arquivo=foto.nome_arquivo,
        categoria=foto.categoria,
        ordem=foto.ordem,
        tamanho_original=foto.tamanho_original,
        tamanho_otimizado=foto.tamanho_otimizado,
        url=_url_foto(foto),
    )


def _url_documento(doc: models.DocumentoAvaliacao) -> str:
    return f"/uploads/{doc.caminho_relativo}"


def _documento_response(doc: models.DocumentoAvaliacao) -> schemas.DocumentoResponse:
    return schemas.DocumentoResponse(
        id=doc.id,
        nome_arquivo=doc.nome_arquivo,
        descricao=doc.descricao,
        content_type=doc.content_type,
        tamanho_bytes=doc.tamanho_bytes,
        url=_url_documento(doc),
    )


def _comparavel_response(comparavel: models.ComparavelAvaliacao) -> schemas.ComparavelResponse:
    justificativas = None
    if comparavel.justificativas_fatores:
        try:
            justificativas = json.loads(comparavel.justificativas_fatores)
        except json.JSONDecodeError:
            justificativas = None

    return schemas.ComparavelResponse(
        id=comparavel.id,
        avaliacao_id=comparavel.avaliacao_id,
        endereco=comparavel.endereco,
        bairro=comparavel.bairro,
        cidade=comparavel.cidade,
        area=comparavel.area,
        quartos=comparavel.quartos,
        banheiros=comparavel.banheiros,
        vagas=comparavel.vagas,
        valor=comparavel.valor,
        fonte=comparavel.fonte,
        distancia=comparavel.distancia,
        latitude=comparavel.latitude,
        longitude=comparavel.longitude,
        observacoes=comparavel.observacoes,
        link=comparavel.link,
        descricao_anuncio=comparavel.descricao_anuncio,
        padrao_construtivo=comparavel.padrao_construtivo,
        idade_anos=comparavel.idade_anos,
        estado_conservacao=comparavel.estado_conservacao,
        testada_m=comparavel.testada_m,
        fator_local=comparavel.fator_local,
        fator_area=comparavel.fator_area,
        fator_depreciacao=comparavel.fator_depreciacao,
        fator_padrao=comparavel.fator_padrao,
        fator_testada=comparavel.fator_testada,
        fatores_calculados_por_ia=bool(comparavel.fatores_calculados_por_ia),
        fatores_editados_manualmente=bool(comparavel.fatores_editados_manualmente),
        justificativas_fatores=justificativas,
    )


def _avaliacao_detalhe(
    avaliacao: models.Avaliacao,
    db: Session,
) -> schemas.AvaliacaoDetalheResponse:
    return schemas.AvaliacaoDetalheResponse(
        id=avaliacao.id,
        status=avaliacao.status,
        endereco=avaliacao.endereco,
        numero=avaliacao.numero,
        complemento=avaliacao.complemento,
        bairro=avaliacao.bairro,
        cidade=avaliacao.cidade,
        estado=avaliacao.estado,
        cep=avaliacao.cep,
        matricula=avaliacao.matricula,
        tipo=avaliacao.tipo,
        area_imovel=avaliacao.area_imovel,
        area_terreno=avaliacao.area_terreno,
        quartos=avaliacao.quartos,
        banheiros=avaliacao.banheiros,
        vagas=avaliacao.vagas,
        caracteristicas=avaliacao.caracteristicas,
        observacoes=avaliacao.observacoes,
        padrao_construtivo=avaliacao.padrao_construtivo or "normal",
        idade_anos=avaliacao.idade_anos,
        estado_conservacao=avaliacao.estado_conservacao,
        testada_m=avaliacao.testada_m,
        testada_referencia_m=avaliacao.testada_referencia_m or 10.0,
        vida_util_anos=avaliacao.vida_util_anos or 60.0,
        valor_final=avaliacao.valor_final,
        latitude=avaliacao.latitude,
        longitude=avaliacao.longitude,
        comparaveis=[_comparavel_response(c) for c in avaliacao.comparaveis],
        fotos=[_foto_response(f) for f in avaliacao.fotos],
        documentos=[_documento_response(d) for d in avaliacao.documentos],
        incluir_anexo_quesitos=bool(avaliacao.incluir_anexo_quesitos),
        respostas_quesitos=avaliacao.respostas_quesitos,
        quesitos_arquivo_nome=avaliacao.quesitos_arquivo_nome,
        quesitos_arquivo_url=quesitos_avaliacao.url_quesitos(avaliacao.quesitos_arquivo_caminho),
        usage=usage_limits.build_usage_snapshot(db, avaliacao.imobiliaria_id, avaliacao),
        criado_em=avaliacao.criado_em,
        atualizado_em=avaliacao.atualizado_em,
    )


def _buscar_avaliacao(avaliacao_id: int, usuario_atual: models.Usuario, db: Session) -> models.Avaliacao:
    avaliacao = (
        db.query(models.Avaliacao)
        .filter(models.Avaliacao.id == avaliacao_id, models.Avaliacao.imobiliaria_id == usuario_atual.imobiliaria_id)
        .first()
    )
    if not avaliacao:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")
    return avaliacao


# ---------- Branding (logo no laudo e template) ----------

@router.get("/branding", response_model=schemas.BrandingResponse)
def obter_branding(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    imob = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == usuario_atual.imobiliaria_id).first()
    return branding_avaliacao.branding_response(imob)


@router.patch("/branding", response_model=schemas.BrandingResponse)
def atualizar_branding(
    dados: schemas.BrandingConfigUpdate,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    imob = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == usuario_atual.imobiliaria_id).first()
    if dados.exibir_logo_laudo is not None:
        imob.usar_marca_dagua = 1 if dados.exibir_logo_laudo else 0
    if dados.ocultar_cabecalho_laudo is not None:
        imob.ocultar_cabecalho_laudo = 1 if dados.ocultar_cabecalho_laudo else 0
    if dados.cor_destaque_laudo is not None:
        imob.cor_destaque_laudo = dados.cor_destaque_laudo
    db.commit()
    db.refresh(imob)
    return branding_avaliacao.branding_response(imob)


@router.post("/branding/logo-laudo", response_model=schemas.BrandingResponse)
async def enviar_logo_laudo(
    arquivo: UploadFile = File(...),
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    imob = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == usuario_atual.imobiliaria_id).first()
    conteudo = await arquivo.read()
    try:
        imob.marca_dagua_caminho = branding_avaliacao.salvar_logo_laudo(imob.id, arquivo.filename, conteudo)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.commit()
    db.refresh(imob)
    return branding_avaliacao.branding_response(imob)


@router.post("/branding/template-laudo", response_model=schemas.BrandingResponse)
async def enviar_template_laudo(
    arquivo: UploadFile = File(...),
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    imob = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == usuario_atual.imobiliaria_id).first()
    conteudo = await arquivo.read()
    try:
        caminho, nome = branding_avaliacao.salvar_template_laudo(imob.id, arquivo.filename, conteudo)
        imob.template_laudo_caminho = caminho
        imob.template_laudo_nome = nome
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.commit()
    db.refresh(imob)
    return branding_avaliacao.branding_response(imob)


# ---------- Localização (CEP, geocodificação, mapa) ----------

@router.get("/cep/{cep}", response_model=schemas.CepConsultaResponse)
async def consultar_cep(
    cep: str,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
):
    try:
        return await localizacao.consultar_cep(cep)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="Não foi possível consultar o CEP no momento.")


@router.get("/geocodificar", response_model=schemas.GeocodificacaoResponse)
async def geocodificar_endereco(
    endereco: str | None = Query(None),
    numero: str | None = Query(None),
    bairro: str | None = Query(None),
    cidade: str | None = Query(None),
    estado: str | None = Query(None),
    cep: str | None = Query(None),
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
):
    return await localizacao.geocodificar(endereco, numero, bairro, cidade, estado, cep)


# ---------- Avaliação (CRUD básico) ----------

@router.post("/", response_model=schemas.AvaliacaoDetalheResponse)
def criar_avaliacao(
    dados: schemas.AvaliacaoImovelDados,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    usage_limits.assert_can_create_appraisal(db, usuario_atual.imobiliaria_id, usuario_atual)
    avaliacao = models.Avaliacao(imobiliaria_id=usuario_atual.imobiliaria_id, **dados.model_dump())
    db.add(avaliacao)
    db.commit()
    db.refresh(avaliacao)
    return _avaliacao_detalhe(avaliacao, db)


@router.get("/", response_model=list[schemas.AvaliacaoResumoResponse])
def listar_avaliacoes(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacoes = (
        db.query(models.Avaliacao)
        .filter(models.Avaliacao.imobiliaria_id == usuario_atual.imobiliaria_id)
        .order_by(models.Avaliacao.atualizado_em.desc())
        .all()
    )
    return [schemas.AvaliacaoResumoResponse.model_validate(a) for a in avaliacoes]


@router.get("/{avaliacao_id}", response_model=schemas.AvaliacaoDetalheResponse)
def obter_avaliacao(
    avaliacao_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return _avaliacao_detalhe(_buscar_avaliacao(avaliacao_id, usuario_atual, db), db)


@router.patch("/{avaliacao_id}", response_model=schemas.AvaliacaoDetalheResponse)
def atualizar_avaliacao(
    avaliacao_id: int,
    dados: schemas.AvaliacaoImovelDados,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    for campo, valor in dados.model_dump().items():
        setattr(avaliacao, campo, valor)
    db.commit()
    db.refresh(avaliacao)
    return _avaliacao_detalhe(avaliacao, db)


@router.delete("/{avaliacao_id}")
def excluir_avaliacao(
    avaliacao_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    for foto in avaliacao.fotos:
        fotos_avaliacao.remover_foto(foto.caminho_relativo)
    for doc in avaliacao.documentos:
        documentos_avaliacao.remover_documento(doc.caminho_relativo)
    quesitos_avaliacao.remover_quesitos_pdf(avaliacao.quesitos_arquivo_caminho)
    db.delete(avaliacao)
    db.commit()
    return {"ok": True}


@router.post("/{avaliacao_id}/concluir", response_model=schemas.AvaliacaoDetalheResponse)
def concluir_avaliacao(
    avaliacao_id: int,
    dados: schemas.ConcluirAvaliacaoRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    avaliacao.status = "Concluída"
    avaliacao.valor_final = dados.valor_final
    db.commit()
    db.refresh(avaliacao)
    return _avaliacao_detalhe(avaliacao, db)


# ---------- Comparáveis ----------

async def _geocodificar_comparavel(
    comparavel: models.ComparavelAvaliacao,
    avaliacao: models.Avaliacao,
) -> None:
    if comparavel.latitude is not None and comparavel.longitude is not None:
        return
    geo = await localizacao.geocodificar(
        comparavel.endereco,
        None,
        comparavel.bairro or avaliacao.bairro,
        comparavel.cidade or avaliacao.cidade,
        avaliacao.estado,
        avaliacao.cep,
    )
    if geo.latitude is None or geo.longitude is None:
        return
    comparavel.latitude = geo.latitude
    comparavel.longitude = geo.longitude
    if avaliacao.latitude and avaliacao.longitude and not comparavel.distancia:
        km = localizacao.distancia_km(
            avaliacao.latitude, avaliacao.longitude, geo.latitude, geo.longitude
        )
        comparavel.distancia = f"{km:.1f}".replace(".", ",")


@router.post("/{avaliacao_id}/comparaveis", response_model=schemas.ComparavelResponse)
async def adicionar_comparavel(
    avaliacao_id: int,
    dados: schemas.ComparavelCreate,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    comparavel = models.ComparavelAvaliacao(avaliacao_id=avaliacao.id, **dados.model_dump())
    await _geocodificar_comparavel(comparavel, avaliacao)
    db.add(comparavel)
    db.commit()
    db.refresh(comparavel)
    return _comparavel_response(comparavel)


@router.post("/{avaliacao_id}/comparaveis/geocodificar", response_model=list[schemas.ComparavelResponse])
async def geocodificar_comparaveis(
    avaliacao_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    """Geocodifica comparáveis sem coordenadas (endereço → lat/lng no mapa)."""
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    for comparavel in avaliacao.comparaveis:
        await _geocodificar_comparavel(comparavel, avaliacao)
    db.commit()
    return [_comparavel_response(c) for c in avaliacao.comparaveis]


@router.patch("/{avaliacao_id}/comparaveis/{comparavel_id}", response_model=schemas.ComparavelResponse)
def atualizar_comparavel(
    avaliacao_id: int,
    comparavel_id: int,
    dados: schemas.ComparavelUpdate,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    comparavel = next((c for c in avaliacao.comparaveis if c.id == comparavel_id), None)
    if not comparavel:
        raise HTTPException(status_code=404, detail="Comparável não encontrado.")

    alteracoes = dados.model_dump(exclude_unset=True)
    if not alteracoes:
        return _comparavel_response(comparavel)

    recalcular_fatores = any(k in alteracoes for k in ("area", "valor", "padrao_construtivo", "idade_anos", "estado_conservacao", "testada_m"))
    for campo, valor in alteracoes.items():
        setattr(comparavel, campo, valor)

    if recalcular_fatores:
        comparavel.fator_local = None
        comparavel.fator_area = None
        comparavel.fator_depreciacao = None
        comparavel.fator_padrao = None
        comparavel.fator_testada = None
        comparavel.fatores_calculados_por_ia = 0
        comparavel.fatores_editados_manualmente = 0
        comparavel.justificativas_fatores = None

    db.commit()
    db.refresh(comparavel)
    return _comparavel_response(comparavel)


@router.patch("/{avaliacao_id}/comparaveis/{comparavel_id}/coordenadas", response_model=schemas.ComparavelResponse)
def atualizar_coordenadas_comparavel(
    avaliacao_id: int,
    comparavel_id: int,
    dados: schemas.ComparavelCoordenadasUpdate,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    comparavel = next((c for c in avaliacao.comparaveis if c.id == comparavel_id), None)
    if not comparavel:
        raise HTTPException(status_code=404, detail="Comparável não encontrado.")
    comparavel.latitude = dados.latitude
    comparavel.longitude = dados.longitude
    if avaliacao.latitude and avaliacao.longitude:
        km = localizacao.distancia_km(
            avaliacao.latitude, avaliacao.longitude, dados.latitude, dados.longitude
        )
        comparavel.distancia = f"{km:.1f}".replace(".", ",")
    db.commit()
    db.refresh(comparavel)
    return _comparavel_response(comparavel)


@router.patch("/{avaliacao_id}/comparaveis/{comparavel_id}/fatores", response_model=schemas.ComparavelResponse)
def atualizar_fatores_comparavel(
    avaliacao_id: int,
    comparavel_id: int,
    dados: schemas.FatoresComparavelUpdate,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    comparavel = next((c for c in avaliacao.comparaveis if c.id == comparavel_id), None)
    if not comparavel:
        raise HTTPException(status_code=404, detail="Comparável não encontrado.")

    for campo, valor in dados.model_dump().items():
        setattr(comparavel, campo, max(0.75, min(1.25, valor)))

    comparavel.fatores_editados_manualmente = 1
    comparavel.fatores_calculados_por_ia = 1
    db.commit()
    db.refresh(comparavel)
    return _comparavel_response(comparavel)


@router.delete("/{avaliacao_id}/comparaveis/{comparavel_id}")
def remover_comparavel(
    avaliacao_id: int,
    comparavel_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    comparavel = next((c for c in avaliacao.comparaveis if c.id == comparavel_id), None)
    if not comparavel:
        raise HTTPException(status_code=404, detail="Comparável não encontrado.")
    db.delete(comparavel)
    db.commit()
    return {"ok": True}


# ---------- Fotos ----------

@router.post("/{avaliacao_id}/fotos", response_model=schemas.FotoResponse)
async def enviar_foto(
    avaliacao_id: int,
    arquivo: UploadFile = File(...),
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)

    if not arquivo.content_type or not arquivo.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Envie um arquivo de imagem.")

    conteudo = await arquivo.read()
    if len(conteudo) > TAMANHO_MAXIMO_FOTO_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Imagem maior que {TAMANHO_MAXIMO_FOTO_MB}MB.")

    metadados = fotos_avaliacao.salvar_foto_otimizada(avaliacao.id, arquivo.filename, conteudo)

    proxima_ordem = len(avaliacao.fotos)
    foto = models.FotoAvaliacao(avaliacao_id=avaliacao.id, ordem=proxima_ordem, **metadados)
    db.add(foto)
    db.commit()
    db.refresh(foto)
    return _foto_response(foto)


@router.patch("/{avaliacao_id}/fotos/{foto_id}", response_model=schemas.FotoResponse)
def atualizar_foto(
    avaliacao_id: int,
    foto_id: int,
    dados: schemas.FotoUpdateRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    foto = next((f for f in avaliacao.fotos if f.id == foto_id), None)
    if not foto:
        raise HTTPException(status_code=404, detail="Foto não encontrada.")

    if dados.categoria is not None:
        foto.categoria = dados.categoria
    if dados.ordem is not None:
        foto.ordem = dados.ordem

    db.commit()
    db.refresh(foto)
    return _foto_response(foto)


@router.delete("/{avaliacao_id}/fotos/{foto_id}")
def remover_foto(
    avaliacao_id: int,
    foto_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    foto = next((f for f in avaliacao.fotos if f.id == foto_id), None)
    if not foto:
        raise HTTPException(status_code=404, detail="Foto não encontrada.")

    fotos_avaliacao.remover_foto(foto.caminho_relativo)
    db.delete(foto)
    db.commit()
    return {"ok": True}


# ---------- Documentos anexos ----------

@router.post("/{avaliacao_id}/documentos", response_model=schemas.DocumentoResponse)
async def enviar_documento(
    avaliacao_id: int,
    arquivo: UploadFile = File(...),
    descricao: str = Form(""),
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    conteudo = await arquivo.read()
    if len(conteudo) > TAMANHO_MAXIMO_DOCUMENTO_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Arquivo maior que {TAMANHO_MAXIMO_DOCUMENTO_MB}MB.")

    try:
        metadados = documentos_avaliacao.salvar_documento(avaliacao.id, arquivo.filename or "documento", conteudo)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    doc = models.DocumentoAvaliacao(
        avaliacao_id=avaliacao.id,
        descricao=descricao.strip() or None,
        content_type=arquivo.content_type,
        ordem=len(avaliacao.documentos),
        **metadados,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _documento_response(doc)


@router.delete("/{avaliacao_id}/documentos/{documento_id}")
def remover_documento(
    avaliacao_id: int,
    documento_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    doc = next((d for d in avaliacao.documentos if d.id == documento_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    documentos_avaliacao.remover_documento(doc.caminho_relativo)
    db.delete(doc)
    db.commit()
    return {"ok": True}


# ---------- Anexo III — Quesitos ----------

@router.patch("/{avaliacao_id}/quesitos", response_model=schemas.AvaliacaoDetalheResponse)
def atualizar_quesitos(
    avaliacao_id: int,
    dados: schemas.QuesitosUpdateRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    payload = dados.model_dump(exclude_unset=True)
    if "incluir_anexo_quesitos" in payload:
        avaliacao.incluir_anexo_quesitos = 1 if payload["incluir_anexo_quesitos"] else 0
    if "respostas_quesitos" in payload:
        avaliacao.respostas_quesitos = payload["respostas_quesitos"]
    db.commit()
    db.refresh(avaliacao)
    return _avaliacao_detalhe(avaliacao, db)


@router.post("/{avaliacao_id}/quesitos/arquivo", response_model=schemas.AvaliacaoDetalheResponse)
async def enviar_quesitos_pdf(
    avaliacao_id: int,
    arquivo: UploadFile = File(...),
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    conteudo = await arquivo.read()
    if len(conteudo) > TAMANHO_MAXIMO_DOCUMENTO_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Arquivo maior que {TAMANHO_MAXIMO_DOCUMENTO_MB}MB.")

    try:
        caminho, nome = quesitos_avaliacao.salvar_quesitos_pdf(
            avaliacao.id,
            arquivo.filename or "quesitos.pdf",
            conteudo,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    quesitos_avaliacao.remover_quesitos_pdf(avaliacao.quesitos_arquivo_caminho)
    avaliacao.quesitos_arquivo_caminho = caminho
    avaliacao.quesitos_arquivo_nome = nome
    avaliacao.incluir_anexo_quesitos = 1
    db.commit()
    db.refresh(avaliacao)
    return _avaliacao_detalhe(avaliacao, db)


@router.delete("/{avaliacao_id}/quesitos/arquivo", response_model=schemas.AvaliacaoDetalheResponse)
def remover_quesitos_pdf(
    avaliacao_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    quesitos_avaliacao.remover_quesitos_pdf(avaliacao.quesitos_arquivo_caminho)
    avaliacao.quesitos_arquivo_caminho = None
    avaliacao.quesitos_arquivo_nome = None
    db.commit()
    db.refresh(avaliacao)
    return _avaliacao_detalhe(avaliacao, db)


# ---------- Pesquisa de mercado (busca real via OpenAI web_search) ----------

@router.post("/{avaliacao_id}/pesquisar-mercado", response_model=schemas.MarketSearchResponse)
def pesquisar_mercado(
    avaliacao_id: int,
    criterios: schemas.PesquisaComparaveisRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    """Busca imóveis comparáveis de verdade na web (via IA). Não salva nada —
    devolve a lista pro corretor escolher quais quer adicionar à avaliação,
    usando o endpoint /comparaveis normal em seguida."""
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    criterios = pesquisa_mercado.enriquecer_criterios(avaliacao, criterios)
    # Sempre busca o máximo permitido (evita cache antigo do front pedindo só 3)
    criterios.quantidade = settings.fair_use_max_comparables_per_search

    usar_demo = (
        settings.comparaveis_modo_demo
        or (settings.comparaveis_demo_admin and eh_admin(usuario_atual))
    )

    if usar_demo:
        resultados, meta = pesquisar_comparaveis_demo(
            criterios,
            lat_ref=avaliacao.latitude,
            lng_ref=avaliacao.longitude,
        )
    else:
        usage_limits.assert_can_run_market_search(avaliacao)
        try:
            resultados, meta = pesquisa_mercado.pesquisar_comparaveis(criterios)
        except RuntimeError as exc:
            msg = str(exc)
            if any(x in msg for x in ("429", "Cota", "quota", "busca na web", "Grounding", "GEMINI_API_KEY")):
                raise HTTPException(status_code=429, detail=msg) from exc
            raise HTTPException(status_code=502, detail=msg) from exc

        if meta.provedor != "fallback":
            usage_limits.increment_market_search_count(avaliacao, db)

    return schemas.MarketSearchResponse(
        results=resultados,
        usage=usage_limits.build_usage_snapshot(db, usuario_atual.imobiliaria_id, avaliacao),
        meta=schemas.MarketSearchMeta(**meta.__dict__),
    )


# ---------- Cálculos e resultado ----------

@router.post("/{avaliacao_id}/calcular-fatores-ia", response_model=list[schemas.ComparavelFatoresResponse])
def calcular_fatores_ia(
    avaliacao_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    usage_limits.assert_can_calculate_factors(avaliacao)
    try:
        return fatores_ia.calcular_e_salvar_fatores(avaliacao, db)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erro ao calcular fatores com IA: {exc}") from exc


@router.get("/{avaliacao_id}/resultado", response_model=schemas.ResultadoAvaliacaoResponse)
def obter_resultado(
    avaliacao_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    return calculo_avaliacao.calcular_resultado(avaliacao)


@router.post("/{avaliacao_id}/ia/texto-laudo", response_model=schemas.TextoLaudoIAResponse)
def gerar_texto_laudo_ia(
    avaliacao_id: int,
    body: schemas.TextoLaudoIARequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    if body.tipo != "perspectivas":
        raise HTTPException(status_code=400, detail="Tipo de texto não suportado.")
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    try:
        laudo_calc = calculo_avaliacao.calcular_laudo_detalhado(avaliacao)
        valor = body.valor_estimado or avaliacao.valor_final or laudo_calc.get("valor_calculado")
        texto = ia_laudo.gerar_perspectivas(
            avaliacao,
            finalidade=body.finalidade or "venda",
            texto_atual=body.texto_atual or "",
            valor_estimado=valor,
            qtd_comparaveis=len(avaliacao.comparaveis),
        )
        return schemas.TextoLaudoIAResponse(texto=texto, gerado_por_ia=gemini_client.disponivel())
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erro ao gerar texto com IA: {exc}") from exc


@router.post("/{avaliacao_id}/exportar-laudo-pdf")
def exportar_laudo_pdf(
    avaliacao_id: int,
    dados: schemas.LaudoExportRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    imob = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == usuario_atual.imobiliaria_id).first()
    try:
        conteudo, nome_arquivo = geracao_laudo.gerar_laudo_pdf(avaliacao, imob, dados)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar laudo PDF: {exc}") from exc
    return Response(
        content=conteudo,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nome_arquivo}"'},
    )


@router.post("/{avaliacao_id}/exportar-laudo-docx")
def exportar_laudo_docx(
    avaliacao_id: int,
    dados: schemas.LaudoExportRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    """Gera Word preenchendo o template (.docx) da imobiliária ou anexando o laudo completo."""
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    imob = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == usuario_atual.imobiliaria_id).first()
    try:
        conteudo, nome_arquivo = geracao_laudo.gerar_laudo_docx(avaliacao, imob, dados)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar laudo Word: {exc}") from exc
    return Response(
        content=conteudo,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{nome_arquivo}"'},
    )
