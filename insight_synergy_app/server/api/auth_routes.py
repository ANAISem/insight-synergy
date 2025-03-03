from datetime import timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database.models import User, get_db
from auth.jwt import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    verify_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Pydantic-Modelle für Anforderungen und Antworten
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    is_active: bool

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Hilfsfunktion zum Abrufen eines Benutzers anhand des Benutzernamens
def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

# Hilfsfunktion zum Überprüfen der Anmeldedaten
def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

# Hilfsfunktion zum Abrufen des aktuellen Benutzers aus dem Token
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Ungültige Anmeldeinformationen",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    user = get_user_by_username(db, username)
    if user is None:
        raise credentials_exception
    
    return user

# Route zum Registrieren eines neuen Benutzers
@router.post("/register", response_model=UserResponse, tags=["Authentifizierung"])
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Registriert einen neuen Benutzer.
    
    - **username**: Eindeutiger Benutzername
    - **email**: Gültige E-Mail-Adresse
    - **password**: Sicheres Passwort
    """
    # Überprüfen, ob der Benutzername bereits existiert
    db_user = get_user_by_username(db, user_data.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Benutzername bereits registriert")
    
    # Passwort hashen und neuen Benutzer erstellen
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

# Route zum Anmelden und Abrufen eines Tokens
@router.post("/token", response_model=Token, tags=["Authentifizierung"])
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Authentifiziert einen Benutzer und gibt ein JWT-Token zurück.
    
    - **username**: Benutzername
    - **password**: Passwort
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger Benutzername oder Passwort",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

# Route zum Abrufen von Informationen über den aktuellen Benutzer
@router.get("/users/me", response_model=UserResponse, tags=["Benutzer"])
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Gibt Informationen über den aktuell authentifizierten Benutzer zurück.
    """
    return current_user

@router.get("/token/test", tags=["Auth"])
async def get_test_token():
    """
    Generiert ein Test-Token für den Benutzer 'testuser'.
    
    Dieses Token ist für Testzwecke gedacht und hat eine Gültigkeit von 1 Tag.
    """
    from datetime import timedelta
    from auth.jwt import create_access_token
    
    # Token für einen Tag generieren
    access_token = create_access_token(
        data={"sub": "testuser"},
        expires_delta=timedelta(days=1)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": "testuser",
        "expires_in": 86400  # 1 Tag in Sekunden
    } 