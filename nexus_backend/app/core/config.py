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
    ALLOWED_ORIGINS_STR: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:8080")
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS_STR.split(",")]
    
    # API-Konfiguration
    API_TIMEOUT: int = int(os.getenv("API_TIMEOUT", "30"))
    
    # Insight Core Feature Flag
    ENABLE_INSIGHT_CORE: bool = os.getenv("ENABLE_INSIGHT_CORE", "false").lower() == "true"
    
    # JWT-Konfiguration für Authentifizierung
    SECRET_KEY: str = os.getenv("SECRET_KEY", "geheimerschluessel123456789") # In Produktion ändern!
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Logging-Konfiguration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: Optional[str] = os.getenv("LOG_FILE")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "allow"
    }

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