"""
Live Expert Debate API-Endpunkte für Insight Synergy.

Diese API ermöglicht Echtzeit-Debatten zwischen mehreren KI-Experten mit 
dynamischer Interaktion und tiefgreifenden Analysen.
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends, Body
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
import json
import asyncio
import uuid
from datetime import datetime

# Eigene Modelle und Dienste
from nexus_backend.utils.logging import get_logger
from nexus_backend.services.openai_service import OpenAIService
from nexus_backend.services.perplexity_service import PerplexityService
from nexus_backend.utils.adaptive_debug import debugger

# Router für Live-Expert-Debatten - WICHTIG: Diese Variable muss "router" heißen!
router = APIRouter()
live_expert_debate_router = router

# Logger einrichten
logger = get_logger("live_expert_debate_api")

# Dienste initialisieren
openai_service = OpenAIService()
perplexity_service = PerplexityService()

# Aktive WebSocket-Verbindungen verwalten
active_connections: Dict[str, WebSocket] = {}
active_debates: Dict[str, Dict[str, Any]] = {}

# Modelle für Request/Response
class ExpertProfile(BaseModel):
    name: str
    expertise: str
    background: str
    perspective: Optional[str] = None
    avatar_url: Optional[str] = None
    color: Optional[str] = None

class LiveDebateRequest(BaseModel):
    topic: str
    context: Optional[str] = None
    experts: List[ExpertProfile] = Field(min_items=2, max_items=5)
    user_name: Optional[str] = "Benutzer"
    max_duration_minutes: Optional[int] = 30

class MessageContent(BaseModel):
    text: str
    sources: Optional[List[Dict[str, str]]] = None
    emphasis: Optional[List[str]] = None

class DebateMessage(BaseModel):
    id: str
    sender: str
    sender_type: str  # "expert", "user", "system"
    content: MessageContent
    timestamp: str
    reply_to: Optional[str] = None

class DebateStatus(BaseModel):
    debate_id: str
    topic: str
    status: str  # "active", "paused", "completed"
    current_round: int
    experts: List[ExpertProfile]
    messages: List[DebateMessage]
    started_at: str
    last_activity: str

# Hilfsfunktionen
def generate_message_id():
    """Erzeugt eine eindeutige Nachrichten-ID."""
    return str(uuid.uuid4())

def get_timestamp():
    """Erzeugt einen Zeitstempel im ISO-Format."""
    return datetime.now().isoformat()

async def get_expert_response(topic: str, context: str, expert: ExpertProfile, 
                             messages: List[DebateMessage], debate_id: str) -> str:
    """Generiert eine Expertenantwort basierend auf dem Kontext und bisherigen Nachrichten."""
    try:
        # Systemkontext für den Experten erstellen
        system_context = f"""
        Du bist {expert.name}, ein Experte in {expert.expertise} mit folgendem Hintergrund: {expert.background}.
        """
        
        if expert.perspective:
            system_context += f" Deine Perspektive ist: {expert.perspective}."
        
        system_context += """
        Du nimmst an einer Live-Expertendebatte teil. Deine Aufgaben:
        1. Beantworte Fragen und reagiere auf Kommentare präzise und informativ
        2. Beziehe dich auf vorherige Aussagen anderer Experten und des Benutzers
        3. Vertrete konsistent deine fachliche Perspektive
        4. Sei respektvoll, aber zögere nicht, bei falschen Aussagen zu widersprechen
        5. Halte Antworten knapp und fokussiert (max. 3 Absätze)
        """
        
        # Konversationsverlauf aufbauen
        conversation_history = f"Thema: {topic}\n\nKontext: {context}\n\n"
        
        # Nur die letzten 10 Nachrichten berücksichtigen
        recent_messages = messages[-10:] if len(messages) > 10 else messages
        
        for msg in recent_messages:
            sender = msg.sender
            sender_type = msg.sender_type
            content = msg.content.text
            
            if sender_type == "expert":
                conversation_history += f"{sender}: {content}\n\n"
            elif sender_type == "user":
                conversation_history += f"Benutzer: {content}\n\n"
            elif sender_type == "system":
                conversation_history += f"[System: {content}]\n\n"
        
        # Anfrage an LLM senden
        response = await openai_service.get_completion(
            user_message=f"Basierend auf dem bisherigen Verlauf der Debatte, wie lautet deine nächste Antwort?\n\n{conversation_history}",
            system_message=system_context
        )
        
        return response
    
    except Exception as e:
        logger.error(f"Fehler bei der Generierung der Expertenantwort: {e}")
        error_id = debugger.log_error(e, f"expert_response:{debate_id}:{expert.name}")
        return f"[Entschuldigung, ich konnte aufgrund eines technischen Problems nicht antworten. Error ID: {error_id}]"

@router.post("/live-debate", tags=["live-expert-debate"])
async def create_live_debate(request: LiveDebateRequest):
    """
    Erstellt eine neue Live-Expertendebatte.
    
    - **topic**: Das Hauptthema der Debatte
    - **context**: Zusätzlicher Kontext oder Hintergrundinformationen
    - **experts**: Liste der Experten mit ihren Profilen
    - **user_name**: Name des Benutzers
    - **max_duration_minutes**: Maximale Dauer der Debatte in Minuten
    """
    logger.info(f"Neue Live-Debatte gestartet: {request.topic}")
    
    # Debate-ID generieren
    debate_id = f"live-{int(datetime.now().timestamp())}"
    
    # Initialnachrichten erstellen
    welcome_message = DebateMessage(
        id=generate_message_id(),
        sender="System",
        sender_type="system",
        content=MessageContent(
            text=f"Willkommen zur Live-Expertendebatte zum Thema '{request.topic}'! "
                 f"Die Experten stehen bereit, um Ihre Fragen zu beantworten und zu diskutieren."
        ),
        timestamp=get_timestamp()
    )
    
    # Expertenvorstellungen generieren
    introduction_messages = []
    for expert in request.experts:
        intro_message = DebateMessage(
            id=generate_message_id(),
            sender=expert.name,
            sender_type="expert",
            content=MessageContent(
                text=f"Hallo! Ich bin {expert.name}, Experte für {expert.expertise}. "
                     f"{expert.background} {expert.perspective or ''} "
                     f"Ich freue mich auf eine spannende Diskussion!"
            ),
            timestamp=get_timestamp()
        )
        introduction_messages.append(intro_message)
    
    # Debattenstatus erstellen
    debate_status = DebateStatus(
        debate_id=debate_id,
        topic=request.topic,
        status="active",
        current_round=1,
        experts=request.experts,
        messages=[welcome_message] + introduction_messages,
        started_at=get_timestamp(),
        last_activity=get_timestamp()
    )
    
    # In aktive Debatten einfügen
    active_debates[debate_id] = {
        "status": debate_status,
        "request": request
    }
    
    return {
        "debate_id": debate_id,
        "status": "active",
        "initial_state": debate_status
    }

@router.websocket("/ws/live-debate/{debate_id}")
async def websocket_live_debate(websocket: WebSocket, debate_id: str):
    """WebSocket-Endpunkt für die Live-Interaktion mit der Expertendebatte."""
    if debate_id not in active_debates:
        await websocket.close(code=4000, reason=f"Debatte mit ID {debate_id} nicht gefunden")
        return
    
    # Verbindung akzeptieren
    await websocket.accept()
    
    # Verbindung zum aktiven Debatten-Pool hinzufügen
    connection_id = f"{debate_id}:{str(uuid.uuid4())}"
    active_connections[connection_id] = websocket
    
    # Aktuellen Zustand senden
    debate_data = active_debates[debate_id]
    await websocket.send_json({"type": "initial_state", "data": debate_data["status"].dict()})
    
    try:
        # Auf Nachrichten warten
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            message_type = message_data.get("type", "")
            
            if message_type == "user_message":
                # Benutzernachricht verarbeiten
                user_message_text = message_data.get("message", "")
                user_name = message_data.get("user_name", "Benutzer")
                
                # Neue Nachricht erstellen
                user_message = DebateMessage(
                    id=generate_message_id(),
                    sender=user_name,
                    sender_type="user",
                    content=MessageContent(text=user_message_text),
                    timestamp=get_timestamp()
                )
                
                # Nachricht zum Debattenverlauf hinzufügen
                debate_data["status"].messages.append(user_message)
                debate_data["status"].last_activity = get_timestamp()
                
                # Allen verbundenen Clients die Nachricht senden
                for conn_id, conn in active_connections.items():
                    if conn_id.startswith(debate_id):
                        await conn.send_json({
                            "type": "new_message",
                            "data": user_message.dict()
                        })
                
                # Expertenantworten generieren (asynchron)
                asyncio.create_task(
                    process_expert_responses(
                        debate_id, 
                        debate_data["status"],
                        debate_data["request"],
                        user_message
                    )
                )
            
            elif message_type == "request_summary":
                # Zusammenfassung anfordern
                asyncio.create_task(
                    generate_live_debate_summary(debate_id)
                )
    
    except WebSocketDisconnect:
        # Verbindung aus dem Pool entfernen
        if connection_id in active_connections:
            del active_connections[connection_id]
    
    except Exception as e:
        logger.error(f"Fehler in der WebSocket-Verbindung: {str(e)}")
        error_id = debugger.log_error(e, f"websocket:{debate_id}")
        
        try:
            await websocket.send_json({
                "type": "error",
                "data": {
                    "message": f"Ein Fehler ist aufgetreten: {str(e)}",
                    "error_id": error_id
                }
            })
        except:
            # Falls Verbindung bereits geschlossen ist
            pass
        
        # Verbindung aus dem Pool entfernen
        if connection_id in active_connections:
            del active_connections[connection_id]

async def process_expert_responses(debate_id: str, debate_status: DebateStatus, 
                                   debate_request: LiveDebateRequest, 
                                   trigger_message: DebateMessage):
    """Verarbeitet Expertenantworten asynchron basierend auf der Benutzernachricht."""
    try:
        # Für jeden Experten eine Antwort generieren
        for expert in debate_request.experts:
            # Kurze Pause zwischen den Antworten für natürlicheres Timing
            await asyncio.sleep(1.5 + (len(expert.name) % 3))  # Variiert zwischen 1.5 und 3.5 Sekunden
            
            # Expertenantwort generieren
            response_text = await get_expert_response(
                debate_request.topic,
                debate_request.context or "",
                expert,
                debate_status.messages,
                debate_id
            )
            
            # Neue Nachricht erstellen
            expert_message = DebateMessage(
                id=generate_message_id(),
                sender=expert.name,
                sender_type="expert",
                content=MessageContent(text=response_text),
                timestamp=get_timestamp(),
                reply_to=trigger_message.id
            )
            
            # Nachricht zum Debattenverlauf hinzufügen
            debate_status.messages.append(expert_message)
            debate_status.last_activity = get_timestamp()
            
            # Allen verbundenen Clients die Nachricht senden
            for conn_id, conn in active_connections.items():
                if conn_id.startswith(debate_id):
                    await conn.send_json({
                        "type": "new_message",
                        "data": expert_message.dict()
                    })
    
    except Exception as e:
        logger.error(f"Fehler bei der Verarbeitung der Expertenantworten: {str(e)}")
        error_id = debugger.log_error(e, f"process_expert_responses:{debate_id}")
        
        # Fehlermeldung an alle verbundenen Clients senden
        for conn_id, conn in active_connections.items():
            if conn_id.startswith(debate_id):
                try:
                    await conn.send_json({
                        "type": "error",
                        "data": {
                            "message": f"Fehler bei der Generierung der Expertenantworten: {str(e)}",
                            "error_id": error_id
                        }
                    })
                except:
                    # Falls Verbindung bereits geschlossen ist
                    pass

async def generate_live_debate_summary(debate_id: str):
    """Generiert eine Zusammenfassung der aktuellen Debatte."""
    if debate_id not in active_debates:
        logger.error(f"Debatte mit ID {debate_id} nicht gefunden")
        return
    
    debate_data = active_debates[debate_id]
    debate_status = debate_data["status"]
    
    try:
        # Alle Nachrichten extrahieren
        messages_text = ""
        for msg in debate_status.messages:
            if msg.sender_type != "system":
                messages_text += f"{msg.sender}: {msg.content.text}\n\n"
        
        # Zusammenfassung mit OpenAI generieren
        summary_prompt = f"""
        Erstelle eine prägnante Zusammenfassung der folgenden Expertendebatte zum Thema '{debate_status.topic}':
        
        {messages_text}
        
        Die Zusammenfassung sollte folgende Punkte enthalten:
        1. Die Hauptthemen und Fragestellungen der Diskussion
        2. Die verschiedenen vertretenen Standpunkte
        3. Übereinstimmungen und Meinungsverschiedenheiten zwischen den Experten
        4. Wichtige Erkenntnisse und Schlussfolgerungen
        """
        
        summary = await openai_service.get_completion(
            user_message=summary_prompt,
            system_message="Du bist ein neutraler Moderator und Analyst für Expertendebatten. Erstelle eine präzise und ausgewogene Zusammenfassung."
        )
        
        # Neue Nachricht erstellen
        summary_message = DebateMessage(
            id=generate_message_id(),
            sender="System",
            sender_type="system",
            content=MessageContent(
                text=f"Zusammenfassung der Debatte:\n\n{summary}"
            ),
            timestamp=get_timestamp()
        )
        
        # Nachricht zum Debattenverlauf hinzufügen
        debate_status.messages.append(summary_message)
        
        # Allen verbundenen Clients die Nachricht senden
        for conn_id, conn in active_connections.items():
            if conn_id.startswith(debate_id):
                await conn.send_json({
                    "type": "summary",
                    "data": summary_message.dict()
                })
    
    except Exception as e:
        logger.error(f"Fehler bei der Generierung der Zusammenfassung: {str(e)}")
        error_id = debugger.log_error(e, f"generate_summary:{debate_id}")
        
        # Fehlermeldung an alle verbundenen Clients senden
        for conn_id, conn in active_connections.items():
            if conn_id.startswith(debate_id):
                try:
                    await conn.send_json({
                        "type": "error",
                        "data": {
                            "message": f"Fehler bei der Generierung der Zusammenfassung: {str(e)}",
                            "error_id": error_id
                        }
                    })
                except:
                    # Falls Verbindung bereits geschlossen ist
                    pass

@router.post("/live-debate/{debate_id}/complete", tags=["live-expert-debate"])
async def complete_live_debate(debate_id: str):
    """
    Beendet eine laufende Live-Debatte und erstellt eine abschließende Zusammenfassung.
    
    - **debate_id**: ID der zu beendenden Debatte
    """
    if debate_id not in active_debates:
        raise HTTPException(status_code=404, detail=f"Debatte mit ID {debate_id} nicht gefunden")
    
    debate_data = active_debates[debate_id]
    debate_status = debate_data["status"]
    
    try:
        # Status auf "completed" setzen
        debate_status.status = "completed"
        
        # Abschließende Zusammenfassung generieren
        await generate_live_debate_summary(debate_id)
        
        # Allen verbundenen Clients die Statusänderung mitteilen
        for conn_id, conn in active_connections.items():
            if conn_id.startswith(debate_id):
                try:
                    await conn.send_json({
                        "type": "status_change",
                        "data": {
                            "status": "completed",
                            "message": "Die Debatte wurde beendet."
                        }
                    })
                except:
                    # Falls Verbindung bereits geschlossen ist
                    pass
        
        return {
            "status": "success",
            "message": "Die Debatte wurde erfolgreich beendet.",
            "debate_id": debate_id
        }
    
    except Exception as e:
        logger.error(f"Fehler beim Beenden der Debatte: {str(e)}")
        error_id = debugger.log_error(e, f"complete_debate:{debate_id}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Beenden der Debatte: {str(e)}. Error ID: {error_id}"
        ) 