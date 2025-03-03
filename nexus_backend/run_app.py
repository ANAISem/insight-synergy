import sys
import os
import uvicorn

# Füge das aktuelle Verzeichnis zum Python-Pfad hinzu
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

if __name__ == "__main__":
    print("Starting Nexus Backend...")
    print(f"Python-Pfad: {sys.path}")
    
    # Starte die Anwendung
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000,
        reload=True
    ) 