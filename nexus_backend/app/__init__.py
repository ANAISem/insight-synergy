# -*- coding: utf-8 -*-
# app/__init__.py
# Initialisierungsdatei für das app-Modul

from fastapi import FastAPI
import logging
import os

logger = logging.getLogger(__name__)

def create_app() -> FastAPI:
    """
    Erstellt und konfiguriert die FastAPI-Anwendung.
    """
    app = FastAPI(
        title="Nexus Backend",
        description="Backend-API für die Insight Synergy App",
        version="1.0.0",
    )
    
    # Health-Check-Endpunkt für Verbindungstests
    @app.get("/health")
    async def health_check():
        return {"status": "ok", "version": "1.0.0"}
    
    # Registriere weitere Routen
    from .main import app as main_app
    app.mount("/api", main_app)
    
    # Debug-Info
    logger.info(f"Anwendung gestartet mit Routen: {app.routes}")
    
    return app 