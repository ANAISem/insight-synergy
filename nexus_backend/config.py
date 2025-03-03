"""
Konfigurationsmodul für das Nexus-Backend.
Stellt Einstellungen für Datenbankverbindungen, API-Endpunkte und LLMs bereit.
"""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Lade Umgebungsvariablen aus .env-Datei
load_dotenv()


class Settings(BaseSettings):
    """
    Konfigurationseinstellungen für das Nexus-Backend.
    Standardwerte können durch Umgebungsvariablen oder eine .env-Datei überschrieben werden.
    """
    # Basis-Einstellungen
    app_name: str = "Nexus Knowledge Backend"
    app_version: str = "1.0.0"
    app_description: str = "Ein Backend für Knowledge-Management und semantische Suche"
    
    # API- und Webserver-Einstellungen
    api_prefix: str = "/api"
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True  # Im Produktionsbetrieb auf False setzen
    allowed_origins: list = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"]
    
    # LLM-Einstellungen
    llm_provider: str = "openai"  # openai, huggingface, local
    llm_model_name: str = "gpt-3.5-turbo"
    llm_temperature: float = 0.3
    llm_max_tokens: int = 1024
    llm_request_timeout: int = 30  # Sekunden
    
    # Vector-DB-Einstellungen
    vector_db_provider: str = "chroma"  # chroma, milvus, pinecone, qdrant, etc.
    vector_db_persist_directory: str = "./nexus_data"
    embedding_model_provider: str = "sentence-transformers"
    embedding_model_name: str = "all-MiniLM-L6-v2"  # Für mehrsprachige Anwendungen: "paraphrase-multilingual-MiniLM-L12-v2"
    embedding_dimension: int = 384  # Abhängig vom Embedding-Modell
    
    # Logging-Einstellungen
    log_level: str = "INFO"
    log_file: str = "nexus_backend.log"
    
    # Sicherheitseinstellungen
    secret_key: str = os.getenv("SECRET_KEY", "supersecretkey-changethisimmediately")
    token_expire_minutes: int = 1440  # 1 Tag
    
    # Performance-Einstellungen
    cache_ttl_seconds: int = 3600  # 1 Stunde
    batch_size: int = 32
    max_workers: int = 4
    
    # Datenanreicherung
    enable_auto_tagging: bool = True
    enable_entity_extraction: bool = True
    language_detection: bool = True
    default_language: str = "de"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Factory-Funktion, die eine zwischengespeicherte Instanz der Einstellungen zurückgibt.
    Wird für Dependency Injection in FastAPI verwendet.
    """
    return Settings()


class MistralConfig:
    API_KEY = os.getenv("MISTRAL_API_KEY")
    API_URL = "https://api.mistral.ai/v1/analyze"

    @staticmethod
    def headers():
        return {
            "Authorization": f"Bearer {MistralConfig.API_KEY}",
            "Content-Type": "application/json"
        } 