"""Resumo dinâmico para a tela Visão Geral."""

from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/resumo", response_model=schemas.DashboardResumoResponse)
def obter_resumo(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    imob_id = usuario_atual.imobiliaria_id
    agora = datetime.datetime.utcnow()
    inicio_mes = agora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    sete_dias = agora - datetime.timedelta(days=7)

    leads = db.query(models.Lead).filter(models.Lead.imobiliaria_id == imob_id).all()
    conversas = db.query(models.Conversa).filter(models.Conversa.imobiliaria_id == imob_id).all()
    avaliacoes = db.query(models.Avaliacao).filter(models.Avaliacao.imobiliaria_id == imob_id).all()

    leads_ativos = [l for l in leads if l.status not in ("Qualificado", "Arquivado")]
    leads_semana = [l for l in leads if l.criado_em and l.criado_em >= sete_dias]
    qualificados = [l for l in leads if l.score_ia >= 50]
    taxa_qual = round(len(qualificados) / len(leads) * 100) if leads else 0

    aval_concluidas = [a for a in avaliacoes if a.status == "Concluída"]
    aval_mes = [a for a in avaliacoes if a.criado_em and a.criado_em >= inicio_mes]
    aval_em_andamento = [a for a in avaliacoes if a.status != "Concluída"]

    aguardando_corretor = sum(1 for c in conversas if not c.ia_ativa)
    ia_ativa = sum(1 for c in conversas if c.ia_ativa)

    # Gráfico: avaliações criadas nos últimos 6 meses
    meses_labels = []
    meses_valores = []
    for i in range(5, -1, -1):
        ref = agora - datetime.timedelta(days=30 * i)
        label = ref.strftime("%b/%y")
        inicio = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if ref.month == 12:
            fim = inicio.replace(year=inicio.year + 1, month=1)
        else:
            fim = inicio.replace(month=inicio.month + 1)
        qtd = sum(1 for a in avaliacoes if a.criado_em and inicio <= a.criado_em < fim)
        meses_labels.append(label)
        meses_valores.append(qtd)

    atividade_raw: list[tuple[datetime.datetime, schemas.DashboardAtividadeItem]] = []
    for a in avaliacoes:
        dt = a.atualizado_em or a.criado_em or agora
        end = a.endereco or "Imóvel"
        atividade_raw.append((dt, schemas.DashboardAtividadeItem(
            tipo="avaliacao",
            texto=f"Avaliação — {end}",
            detalhe=a.status or "Em andamento",
            tempo=_tempo_relativo(dt),
        )))
    for c in conversas:
        dt = c.atualizado_em or c.criado_em or agora
        atividade_raw.append((dt, schemas.DashboardAtividadeItem(
            tipo="whatsapp",
            texto=f"WhatsApp — {c.lead.nome}",
            detalhe=c.lead.status or "Conversa",
            tempo=_tempo_relativo(dt),
        )))
    atividade = [item for _, item in sorted(atividade_raw, key=lambda x: x[0], reverse=True)[:8]]

    leads_resumo = [
        schemas.LeadResponse.model_validate(l)
        for l in sorted(leads, key=lambda x: x.score_ia, reverse=True)[:20]
    ]

    return schemas.DashboardResumoResponse(
        leads_ativos=len(leads_ativos),
        leads_novos_semana=len(leads_semana),
        taxa_qualificacao=taxa_qual,
        conversas_total=len(conversas),
        conversas_aguardando_corretor=aguardando_corretor,
        conversas_ia_ativa=ia_ativa,
        avaliacoes_total=len(avaliacoes),
        avaliacoes_mes=len(aval_mes),
        avaliacoes_concluidas=len(aval_concluidas),
        avaliacoes_em_andamento=len(aval_em_andamento),
        grafico_avaliacoes_meses=meses_labels,
        grafico_avaliacoes_valores=meses_valores,
        atividade=atividade,
        leads=leads_resumo,
    )


def _tempo_relativo(dt: datetime.datetime | None) -> str:
    if not dt:
        return "—"
    diff = datetime.datetime.utcnow() - dt
    if diff.days > 0:
        return f"há {diff.days} dia(s)"
    horas = diff.seconds // 3600
    if horas > 0:
        return f"há {horas}h"
    mins = max(1, diff.seconds // 60)
    return f"há {mins} min"
