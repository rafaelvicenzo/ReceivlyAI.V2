import json
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


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
    perfil: str = "cliente"
    eh_admin: bool = False
    creci: str | None = None
    cnai: str | None = None
    local_laudo: str | None = None
    titulo_profissional: str | None = None
    qualificacao_laudo: str | None = None

    class Config:
        from_attributes = True


class PlanoStatusResponse(BaseModel):
    status: str
    ativo: bool
    eh_admin: bool = False
    valido_ate: str | None = None
    valor_mensal: float
    avaliacoes_usadas_mes: int = 0
    avaliacoes_limite_mes: int = 25
    creditos_avaliacao: int = 0
    credito_pacote_qtd: int = 5
    credito_pacote_valor: float = 59.0
    pode_criar_avaliacao: bool = False
    foto_tours_usadas_mes: int = 0
    foto_tours_limite_mes: int = 10
    pode_usar_foto_tours: bool = False
    asaas_configurado: bool = False


class CheckoutResponse(BaseModel):
    payment_id: str
    invoice_url: str | None = None
    pix_copia_cola: str | None = None
    pix_qr_base64: str | None = None
    valor: float
    tipo: str = "plano"
    creditos_qtd: int = 0


class PerfilUpdateRequest(BaseModel):
    nome: str | None = None
    creci: str | None = None
    cnai: str | None = None
    local_laudo: str | None = None
    titulo_profissional: str | None = None
    qualificacao_laudo: str | None = None


# ---------- Leads ----------

class LeadCreate(BaseModel):
    nome: str
    telefone: str | None = None
    imovel_interesse: str | None = None
    bairro: str | None = None
    valor: str | None = None
    quartos_interesse: str | None = None
    vagas_interesse: str | None = None
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
    gerado_por_ia: bool = False


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
    matricula: str | None = None
    tipo: str = "Apartamento"
    area_imovel: float | None = None
    area_terreno: float | None = None
    quartos: int | None = None
    banheiros: int | None = None
    vagas: int | None = None
    caracteristicas: str | None = None
    observacoes: str | None = None
    padrao_construtivo: str = "normal"
    idade_anos: float | None = None
    estado_conservacao: float | None = None
    testada_m: float | None = None
    testada_referencia_m: float = 10.0
    vida_util_anos: float = 60.0
    latitude: float | None = None
    longitude: float | None = None


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
    latitude: float | None = None
    longitude: float | None = None
    observacoes: str | None = None
    link: str | None = None
    descricao_anuncio: str | None = None
    padrao_construtivo: str | None = None
    idade_anos: float | None = None
    estado_conservacao: float | None = None
    testada_m: float | None = None


class ComparavelResponse(ComparavelCreate):
    id: int
    avaliacao_id: int
    fator_local: float | None = None
    fator_area: float | None = None
    fator_depreciacao: float | None = None
    fator_padrao: float | None = None
    fator_testada: float | None = None
    fatores_calculados_por_ia: bool = False
    fatores_editados_manualmente: bool = False
    justificativas_fatores: dict[str, str] | None = None

    @field_validator("justificativas_fatores", mode="before")
    @classmethod
    def _parse_justificativas(cls, valor):
        if isinstance(valor, str):
            try:
                return json.loads(valor)
            except json.JSONDecodeError:
                return None
        return valor

    class Config:
        from_attributes = True


class ComparavelUpdate(BaseModel):
    endereco: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    area: float | None = None
    quartos: int | None = None
    banheiros: int | None = None
    vagas: int | None = None
    valor: float | None = None
    fonte: str | None = None
    distancia: str | None = None
    observacoes: str | None = None
    link: str | None = None
    descricao_anuncio: str | None = None
    padrao_construtivo: str | None = None
    idade_anos: float | None = None
    estado_conservacao: float | None = None
    testada_m: float | None = None


class ComparavelCoordenadasUpdate(BaseModel):
    latitude: float
    longitude: float


class FatoresComparavelUpdate(BaseModel):
    fator_local: float
    fator_area: float
    fator_depreciacao: float
    fator_padrao: float
    fator_testada: float


class BrandingResponse(BaseModel):
    logo_laudo_url: str | None = None
    template_laudo_url: str | None = None
    template_laudo_nome: str | None = None
    exibir_logo_laudo: bool = False
    ocultar_cabecalho_laudo: bool = False


class BrandingConfigUpdate(BaseModel):
    exibir_logo_laudo: bool | None = None
    ocultar_cabecalho_laudo: bool | None = None


class DashboardAtividadeItem(BaseModel):
    tipo: str
    texto: str
    detalhe: str
    tempo: str


class DashboardResumoResponse(BaseModel):
    leads_ativos: int
    leads_novos_semana: int
    taxa_qualificacao: int
    conversas_total: int
    conversas_aguardando_corretor: int
    conversas_ia_ativa: int
    avaliacoes_total: int
    avaliacoes_mes: int
    avaliacoes_concluidas: int
    avaliacoes_em_andamento: int
    grafico_avaliacoes_meses: list[str]
    grafico_avaliacoes_valores: list[int]
    atividade: list[DashboardAtividadeItem]
    leads: list["LeadResponse"]


class FotoTourEstiloResponse(BaseModel):
    nome: str
    descricao: str


class FotoTourResponse(BaseModel):
    id: int
    estilo: str
    nome_original: str | None
    url: str
    gerado_por_ia: bool
    prompt_usado: str | None = None
    criado_em: datetime


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


class FairUseUsageResponse(BaseModel):
    market_searches_used: int
    market_searches_limit: int
    comparables_per_search_limit: int
    monthly_appraisals_used: int
    monthly_appraisals_limit: int
    creditos_avaliacao: int = 0
    pending_factor_calculations: int = 0


class AvaliacaoDetalheResponse(AvaliacaoImovelDados):
    id: int
    status: str
    valor_final: float | None
    comparaveis: list[ComparavelResponse]
    fotos: list[FotoResponse]
    usage: FairUseUsageResponse
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
    fatores_definidos: list[str]
    gerado_por_ia: bool = False
    justificativas: dict[str, str] | None = None


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
    endereco: str | None = None
    numero: str | None = None
    complemento: str | None = None
    bairro: str = ""
    cidade: str = ""
    estado: str | None = None
    quartos: int | None = None
    banheiros: int | None = None
    vagas: int | None = None
    area_imovel: float | None = None
    area_min: float | None = None
    area_max: float | None = None
    raio_km: float | None = 2
    quantidade: int = 10


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
    descricao_anuncio: str | None = None
    padrao_construtivo: str | None = None
    idade_anos: float | None = None
    estado_conservacao: float | None = None
    testada_m: float | None = None
    latitude: float | None = None
    longitude: float | None = None
    gerado_por_ia: bool


class MarketSearchMeta(BaseModel):
    provedor: str
    modelo: str | None = None
    duracao_ms: int | None = None
    erro: str | None = None


class MarketSearchResponse(BaseModel):
    results: list[PesquisaResultadoItem]
    usage: FairUseUsageResponse
    meta: MarketSearchMeta | None = None


class CepConsultaResponse(BaseModel):
    cep: str
    endereco: str
    bairro: str
    cidade: str
    estado: str
    complemento: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    mapa_satelite_url: str | None = None


class GeocodificacaoResponse(BaseModel):
    latitude: float | None = None
    longitude: float | None = None
    endereco_formatado: str | None = None
    mapa_satelite_url: str | None = None


class FatoresIAResponse(BaseModel):
    fator_local: float
    fator_depreciacao: float
    fator_padrao: float
    fator_testada: float
    justificativas: dict[str, str] = {}
    gerado_por_ia: bool = True


class ComparavelFatoresResponse(BaseModel):
    comparavel_id: int
    fatores: FatoresIAResponse


class LaudoExportRequest(BaseModel):
    """Dados do laudo editados no front-end para exportação Word."""
    solicitante: str = ""
    processo: str | None = None
    matricula: str | None = None
    natureza_imovel: str = "urbano"
    finalidade: str = "venda"
    local: str = ""
    data: str = ""
    perita: str = ""
    titulo_profissional: str = ""
    qualificacao_laudo: str = ""
    creci: str = ""
    cnai: str = ""
    valor_adotado: float | None = None
    valor_extenso: str | None = None
    textos: dict[str, str] = {}
    pontos: dict[str, int] = {}
