from pydantic import Field, field_validator
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
    database_url: str
    db_pool_size: int = Field(default=5, ge=1, le=50)
    db_pool_max_overflow: int = Field(default=10, ge=0, le=100)

    # Redis (Upstash)
    upstash_redis_url: str
    upstash_redis_token: str

    # Auth
    secret_key: str = Field(min_length=16)
    algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=30, ge=1)
    refresh_token_expire_days: int = Field(default=7, ge=1)

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    # Google Gemini
    gemini_api_key: str = ""

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith(("postgresql://", "postgresql+asyncpg://")):
            raise ValueError("DATABASE_URL must start with postgresql:// or postgresql+asyncpg://")
        return v

    @property
    def async_database_url(self) -> str:
        """Ensure the database URL uses the asyncpg driver."""
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()  # type: ignore[call-arg]
