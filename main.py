#!/usr/bin/env python3
"""
Entry-Point für das Nexus-Backend.
Startet den FastAPI-Server mit Uvicorn.
"""

import os
import sys
import uvicorn
import argparse
from dotenv import load_dotenv

# Stelle sicher, dass das Projekt-Verzeichnis im Pythonpfad ist
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Lade Umgebungsvariablen
load_dotenv()

# Importiere Einstellungen
from nexus_backend.config import get_settings
from nexus_backend.utils.logging import get_logger

settings = get_settings()
logger = get_logger("main")


def parse_args():
    """Parst Kommandozeilenargumente."""
    parser = argparse.ArgumentParser(description="Nexus Knowledge Backend Server")
    
    parser.add_argument(
        "--host", 
        type=str, 
        default=settings.host,
        help=f"Host-Adresse (Standard: {settings.host})"
    )
    
    parser.add_argument(
        "--port", 
        type=int, 
        default=settings.port,
        help=f"Port (Standard: {settings.port})"
    )
    
    parser.add_argument(
        "--reload", 
        action="store_true",
        help="Auto-Reload bei Codeänderungen aktivieren"
    )
    
    parser.add_argument(
        "--debug", 
        action="store_true",
        help="Debug-Modus aktivieren"
    )
    
    parser.add_argument(
        "--workers", 
        type=int, 
        default=1,
        help="Anzahl der Worker-Prozesse (Standard: 1)"
    )
    
    return parser.parse_args()


def main():
    """Hauptfunktion zum Starten des Servers."""
    args = parse_args()
    
    # Log-Level basierend auf Debug-Flag festlegen
    log_level = "debug" if args.debug else settings.log_level.lower()
    
    # Debug-Informationen ausgeben
    if args.debug:
        logger.info(f"Starte {settings.app_name} v{settings.app_version}")
        logger.info(f"Host: {args.host}, Port: {args.port}")
        logger.info(f"Debug-Modus: {'Aktiviert' if args.debug else 'Deaktiviert'}")
        logger.info(f"Auto-Reload: {'Aktiviert' if args.reload else 'Deaktiviert'}")
        logger.info(f"Worker-Prozesse: {args.workers}")
    
    # Server starten
    uvicorn.run(
        "nexus_backend.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload or settings.debug,
        log_level=log_level,
        workers=args.workers
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Server manuell beendet.")
    except Exception as e:
        logger.error(f"Fehler beim Starten des Servers: {str(e)}", exc_info=True)
        sys.exit(1) 