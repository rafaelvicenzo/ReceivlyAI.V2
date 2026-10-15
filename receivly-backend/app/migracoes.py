"""Migrações leves para SQLite (sem Alembic)."""

from sqlalchemy import inspect, text

from app.database import engine
from app.config import settings


def _coluna_existe(tabela: str, coluna: str) -> bool:
    insp = inspect(engine)
    colunas = {c["name"] for c in insp.get_columns(tabela)}
    return coluna in colunas


def _coluna_obrigatoria(tabela: str, coluna: str) -> bool:
    insp = inspect(engine)
    for c in insp.get_columns(tabela):
        if c["name"] == coluna:
            return c.get("nullable") is False
    return False


def _tornar_avaliacao_id_opcional(conn) -> None:
    """SQLite não altera NOT NULL; recria a tabela se avaliacao_id ainda for obrigatório."""
    if not _coluna_existe("anuncio_geracoes", "avaliacao_id"):
        return
    if not _coluna_obrigatoria("anuncio_geracoes", "avaliacao_id"):
        return

    conn.execute(text("PRAGMA foreign_keys=OFF"))
    conn.execute(
        text(
            """
            CREATE TABLE anuncio_geracoes_new (
                id INTEGER NOT NULL PRIMARY KEY,
                imobiliaria_id INTEGER NOT NULL,
                usuario_id INTEGER NOT NULL,
                imovel_anuncio_id INTEGER,
                avaliacao_id INTEGER,
                status VARCHAR,
                config_json TEXT,
                alertas_json TEXT,
                publico_alvo TEXT,
                prompt_versao VARCHAR,
                modelo_ia VARCHAR,
                gerado_por_ia INTEGER,
                criado_em DATETIME,
                atualizado_em DATETIME,
                FOREIGN KEY(imobiliaria_id) REFERENCES imobiliarias (id),
                FOREIGN KEY(usuario_id) REFERENCES usuarios (id),
                FOREIGN KEY(imovel_anuncio_id) REFERENCES imoveis_anuncio (id),
                FOREIGN KEY(avaliacao_id) REFERENCES avaliacoes (id)
            )
            """
        )
    )
    conn.execute(
        text(
            """
            INSERT INTO anuncio_geracoes_new (
                id, imobiliaria_id, usuario_id, imovel_anuncio_id, avaliacao_id, status,
                config_json, alertas_json, publico_alvo, prompt_versao, modelo_ia,
                gerado_por_ia, criado_em, atualizado_em
            )
            SELECT
                id, imobiliaria_id, usuario_id, imovel_anuncio_id, avaliacao_id, status,
                config_json, alertas_json, publico_alvo, prompt_versao, modelo_ia,
                gerado_por_ia, criado_em, atualizado_em
            FROM anuncio_geracoes
            """
        )
    )
    conn.execute(text("DROP TABLE anuncio_geracoes"))
    conn.execute(text("ALTER TABLE anuncio_geracoes_new RENAME TO anuncio_geracoes"))
    conn.execute(text("PRAGMA foreign_keys=ON"))


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
        ("imobiliarias", "cor_destaque_laudo", "TEXT DEFAULT '#F59E0B'"),
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
        ("documentos_avaliacao", "content_type", "TEXT"),
        ("documentos_avaliacao", "ordem", "INTEGER DEFAULT 0"),
        ("usuarios", "curriculo_formacao", "TEXT"),
        ("usuarios", "curriculo_experiencia", "TEXT"),
        ("usuarios", "curriculo_arquivo_caminho", "TEXT"),
        ("usuarios", "curriculo_arquivo_nome", "TEXT"),
        ("avaliacoes", "incluir_anexo_quesitos", "INTEGER DEFAULT 0"),
        ("avaliacoes", "respostas_quesitos", "TEXT"),
        ("avaliacoes", "quesitos_arquivo_caminho", "TEXT"),
        ("avaliacoes", "quesitos_arquivo_nome", "TEXT"),
        ("anuncio_geracoes", "imovel_anuncio_id", "INTEGER"),
        ("anuncio_artes", "gerado_por_ia", "INTEGER DEFAULT 0"),
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

        _tornar_avaliacao_id_opcional(conn)
