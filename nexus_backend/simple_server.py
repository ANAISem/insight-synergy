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
    allow_origins=["*"],  # Erlaube Anfragen von allen Ursprüngen
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/messages")
async def get_messages(limit: Optional[int] = 100):
    return messages[-limit:]

@app.post("/messages")
async def create_message(message: MessageCreate):
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
            pass  # Verbindungsfehler ignorieren
    
    # Systemnachricht als Antwort erstellen
    system_response = {
        "id": str(uuid.uuid4()),
        "content": f"Nachricht empfangen: {message.content}",
        "type": "system",
        "timestamp": datetime.now().isoformat()
    }
    messages.append(system_response)
    
    # Antwort zurückgeben
    return system_response

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Prüfe erforderliche Header
    client = websocket.client
    print(f"Neue WebSocket-Verbindung: {client} - Prüfe erforderliche Header...")
    
    # Akzeptiere die Verbindung
    await websocket.accept()
    print(f"WebSocket-Verbindung akzeptiert für {client}")
    
    # Füge die Verbindung zur Liste der aktiven Verbindungen hinzu
    active_connections.append(websocket)
    
    # Sende alle vorhandenen Nachrichten an den neuen Client
    try:
        messages = await get_messages(limit=100)
        await websocket.send_json({"type": "messages", "data": messages})
        
        # Sende eine Willkommensnachricht
        welcome_message = Message(
            id=str(uuid.uuid4()),
            content="Verbindung zum Server hergestellt!",
            type="system",
            timestamp=datetime.now().isoformat()
        )
        await websocket.send_json({"type": "message", "data": welcome_message.dict()})
    except Exception as e:
        print(f"Fehler beim Senden der initialen Nachrichten: {e}")
    
    # Setze den Zeitpunkt des letzten Heartbeats
    last_heartbeat = time.time()
    
    try:
        # Warte auf Nachrichten vom Client
        while True:
            try:
                # Warte auf Text mit Timeout (20 Sekunden)
                text = await asyncio.wait_for(websocket.receive_text(), timeout=20)
                
                # Versuche, den Text als JSON zu parsen
                try:
                    json_data = json.loads(text)
                except json.JSONDecodeError as e:
                    print(f"Ungültiges JSON empfangen: {e}")
                    continue  # Überspringe diese Nachricht und warte auf die nächste

                if json_data.get("type") == "ping":
                    try:
                        if websocket.client_state.name != "DISCONNECTED":
                            await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
                            last_heartbeat = time.time()  # Aktualisiere den Zeitpunkt des letzten Heartbeats
                        else:
                            print(f"Verbindung bereits getrennt, kann kein Pong senden")
                            break
                    except Exception as e:
                        print(f"Fehler beim Senden von Pong: {e}")
                        # Versuche die Verbindung zu schließen und breche die Schleife ab
                        break

                elif json_data.get("type") == "message" and json_data.get("data"):
                    message_data = json_data.get("data", {})
                    message = MessageCreate(content=message_data.get("content", ""), type=message_data.get("type", "user"))
                    response = await create_message(message)

                    # Sende an alle anderen Verbindungen
                    disconnected_connections = []
                    for connection in active_connections:
                        if connection != websocket and connection.client_state.name != "DISCONNECTED":
                            try:
                                await connection.send_json({"type": "message", "data": response})
                            except Exception as e:
                                print(f"Fehler beim Senden an andere Verbindung: {e}")
                                disconnected_connections.append(connection)
                    
                    # Entferne getrennte Verbindungen aus der Liste
                    for conn in disconnected_connections:
                        try:
                            await conn.close()
                        except:
                            pass
                        if conn in active_connections:
                            active_connections.remove(conn)
            
            except asyncio.TimeoutError:
                # Kein Datenempfang innerhalb des Timeouts, sende Heartbeat
                current_time = time.time()
                if current_time - last_heartbeat > 15:  # Wenn seit 15 Sekunden kein Heartbeat
                    try:
                        # Prüfe, ob die Verbindung noch aktiv ist, bevor wir senden
                        if websocket.client_state.name != "DISCONNECTED":
                            await websocket.send_json({"type": "heartbeat", "timestamp": datetime.now().isoformat()})
                            last_heartbeat = current_time
                            print(f"Heartbeat an {client} gesendet")
                        else:
                            print(f"Verbindung getrennt, kann keinen Heartbeat senden: {client}")
                            break
                    except Exception as e:
                        print(f"Fehler beim Senden des Heartbeats: {e}")
                        break
            
            except WebSocketDisconnect:
                print(f"WebSocket-Verbindung getrennt: {client}")
                break
            
            except json.JSONDecodeError as e:
                print(f"Fehler beim Dekodieren von JSON: {e}")
                continue  # Überspringe diese Nachricht und warte auf die nächste
            
            except Exception as e:
                print(f"Unerwarteter Fehler: {e}")
                # Versuche weiterzumachen, anstatt die Verbindung zu beenden
                continue
    
    except WebSocketDisconnect:
        print(f"WebSocket-Verbindung normal getrennt: {client}")
    
    except Exception as e:
        print(f"Fehler in der WebSocket-Verbindung: {e}")
    
    finally:
        # Stelle sicher, dass die Verbindung geschlossen und aus der Liste entfernt wird
        try:
            if websocket.client_state.name != "DISCONNECTED":
                await websocket.close()
        except:
            pass
        
        if websocket in active_connections:
            active_connections.remove(websocket)
        
        print(f"WebSocket-Verbindung bereinigt: {client}")

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