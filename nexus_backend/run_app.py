import sys
import os
import uvicorn

# Füge das aktuelle Verzeichnis zum Python-Pfad hinzu
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Lese Port aus Umgebungsvariable oder verwende Standardport 8000
    port = int(os.environ.get("PORT", 8000))
    
    print("Starting Nexus Backend...")
    print(f"Python-Pfad: {sys.path}")
    print(f"Server wird auf Port {port} gestartet")
    
    # Konfiguriere und erstelle eine health-Route für Port-Checks
    # Starte die Anwendung
    uvicorn.run(
        app,
        host="0.0.0.0", 
        port=port,
        reload=True
    ) 