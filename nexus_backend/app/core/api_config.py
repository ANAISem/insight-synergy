import os
from typing import Optional, List
from pydantic import BaseSettings

class APIConfig(BaseSettings):
    """API-Konfiguration für externe Dienste"""
    
    # Perplexity API Konfiguration
    PERPLEXITY_API_KEY: Optional[str] = os.getenv("PERPLEXITY_API_KEY")
    PERPLEXITY_API_BASE: str = os.getenv("PERPLEXITY_API_BASE", "https://api.perplexity.ai")
    PERPLEXITY_MODEL: str = os.getenv("PERPLEXITY_MODEL", "sonar-deep-research")
    PERPLEXITY_MAX_RETRIES: int = int(os.getenv("PERPLEXITY_MAX_RETRIES", "3"))
    PERPLEXITY_TIMEOUT: int = int(os.getenv("PERPLEXITY_TIMEOUT", "15"))
    PERPLEXITY_MAX_TOKENS: int = int(os.getenv("PERPLEXITY_MAX_TOKENS", "4000"))
    PERPLEXITY_TEMPERATURE: float = float(os.getenv("PERPLEXITY_TEMPERATURE", "0.0"))
    
    # OpenAI API Konfiguration
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    OPENAI_API_BASE: str = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
    OPENAI_MAX_RETRIES: int = int(os.getenv("OPENAI_MAX_RETRIES", "3"))
    OPENAI_TIMEOUT: int = int(os.getenv("OPENAI_TIMEOUT", "20"))
    OPENAI_MAX_TOKENS: int = int(os.getenv("OPENAI_MAX_TOKENS", "4000"))
    OPENAI_TEMPERATURE: float = float(os.getenv("OPENAI_TEMPERATURE", "0.2"))
    
    # OpenAI Modelle
    PRIMARY_MODEL: str = os.getenv("PRIMARY_MODEL", "gpt-o1-mini")     # Standard-Modell: o1 mini
    FALLBACK_MODEL: str = os.getenv("FALLBACK_MODEL", "gpt-4o-mini")   # Erstes Fallback: 4o mini
    
    # Rate Limiting Konfiguration
    RATE_LIMIT_PERPLEXITY: int = int(os.getenv("RATE_LIMIT_PERPLEXITY", "60"))  # Anfragen pro Minute
    RATE_LIMIT_OPENAI: int = int(os.getenv("RATE_LIMIT_OPENAI", "100"))         # Anfragen pro Minute
    
    # Fallback Konfiguration
    ENABLE_MODEL_FALLBACK: bool = os.getenv("ENABLE_MODEL_FALLBACK", "true").lower() == "true"
    ENABLE_INSIGHT_CORE_FALLBACK: bool = os.getenv("ENABLE_INSIGHT_CORE_FALLBACK", "true").lower() == "true"
    MAX_FALLBACK_ATTEMPTS: int = int(os.getenv("MAX_FALLBACK_ATTEMPTS", "2"))
    
    # Insight Synergy Core Konfiguration
    IS_CORE_ENABLED: bool = os.getenv("ENABLE_INSIGHT_CORE", "false").lower() == "true"
    IS_CORE_ENDPOINT: str = os.getenv("IS_CORE_ENDPOINT", "http://localhost:8080/api/core/completion")
    IS_CORE_TIMEOUT: int = int(os.getenv("IS_CORE_TIMEOUT", "25"))
    IS_CORE_MAX_TOKENS: int = int(os.getenv("IS_CORE_MAX_TOKENS", "4000"))
    IS_CORE_TEMPERATURE: float = float(os.getenv("IS_CORE_TEMPERATURE", "0.4"))
    
    # Workflow Konfiguration
    ALWAYS_USE_PERPLEXITY_FIRST: bool = os.getenv("ALWAYS_USE_PERPLEXITY_FIRST", "true").lower() == "true"
    COMBINE_PERPLEXITY_WITH_OPENAI: bool = os.getenv("COMBINE_PERPLEXITY_WITH_OPENAI", "true").lower() == "true"
    MAX_CONTEXT_LENGTH: int = int(os.getenv("MAX_CONTEXT_LENGTH", "12000"))
    
    class Config:
        env_file = ".env"
        case_sensitive = True

api_config = APIConfig() 