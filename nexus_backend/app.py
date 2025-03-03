"""
Hauptanwendungsmodul für das Nexus-Backend.

Dieses Modul enthält die FastAPI-Anwendung und die Registrierung der Routen.
"""

import logging
from fastapi import FastAPI, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware

# Relative Imports durch absolute Imports ersetzen
try:
    from nexus_backend.settings import get_settings
    from nexus_backend.dependencies import get_vector_db
    from nexus_backend.api import auth, documents, search, websocket, discussions
    from nexus_backend.api.discussions import experts_router
    from nexus_backend.db.vector_db import VectorDB
except ImportError:
    # Fallback für relative Imports, wenn als Modul importiert
    from .settings import get_settings
    from .dependencies import get_vector_db
    from .api import auth, documents, search, websocket, discussions
    from .api.discussions import experts_router
    from .db.vector_db import VectorDB

# Logger für dieses Modul konfigurieren
logger = logging.getLogger(__name__)

# API-Router erstellen
api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(websocket.router, prefix="/ws", tags=["websocket"])
# Neue Cognitive Loop AI Routen
api_router.include_router(discussions.router, prefix="/cognitive", tags=["cognitive-loop"])
api_router.include_router(experts_router, prefix="/cognitive", tags=["cognitive-loop"])

# FastAPI-Anwendung erstellen
app = FastAPI(
    title="Nexus API",
    description="API für Nexus - Eine Plattform für Wissensmanagement und intelligente Diskussionen",
    version="3.0.0"
)

# CORS-Middleware hinzufügen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://insight-synergy.com", "http://localhost:3000"],  # Localhost für Entwicklung hinzugefügt
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

# API-Router zur Anwendung hinzufügen
app.include_router(api_router)


# Startup-Event-Handler für die Anwendung
@app.on_event("startup")
async def startup_event():
    """
    Startup-Handler für die FastAPI-Anwendung.
    Initialisiert alle notwendigen Ressourcen.
    """
    settings = get_settings()
    logger.info(f"Starte Nexus-Backend mit Umgebung: {settings.environment}")
    
    # Vector-DB initialisieren
    vector_db = get_vector_db(settings)
    logger.info(f"Vector-DB initialisiert mit Persistenzverzeichnis: {settings.vector_db_path}")
    
    logger.info("Nexus-Backend erfolgreich gestartet")


# Shutdown-Event-Handler für die Anwendung
@app.on_event("shutdown")
async def shutdown_event():
    """
    Shutdown-Handler für die FastAPI-Anwendung.
    Bereinigt alle Ressourcen.
    """
    logger.info("Fahre Nexus-Backend herunter")
    
    # Vector-DB bereinigen
    vector_db = get_vector_db(get_settings())
    if hasattr(vector_db, 'cleanup') and callable(vector_db.cleanup):
        logger.info("Bereinige Vector-DB...")
        await vector_db.cleanup()
    
    logger.info("Nexus-Backend erfolgreich heruntergefahren")


# Gesundheitscheck-Endpunkt
@app.get("/health", tags=["health"])
async def health_check():
    """
    Einfacher Gesundheitscheck-Endpunkt.
    Gibt zurück, ob die API läuft.
    """
    return {"status": "ok", "message": "Nexus-API ist betriebsbereit"}


# Root-Endpunkt
@app.get("/", tags=["root"])
async def root():
    """
    Root-Endpunkt der API.
    Gibt Basisinformationen zur API zurück.
    """
    return {
        "name": "Nexus API",
        "version": "3.0.0",
        "description": "API für Nexus - Eine Plattform für Wissensmanagement und intelligente Diskussionen"
    }

# Stelle sicher, dass 'app' explizit als Teil des Moduls exportiert wird
__all__ = ['app'] 