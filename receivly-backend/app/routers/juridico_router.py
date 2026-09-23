import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth, ia_juridico

router = APIRouter(prefix="/juridico", tags=["Analisador Jurídico"])

TAMANHO_MAXIMO_MB = 15


@router.post("/analisar", response_model=schemas.AnaliseJuridicaResponse)
async def analisar_documento(
    arquivo: UploadFile = File(...),
    nome_imovel: str | None = Form(None),
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    if arquivo.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Envie um arquivo em PDF.")

    conteudo = await arquivo.read()
    if len(conteudo) > TAMANHO_MAXIMO_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Arquivo maior que {TAMANHO_MAXIMO_MB}MB.")

    resultado = ia_juridico.analisar_documento(conteudo, arquivo.filename, nome_imovel)

    registro = models.AnaliseJuridica(
        imobiliaria_id=usuario_atual.imobiliaria_id,
        nome_arquivo=arquivo.filename,
        nome_imovel=nome_imovel,
        risco=resultado.risco,
        resumo=resultado.resumo,
        achados_json=json.dumps([a.model_dump() for a in resultado.achados]),
        gerado_por_ia=1 if resultado.gerado_por_ia else 0,
    )
    db.add(registro)
    db.commit()
    db.refresh(registro)

    return _para_response(registro)


@router.get("/", response_model=list[schemas.AnaliseJuridicaResponse])
def listar_analises(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    registros = (
        db.query(models.AnaliseJuridica)
        .filter(models.AnaliseJuridica.imobiliaria_id == usuario_atual.imobiliaria_id)
        .order_by(models.AnaliseJuridica.criado_em.desc())
        .all()
    )
    return [_para_response(r) for r in registros]


def _para_response(registro: models.AnaliseJuridica) -> schemas.AnaliseJuridicaResponse:
    achados = json.loads(registro.achados_json) if registro.achados_json else []
    return schemas.AnaliseJuridicaResponse(
        id=registro.id,
        nome_arquivo=registro.nome_arquivo,
        nome_imovel=registro.nome_imovel,
        risco=registro.risco,
        resumo=registro.resumo,
        achados=[schemas.AchadoRisco(**a) for a in achados],
        gerado_por_ia=bool(registro.gerado_por_ia),
        criado_em=registro.criado_em,
    )
