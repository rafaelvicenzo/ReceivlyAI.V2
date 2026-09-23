from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth, ia_whatsapp, whatsapp_api

router = APIRouter(prefix="/whatsapp", tags=["IA para WhatsApp"])


def _dados_extraidos_do_lead(lead: models.Lead) -> ia_whatsapp.DadosExtraidos:
    return ia_whatsapp.DadosExtraidos(
        orcamento=lead.valor,
        bairro=lead.bairro,
        quartos=lead.imovel_interesse,
        motivacao=None,
    )


def _aplicar_dados_extraidos(lead: models.Lead, dados: ia_whatsapp.DadosExtraidos):
    if dados.orcamento:
        lead.valor = dados.orcamento
    if dados.bairro:
        lead.bairro = dados.bairro
    if dados.quartos:
        lead.imovel_interesse = dados.quartos


def processar_mensagem_recebida(
    db: Session,
    imobiliaria_id: int,
    telefone: str,
    nome: str,
    texto: str,
    enviar_via_whatsapp: bool = False,
) -> models.Conversa:
    """Lógica central: cria/reaproveita o lead e a conversa, salva a mensagem do
    lead, chama a IA e salva a resposta. Usada tanto pelo endpoint autenticado
    /mensagens (usado pelo simulador do front-end) quanto pelo webhook real do
    WhatsApp — o comportamento da IA é idêntico nos dois casos, muda só de onde
    a mensagem "chegou" e se a resposta é enviada de volta pelo WhatsApp de verdade."""

    lead = (
        db.query(models.Lead)
        .filter(models.Lead.imobiliaria_id == imobiliaria_id, models.Lead.telefone == telefone)
        .first()
    )
    if lead is None:
        lead = models.Lead(
            imobiliaria_id=imobiliaria_id,
            nome=nome,
            telefone=telefone,
            canal="WhatsApp",
            status="IA respondendo",
            score_ia=0,
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

    conversa = (
        db.query(models.Conversa)
        .filter(models.Conversa.lead_id == lead.id, models.Conversa.imobiliaria_id == imobiliaria_id)
        .first()
    )
    if conversa is None:
        conversa = models.Conversa(imobiliaria_id=imobiliaria_id, lead_id=lead.id, ia_ativa=1)
        db.add(conversa)
        db.commit()
        db.refresh(conversa)

    mensagem_lead = models.Mensagem(conversa_id=conversa.id, remetente="lead", texto=texto)
    db.add(mensagem_lead)
    db.commit()

    if conversa.ia_ativa:
        historico = [{"remetente": m.remetente, "texto": m.texto} for m in conversa.mensagens]
        resultado = ia_whatsapp.gerar_resposta(historico, _dados_extraidos_do_lead(lead))

        mensagem_ia = models.Mensagem(conversa_id=conversa.id, remetente="ia", texto=resultado.resposta)
        db.add(mensagem_ia)

        _aplicar_dados_extraidos(lead, resultado.dados_extraidos)

        if resultado.encaminhar_corretor:
            conversa.ia_ativa = 0
            lead.status = "Aguardando corretor"
        else:
            lead.status = "IA respondendo"

        db.commit()

        if enviar_via_whatsapp:
            whatsapp_api.enviar_mensagem(telefone, resultado.resposta)

    db.refresh(conversa)
    db.refresh(lead)
    return conversa


@router.post("/mensagens", response_model=schemas.ConversaDetalheResponse)
def receber_mensagem(
    dados: schemas.MensagemRecebidaRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    """Endpoint autenticado usado pelo simulador de lead do front-end (e por
    qualquer teste manual via /docs). Não manda a resposta pelo WhatsApp real —
    só grava no banco, pra você ver o resultado na tela."""
    conversa = processar_mensagem_recebida(
        db, usuario_atual.imobiliaria_id, dados.telefone, dados.nome, dados.texto, enviar_via_whatsapp=False
    )
    return _detalhe(conversa, conversa.lead)


@router.post("/conversas/{conversa_id}/mensagens", response_model=schemas.ConversaDetalheResponse)
def enviar_mensagem_manual(
    conversa_id: int,
    dados: schemas.MensagemManualRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    conversa = _buscar_conversa(conversa_id, usuario_atual, db)
    mensagem = models.Mensagem(conversa_id=conversa.id, remetente="corretor", texto=dados.texto)
    db.add(mensagem)
    db.commit()

    # Se o número real estiver conectado, manda a mensagem do corretor pelo WhatsApp de verdade também.
    whatsapp_api.enviar_mensagem(conversa.lead.telefone, dados.texto)

    db.refresh(conversa)
    return _detalhe(conversa, conversa.lead)


@router.patch("/conversas/{conversa_id}/ia", response_model=schemas.ConversaDetalheResponse)
def alternar_ia(
    conversa_id: int,
    dados: schemas.ToggleIaRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    conversa = _buscar_conversa(conversa_id, usuario_atual, db)
    conversa.ia_ativa = 1 if dados.ativa else 0
    conversa.lead.status = "IA respondendo" if dados.ativa else "Aguardando corretor"
    db.commit()
    db.refresh(conversa)
    return _detalhe(conversa, conversa.lead)


@router.get("/conversas", response_model=list[schemas.ConversaResumoResponse])
def listar_conversas(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    conversas = (
        db.query(models.Conversa)
        .filter(models.Conversa.imobiliaria_id == usuario_atual.imobiliaria_id)
        .order_by(models.Conversa.atualizado_em.desc())
        .all()
    )
    respostas = []
    for c in conversas:
        ultima = c.mensagens[-1].texto if c.mensagens else None
        respostas.append(
            schemas.ConversaResumoResponse(
                id=c.id,
                lead=schemas.LeadResponse.model_validate(c.lead),
                ia_ativa=bool(c.ia_ativa),
                ultima_mensagem=ultima,
                atualizado_em=c.atualizado_em,
            )
        )
    return respostas


@router.get("/conversas/{conversa_id}", response_model=schemas.ConversaDetalheResponse)
def obter_conversa(
    conversa_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    conversa = _buscar_conversa(conversa_id, usuario_atual, db)
    return _detalhe(conversa, conversa.lead)


def _buscar_conversa(conversa_id: int, usuario_atual: models.Usuario, db: Session) -> models.Conversa:
    conversa = (
        db.query(models.Conversa)
        .filter(models.Conversa.id == conversa_id, models.Conversa.imobiliaria_id == usuario_atual.imobiliaria_id)
        .first()
    )
    if not conversa:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    return conversa


def _detalhe(conversa: models.Conversa, lead: models.Lead) -> schemas.ConversaDetalheResponse:
    return schemas.ConversaDetalheResponse(
        id=conversa.id,
        lead=schemas.LeadResponse.model_validate(lead),
        ia_ativa=bool(conversa.ia_ativa),
        mensagens=[schemas.MensagemResponse.model_validate(m) for m in conversa.mensagens],
    )
