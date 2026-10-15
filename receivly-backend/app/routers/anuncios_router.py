from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.database import get_db
from app.ia_anuncios import gerar_anuncios
from app import anuncios_service

router = APIRouter(prefix="/anuncios", tags=["Gerador de Anúncios"])


@router.get("/imoveis", response_model=list[schemas.ImovelAnuncioResponse])
def listar_imoveis(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.listar_imoveis(db, usuario_atual.imobiliaria_id)


@router.post("/imoveis", response_model=schemas.ImovelAnuncioResponse)
def criar_imovel(
    data: schemas.ImovelAnuncioCreate,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.criar_imovel(db, data, usuario_atual)


@router.patch("/imoveis/{imovel_id}", response_model=schemas.ImovelAnuncioResponse)
def atualizar_imovel(
    imovel_id: int,
    data: schemas.ImovelAnuncioUpdate,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.atualizar_imovel(db, imovel_id, usuario_atual.imobiliaria_id, data)


@router.delete("/imoveis/{imovel_id}", status_code=204)
def excluir_imovel(
    imovel_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    anuncios_service.excluir_imovel(db, imovel_id, usuario_atual.imobiliaria_id)


@router.post("/imoveis/{imovel_id}/fachada", response_model=schemas.ImovelAnuncioResponse)
async def upload_fachada(
    imovel_id: int,
    arquivo: UploadFile = File(...),
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return await anuncios_service.upload_fachada(db, imovel_id, usuario_atual.imobiliaria_id, arquivo)


@router.post("/imoveis/{imovel_id}/analisar-fachada", response_model=schemas.AnaliseFachadaResponse)
async def analisar_fachada(
    imovel_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return await anuncios_service.analisar_fachada_imovel(db, imovel_id, usuario_atual.imobiliaria_id)


@router.post("/gerar", response_model=schemas.GerarAnuncioResponse)
def gerar_anuncio_endpoint(
    dados: schemas.GerarAnuncioRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
):
    return gerar_anuncios(dados)


@router.post("/validar", response_model=schemas.AnuncioValidacaoResponse)
def validar_anuncio(
    req: schemas.AnuncioValidarRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.validar(db, req, usuario_atual.imobiliaria_id)


@router.post("/hashtags/sugerir", response_model=schemas.HashtagSugerirResponse)
def sugerir_hashtags(
    req: schemas.HashtagSugerirRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.sugerir_hashtags(db, req, usuario_atual.imobiliaria_id)


@router.post("/eventos", status_code=204)
def registrar_evento_anuncio(
    req: schemas.AnuncioEventoCreateRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    anuncios_service.registrar_evento(db, usuario_atual.imobiliaria_id, req)


@router.post("/materiais/{material_id}/escolher", response_model=schemas.AnuncioMaterialResponse)
def escolher_material(
    material_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.escolher_material(db, material_id, usuario_atual.imobiliaria_id)


@router.get("/desempenho", response_model=schemas.AnuncioDesempenhoResponse)
def desempenho_anuncios(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.obter_desempenho(db, usuario_atual.imobiliaria_id)


@router.post("/geracoes", response_model=schemas.AnuncioGeracaoResponse)
def criar_geracao(
    req: schemas.AnuncioGeracaoCreateRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.criar_geracao(db, req, usuario_atual)


@router.get("/geracoes", response_model=list[schemas.AnuncioGeracaoResumoResponse])
def listar_geracoes(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.listar_geracoes(db, usuario_atual.imobiliaria_id)


@router.get("/geracoes/{geracao_id}", response_model=schemas.AnuncioGeracaoResponse)
def obter_geracao(
    geracao_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.obter_geracao(db, geracao_id, usuario_atual.imobiliaria_id)


@router.patch("/materiais/{material_id}", response_model=schemas.AnuncioMaterialResponse)
def editar_material(
    material_id: int,
    patch: schemas.AnuncioMaterialUpdateRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.atualizar_material(db, material_id, usuario_atual.imobiliaria_id, patch)


@router.post("/geracoes/{geracao_id}/regenerar-material", response_model=schemas.AnuncioMaterialResponse)
def regenerar_material(
    geracao_id: int,
    req: schemas.AnuncioRegenerarMaterialRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.regenerar_material(db, geracao_id, usuario_atual.imobiliaria_id, req)


@router.post("/geracoes/{geracao_id}/regenerar-arte", response_model=schemas.AnuncioArteResponse)
def regenerar_arte(
    geracao_id: int,
    req: schemas.AnuncioRegenerarArteRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return anuncios_service.regenerar_arte(db, geracao_id, usuario_atual.imobiliaria_id, req)
