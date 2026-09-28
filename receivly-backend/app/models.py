import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Imobiliaria(Base):
    __tablename__ = "imobiliarias"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    whatsapp_numero = Column(String, nullable=True)
    criado_em = Column(DateTime, default=datetime.datetime.utcnow)

    usuarios = relationship("Usuario", back_populates="imobiliaria")
    leads = relationship("Lead", back_populates="imobiliaria")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    imobiliaria_id = Column(Integer, ForeignKey("imobiliarias.id"), nullable=False)
    criado_em = Column(DateTime, default=datetime.datetime.utcnow)

    imobiliaria = relationship("Imobiliaria", back_populates="usuarios")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    imobiliaria_id = Column(Integer, ForeignKey("imobiliarias.id"), nullable=False)
    nome = Column(String, nullable=False)
    telefone = Column(String, nullable=True)
    imovel_interesse = Column(String, nullable=True)
    bairro = Column(String, nullable=True)
    valor = Column(String, nullable=True)
    score_ia = Column(Integer, default=0)
    canal = Column(String, default="WhatsApp")
    status = Column(String, default="IA respondendo")
    criado_em = Column(DateTime, default=datetime.datetime.utcnow)

    imobiliaria = relationship("Imobiliaria", back_populates="leads")


class AnaliseJuridica(Base):
    __tablename__ = "analises_juridicas"

    id = Column(Integer, primary_key=True, index=True)
    imobiliaria_id = Column(Integer, ForeignKey("imobiliarias.id"), nullable=False)
    nome_arquivo = Column(String, nullable=False)
    nome_imovel = Column(String, nullable=True)
    risco = Column(String, default="Indefinido")  # "Alto" | "Médio" | "Baixo" | "Indefinido"
    resumo = Column(Text, nullable=True)
    achados_json = Column(Text, nullable=True)  # lista de achados, serializada em JSON
    gerado_por_ia = Column(Integer, default=0)  # 0 = fallback local, 1 = IA de verdade
    criado_em = Column(DateTime, default=datetime.datetime.utcnow)

    imobiliaria = relationship("Imobiliaria")


class Conversa(Base):
    __tablename__ = "conversas"

    id = Column(Integer, primary_key=True, index=True)
    imobiliaria_id = Column(Integer, ForeignKey("imobiliarias.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    ia_ativa = Column(Integer, default=1)  # 1 = IA respondendo, 0 = corretor assumiu
    criado_em = Column(DateTime, default=datetime.datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.datetime.utcnow)

    lead = relationship("Lead")
    mensagens = relationship("Mensagem", back_populates="conversa", order_by="Mensagem.id")


class Mensagem(Base):
    __tablename__ = "mensagens"

    id = Column(Integer, primary_key=True, index=True)
    conversa_id = Column(Integer, ForeignKey("conversas.id"), nullable=False)
    remetente = Column(String, nullable=False)  # "lead" | "ia" | "corretor"
    texto = Column(Text, nullable=False)
    criado_em = Column(DateTime, default=datetime.datetime.utcnow)

    conversa = relationship("Conversa", back_populates="mensagens")


class Avaliacao(Base):
    __tablename__ = "avaliacoes"

    id = Column(Integer, primary_key=True, index=True)
    imobiliaria_id = Column(Integer, ForeignKey("imobiliarias.id"), nullable=False)
    status = Column(String, default="Em andamento")  # "Em andamento" | "Concluída"

    # Dados do imóvel avaliado
    endereco = Column(String, nullable=True)
    numero = Column(String, nullable=True)
    complemento = Column(String, nullable=True)
    bairro = Column(String, nullable=True)
    cidade = Column(String, nullable=True)
    estado = Column(String, nullable=True)
    cep = Column(String, nullable=True)
    tipo = Column(String, default="Apartamento")
    area_imovel = Column(Float, nullable=True)
    area_terreno = Column(Float, nullable=True)
    quartos = Column(Integer, nullable=True)
    banheiros = Column(Integer, nullable=True)
    vagas = Column(Integer, nullable=True)
    caracteristicas = Column(Text, nullable=True)
    observacoes = Column(Text, nullable=True)

    valor_final = Column(Float, nullable=True)

    criado_em = Column(DateTime, default=datetime.datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    comparaveis = relationship("ComparavelAvaliacao", back_populates="avaliacao", cascade="all, delete-orphan", order_by="ComparavelAvaliacao.id")
    fotos = relationship("FotoAvaliacao", back_populates="avaliacao", cascade="all, delete-orphan", order_by="FotoAvaliacao.ordem")


class ComparavelAvaliacao(Base):
    __tablename__ = "comparaveis_avaliacao"

    id = Column(Integer, primary_key=True, index=True)
    avaliacao_id = Column(Integer, ForeignKey("avaliacoes.id"), nullable=False)
    endereco = Column(String, nullable=False)
    bairro = Column(String, nullable=True)
    cidade = Column(String, nullable=True)
    area = Column(Float, nullable=False)
    quartos = Column(Integer, nullable=True)
    banheiros = Column(Integer, nullable=True)
    vagas = Column(Integer, nullable=True)
    valor = Column(Float, nullable=False)
    fonte = Column(String, nullable=True)
    distancia = Column(String, nullable=True)
    observacoes = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.datetime.utcnow)

    avaliacao = relationship("Avaliacao", back_populates="comparaveis")


class FotoAvaliacao(Base):
    __tablename__ = "fotos_avaliacao"

    id = Column(Integer, primary_key=True, index=True)
    avaliacao_id = Column(Integer, ForeignKey("avaliacoes.id"), nullable=False)
    nome_arquivo = Column(String, nullable=False)
    categoria = Column(String, default="Outros")
    ordem = Column(Integer, default=0)
    tamanho_original = Column(Integer, nullable=True)
    tamanho_otimizado = Column(Integer, nullable=True)
    caminho_relativo = Column(String, nullable=False)  # caminho dentro de /uploads
    criado_em = Column(DateTime, default=datetime.datetime.utcnow)

    avaliacao = relationship("Avaliacao", back_populates="fotos")
