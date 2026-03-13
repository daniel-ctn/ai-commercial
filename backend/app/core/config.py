from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables / .env file.

    Pydantic Settings automatically reads from a .env file and validates types.
    If a required field is missing, the app won't start (fail-fast).
    Fields with defaults are optional in the .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    app_name: str = "AI Commercial"
    debug: bool = False
    api_prefix: str = "/api/v1"
    frontend_url: str = "http://localhost:3000"

    # Database (Neon PostgreSQL)
    # Format: postgresql+asyncpg://user:password@host/dbname?sslmode=require
    database_url: str

    # Redis (Upstash)
    upstash_redis_url: str
    upstash_redis_token: str

    # Auth
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    # Google Gemini
    gemini_api_key: str = ""

    @property
    def async_database_url(self) -> str:
        """Ensure the database URL uses the asyncpg driver."""
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()  # type: ignore[call-arg]
