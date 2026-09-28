from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth, calculo_avaliacao, fotos_avaliacao, pesquisa_mercado

router = APIRouter(prefix="/avaliacoes", tags=["Avaliação Imobiliária"])

TAMANHO_MAXIMO_FOTO_MB = 15


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


def _avaliacao_detalhe(avaliacao: models.Avaliacao) -> schemas.AvaliacaoDetalheResponse:
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
        tipo=avaliacao.tipo,
        area_imovel=avaliacao.area_imovel,
        area_terreno=avaliacao.area_terreno,
        quartos=avaliacao.quartos,
        banheiros=avaliacao.banheiros,
        vagas=avaliacao.vagas,
        caracteristicas=avaliacao.caracteristicas,
        observacoes=avaliacao.observacoes,
        valor_final=avaliacao.valor_final,
        comparaveis=[schemas.ComparavelResponse.model_validate(c) for c in avaliacao.comparaveis],
        fotos=[_foto_response(f) for f in avaliacao.fotos],
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


# ---------- Avaliação (CRUD básico) ----------

@router.post("/", response_model=schemas.AvaliacaoDetalheResponse)
def criar_avaliacao(
    dados: schemas.AvaliacaoImovelDados,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = models.Avaliacao(imobiliaria_id=usuario_atual.imobiliaria_id, **dados.model_dump())
    db.add(avaliacao)
    db.commit()
    db.refresh(avaliacao)
    return _avaliacao_detalhe(avaliacao)


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
    return _avaliacao_detalhe(_buscar_avaliacao(avaliacao_id, usuario_atual, db))


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
    return _avaliacao_detalhe(avaliacao)


@router.delete("/{avaliacao_id}")
def excluir_avaliacao(
    avaliacao_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    for foto in avaliacao.fotos:
        fotos_avaliacao.remover_foto(foto.caminho_relativo)
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
    return _avaliacao_detalhe(avaliacao)


# ---------- Comparáveis ----------

@router.post("/{avaliacao_id}/comparaveis", response_model=schemas.ComparavelResponse)
def adicionar_comparavel(
    avaliacao_id: int,
    dados: schemas.ComparavelCreate,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    comparavel = models.ComparavelAvaliacao(avaliacao_id=avaliacao.id, **dados.model_dump())
    db.add(comparavel)
    db.commit()
    db.refresh(comparavel)
    return schemas.ComparavelResponse.model_validate(comparavel)


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


# ---------- Pesquisa de mercado (busca real via OpenAI web_search) ----------

@router.post("/pesquisar-mercado", response_model=list[schemas.PesquisaResultadoItem])
def pesquisar_mercado(
    criterios: schemas.PesquisaComparaveisRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
):
    """Busca imóveis comparáveis de verdade na web (via IA). Não salva nada —
    devolve a lista pro corretor escolher quais quer adicionar à avaliação,
    usando o endpoint /comparaveis normal em seguida."""
    return pesquisa_mercado.pesquisar_comparaveis(criterios)


# ---------- Cálculos e resultado ----------

@router.get("/{avaliacao_id}/resultado", response_model=schemas.ResultadoAvaliacaoResponse)
def obter_resultado(
    avaliacao_id: int,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    avaliacao = _buscar_avaliacao(avaliacao_id, usuario_atual, db)
    return calculo_avaliacao.calcular_resultado(avaliacao)
