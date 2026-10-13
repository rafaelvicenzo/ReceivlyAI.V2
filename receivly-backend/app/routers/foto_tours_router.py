"""Foto Tours — estilização de fotos de imóveis."""



import uuid

from pathlib import Path



from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from sqlalchemy.orm import Session



from app.database import get_db

from app import models, schemas, auth, ia_foto_tours, usage_limits



router = APIRouter(prefix="/foto-tours", tags=["Foto Tours"])



BASE_DIR = Path(__file__).resolve().parent.parent.parent

UPLOADS = BASE_DIR / "uploads" / "foto_tours"





def _foto_tour_response(registro: models.FotoTour) -> schemas.FotoTourResponse:

    return schemas.FotoTourResponse(

        id=registro.id,

        estilo=registro.estilo,

        nome_original=registro.nome_original,

        url=f"/uploads/{registro.caminho_relativo}",

        gerado_por_ia=bool(registro.gerado_por_ia),

        prompt_usado=registro.prompt_usado,

        criado_em=registro.criado_em,

    )





@router.get("/estilos", response_model=list[schemas.FotoTourEstiloResponse])

def listar_estilos():

    return [

        schemas.FotoTourEstiloResponse(nome=nome, descricao=desc)

        for nome, desc in ia_foto_tours.ESTILOS.items()

    ]





@router.post("/estilizar", response_model=schemas.FotoTourResponse)

async def estilizar_foto(

    estilo: str = Form("Organizado"),

    prompt_personalizado: str | None = Form(None),

    arquivo: UploadFile = File(...),

    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),

    db: Session = Depends(get_db),

):

    usage_limits.assert_can_stylize_foto_tour(db, usuario_atual.imobiliaria_id, usuario_atual)



    conteudo = await arquivo.read()

    if len(conteudo) > 8 * 1024 * 1024:

        raise HTTPException(status_code=400, detail="Imagem muito grande (máx. 8 MB).")



    try:

        resultado, usou_gemini, estilo_efetivo, prompt_usado = ia_foto_tours.estilizar_foto(

            conteudo,

            estilo,

            prompt_personalizado=prompt_personalizado,

        )

    except ValueError as exc:

        raise HTTPException(status_code=400, detail=str(exc)) from exc

    except ia_foto_tours.EstilizacaoIndisponivel as exc:

        raise HTTPException(status_code=503, detail=str(exc)) from exc

    except Exception as exc:

        raise HTTPException(status_code=502, detail=f"Erro ao processar imagem: {exc}") from exc



    pasta = UPLOADS / str(usuario_atual.imobiliaria_id)

    pasta.mkdir(parents=True, exist_ok=True)

    nome = f"{uuid.uuid4().hex[:12]}.jpg"

    caminho = pasta / nome

    caminho.write_bytes(resultado)



    registro = models.FotoTour(

        imobiliaria_id=usuario_atual.imobiliaria_id,

        estilo=estilo_efetivo,

        nome_original=arquivo.filename or "foto.jpg",

        caminho_relativo=f"foto_tours/{usuario_atual.imobiliaria_id}/{nome}",

        gerado_por_ia=1 if usou_gemini else 0,

        prompt_usado=prompt_usado,

    )

    db.add(registro)

    db.commit()

    db.refresh(registro)



    return _foto_tour_response(registro)





@router.get("/historico", response_model=list[schemas.FotoTourResponse])

def historico(

    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),

    db: Session = Depends(get_db),

):

    itens = (

        db.query(models.FotoTour)

        .filter(models.FotoTour.imobiliaria_id == usuario_atual.imobiliaria_id)

        .order_by(models.FotoTour.criado_em.desc())

        .limit(50)

        .all()

    )

    return [_foto_tour_response(i) for i in itens]


