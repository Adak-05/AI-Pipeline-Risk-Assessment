from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    vite_supabase_url: str = ""
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    app_name: str = "Municipal Pipeline Risk System"
    environment: str = "development"
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ("backend/.env", ".env", "../.env")
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
