"""
Abhängigkeitsinjektionen für die Nexus-Backend-Anwendung.

Dieses Modul definiert Abhängigkeiten, die in FastAPI-Endpunkten verwendet werden können.
"""

import logging
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt
from typing import Annotated

from settings import Settings, get_settings
from db.vector_db import VectorDB
from services.auth_service import AuthService
from services.llm_service import LLMService
from services.experts_service import ExpertsService
from services.discussion_service import DiscussionService

logger = logging.getLogger(__name__)

# Singletons für Services
_vector_db = None
_auth_service = None
_llm_service = None
_experts_service = None
_discussion_service = None

SECRET_KEY = "your_secret_key"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Ungültiger Token")

def get_vector_db(settings: Annotated[Settings, Depends(get_settings)]) -> VectorDB:
    """
    Gibt eine Instanz der VectorDB zurück, die für Vektorsuche und Wissensspeicherung verwendet wird.
    Stellt sicher, dass nur eine Instanz erstellt wird (Singleton).

    Args:
        settings: Anwendungseinstellungen

    Returns:
        VectorDB-Instanz
    """
    global _vector_db
    if _vector_db is None:
        logger.info("Initialisiere Vector-Datenbank")
        _vector_db = VectorDB(
            persist_directory=settings.vector_db_path,
            embedding_model_name=settings.embedding_model
        )
    return _vector_db


def get_auth_service(settings: Annotated[Settings, Depends(get_settings)]) -> AuthService:
    """
    Gibt eine Instanz des AuthService zurück, der für Authentifizierung und Autorisierung verwendet wird.
    Stellt sicher, dass nur eine Instanz erstellt wird (Singleton).

    Args:
        settings: Anwendungseinstellungen

    Returns:
        AuthService-Instanz
    """
    global _auth_service
    if _auth_service is None:
        logger.info("Initialisiere Auth-Service")
        _auth_service = AuthService(
            secret_key=settings.secret_key,
            token_expire_minutes=settings.token_expire_minutes
        )
    return _auth_service


def get_llm_service(settings: Annotated[Settings, Depends(get_settings)]) -> LLMService:
    """
    Gibt eine Instanz des LLMService zurück, der für Interaktionen mit dem Sprachmodell verwendet wird.
    Stellt sicher, dass nur eine Instanz erstellt wird (Singleton).

    Args:
        settings: Anwendungseinstellungen

    Returns:
        LLMService-Instanz
    """
    global _llm_service
    if _llm_service is None:
        logger.info("Initialisiere LLM-Service")
        _llm_service = LLMService(
            mistral_api_key=settings.mistral_api_key,
            model_name=settings.llm_model
        )
    return _llm_service


def get_experts_service(
    llm_service: Annotated[LLMService, Depends(get_llm_service)],
    vector_db: Annotated[VectorDB, Depends(get_vector_db)]
) -> ExpertsService:
    """
    Gibt eine Instanz des ExpertsService zurück, der für die Verwaltung virtueller Experten verwendet wird.
    Stellt sicher, dass nur eine Instanz erstellt wird (Singleton).

    Args:
        llm_service: LLMService-Instanz
        vector_db: VectorDB-Instanz

    Returns:
        ExpertsService-Instanz
    """
    global _experts_service
    if _experts_service is None:
        logger.info("Initialisiere Experts-Service")
        _experts_service = ExpertsService(
            llm_service=llm_service,
            vector_db=vector_db
        )
    return _experts_service


def get_discussion_service(
    llm_service: Annotated[LLMService, Depends(get_llm_service)],
    vector_db: Annotated[VectorDB, Depends(get_vector_db)],
    experts_service: Annotated[ExpertsService, Depends(get_experts_service)]
) -> DiscussionService:
    """
    Gibt eine Instanz des DiscussionService zurück, der für die Verwaltung von Diskussionen verwendet wird.
    Stellt sicher, dass nur eine Instanz erstellt wird (Singleton).

    Args:
        llm_service: LLMService-Instanz
        vector_db: VectorDB-Instanz
        experts_service: ExpertsService-Instanz

    Returns:
        DiscussionService-Instanz
    """
    global _discussion_service
    if _discussion_service is None:
        logger.info("Initialisiere Discussion-Service")
        _discussion_service = DiscussionService(
            llm_service=llm_service,
            vector_db=vector_db,
            experts_service=experts_service
        )
    return _discussion_service 