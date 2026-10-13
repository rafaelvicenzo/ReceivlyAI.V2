"""Fair-use limits for appraisal AI features (market search, monthly volume, créditos)."""

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models, schemas, plano
from app.config import settings
from app.perfil import eh_admin


def _month_start_utc() -> datetime:
    now = datetime.utcnow()
    return datetime(now.year, now.month, 1)


def count_monthly_foto_tours(db: Session, agency_id: int) -> int:
    return (
        db.query(models.FotoTour)
        .filter(
            models.FotoTour.imobiliaria_id == agency_id,
            models.FotoTour.criado_em >= _month_start_utc(),
        )
        .count()
    )


def count_monthly_appraisals(db: Session, agency_id: int) -> int:
    return (
        db.query(models.Avaliacao)
        .filter(
            models.Avaliacao.imobiliaria_id == agency_id,
            models.Avaliacao.criado_em >= _month_start_utc(),
        )
        .count()
    )


def build_usage_snapshot(
    db: Session,
    agency_id: int,
    appraisal: models.Avaliacao | None = None,
) -> schemas.FairUseUsageResponse:
    pending_factors = 0
    market_searches_used = 0
    if appraisal is not None:
        market_searches_used = appraisal.market_search_count or 0
        pending_factors = sum(
            1 for comparable in appraisal.comparaveis if not comparable.fatores_calculados_por_ia
        )

    imob = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == agency_id).first()
    creditos = (imob.creditos_avaliacao or 0) if imob else 0
    used = count_monthly_appraisals(db, agency_id)
    limit = settings.fair_use_max_appraisals_per_month

    return schemas.FairUseUsageResponse(
        market_searches_used=market_searches_used,
        market_searches_limit=settings.fair_use_max_market_searches_per_appraisal,
        comparables_per_search_limit=settings.fair_use_max_comparables_per_search,
        monthly_appraisals_used=used,
        monthly_appraisals_limit=limit,
        creditos_avaliacao=creditos,
        pending_factor_calculations=pending_factors,
    )


def assert_and_consume_appraisal_slot(
    db: Session,
    agency_id: int,
    usuario: models.Usuario | None = None,
) -> str:
    """Retorna 'incluida', 'credito' ou 'admin'. Consome 1 crédito se necessário."""
    imob = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == agency_id).first()
    if not imob:
        raise HTTPException(status_code=404, detail="Imobiliária não encontrada.")
    if eh_admin(usuario):
        return "admin"
    plano.assert_plano_ativo(imob, usuario)

    used = count_monthly_appraisals(db, agency_id)
    limit = settings.fair_use_max_appraisals_per_month

    if used < limit:
        return "incluida"

    creditos = imob.creditos_avaliacao or 0
    if creditos > 0:
        imob.creditos_avaliacao = creditos - 1
        db.commit()
        db.refresh(imob)
        return "credito"

    raise HTTPException(
        status_code=429,
        detail=(
            f"Limite mensal de {limit} avaliações atingido. "
            f"Compre créditos extras em Assinatura (+{settings.credito_pacote_qtd} por R$ {settings.credito_pacote_valor:.2f})."
        ),
    )


def assert_can_create_appraisal(
    db: Session,
    agency_id: int,
    usuario: models.Usuario | None = None,
) -> None:
    assert_and_consume_appraisal_slot(db, agency_id, usuario)


def assert_can_stylize_foto_tour(
    db: Session,
    agency_id: int,
    usuario: models.Usuario | None = None,
) -> None:
    imob = db.query(models.Imobiliaria).filter(models.Imobiliaria.id == agency_id).first()
    if not imob:
        raise HTTPException(status_code=404, detail="Imobiliária não encontrada.")
    if eh_admin(usuario):
        return
    plano.assert_plano_ativo(imob, usuario)

    usadas = count_monthly_foto_tours(db, agency_id)
    limite = settings.fair_use_max_foto_tours_per_month
    if usadas >= limite:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Limite mensal de {limite} fotos estilizadas atingido. "
                "O contador renova no início do próximo mês."
            ),
        )


def assert_can_run_market_search(appraisal: models.Avaliacao) -> None:
    used = appraisal.market_search_count or 0
    limit = settings.fair_use_max_market_searches_per_appraisal
    if used >= limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Limite de buscas web atingido nesta avaliação ({limit}/{limit}). "
                "Adicione comparáveis manualmente ou entre em contato."
            ),
        )


def clamp_comparables_requested(requested: int) -> int:
    limit = settings.fair_use_max_comparables_per_search
    return max(1, min(requested, limit))


def increment_market_search_count(appraisal: models.Avaliacao, db: Session) -> None:
    appraisal.market_search_count = (appraisal.market_search_count or 0) + 1
    db.commit()
    db.refresh(appraisal)


def assert_can_calculate_factors(appraisal: models.Avaliacao) -> None:
    if not appraisal.comparaveis:
        raise HTTPException(
            status_code=400,
            detail="Adicione comparáveis antes de calcular os fatores.",
        )

    pending = [c for c in appraisal.comparaveis if not c.fatores_calculados_por_ia]
    if not pending:
        raise HTTPException(
            status_code=429,
            detail=(
                "Os fatores já foram calculados para todos os comparáveis. "
                "Adicione um novo comparável ou edite os fatores manualmente."
            ),
        )
