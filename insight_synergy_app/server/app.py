import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse
import uvicorn
import sys

# Füge das Server-Verzeichnis zum Python-Pfad hinzu
server_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, server_dir)

# Pfade definieren
static_dir = os.path.join(server_dir, "static")
os.makedirs(static_dir, exist_ok=True)  # Stelle sicher, dass das Verzeichnis existiert

# Absolute Imports statt relativer Imports verwenden
from api import auth_routes, chat_routes
from database.models import create_tables, User, get_db
from sqlalchemy.orm import Session

# Erstellen der FastAPI-Anwendung
app = FastAPI(
    title="Insight Synergy API",
    description="Eine API für die Insight Synergy Chat-Anwendung mit WebSocket-Unterstützung",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS-Konfiguration
origins = [
    "http://localhost:8000",
    "http://localhost:8001",
    "http://localhost:8002",
    "http://localhost:8003",
    "http://localhost:8095",
    "http://127.0.0.1:8095",
    "ws://localhost:8095",
    "ws://127.0.0.1:8095"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Erlaubt alle Origins für Testzwecke
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# WebSocket CORS-Middleware
@app.middleware("http")
async def add_cors_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/ws"):
        response.headers["Access-Control-Allow-Origin"] = "*"
    return response

# Statische Dateien einbinden
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Router einbinden
app.include_router(auth_routes.router, prefix="/api")
app.include_router(chat_routes.router, prefix="/api")

# Root-Endpunkt
@app.get("/", tags=["Root"])
async def root():
    """
    Leitet zur API-Dokumentation weiter.
    """
    return RedirectResponse(url="/api/docs")

# Status-Endpunkt
@app.get("/api/status", tags=["Systemstatus"])
async def status():
    """
    Gibt den Systemstatus zurück.
    """
    return {"status": "online", "version": "1.0.0"}

# Datenbanktabellen erstellen
create_tables()

# Testbenutzer erstellen (falls noch nicht vorhanden)
from auth.jwt import get_password_hash

def create_test_user():
    """Erstellt einen Testbenutzer in der Datenbank, falls nicht vorhanden."""
    db: Session = next(get_db())
    try:
        # Prüfen, ob Testbenutzer existiert
        test_user = db.query(User).filter(User.username == "testuser").first()
        if not test_user:
            # Testbenutzer erstellen
            test_user = User(
                username="testuser",
                email="test@example.com",
                hashed_password=get_password_hash("password"),
                is_active=True
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            print("✅ Testbenutzer 'testuser' wurde erstellt")
        else:
            print("ℹ️ Testbenutzer 'testuser' existiert bereits")
    except Exception as e:
        print(f"❌ Fehler beim Erstellen des Testbenutzers: {str(e)}")
    finally:
        db.close()

# Testbenutzer erstellen
create_test_user()

# Anwendung starten
if __name__ == "__main__":
    # Port aus Umgebungsvariable oder Standard
    port = int(os.environ.get("PORT", 8090))
    
    # Server starten
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True) 