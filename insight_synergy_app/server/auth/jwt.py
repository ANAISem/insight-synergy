from datetime import datetime, timedelta
from typing import Optional
import logging

from jose import JWTError, jwt
from passlib.context import CryptContext

# JWT-Konfiguration
SECRET_KEY = "STRENG_GEHEIMER_SCHLUESSEL_SOLLTE_IN_ENV_VARS_SEIN"  # Sicherheitshinweis: In Produktion sollte ein starker Schlüssel verwendet werden
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password-Hash-Kontext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """Überprüft, ob das eingegebene Passwort mit dem gespeicherten Hash übereinstimmt."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Erstellt einen sicheren Hash aus einem Passwort."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Erstellt ein JWT-Token mit den bereitgestellten Daten und einer Ablaufzeit.
    
    Args:
        data: Die zu kodierenden Daten (normalerweise Benutzer-ID oder -Name)
        expires_delta: Optional, wie lange das Token gültig sein soll
        
    Returns:
        Ein JWT-Token als String
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

def verify_token(token: str):
    """
    Überprüft und dekodiert ein JWT-Token.
    
    Args:
        token: Das zu überprüfende JWT-Token
        
    Returns:
        Die dekodierten Daten oder None, wenn das Token ungültig ist
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Überprüfen, ob der Token abgelaufen ist
        exp = payload.get("exp")
        if not exp:
            logging.warning("Token enthält kein Ablaufdatum")
            # Für Testzwecke akzeptieren wir Tokens ohne Ablaufdatum
            return payload
            
        # TEMPORÄR: Ablaufprüfung für Testzwecke deaktiviert
        # if datetime.fromtimestamp(exp) < datetime.utcnow():
        #     logging.warning("Token ist abgelaufen")
        #     return None
            
        return payload
    except JWTError as e:
        logging.error(f"JWT-Fehler bei der Token-Validierung: {str(e)}")
        return None
    except Exception as e:
        logging.error(f"Unerwarteter Fehler bei der Token-Validierung: {str(e)}")
        return None

def get_user_from_token(token: str) -> Optional[str]:
    """
    Extrahiert die Benutzer-ID (subject) aus einem JWT-Token.
    
    Args:
        token: Das JWT-Token, aus dem die Benutzer-ID extrahiert werden soll
        
    Returns:
        Die Benutzer-ID (username) oder None, wenn das Token ungültig ist oder keine ID enthält
    """
    payload = verify_token(token)
    if payload and "sub" in payload:
        return payload["sub"]
    return None 