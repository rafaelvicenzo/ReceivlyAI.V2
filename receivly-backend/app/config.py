from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Sempre carrega o .env da pasta receivly-backend, independente de onde o uvicorn foi iniciado.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    database_url: str = "sqlite:///./receivly.db"
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    # Modelo usado especificamente pela IA do WhatsApp (conversa em texto, sem leitura de PDF).
    # Pode ser o mesmo do Analisador Jurídico, ou um mais barato/rápido — sua escolha.
    openai_model_whatsapp: str = "gpt-4o-mini"
    # Market search model — must support OpenAI "web_search". Default is the cheapest option;
    # switch to gpt-4o via OPENAI_MODEL_PESQUISA if search quality is insufficient.
    openai_model_pesquisa: str = "gpt-4o-mini"
    gemini_api_key: str = ""
    # Provedor padrão: gemini (free tier) | openai | auto (gemini com fallback openai)
    ai_provider: str = "gemini"
    # Contas novas: gemini-3.5-flash (2.x dá 404). Busca web = cota separada.
    gemini_model: str = "gemini-3.5-flash"
    gemini_model_pesquisa: str = "gemini-3.5-flash"
    gemini_model_whatsapp: str = "gemini-3.5-flash"
    gemini_model_foto: str = "gemini-3.5-flash"

    fair_use_max_market_searches_per_appraisal: int = 2
    fair_use_max_comparables_per_search: int = 10
    fair_use_max_appraisals_per_month: int = 25
    fair_use_max_foto_tours_per_month: int = 10

    # WhatsApp Cloud API (Meta) — conexão real com o número de WhatsApp.
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_verify_token: str = "receivly-verify"
    whatsapp_api_version: str = "v21.0"
    jwt_secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Asaas — cobrança e liberação de plano
    asaas_api_key: str = ""
    asaas_sandbox: bool = True
    asaas_webhook_token: str = ""
    plano_valor_reais: float = 249.0
    plano_dias: int = 30
    credito_pacote_qtd: int = 5
    credito_pacote_valor: float = 59.0
    # E-mails com acesso admin (plano/limites liberados). Separar por vírgula.
    admin_emails: str = ""
    # Comparáveis: modo demo (sem IA). Admin usa demo por padrão; ou force para todos.
    comparaveis_demo_admin: bool = True
    comparaveis_modo_demo: bool = False
    # Homogeneização: False = só fórmulas (rápido); True = IA lê anúncio real para fator local/atributos
    fatores_usar_ia: bool = False

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()


def env_file_path() -> str:
    return str(_ENV_FILE)
