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


# ---------- Avaliação Imobiliária ----------

class AvaliacaoImovelDados(BaseModel):
    endereco: str | None = None
    numero: str | None = None
    complemento: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    estado: str | None = None
    cep: str | None = None
    tipo: str = "Apartamento"
    area_imovel: float | None = None
    area_terreno: float | None = None
    quartos: int | None = None
    banheiros: int | None = None
    vagas: int | None = None
    caracteristicas: str | None = None
    observacoes: str | None = None


class ComparavelCreate(BaseModel):
    endereco: str
    bairro: str | None = None
    cidade: str | None = None
    area: float
    quartos: int | None = None
    banheiros: int | None = None
    vagas: int | None = None
    valor: float
    fonte: str | None = None
    distancia: str | None = None
    observacoes: str | None = None


class ComparavelResponse(ComparavelCreate):
    id: int
    avaliacao_id: int

    class Config:
        from_attributes = True


class FotoResponse(BaseModel):
    id: int
    nome_arquivo: str
    categoria: str
    ordem: int
    tamanho_original: int | None
    tamanho_otimizado: int | None
    url: str

    class Config:
        from_attributes = True


class FotoUpdateRequest(BaseModel):
    categoria: str | None = None
    ordem: int | None = None


class AvaliacaoResumoResponse(BaseModel):
    id: int
    tipo: str
    bairro: str | None
    endereco: str | None
    cidade: str | None
    status: str
    valor_final: float | None
    atualizado_em: datetime

    class Config:
        from_attributes = True


class AvaliacaoDetalheResponse(AvaliacaoImovelDados):
    id: int
    status: str
    valor_final: float | None
    comparaveis: list[ComparavelResponse]
    fotos: list[FotoResponse]
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class FatoresCalculoResponse(BaseModel):
    fator_local: float
    fator_area: float
    fator_depreciacao: float
    fator_padrao: float
    fator_testada: float
    fator_total: float
    fatores_definidos: list[str]  # quais fatores já têm critério aplicado (hoje só "area")


class CalculoComparavelResponse(BaseModel):
    comparavel: ComparavelResponse
    valor_unitario_base: float
    fatores: FatoresCalculoResponse
    valor_unitario_homogeneizado: float
    resultado_ajustado: float


class ResultadoAvaliacaoResponse(BaseModel):
    valor_estimado: float
    valor_minimo: float
    valor_maximo: float
    valor_medio_m2: float
    quantidade_comparaveis: int
    area_imovel: float | None
    calculos: list[CalculoComparavelResponse]


class ConcluirAvaliacaoRequest(BaseModel):
    valor_final: float


class PesquisaComparaveisRequest(BaseModel):
    tipo: str = "Apartamento"
    bairro: str
    cidade: str
    area_min: float | None = None
    area_max: float | None = None
    raio_km: float | None = 2
    quantidade: int = 5


class PesquisaResultadoItem(BaseModel):
    endereco: str
    bairro: str | None = None
    cidade: str | None = None
    area: float
    quartos: int | None = None
    vagas: int | None = None
    valor: float
    fonte: str | None = None
    link: str | None = None
    gerado_por_ia: bool
