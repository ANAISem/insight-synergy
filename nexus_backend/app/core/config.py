import os
import logging
from typing import List, Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# .env-Datei laden, falls vorhanden
load_dotenv()

class Settings(BaseSettings):
    """
    Konfigurationseinstellungen für die Anwendung, basierend auf Umgebungsvariablen
    """
    # API-Konfiguration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    API_PREFIX: str = "/api"
    
    # CORS-Konfiguration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8080",
    ]
    
    # Ollama/Mistral-Konfiguration
    OLLAMA_API_URL: str = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api")
    MISTRAL_MODEL_NAME: str = os.getenv("MISTRAL_MODEL_NAME", "mistral")
    USE_LOCAL_MODEL: bool = os.getenv("USE_LOCAL_MODEL", "true").lower() == "true"
    MISTRAL_API_KEY: Optional[str] = os.getenv("MISTRAL_API_KEY")
    MISTRAL_API_ENDPOINT: str = os.getenv("MISTRAL_API_ENDPOINT", "https://api.mistral.ai/v1")
    API_TIMEOUT: int = int(os.getenv("API_TIMEOUT", "30"))
    
    # JWT-Konfiguration für Authentifizierung
    SECRET_KEY: str = os.getenv("SECRET_KEY", "geheimerschluessel123456789") # In Produktion ändern!
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Logging-Konfiguration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: Optional[str] = os.getenv("LOG_FILE")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Logger-Konfiguration
def setup_logging(settings: Settings) -> None:
    """
    Konfiguriert das Logging basierend auf den Einstellungen
    """
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    logging_config = {
        "level": log_level,
        "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        "handlers": [logging.StreamHandler()]
    }
    
    # Datei-Logger hinzufügen, falls konfiguriert
    if settings.LOG_FILE:
        logging_config["handlers"].append(logging.FileHandler(settings.LOG_FILE))
    
    logging.basicConfig(**logging_config)
    logging.info("Logging konfiguriert mit Level: %s", settings.LOG_LEVEL)

# Einstellungen laden
settings = Settings()

# Logging einrichten
setup_logging(settings) 