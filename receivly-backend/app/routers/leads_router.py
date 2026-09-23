from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("/", response_model=list[schemas.LeadResponse])
def listar_leads(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Lead)
        .filter(models.Lead.imobiliaria_id == usuario_atual.imobiliaria_id)
        .order_by(models.Lead.score_ia.desc())
        .all()
    )


@router.post("/", response_model=schemas.LeadResponse)
def criar_lead(
    dados: schemas.LeadCreate,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    lead = models.Lead(**dados.model_dump(), imobiliaria_id=usuario_atual.imobiliaria_id)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.patch("/{lead_id}", response_model=schemas.LeadResponse)
def atualizar_lead(
    lead_id: int,
    dados: schemas.LeadCreate,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    lead = (
        db.query(models.Lead)
        .filter(models.Lead.id == lead_id, models.Lead.imobiliaria_id == usuario_atual.imobiliaria_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")

    for campo, valor in dados.model_dump().items():
        setattr(lead, campo, valor)

    db.commit()
    db.refresh(lead)
    return lead
