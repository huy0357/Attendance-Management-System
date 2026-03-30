from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ams-chatbot-service"
    app_env: str = "local"
    app_host: str = "0.0.0.0"
    app_port: int = 8088
    app_debug: bool = True

    ams_be_base_url: str = "http://localhost:8080"
    ams_be_timeout_seconds: int = 8
    ams_be_jwt_validate_path: str = "/api/auth/introspect"

    rasa_url: str = "http://localhost:5005"
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "ams_knowledge_v1"
    qdrant_top_k: int = 5
    qdrant_score_threshold: float = 0.55

    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_api_key: str = ""
    openrouter_model: str = "openrouter/free"
    openrouter_timeout_seconds: int = 20

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
