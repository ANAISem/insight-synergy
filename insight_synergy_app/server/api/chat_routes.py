from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from fastapi.responses import JSONResponse
from starlette.websockets import WebSocketState
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from datetime import datetime
import json
import logging
import traceback  # Hinzugefügt für detaillierte Fehlerausgabe
import asyncio
import uuid

# Logging-Level für WebSocket-Debugging erhöhen
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("websocket")
logger.setLevel(logging.DEBUG)

from database.models import User, Message, get_db
from api.auth_routes import get_current_user
from auth.jwt import verify_token, get_user_from_token

router = APIRouter()

# WebSocket-Verbindungsmanager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, Any]] = {}  # user_id -> {websocket, user_data}
        self.connection_count = 0
        logger.info("WebSocket ConnectionManager initialisiert")

    async def connect(self, websocket: WebSocket, user_id: Optional[str] = None, user_data: Optional[dict] = None):
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        
        if user_id:
            self.active_connections[user_id] = {
                "websocket": websocket,
                "connection_id": connection_id,
                "user_data": user_data or {},
                "authenticated": True,
                "connected_at": datetime.now().isoformat()
            }
            logger.info(f"Authentifizierte Verbindung für Benutzer {user_id} hergestellt (Connection ID: {connection_id})")
            
            # Bestätigungsnachricht senden
            await self.send_json_to_user(
                user_id, 
                {
                    "type": "connection_established",
                    "user_id": user_id,
                    "authenticated": True,
                    "timestamp": datetime.now().isoformat()
                }
            )
        else:
            # Anonyme Verbindung (kein Benutzer identifiziert)
            self.active_connections[connection_id] = {
                "websocket": websocket,
                "connection_id": connection_id,
                "authenticated": False,
                "connected_at": datetime.now().isoformat()
            }
            logger.info(f"Anonyme Verbindung hergestellt (Connection ID: {connection_id})")
            
            # Bestätigungsnachricht senden
            await self.send_json_to_connection(
                connection_id, 
                {
                    "type": "connection_established",
                    "authenticated": False,
                    "connection_id": connection_id,
                    "timestamp": datetime.now().isoformat()
                }
            )
            
        self.connection_count += 1
        logger.info(f"Aktive Verbindungen: {self.connection_count}")
        return connection_id
        
    def disconnect(self, user_id: str = None, connection_id: str = None):
        """Verbindung trennen (entweder nach user_id oder connection_id)"""
        if user_id and user_id in self.active_connections:
            logger.info(f"Benutzer {user_id} getrennt")
            del self.active_connections[user_id]
            self.connection_count -= 1
        elif connection_id:
            # Suche nach der Verbindung mit dieser connection_id
            for key, conn_data in list(self.active_connections.items()):
                if conn_data.get("connection_id") == connection_id:
                    logger.info(f"Verbindung {connection_id} getrennt")
                    del self.active_connections[key]
                    self.connection_count -= 1
                    break
        
        logger.info(f"Aktive Verbindungen nach Trennung: {self.connection_count}")

    async def send_json_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            try:
                websocket = self.active_connections[user_id]["websocket"]
                await websocket.send_text(json.dumps(message))
                logger.debug(f"Nachricht an Benutzer {user_id} gesendet: {message}")
                return True
            except Exception as e:
                logger.error(f"Fehler beim Senden an Benutzer {user_id}: {str(e)}")
                return False
        else:
            logger.warning(f"Benutzer {user_id} nicht verbunden")
            return False

    async def send_json_to_connection(self, connection_id: str, message: dict):
        for user_id, conn_data in self.active_connections.items():
            if conn_data.get("connection_id") == connection_id:
                try:
                    websocket = conn_data["websocket"]
                    await websocket.send_text(json.dumps(message))
                    logger.debug(f"Nachricht an Verbindung {connection_id} gesendet: {message}")
                    return True
                except Exception as e:
                    logger.error(f"Fehler beim Senden an Verbindung {connection_id}: {str(e)}")
                    return False
        
        logger.warning(f"Verbindung {connection_id} nicht gefunden")
        return False

    async def broadcast(self, message: dict, exclude_user: Optional[str] = None):
        """Sendet eine Nachricht an alle verbundenen Clients außer exclude_user"""
        disconnected_users = []
        
        for user_id, conn_data in self.active_connections.items():
            if exclude_user and user_id == exclude_user:
                continue
                
            try:
                websocket = conn_data["websocket"]
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Fehler beim Senden an {user_id}, markiere für Trennung: {str(e)}")
                disconnected_users.append(user_id)
        
        # Entferne getrennte Benutzer
        for user_id in disconnected_users:
            self.disconnect(user_id=user_id)

manager = ConnectionManager()

# Pydantic-Modelle für Nachrichten
class MessageCreate(BaseModel):
    content: str
    type: str = "user"

class MessageResponse(BaseModel):
    id: str
    content: str
    type: str
    timestamp: datetime

    class Config:
        orm_mode = True

# Routen für Nachrichten
@router.post("/messages", response_model=MessageResponse, tags=["Chat"])
async def create_message(
    message_data: MessageCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Erstellt eine neue Nachricht für den aktuellen Benutzer.
    
    - **content**: Der Inhalt der Nachricht
    - **type**: Der Typ der Nachricht (standardmäßig "user")
    """
    db_message = Message(
        user_id=current_user.id,
        content=message_data.content,
        type=message_data.type
    )
    
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    return db_message

@router.get("/messages", response_model=List[MessageResponse], tags=["Chat"])
async def get_messages(
    limit: int = 100, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ruft Nachrichten für den aktuellen Benutzer ab.
    
    - **limit**: Maximale Anzahl von Nachrichten, die zurückgegeben werden sollen
    """
    messages = db.query(Message).filter(
        Message.user_id == current_user.id
    ).order_by(Message.timestamp.desc()).limit(limit).all()
    
    return messages

# WebSocket-Route für Echtzeit-Chat
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    connection_id = None
    user_id = None
    user_data = None
    
    # Debug-Informationen zu Verbindungsversuch
    client = f"{websocket.client.host}:{websocket.client.port}"
    logger.info(f"WebSocket Verbindungsversuch von {client}")
    
    try:
        # Erweiterte Debug-Logs
        logger.info("=== WEBSOCKET VERBINDUNGSDETAILS ===")
        logger.info(f"Headers: {websocket.headers}")
        logger.info(f"Query params: {websocket.query_params}")
        logger.info(f"Token vorhanden: {token is not None}")
        
        # Token-Überprüfung, falls vorhanden
        if token:
            try:
                logger.info(f"Versuche Token zu verifizieren")
                decoded_token = verify_token(token)
                if decoded_token and "sub" in decoded_token:
                    user_id = decoded_token["sub"]
                    # Zusätzliche Benutzerdaten aus DB holen
                    db = next(get_db())
                    user = db.query(User).filter(User.username == user_id).first()
                    if user:
                        user_data = {
                            "username": user.username,
                            "email": user.email,
                            "is_active": user.is_active
                        }
                        logger.info(f"Token verifiziert für Benutzer: {user_id}")
                    else:
                        logger.warning(f"Benutzer {user_id} aus Token nicht in Datenbank gefunden")
                        # Wir erlauben die Verbindung, aber ohne Benutzerinformationen
                        user_id = None
                else:
                    logger.warning("Token ungültig oder enthält keine Benutzer-ID")
                    user_id = None
            except Exception as e:
                logger.error(f"Fehler bei Token-Verifizierung: {str(e)}")
                # Verbindung akzeptieren, aber als nicht authentifiziert
                user_id = None
        
        # Verbindung herstellen
        connection_id = await manager.connect(websocket, user_id, user_data)
        
        # Nachrichtenverarbeitung in Schleife
        while True:
            try:
                data = await websocket.receive_text()
                logger.debug(f"Nachricht empfangen: {data}")
                
                try:
                    message_data = json.loads(data)
                    message_type = message_data.get("type", "unknown")
                    
                    # Ping-Pong Handling
                    if message_type == "ping":
                        response = {
                            "type": "pong", 
                            "timestamp": datetime.now().isoformat(),
                            "echo": message_data.get("timestamp", "")
                        }
                        if user_id:
                            await manager.send_json_to_user(user_id, response)
                        else:
                            await manager.send_json_to_connection(connection_id, response)
                    
                    # Chat-Nachricht
                    elif message_type == "message":
                        # Antwort an den Sender
                        response = {
                            "type": "message_received",
                            "timestamp": datetime.now().isoformat(),
                            "message_id": str(uuid.uuid4()),
                            "content": message_data.get("data", {}).get("content", "")
                        }
                        
                        if user_id:
                            await manager.send_json_to_user(user_id, response)
                            
                            # Hier würde man normalerweise die Nachricht in der DB speichern
                            # und an alle relevanten Empfänger senden
                        else:
                            await manager.send_json_to_connection(connection_id, response)
                    
                    # Unbekannter Nachrichtentyp
                    else:
                        response = {
                            "type": "error",
                            "message": f"Unbekannter Nachrichtentyp: {message_type}",
                            "timestamp": datetime.now().isoformat()
                        }
                        if user_id:
                            await manager.send_json_to_user(user_id, response)
                        else:
                            await manager.send_json_to_connection(connection_id, response)
                            
                except json.JSONDecodeError:
                    logger.warning(f"Ungültiges JSON empfangen: {data}")
                    error_response = {
                        "type": "error",
                        "message": "Ungültiges JSON-Format",
                        "timestamp": datetime.now().isoformat()
                    }
                    if user_id:
                        await manager.send_json_to_user(user_id, error_response)
                    else:
                        await manager.send_json_to_connection(connection_id, error_response)
                        
            except Exception as e:
                if isinstance(e, asyncio.CancelledError):
                    logger.info("WebSocket Verbindung wurde abgebrochen")
                else:
                    logger.error(f"Fehler bei Nachrichtenverarbeitung: {str(e)}")
                break
                
    except Exception as e:
        logger.error(f"Fehler bei WebSocket-Verbindung: {str(e)}")
        await websocket.close(code=1011)
    finally:
        # Verbindung trennen
        if user_id:
            manager.disconnect(user_id=user_id)
        elif connection_id:
            manager.disconnect(connection_id=connection_id)
        logger.info(f"WebSocket Verbindung getrennt") 