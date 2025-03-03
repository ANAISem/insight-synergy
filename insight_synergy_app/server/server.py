#!/usr/bin/env python3
import asyncio
import json
import logging
import datetime
import uuid
from aiohttp import web
from websockets.server import serve, WebSocketServerProtocol
from websockets.exceptions import ConnectionClosed
import os
import uvicorn

# Logging einrichten
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Konfiguration
PORT = 8090
API_PATH = "/api"
MAX_HISTORY = 50

# Clients und Nachrichtenverlauf
clients = set()
message_history = []

# Hilfsfunktion zum Erstellen von Nachrichten
def create_message(content, sender="system"):
    return {
        "type": "message",
        "data": {
            "id": str(uuid.uuid4()),
            "content": content,
            "sender": sender,
            "timestamp": datetime.datetime.now().isoformat()
        }
    }

# Hilfsfunktion zum Erstellen von Fehlermeldungen
def create_error(message):
    return {
        "type": "error",
        "message": message
    }

# Broadcast an alle verbundenen Clients
async def broadcast(message):
    if clients:
        message_json = json.dumps(message)
        await asyncio.gather(
            *[client.send(message_json) for client in clients]
        )

# WebSocket-Verbindungshandler
async def ws_handler(websocket: WebSocketServerProtocol):
    clients.add(websocket)
    logger.info(f"Neuer Client verbunden. Aktive Verbindungen: {len(clients)}")
    
    try:
        # Willkommensnachricht senden
        welcome_message = create_message("Willkommen beim Insight Synergy Server!")
        await websocket.send(json.dumps(welcome_message))
        
        # Nachrichtenverlauf senden
        for msg in message_history:
            await websocket.send(json.dumps(msg))
        
        # Auf Nachrichten warten
        async for message in websocket:
            try:
                data = json.loads(message)
                logger.info(f"Nachricht erhalten: {data}")
                
                if data.get("type") == "message" and "data" in data:
                    # Antwort erstellen
                    response = create_message(
                        f"Antwort auf: {data['data']['content']}", 
                        sender="assistant"
                    )
                    
                    # Zur Historie hinzufügen
                    message_history.append(response)
                    if len(message_history) > MAX_HISTORY:
                        message_history.pop(0)
                    
                    # An alle Clients senden
                    await broadcast(response)
                else:
                    await websocket.send(json.dumps(create_error("Ungültiges Nachrichtenformat")))
            except json.JSONDecodeError:
                logger.error(f"Ungültiges JSON empfangen: {message}")
                await websocket.send(json.dumps(create_error("Ungültiges JSON")))
            except Exception as e:
                logger.error(f"Fehler bei der Verarbeitung: {str(e)}")
                await websocket.send(json.dumps(create_error(f"Verarbeitungsfehler: {str(e)}")))
    except ConnectionClosed:
        logger.info("Verbindung geschlossen")
    finally:
        clients.remove(websocket)
        logger.info(f"Client getrennt. Verbleibende Verbindungen: {len(clients)}")

# HTTP-Handler für /api/message
async def http_message_handler(request):
    try:
        data = await request.json()
        logger.info(f"HTTP-Anfrage erhalten: {data}")
        
        # Antwort erstellen
        response = {
            "id": str(uuid.uuid4()),
            "content": f"Antwort auf: {data.get('content', 'leere Nachricht')}",
            "sender": "assistant",
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        return web.json_response(response)
    except Exception as e:
        logger.error(f"HTTP-Fehler: {str(e)}")
        return web.json_response({"error": str(e)}, status=500)

# HTTP-Handler für /api/status
async def status_handler(request):
    return web.json_response({
        "status": "online",
        "connectedClients": len(clients),
        "messageHistorySize": len(message_history)
    })

# CORS-Middleware
@web.middleware
async def cors_middleware(request, handler):
    response = await handler(request)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

# HTTP-Server einrichten
def init_http_server():
    app = web.Application(middlewares=[cors_middleware])
    app.router.add_post(f"{API_PATH}/message", http_message_handler)
    app.router.add_get(f"{API_PATH}/status", status_handler)
    
    # WebSocket-Handler hinzufügen
    async def websocket_handler(request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws_handler(ws)
        return ws
    
    app.router.add_get('/ws', websocket_handler)
    
    # OPTIONS-Handler für CORS-Preflight
    async def options_handler(request):
        return web.Response(status=204)
    
    app.router.add_options(f"{API_PATH}/message", options_handler)
    app.router.add_options(f"{API_PATH}/status", options_handler)
    
    return app

async def main():
    # HTTP-Server starten
    app = init_http_server()
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', PORT)
    await site.start()
    logger.info(f"HTTP-Server gestartet auf http://localhost:{PORT}{API_PATH}")
    logger.info(f"WebSocket-Server gestartet auf ws://localhost:{PORT}/ws")
    
    try:
        # Server am Laufen halten
        await asyncio.Future()
    finally:
        # Aufräumen
        await runner.cleanup()

if __name__ == "__main__":
    # Port aus Umgebungsvariable oder Standard
    port = int(os.environ.get("PORT", 8090))
    
    # Starte die FastAPI-Anwendung
    # Mit reload=True für automatisches Neuladen bei Codeänderungen
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True) 