from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import List, Optional, Dict, Any, Union
import os
import time
import uvicorn
from datetime import datetime, timedelta
import jwt
from pydantic import BaseModel

from .api.router import router as api_router
from .core.config import settings
from .core.logging import setup_logger
from .services.service_factory import get_nexus_service
from .middleware import AdaptiveDebugMiddleware, RequestContextMiddleware

logger = setup_logger()

# Initialize FastAPI app
app = FastAPI(
    title="Nexus Backend",
    description="Backend API for the Nexus AI application",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add adaptive debugging middleware
app.add_middleware(RequestContextMiddleware)
app.add_middleware(AdaptiveDebugMiddleware)

# Secret key for JWT tokens
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Get services from factory
nexus_service = get_nexus_service()

# Include API router
app.include_router(api_router, prefix="/api")

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

# Models for authentication
class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Mock user database
fake_users_db = {
    "admin": {
        "username": "admin",
        "full_name": "Admin User",
        "email": "admin@example.com",
        "hashed_password": "adminpassword",  # In production, use hashed passwords
        "disabled": False,
    }
}

def verify_password(plain_password, hashed_password):
    # In production, use proper password hashing like bcrypt
    return plain_password == hashed_password

def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    
def authenticate_user(fake_db, username: str, password: str):
    user = get_user(fake_db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except jwt.PyJWTError:
        raise credentials_exception
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/")
async def root():
    return {"message": "Welcome to the Nexus Backend API"}

@app.get("/status")
async def status():
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "version": app.version,
        "insight_core_enabled": settings.ENABLE_INSIGHT_CORE
    }

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

# API-Endpunkt für Debug-Status hinzufügen
@app.get("/debug/status")
async def debug_status():
    from nexus_backend.utils.adaptive_debug import get_debug_report
    report = get_debug_report()
    return report

if __name__ == "__main__":
    logger.info(f"Starting Nexus Backend on {settings.HOST}:{settings.PORT}")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=settings.WORKERS
    ) 