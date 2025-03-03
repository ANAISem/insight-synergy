import os
import uvicorn
import logging

# Logging einrichten
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("server")

if __name__ == "__main__":
    try:
        # Port aus Umgebungsvariable oder Standard
        port = int(os.environ.get("PORT", 8090))
        logger.info(f"Starte Server auf Port {port}...")
        
        # Starte die FastAPI-Anwendung
        # Mit reload=True für automatisches Neuladen bei Codeänderungen
        uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
    except KeyboardInterrupt:
        logger.info("Server wird beendet...")
    except Exception as e:
        logger.error(f"Fehler beim Starten des Servers: {e}") 