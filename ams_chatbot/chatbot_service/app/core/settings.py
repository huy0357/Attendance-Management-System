from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_policies_file_path() -> str:
    """Resolve policies.json: local repo (ams_chatbot/data) or Docker (/app/data)."""
    base = Path(__file__).resolve()
    # settings.py at ams_chatbot/chatbot_service/app/core/ -> parents[3] == ams_chatbot
    repo_path = base.parents[3] / "data" / "policies.json"
    # In image: /app/app/core/settings.py -> parents[2] == /app
    docker_path = base.parents[2] / "data" / "policies.json"
    if repo_path.exists():
        return str(repo_path)
    if docker_path.exists():
        return str(docker_path)
    return str(repo_path)


class Settings(BaseSettings):
    app_name: str = "ams-chatbot-service"
    app_env: str = "local"
    app_host: str = "0.0.0.0"
    app_port: int = 8088
    app_debug: bool = True
    app_timezone: str = "Asia/Bangkok"

    ams_be_base_url: str = "http://localhost:8080"
    ams_be_timeout_seconds: int = 8
    ams_be_jwt_validate_path: str = "/api/auth/introspect"

    rasa_url: str = "http://localhost:5005"
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "ams_knowledge_v1"
    qdrant_top_k: int = 5
    qdrant_score_threshold: float = 0.55

    policies_file_path: str = Field(default_factory=_default_policies_file_path)
    policies_search_top_k: int = 5

    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemini-2.0-flash-exp:free"
    openrouter_timeout_seconds: int = 20

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")


settings = Settings()
