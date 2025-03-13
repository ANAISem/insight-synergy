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
    from nexus_backend.api.live_expert_debate import live_expert_debate_router
    from nexus_backend.api.cognitive_profiles import profiles_router
    from nexus_backend.db.vector_db import VectorDB
except ImportError:
    # Fallback für relative Imports, wenn als Modul importiert
    from .settings import get_settings
    from .dependencies import get_vector_db
    from .api import auth, documents, search, websocket, discussions
    from .api.discussions import experts_router
    from .api.live_expert_debate import live_expert_debate_router
    from .api.cognitive_profiles import profiles_router
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
api_router.include_router(experts_router, prefix="/cognitive", tags=["experts"])
# Live-Expert-Debate Routen
api_router.include_router(live_expert_debate_router, tags=["live-expert-debate"])
# Cognitive Profiles Routen
api_router.include_router(profiles_router, prefix="/cognitive", tags=["cognitive-profiles"])

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

# Direkte Experten-Profile-Endpunkte
EXPERT_PROFILES = [
    {
        "id": "exp-001",
        "name": "Dr. Tech Visionary",
        "domain": "Technologie",
        "specialty": "KI-Entwicklung & Zukunftstechnologien",
        "background": "Führender Forscher im Bereich künstliche Intelligenz mit Schwerpunkt auf ethischen Implikationen.",
        "perspective": "Techno-optimistisch, aber mit kritischem Blick auf gesellschaftliche Auswirkungen",
        "avatar": "🧠",
        "color": "#6366f1",
        "expertise": 95,
        "validatedCredentials": True
    },
    {
        "id": "exp-002",
        "name": "Prof. EcoThinker",
        "domain": "Umweltwissenschaften",
        "specialty": "Klimawandel & Nachhaltige Entwicklung",
        "background": "Langjährige Forschung zu Umweltauswirkungen verschiedener Technologien und Wirtschaftsmodelle.",
        "perspective": "Fokus auf langfristige ökologische Nachhaltigkeit und Systemwandel",
        "avatar": "🌍",
        "color": "#22c55e",
        "expertise": 92,
        "validatedCredentials": True
    },
    {
        "id": "exp-003",
        "name": "FinExpert",
        "domain": "Wirtschaft",
        "specialty": "Finanzmarkt & Investitionsanalyse",
        "background": "Jahrzehnte an Erfahrung in der Analyse globaler Märkte und wirtschaftlicher Trends.",
        "perspective": "Pragmatisch, datengetrieben mit Fokus auf wirtschaftlichen Mehrwert",
        "avatar": "📊",
        "color": "#eab308",
        "expertise": 88,
        "validatedCredentials": True
    },
    {
        "id": "exp-004",
        "name": "Ethics Specialist",
        "domain": "Philosophie & Ethik",
        "specialty": "Angewandte Ethik & soziale Gerechtigkeit",
        "background": "Forschung zu ethischen Fragen neuer Technologien und deren gesellschaftlichen Implikationen.",
        "perspective": "Stellt kritische Fragen zu Fairness, Zugänglichkeit und langfristigen Konsequenzen",
        "avatar": "⚖️",
        "color": "#8b5cf6",
        "expertise": 90,
        "validatedCredentials": True
    },
    {
        "id": "exp-005",
        "name": "Policy Advisor",
        "domain": "Politik & Regulierung",
        "specialty": "Internationale Richtlinien & Gesetzgebung",
        "background": "Beratung für Regierungen und internationale Organisationen zu Regulierungsfragen.",
        "perspective": "Fokus auf praktische Umsetzbarkeit und regulatorische Herausforderungen",
        "avatar": "📝",
        "color": "#0ea5e9",
        "expertise": 87,
        "validatedCredentials": True
    },
    {
        "id": "exp-006",
        "name": "Dr. Medicine Insights",
        "domain": "Medizin",
        "specialty": "Medizinische Ethik & Gesundheitssystemforschung",
        "background": "Forschung und Praxis an der Schnittstelle zwischen medizinischer Innovation und ethischen Fragen.",
        "perspective": "Patientenzentrierter Ansatz mit Fokus auf gerechten Zugang zu Gesundheitsversorgung",
        "avatar": "🏥",
        "color": "#ec4899",
        "expertise": 93,
        "validatedCredentials": True
    },
    {
        "id": "exp-007",
        "name": "Tech Ethicist",
        "domain": "Technologieethik",
        "specialty": "KI-Ethik & Verantwortungsvolle Innovation",
        "background": "Forschung zur ethischen Entwicklung und Anwendung von KI in verschiedenen Bereichen.",
        "perspective": "Fokus auf menschenzentrierte Technologieentwicklung und ethische Leitplanken",
        "avatar": "🤖",
        "color": "#3b82f6",
        "expertise": 96,
        "validatedCredentials": True
    }
]

@app.get("/api/cognitive/profiles", tags=["cognitive"])
async def get_expert_profiles():
    """Gibt eine Liste vordefinierter Expertenprofile zurück."""
    return {
        "experts": EXPERT_PROFILES,
        "count": len(EXPERT_PROFILES)
    }

@app.get("/api/cognitive/suggested", tags=["cognitive"])
async def get_suggested_experts(
    topic: str,
    count: int = 3
):
    """Schlägt geeignete Experten für ein bestimmtes Thema vor."""
    # Für diese Implementierung wählen wir einfach zufällig `count` Experten aus
    import random
    suggested_experts = random.sample(EXPERT_PROFILES, min(count, len(EXPERT_PROFILES)))
    
    return {
        "topic": topic,
        "experts": suggested_experts,
        "count": len(suggested_experts)
    }

# Stelle sicher, dass 'app' explizit als Teil des Moduls exportiert wird
__all__ = ['app'] 