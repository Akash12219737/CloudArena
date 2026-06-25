from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "CloudArena"
    APP_ENV: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str
    SYNC_DATABASE_URL: str

    # Kubernetes
    K8S_IN_CLUSTER: bool = False
    K8S_KUBECONFIG_PATH: str = "~/.kube/config"
    LAB_NAMESPACE_PREFIX: str = "cloudarena"
    LAB_EXPIRY_HOURS: int = 2

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    # Admin bootstrap
    FIRST_ADMIN_EMAIL: str = "admin@cloudarena.io"
    FIRST_ADMIN_PASSWORD: str = "Admin@123456"


settings = Settings()
