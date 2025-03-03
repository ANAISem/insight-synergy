import uvicorn
import os
from dotenv import load_dotenv

# Umgebungsvariablen laden
load_dotenv()

if __name__ == "__main__":
    # Server starten mit Host und Port aus Umgebungsvariablen oder Standardwerten
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host=host, port=port, reload=True) 