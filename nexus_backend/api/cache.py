"""
API-Routen für die Cache-Verwaltung.
Ermöglicht das Löschen und Abfragen von Cache-Informationen.
"""

from fastapi import APIRouter, Depends, Security, HTTPException, status
from fastapi.security import APIKeyHeader
from typing import Dict, Any

from ..services.cache_service import get_cache_service
from ..config import settings

router = APIRouter(prefix="/cache", tags=["Cache"])

# Security-Middleware
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    """Überprüft, ob der API-Key gültig ist."""
    if not settings.API_KEYS:
        return True
    
    if not api_key or api_key not in settings.API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger API-Key"
        )
    
    return True

@router.post("/clear")
async def clear_cache(api_key_valid: bool = Depends(verify_api_key)):
    """
    Löscht den gesamten LLM-Cache (sowohl Memory als auch Redis).
    Erfordert API-Key-Authentifizierung.
    """
    cache_service = await get_cache_service()
    await cache_service.clear_all_cache()
    
    return {
        "status": "success",
        "message": "Cache erfolgreich gelöscht"
    }

@router.get("/stats")
async def get_cache_stats(api_key_valid: bool = Depends(verify_api_key)):
    """
    Gibt Statistiken über den Cache zurück.
    Erfordert API-Key-Authentifizierung.
    """
    cache_service = await get_cache_service()
    stats = await cache_service.get_cache_stats()
    
    return {
        "status": "success",
        "stats": stats
    } 