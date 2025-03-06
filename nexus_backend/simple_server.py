from fastapi import FastAPI, WebSocket, Request, HTTPException, WebSocketDisconnect
import uvicorn
import json
import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import asyncio
import sys
from pathlib import Path
import httpx

# Füge das Verzeichnis zum Python-Pfad hinzu
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Ollama-Konfiguration
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "mistral"

# System-Prompt für bessere Antworten
SYSTEM_PROMPT = """Du bist ein hilfreicher KI-Assistent. Beachte folgende Regeln:
1. Sei präzise und direkt in deinen Antworten
2. Nutze IMMER das aktuelle Systemdatum für Zeitangaben
3. Formatiere Datumsangaben im Format "Wochentag, DD. Monat YYYY"
4. Antworte auf Deutsch
5. Sei freundlich und professionell
6. Bei Fragen nach dem aktuellen Datum, gib NUR das Datum zurück"""

# Kontext-Management
conversation_context = {}

async def generate_response(prompt: str, conversation_id: str = None) -> str:
    """Generiere eine Antwort mit Ollama."""
    
    # Aktuelles Datum und Uhrzeit für Kontext
    current_time = datetime.now()
    
    # Kontext für diese Konversation abrufen oder neu erstellen
    if conversation_id not in conversation_context:
        conversation_context[conversation_id] = {
            "messages": [],
            "last_interaction": current_time
        }
    
    # Kontext aktualisieren
    context = conversation_context[conversation_id]
    context["last_interaction"] = current_time
    
    # Spezielle Behandlung für Datumsabfragen
    date_keywords = ["datum", "tag", "heute"]
    if any(keyword in prompt.lower() for keyword in date_keywords):
        weekday_names = {
            0: "Montag", 1: "Dienstag", 2: "Mittwoch", 3: "Donnerstag",
            4: "Freitag", 5: "Samstag", 6: "Sonntag"
        }
        month_names = {
            1: "Januar", 2: "Februar", 3: "März", 4: "April", 5: "Mai", 6: "Juni",
            7: "Juli", 8: "August", 9: "September", 10: "Oktober", 11: "November", 12: "Dezember"
        }
        
        weekday = weekday_names[current_time.weekday()]
        month = month_names[current_time.month]
        formatted_date = f"Heute ist {weekday}, der {current_time.day}. {month} {current_time.year}"
        return formatted_date
    
    # Prompt mit Systemkontext anreichern
    enhanced_prompt = f"{SYSTEM_PROMPT}\n\nAktuelles Datum: {current_time.strftime('%A, %d. %B %Y')}\nAktuelle Uhrzeit: {current_time.strftime('%H:%M:%S')}\n\nBenutzeranfrage: {prompt}"
    
    print(f"Sende Anfrage an Ollama: {prompt}")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": enhanced_prompt,
                    "stream": False
                },
                timeout=30.0
            )
            if response.status_code == 200:
                result = response.json()["response"]
                print(f"Ollama-Antwort erhalten: {result[:100]}...")
                
                # Antwort im Kontext speichern
                context["messages"].append({
                    "role": "assistant",
                    "content": result,
                    "timestamp": current_time.isoformat()
                })
                
                return result
            else:
                raise Exception(f"Fehler bei der Ollama-Anfrage: {response.text}")
    except Exception as e:
        print(f"Fehler bei der Antwortgenerierung: {e}")
        return f"Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage: {str(e)}"

# Lade die Konfiguration aus shared_config.json
config_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'shared_config.json')
try:
    with open(config_file_path, 'r') as f:
        config = json.load(f)
    port = config.get('backend_port', 8001)
except Exception as e:
    print(f"Fehler beim Lesen der Konfiguration: {e}")
    port = 8001

# In-Memory Speicher für Nachrichten
messages = []

# Nachrichtenmodell
class MessageCreate(BaseModel):
    content: str
    type: str = "user"

class Message(BaseModel):
    id: str
    content: str
    type: str
    timestamp: str

# WebSocket-Verbindungen speichern
active_connections: List[WebSocket] = []

app = FastAPI(
    title="Simple Backend",
    description="Einfaches Backend für Tests",
    version="1.0.0",
)

# CORS-Middleware hinzufügen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Teste die Ollama-Verbindung
    try:
        response = await generate_response("test")
        print("Ollama-Verbindung erfolgreich getestet")
    except Exception as e:
        print(f"Warnung: Ollama-Verbindungstest fehlgeschlagen: {e}")

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/messages")
async def get_messages(limit: Optional[int] = 100):
    return messages[-limit:]

@app.delete("/messages")
async def delete_all_messages():
    global messages
    messages = []
    for connection in active_connections:
        try:
            await connection.send_json({
                "type": "clear_messages"
            })
        except:
            pass
    return {"status": "success", "message": "Alle Nachrichten wurden gelöscht"}

@app.post("/messages")
async def create_message(message: MessageCreate):
    print(f"Neue Nachricht empfangen: {message.content}")
    
    # Nachricht erstellen
    new_message = {
        "id": str(uuid.uuid4()),
        "content": message.content,
        "type": message.type,
        "timestamp": datetime.now().isoformat()
    }
    messages.append(new_message)
    
    # Nachricht an alle WebSocket-Clients senden
    for connection in active_connections:
        try:
            await connection.send_json({
                "type": "message",
                "data": new_message
            })
        except:
            pass
    
    try:
        # KI-Antwort generieren
        ai_response_content = await generate_response(message.content)
        print(f"KI-Antwort generiert: {ai_response_content[:100]}...")
        
        # Systemnachricht mit KI-Antwort erstellen
        system_response = {
            "id": str(uuid.uuid4()),
            "content": ai_response_content,
            "type": "system",
            "timestamp": datetime.now().isoformat()
        }
        messages.append(system_response)
        
        # KI-Antwort an alle WebSocket-Clients senden
        for connection in active_connections:
            try:
                await connection.send_json({
                    "type": "message",
                    "data": system_response
                })
            except:
                pass
        
        return system_response
        
    except Exception as e:
        print(f"Fehler bei der Nachrichtenverarbeitung: {e}")
        error_response = {
            "id": str(uuid.uuid4()),
            "content": f"Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Nachricht: {str(e)}",
            "type": "system",
            "timestamp": datetime.now().isoformat()
        }
        messages.append(error_response)
        return error_response

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    try:
        # Generiere eine eindeutige Konversations-ID
        conversation_id = str(uuid.uuid4())
        
        # Prüfe erforderliche Header
        client = websocket.client
        print(f"[DEBUG] Neue WebSocket-Verbindung von: {client}")
        
        # Akzeptiere die Verbindung
        await websocket.accept()
        print(f"[DEBUG] WebSocket-Verbindung akzeptiert für: {client}")
        
        # Füge die Verbindung zur Liste der aktiven Verbindungen hinzu
        active_connections.append(websocket)
        print(f"[DEBUG] Client {client} zu aktiven Verbindungen hinzugefügt")
        
        # Sende alle vorhandenen Nachrichten an den neuen Client
        try:
            messages_to_send = await get_messages(limit=100)
            print(f"[DEBUG] Sende {len(messages_to_send)} Nachrichten an neuen Client")
            await websocket.send_json({"type": "messages", "data": messages_to_send})
            
            # Sende eine Willkommensnachricht
            welcome_message = Message(
                id=str(uuid.uuid4()),
                content="Verbindung zum Server hergestellt!",
                type="system",
                timestamp=datetime.now().isoformat()
            )
            await websocket.send_json({"type": "message", "data": welcome_message.model_dump()})
            print(f"[DEBUG] Willkommensnachricht an {client} gesendet")
        except Exception as e:
            print(f"[ERROR] Fehler beim Senden der initialen Nachrichten: {e}")
        
        while True:
            try:
                # Empfange Nachricht
                text = await websocket.receive_text()
                print(f"[DEBUG] Nachricht von {client} empfangen: {text}")
                
                # Parse JSON
                json_data = json.loads(text)
                
                if json_data.get("type") == "message" and json_data.get("data"):
                    message_data = json_data.get("data", {})
                    print(f"[DEBUG] Verarbeite Nachricht: {message_data}")
                    
                    # Speichere Benutzernachricht im Kontext
                    if conversation_id in conversation_context:
                        conversation_context[conversation_id]["messages"].append({
                            "role": "user",
                            "content": message_data.get("content", ""),
                            "timestamp": datetime.now().isoformat()
                        })
                    
                    # Erstelle Benutzernachricht
                    user_message = Message(
                        id=str(uuid.uuid4()),
                        content=message_data.get("content", ""),
                        type="user",
                        timestamp=datetime.now().isoformat()
                    )
                    messages.append(user_message.model_dump())
                    print(f"[DEBUG] Benutzernachricht erstellt: {user_message}")
                    
                    # Sende Benutzernachricht an alle Clients
                    for connection in active_connections:
                        try:
                            await connection.send_json({
                                "type": "message",
                                "data": user_message.model_dump()
                            })
                        except Exception as e:
                            print(f"[ERROR] Fehler beim Senden der Benutzernachricht: {e}")
                    
                    # Generiere und sende KI-Antwort
                    try:
                        ai_response = await generate_response(
                            message_data.get("content", ""),
                            conversation_id=conversation_id
                        )
                        print(f"[DEBUG] KI-Antwort generiert: {ai_response[:100]}...")
                        
                        system_response = Message(
                            id=str(uuid.uuid4()),
                            content=ai_response,
                            type="system",
                            timestamp=datetime.now().isoformat()
                        )
                        messages.append(system_response.model_dump())
                        print(f"[DEBUG] Systemantwort erstellt: {system_response}")
                        
                        # Sende an alle Clients
                        for connection in active_connections:
                            try:
                                await connection.send_json({
                                    "type": "message",
                                    "data": system_response.model_dump()
                                })
                                print(f"[DEBUG] Systemantwort an Client gesendet")
                            except Exception as e:
                                print(f"[ERROR] Fehler beim Senden der Systemantwort: {e}")
                    except Exception as e:
                        print(f"[ERROR] Fehler bei der KI-Antwortgenerierung: {e}")
                        error_response = Message(
                            id=str(uuid.uuid4()),
                            content=f"Entschuldigung, es gab einen Fehler: {str(e)}",
                            type="system",
                            timestamp=datetime.now().isoformat()
                        )
                        messages.append(error_response.model_dump())
                        await websocket.send_json({
                            "type": "message",
                            "data": error_response.model_dump()
                        })
            except json.JSONDecodeError as e:
                print(f"[ERROR] Ungültiges JSON empfangen von {client}: {e}")
                continue
            except Exception as e:
                print(f"[ERROR] Unerwarteter Fehler bei {client}: {e}")
                break
    except WebSocketDisconnect:
        print(f"[INFO] WebSocket-Verbindung normal getrennt: {client}")
    except Exception as e:
        print(f"[ERROR] Fehler in der WebSocket-Verbindung: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
            print(f"[DEBUG] Client {client} aus aktiven Verbindungen entfernt")
        
        # Kontext aufräumen wenn älter als 1 Stunde
        current_time = datetime.now()
        contexts_to_remove = []
        for conv_id, context in conversation_context.items():
            last_interaction = datetime.fromisoformat(context["messages"][-1]["timestamp"]) if context["messages"] else context["last_interaction"]
            if (current_time - last_interaction).total_seconds() > 3600:  # 1 Stunde
                contexts_to_remove.append(conv_id)
        
        for conv_id in contexts_to_remove:
            del conversation_context[conv_id]

# Health-Check-Endpoint mit WebSocket-Status
@app.get("/ws-status")
async def websocket_status():
    # Bereinige die Liste der aktiven Verbindungen
    global active_connections
    active_connections = [conn for conn in active_connections if conn.client_state.name != "DISCONNECTED"]
    
    return {
        "active_connections": len(active_connections),
        "connection_details": [
            {"client": str(conn.client), "state": conn.client_state.name if hasattr(conn, "client_state") else "unknown"}
            for conn in active_connections
        ]
    }

if __name__ == "__main__":
    print(f"Starting simple server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info") 