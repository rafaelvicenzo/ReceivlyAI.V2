"""Migrações leves para SQLite (sem Alembic)."""

from sqlalchemy import inspect, text

from app.database import engine
from app.config import settings


def _coluna_existe(tabela: str, coluna: str) -> bool:
    insp = inspect(engine)
    colunas = {c["name"] for c in insp.get_columns(tabela)}
    return coluna in colunas


def aplicar_migracoes() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    alteracoes = [
        ("avaliacoes", "matricula", "TEXT"),
        ("avaliacoes", "latitude", "REAL"),
        ("avaliacoes", "longitude", "REAL"),
        ("comparaveis_avaliacao", "fator_local", "REAL"),
        ("comparaveis_avaliacao", "fator_area", "REAL"),
        ("usuarios", "creci", "TEXT"),
        ("usuarios", "cnai", "TEXT"),
        ("usuarios", "local_laudo", "TEXT"),
        ("usuarios", "titulo_profissional", "TEXT"),
        ("usuarios", "qualificacao_laudo", "TEXT"),
        ("imobiliarias", "ocultar_cabecalho_laudo", "INTEGER DEFAULT 0"),
        ("leads", "quartos_interesse", "TEXT"),
        ("leads", "vagas_interesse", "TEXT"),
        ("comparaveis_avaliacao", "fator_depreciacao", "REAL"),
        ("comparaveis_avaliacao", "fator_padrao", "REAL"),
        ("comparaveis_avaliacao", "fator_testada", "REAL"),
        ("comparaveis_avaliacao", "fatores_calculados_por_ia", "INTEGER DEFAULT 0"),
        ("comparaveis_avaliacao", "fatores_editados_manualmente", "INTEGER DEFAULT 0"),
        ("comparaveis_avaliacao", "justificativas_fatores", "TEXT"),
        ("imobiliarias", "marca_dagua_caminho", "TEXT"),
        ("imobiliarias", "template_laudo_caminho", "TEXT"),
        ("imobiliarias", "template_laudo_nome", "TEXT"),
        ("imobiliarias", "usar_marca_dagua", "INTEGER DEFAULT 0"),
        ("avaliacoes", "market_search_count", "INTEGER DEFAULT 0"),
        ("avaliacoes", "padrao_construtivo", "TEXT DEFAULT 'normal'"),
        ("avaliacoes", "idade_anos", "REAL"),
        ("avaliacoes", "estado_conservacao", "REAL"),
        ("avaliacoes", "testada_m", "REAL"),
        ("avaliacoes", "testada_referencia_m", "REAL DEFAULT 10.0"),
        ("avaliacoes", "vida_util_anos", "REAL DEFAULT 60.0"),
        ("comparaveis_avaliacao", "link", "TEXT"),
        ("comparaveis_avaliacao", "descricao_anuncio", "TEXT"),
        ("comparaveis_avaliacao", "padrao_construtivo", "TEXT"),
        ("comparaveis_avaliacao", "idade_anos", "REAL"),
        ("comparaveis_avaliacao", "estado_conservacao", "REAL"),
        ("comparaveis_avaliacao", "testada_m", "REAL"),
        ("comparaveis_avaliacao", "latitude", "REAL"),
        ("comparaveis_avaliacao", "longitude", "REAL"),
        ("imobiliarias", "plano_status", "TEXT DEFAULT 'inativo'"),
        ("imobiliarias", "plano_valido_ate", "DATETIME"),
        ("imobiliarias", "asaas_customer_id", "TEXT"),
        ("imobiliarias", "creditos_avaliacao", "INTEGER DEFAULT 0"),
        ("usuarios", "perfil", "TEXT DEFAULT 'cliente'"),
        ("foto_tours", "prompt_usado", "TEXT"),
    ]

    with engine.begin() as conn:
        for tabela, coluna, tipo in alteracoes:
            if not _coluna_existe(tabela, coluna):
                conn.execute(text(f"ALTER TABLE {tabela} ADD COLUMN {coluna} {tipo}"))

        if _coluna_existe("imobiliarias", "plano_status"):
            conn.execute(
                text(
                    "UPDATE imobiliarias SET plano_status = 'inativo' "
                    "WHERE plano_status IN ('trial', NULL) AND plano_valido_ate IS NULL"
                )
            )

        if _coluna_existe("usuarios", "perfil"):
            for email in [e.strip().lower() for e in settings.admin_emails.split(",") if e.strip()]:
                conn.execute(
                    text("UPDATE usuarios SET perfil = 'admin' WHERE lower(email) = :email"),
                    {"email": email},
                )
