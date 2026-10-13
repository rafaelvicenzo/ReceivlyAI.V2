from fastapi import APIRouter, Depends

from app import models, schemas, auth
from app.ia_anuncios import gerar_anuncios

router = APIRouter(prefix="/anuncios", tags=["Gerador de Anúncios"])


@router.post("/gerar", response_model=schemas.GerarAnuncioResponse)
def gerar_anuncio_endpoint(
    dados: schemas.GerarAnuncioRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
):
    return gerar_anuncios(dados)
