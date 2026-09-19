from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://radar:radar_secret_2024@localhost:5432/radar_db"
    redis_url: str = "redis://:radar_redis_2024@localhost:6379/0"
    api_port: int = 8000
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
