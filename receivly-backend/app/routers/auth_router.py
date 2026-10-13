from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth, plano, perfil as perfil_acesso

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/registrar", response_model=schemas.TokenResponse)
def registrar(dados: schemas.RegistrarImobiliariaRequest, db: Session = Depends(get_db)):
    email_existente = db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    if email_existente:
        raise HTTPException(status_code=400, detail="Já existe uma conta com este e-mail.")

    imobiliaria = models.Imobiliaria(nome=dados.nome_imobiliaria)
    plano.registrar_conta_nova(imobiliaria)
    db.add(imobiliaria)
    db.commit()
    db.refresh(imobiliaria)

    perfil_inicial = (
        perfil_acesso.PERFIL_ADMIN
        if dados.email.lower() in perfil_acesso.emails_admin_configurados()
        else perfil_acesso.PERFIL_CLIENTE
    )
    usuario = models.Usuario(
        nome=dados.nome_usuario,
        email=dados.email,
        senha_hash=auth.gerar_hash_senha(dados.senha),
        imobiliaria_id=imobiliaria.id,
        perfil=perfil_inicial,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    token = auth.criar_access_token({"sub": str(usuario.id)})
    return schemas.TokenResponse(access_token=token)


@router.post("/login", response_model=schemas.TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # form_data.username carrega o e-mail (padrão do OAuth2PasswordRequestForm)
    usuario = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    if not usuario or not auth.verificar_senha(form_data.password, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")

    perfil_acesso.sincronizar_perfil_admin(usuario, db)
    token = auth.criar_access_token({"sub": str(usuario.id)})
    return schemas.TokenResponse(access_token=token)


def _usuario_response(usuario: models.Usuario, db: Session) -> schemas.UsuarioResponse:
    perfil_acesso.sincronizar_perfil_admin(usuario, db)
    base = schemas.UsuarioResponse.model_validate(usuario)
    return base.model_copy(update={"eh_admin": perfil_acesso.eh_admin(usuario)})


@router.get("/me", response_model=schemas.UsuarioResponse)
def eu(
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    return _usuario_response(usuario_atual, db)


@router.patch("/perfil", response_model=schemas.UsuarioResponse)
def atualizar_perfil(
    dados: schemas.PerfilUpdateRequest,
    usuario_atual: models.Usuario = Depends(auth.obter_usuario_atual),
    db: Session = Depends(get_db),
):
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        if isinstance(valor, str):
            valor = valor.strip()
        setattr(usuario_atual, campo, valor)
    db.commit()
    db.refresh(usuario_atual)
    return _usuario_response(usuario_atual, db)
