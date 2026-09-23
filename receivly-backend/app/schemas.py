from datetime import datetime
from pydantic import BaseModel, EmailStr


# ---------- Auth ----------

class RegistrarImobiliariaRequest(BaseModel):
    nome_imobiliaria: str
    nome_usuario: str
    email: EmailStr
    senha: str


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: str
    imobiliaria_id: int

    class Config:
        from_attributes = True


# ---------- Leads ----------

class LeadCreate(BaseModel):
    nome: str
    telefone: str | None = None
    imovel_interesse: str | None = None
    bairro: str | None = None
    valor: str | None = None
    score_ia: int = 0
    canal: str = "WhatsApp"
    status: str = "IA respondendo"


class LeadResponse(LeadCreate):
    id: int
    imobiliaria_id: int
    criado_em: datetime

    class Config:
        from_attributes = True


# ---------- Gerador de Anúncios ----------

class GerarAnuncioRequest(BaseModel):
    descricao: str
    tipo_imovel: str
    bairro: str
    preco: str
    suites: int = 0
    vagas: int = 0
    tom_de_voz: str = "Profissional"


class GerarAnuncioResponse(BaseModel):
    portal: str
    instagram: str
    whatsapp: str


# ---------- Analisador Jurídico ----------

class AchadoRisco(BaseModel):
    titulo: str
    descricao: str
    gravidade: str  # "Alto" | "Médio" | "Baixo"


class AnaliseJuridicaResultado(BaseModel):
    risco: str  # "Alto" | "Médio" | "Baixo"
    resumo: str
    achados: list[AchadoRisco]
    gerado_por_ia: bool


class AnaliseJuridicaResponse(BaseModel):
    id: int
    nome_arquivo: str
    nome_imovel: str | None
    risco: str
    resumo: str | None
    achados: list[AchadoRisco]
    gerado_por_ia: bool
    criado_em: datetime

    class Config:
        from_attributes = True


# ---------- IA para WhatsApp ----------

class MensagemRecebidaRequest(BaseModel):
    telefone: str
    nome: str
    texto: str


class MensagemManualRequest(BaseModel):
    texto: str


class MensagemResponse(BaseModel):
    id: int
    remetente: str
    texto: str
    criado_em: datetime

    class Config:
        from_attributes = True


class ConversaResumoResponse(BaseModel):
    id: int
    lead: LeadResponse
    ia_ativa: bool
    ultima_mensagem: str | None
    atualizado_em: datetime

    class Config:
        from_attributes = True


class ConversaDetalheResponse(BaseModel):
    id: int
    lead: LeadResponse
    ia_ativa: bool
    mensagens: list[MensagemResponse]

    class Config:
        from_attributes = True


class ToggleIaRequest(BaseModel):
    ativa: bool
