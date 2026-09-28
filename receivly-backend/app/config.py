from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./receivly.db"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    # Modelo usado especificamente pela IA do WhatsApp (conversa em texto, sem leitura de PDF).
    # Pode ser o mesmo do Analisador Jurídico, ou um mais barato/rápido — sua escolha.
    openai_model_whatsapp: str = "gpt-4o-mini"
    # Modelo usado na pesquisa de mercado (precisa suportar a ferramenta de busca na web
    # da OpenAI — confira em platform.openai.com quais modelos suportam "web_search" hoje).
    openai_model_pesquisa: str = "gpt-4o"

    # WhatsApp Cloud API (Meta) — conexão real com o número de WhatsApp.
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_verify_token: str = "receivly-verify"
    whatsapp_api_version: str = "v21.0"
    jwt_secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
