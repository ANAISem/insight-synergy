"""
API-Routen für die Systemüberwachung und Gesundheitsprüfung im Nexus-Backend.
"""

import time
import psutil
import os
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any, Optional

from ..models.schemas import HealthCheckResponse, ErrorResponse
from ..services.vector_db import VectorDB, get_vector_db
from ..utils.logging import get_logger
from ..config import get_settings

# Startzeit der Anwendung
start_time = time.time()

# Einstellungen und Logger laden
settings = get_settings()
logger = get_logger(__name__)

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    responses={
        500: {"model": ErrorResponse, "description": "Serverfehler"}
    }
)
async def health_check(
    extended: bool = Query(False, description="Ob detaillierte Gesundheitsinformationen zurückgegeben werden sollen"),
    vector_db: VectorDB = Depends(get_vector_db)
):
    """
    Überprüft den Gesundheitszustand des Systems.
    
    - **extended**: Ob detaillierte Informationen zurückgegeben werden sollen
    
    Gibt Statusinformationen über den Server und die Vektordatenbank zurück.
    """
    try:
        # Basis-Gesundheitsinformationen
        uptime_seconds = time.time() - start_time
        
        # Vektordatenbank-Status prüfen
        try:
            db_status = await vector_db.check_health()
            db_status_str = "CONNECTED" if db_status else "DEGRADED"
            doc_count = await vector_db.count_documents()
        except Exception as e:
            logger.error(f"Fehler bei der Überprüfung der Vektordatenbank: {str(e)}")
            db_status_str = "ERROR"
            doc_count = -1
        
        # Antwort vorbereiten
        response = HealthCheckResponse(
            status="OK" if db_status_str == "CONNECTED" else "DEGRADED",
            version=settings.app_version,
            uptime_seconds=uptime_seconds,
            database_status=db_status_str,
            document_count=doc_count
        )
        
        # Erweiterte Informationen, wenn angefordert
        if extended:
            extended_info = await get_extended_health_info(vector_db)
            # Antwort als Dict umwandeln, um zusätzliche Felder hinzuzufügen
            response_dict = response.dict()
            response_dict.update(extended_info)
            
            # In ein neues HealthCheckResponse-Objekt umwandeln (ignoriere zusätzliche Felder)
            # Die zusätzlichen Felder werden in der JSON-Antwort enthalten sein
            return response_dict
        
        logger.info(f"Gesundheitsprüfung durchgeführt: Status {response.status}")
        return response
        
    except Exception as e:
        logger.error(f"Fehler bei der Gesundheitsprüfung: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler bei der Gesundheitsprüfung: {str(e)}"
        )


@router.get(
    "/metrics",
    response_model=Dict[str, Any],
    responses={
        500: {"model": ErrorResponse, "description": "Serverfehler"}
    }
)
async def system_metrics():
    """
    Gibt detaillierte Systemmetriken zurück.
    
    Enthält Informationen über CPU, Speicher, Festplatte und Anwendung.
    """
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory_info = psutil.virtual_memory()
        disk_info = psutil.disk_usage('/')
        
        metrics = {
            "cpu": {
                "percent": cpu_percent,
                "cores": psutil.cpu_count()
            },
            "memory": {
                "total": memory_info.total,
                "available": memory_info.available,
                "percent": memory_info.percent
            },
            "disk": {
                "total": disk_info.total,
                "free": disk_info.free,
                "percent": disk_info.percent
            },
            "process": {
                "pid": os.getpid(),
                "memory_percent": psutil.Process(os.getpid()).memory_percent(),
                "cpu_percent": psutil.Process(os.getpid()).cpu_percent(interval=0.1)
            },
            "uptime_seconds": time.time() - start_time
        }
        
        logger.info("Systemmetriken abgerufen")
        return metrics
        
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Systemmetriken: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Abrufen der Systemmetriken: {str(e)}"
        )


async def get_extended_health_info(vector_db: VectorDB) -> Dict[str, Any]:
    """
    Sammelt erweiterte Gesundheitsinformationen.
    
    Args:
        vector_db: Instanz der Vektordatenbank
        
    Returns:
        Dictionary mit erweiterten Gesundheitsinformationen
    """
    try:
        # Systeminformationen
        extended_info = {
            "system": {
                "cpu_percent": psutil.cpu_percent(interval=0.1),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_percent": psutil.disk_usage('/').percent
            },
            "embedding_model": {
                "name": vector_db.embedding_model_name,
                "provider": settings.embedding_model_provider,
                "dimension": settings.embedding_dimension
            },
            "vector_db": {
                "provider": settings.vector_db_provider,
                "directory": settings.vector_db_persist_directory,
                "collections": await vector_db.get_collection_info()
            },
            "config": {
                "llm_provider": settings.llm_provider,
                "llm_model": settings.llm_model_name,
                "auto_tagging": settings.enable_auto_tagging,
                "entity_extraction": settings.enable_entity_extraction
            }
        }
        
        return extended_info
        
    except Exception as e:
        logger.error(f"Fehler beim Sammeln erweiterter Gesundheitsinformationen: {str(e)}")
        return {
            "extended_info_error": str(e)
        } 