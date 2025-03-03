"""
WebSocket-Implementierung für das Nexus-Backend.
Ermöglicht das Streamen von LLM-Antworten und Echtzeitkommunikation für RAG-basierte Wissensabfragen.
"""

import json
import asyncio
import time
import uuid
from typing import Dict, Any, List, Optional, Set, Callable
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ValidationError

from ..models.schemas import KnowledgeQuery, DocumentResponse, CitationInfo
from ..services.vector_db import VectorDB, get_vector_db
from ..services.llm_service import LLMService, get_llm_service
from ..utils.logging import get_logger
from ..config import settings

logger = get_logger(__name__)

router = APIRouter()

# API-Key-Header für die WebSocket-Authentifizierung
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Verbindungsmanager für aktive WebSocket-Clients
class ConnectionManager:
    """Verwaltet aktive WebSocket-Verbindungen und ermöglicht Broadcasts."""
    
    def __init__(self):
        # Aktive Verbindungen: Dict[connection_id, websocket]
        self.active_connections: Dict[str, WebSocket] = {}
        # Verbindungs-Counter für eindeutige IDs
        self.connection_counter = 0
        # Heartbeat-Status für alle Verbindungen: Dict[connection_id, last_heartbeat_time]
        self.heartbeats: Dict[str, float] = {}
        # Task für die Heartbeat-Überprüfung
        self.heartbeat_task = None
    
    async def connect(self, websocket: WebSocket) -> str:
        """
        Akzeptiert eine neue WebSocket-Verbindung und weist ihr eine ID zu.
        
        Args:
            websocket: Die neue WebSocket-Verbindung
            
        Returns:
            connection_id: Eindeutige ID für die Verbindung
        """
        # Verbindung akzeptieren
        await websocket.accept()
        
        # Eindeutige ID generieren
        self.connection_counter += 1
        connection_id = f"conn_{self.connection_counter}_{uuid.uuid4().hex[:8]}"
        
        # Verbindung speichern
        self.active_connections[connection_id] = websocket
        
        # Heartbeat initialisieren
        self.heartbeats[connection_id] = time.time()
        
        # Heartbeat-Task starten, falls noch nicht aktiv
        if self.heartbeat_task is None or self.heartbeat_task.done():
            self.heartbeat_task = asyncio.create_task(self._heartbeat_monitor())
        
        logger.info(f"Neue WebSocket-Verbindung: {connection_id}")
        return connection_id
    
    def disconnect(self, connection_id: str):
        """
        Entfernt eine Verbindung aus dem Manager.
        
        Args:
            connection_id: ID der zu entfernenden Verbindung
        """
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
            
            # Heartbeat-Status entfernen
            if connection_id in self.heartbeats:
                del self.heartbeats[connection_id]
                
            logger.info(f"WebSocket-Verbindung geschlossen: {connection_id}")
    
    async def send_message(self, connection_id: str, message: Dict[str, Any]):
        """
        Sendet eine Nachricht an eine bestimmte Verbindung.
        
        Args:
            connection_id: ID der Zielverbindung
            message: Zu sendende Nachricht als Dictionary
        """
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_json(message)
                # Heartbeat aktualisieren bei erfolgreicher Übertragung
                self.heartbeats[connection_id] = time.time()
            except Exception as e:
                logger.error(f"Fehler beim Senden einer Nachricht an {connection_id}: {str(e)}")
                # Verbindung als fehlerhaft markieren
                await self._handle_connection_error(connection_id, e)
    
    async def broadcast(self, message: Dict[str, Any], exclude: Optional[Set[str]] = None):
        """
        Sendet eine Nachricht an alle verbundenen Clients, außer die ausgeschlossenen.
        
        Args:
            message: Zu sendende Nachricht als Dictionary
            exclude: Set von connection_ids, die ausgeschlossen werden sollen
        """
        exclude = exclude or set()
        
        failed_connections = set()
        
        for connection_id, connection in self.active_connections.items():
            if connection_id not in exclude:
                try:
                    await connection.send_json(message)
                    # Heartbeat aktualisieren bei erfolgreicher Übertragung
                    self.heartbeats[connection_id] = time.time()
                except Exception as e:
                    logger.error(f"Fehler beim Broadcast an {connection_id}: {str(e)}")
                    failed_connections.add(connection_id)
        
        # Fehlerhafte Verbindungen behandeln
        for connection_id in failed_connections:
            await self._handle_connection_error(connection_id, Exception("Broadcast-Fehler"))
    
    async def update_heartbeat(self, connection_id: str):
        """Aktualisiert den Heartbeat-Zeitstempel für eine Verbindung."""
        if connection_id in self.heartbeats:
            self.heartbeats[connection_id] = time.time()
    
    async def _heartbeat_monitor(self):
        """Überwacht alle Verbindungen auf Aktivität und entfernt inaktive."""
        while True:
            try:
                # Warten, um CPU-Last zu reduzieren
                await asyncio.sleep(30)
                
                current_time = time.time()
                expired_connections = []
                
                # Inaktive Verbindungen identifizieren (2 Minuten ohne Aktivität)
                for conn_id, last_heartbeat in self.heartbeats.items():
                    if current_time - last_heartbeat > 120:  # 2 Minuten
                        expired_connections.append(conn_id)
                
                # Inaktive Verbindungen entfernen
                for conn_id in expired_connections:
                    logger.warning(f"Verbindung {conn_id} wegen Inaktivität getrennt")
                    
                    try:
                        # Informiere den Client, dass die Verbindung geschlossen wird
                        if conn_id in self.active_connections:
                            await self.active_connections[conn_id].send_json({
                                "type": "connection_timeout",
                                "data": {
                                    "message": "Verbindung wegen Inaktivität getrennt"
                                }
                            })
                            await self.active_connections[conn_id].close(code=1000)
                    except Exception:
                        # Ignorieren, falls die Verbindung bereits geschlossen ist
                        pass
                    
                    self.disconnect(conn_id)
            
            except Exception as e:
                logger.error(f"Fehler im Heartbeat-Monitor: {str(e)}")
    
    async def _handle_connection_error(self, connection_id: str, error: Exception):
        """Behandelt Fehler bei der Kommunikation mit einem Client."""
        try:
            # Versuche, die Verbindung ordnungsgemäß zu schließen
            if connection_id in self.active_connections:
                await self.active_connections[connection_id].close(code=1011)  # 1011 = Server Error
        except Exception:
            # Ignorieren, falls die Verbindung bereits geschlossen ist
            pass
        
        # Verbindung aus dem Manager entfernen
        self.disconnect(connection_id)
    
    def get_connection_count(self) -> int:
        """Gibt die Anzahl der aktiven Verbindungen zurück."""
        return len(self.active_connections)


# Singleton-Instanz des ConnectionManager
manager = ConnectionManager()


# Hilfsfunktion zur API-Key-Validierung
async def validate_api_key(api_key: Optional[str] = Security(api_key_header)):
    """
    Validiert den API-Key für WebSocket-Verbindungen.
    Gibt None zurück, wenn die Authentifizierung deaktiviert ist oder der Key gültig ist.
    Wirft eine HTTPException, wenn der Key ungültig ist.
    """
    # Wenn die Authentifizierung deaktiviert ist
    if not settings.ENABLE_WEBSOCKET_AUTH:
        return None
    
    # Wenn kein API-Key konfiguriert ist, erlaube alle Verbindungen
    if not settings.API_KEYS:
        return None
    
    # API-Key prüfen
    if not api_key or api_key not in settings.API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger API-Key für WebSocket-Zugriff"
        )
    
    return None


# WebSocket-Route für Knowledge-Streaming
@router.websocket("/ws/knowledge")
async def websocket_knowledge(
    websocket: WebSocket, 
    vector_db: VectorDB = Depends(get_vector_db),
    llm_service: LLMService = Depends(get_llm_service)
):
    """
    WebSocket-Endpunkt für RAG-basierte Wissensabfragen mit Token-Streaming.
    
    Akzeptiert eine Anfrage im JSON-Format mit denselben Feldern wie die REST-API-Knowledge-Query.
    Streamt die Antwort Token für Token zurück an den Client.
    """
    # API-Key-Validierung vor dem Verbindungsaufbau
    try:
        headers = dict(websocket.headers)
        api_key = headers.get("x-api-key")
        await validate_api_key(api_key)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    connection_id = await manager.connect(websocket)
    
    # Reconnection-Tracker, um zu erkennen, ob ein Client wiederholt Verbindungsprobleme hat
    reconnection_attempts = 0
    last_query_state = None
    
    try:
        # Auf erste Nachricht warten
        await websocket.send_json({
            "type": "connection_established",
            "data": {
                "connection_id": connection_id,
                "message": "Verbindung hergestellt. Sende eine Wissensabfrage im JSON-Format."
            }
        })
        
        while True:
            # Auf eingehende Nachrichten warten
            try:
                data = await websocket.receive_text()
                # Heartbeat aktualisieren bei jeder erfolgreichen Nachricht
                await manager.update_heartbeat(connection_id)
                
                try:
                    # JSON parsen
                    json_data = json.loads(data)
                    
                    # Message-Typ identifizieren
                    message_type = json_data.get("type", "query")
                    
                    if message_type == "ping":
                        # Ping/Pong-Mechanismus zur Verbindungsüberprüfung
                        await websocket.send_json({
                            "type": "pong",
                            "data": {
                                "timestamp": time.time()
                            }
                        })
                        continue
                    
                    if message_type == "heartbeat":
                        # Expliziter Heartbeat vom Client
                        await manager.update_heartbeat(connection_id)
                        await websocket.send_json({
                            "type": "heartbeat_acknowledged",
                            "data": {
                                "timestamp": time.time()
                            }
                        })
                        continue
                    
                    if message_type == "reconnect":
                        # Client versucht, nach einem Fehler wieder zu verbinden
                        reconnection_attempts += 1
                        
                        # Status der letzten Anfrage wiederherstellen, falls vorhanden
                        if last_query_state:
                            await websocket.send_json({
                                "type": "reconnect_successful",
                                "data": {
                                    "last_query_state": last_query_state,
                                    "reconnection_attempts": reconnection_attempts
                                }
                            })
                        else:
                            await websocket.send_json({
                                "type": "reconnect_successful",
                                "data": {
                                    "message": "Verbindung wiederhergestellt, keine vorherige Anfrage gefunden",
                                    "reconnection_attempts": reconnection_attempts
                                }
                            })
                        continue
                    
                    if message_type == "query":
                        # Knowledge-Query verarbeiten
                        query_data = json_data.get("data", {})
                        
                        try:
                            # Query-Daten validieren
                            knowledge_query = KnowledgeQuery(**query_data)
                            
                            # Start-Nachricht senden
                            await websocket.send_json({
                                "type": "query_received",
                                "data": {
                                    "query": knowledge_query.query,
                                    "message": "Anfrage wird verarbeitet..."
                                }
                            })
                            
                            # Aktuellen Zustand für mögliche Reconnects speichern
                            last_query_state = {
                                "query": knowledge_query.query,
                                "status": "processing",
                                "timestamp": time.time()
                            }
                            
                            # Semantische Suche durchführen
                            context_docs = await vector_db.search(
                                query=knowledge_query.query,
                                limit=knowledge_query.max_context_docs,
                                filter_criteria=knowledge_query.filter_criteria
                            )
                            
                            # Suchergebnisse senden
                            await websocket.send_json({
                                "type": "context_retrieved",
                                "data": {
                                    "document_count": len(context_docs),
                                    "message": f"{len(context_docs)} relevante Dokumente gefunden."
                                }
                            })
                            
                            # Callback für Streaming-Antwort
                            async def stream_callback(token: str, is_final: bool = False):
                                """Callback für LLM-Token-Streaming."""
                                try:
                                    await websocket.send_json({
                                        "type": "token" if not is_final else "token_final",
                                        "data": {
                                            "token": token
                                        }
                                    })
                                    # Heartbeat bei jedem Token aktualisieren
                                    await manager.update_heartbeat(connection_id)
                                except Exception as e:
                                    # Fehler beim Streaming werden im Hauptthread behandelt
                                    logger.error(f"Fehler beim Token-Streaming: {str(e)}")
                                    raise
                            
                            # Antwort generieren mit Streaming
                            start_time = time.time()
                            llm_response = await llm_service.generate_answer_streaming(
                                query=knowledge_query.query,
                                context_documents=context_docs,
                                response_format=knowledge_query.response_format,
                                stream_callback=stream_callback
                            )
                            
                            # Zitationen erstellen
                            citations = []
                            for doc in context_docs:
                                if doc["score"] >= 0.2:  # Nur relevante Dokumente zitieren
                                    citation = CitationInfo(
                                        document_id=doc["id"],
                                        content_snippet=doc["text"][:200] + ("..." if len(doc["text"]) > 200 else ""),
                                        source_name=doc["metadata"].get("source_name"),
                                        source_url=doc["metadata"].get("source_url"),
                                        relevance_score=doc["score"]
                                    )
                                    citations.append(citation.dict())
                            
                            # Komplette Antwort senden
                            processing_time = time.time() - start_time
                            await websocket.send_json({
                                "type": "answer_complete",
                                "data": {
                                    "query": knowledge_query.query,
                                    "answer": llm_response["answer"],
                                    "citations": citations,
                                    "confidence": llm_response["confidence"],
                                    "processing_time_ms": processing_time * 1000,
                                    "context_docs_count": len(context_docs)
                                }
                            })
                            
                            # Erfolgreichen Zustand für mögliche Reconnects speichern
                            last_query_state = {
                                "query": knowledge_query.query,
                                "status": "completed",
                                "timestamp": time.time(),
                                "processing_time_ms": processing_time * 1000
                            }
                            
                            # Reconnection-Counter zurücksetzen nach erfolgreicher Anfrage
                            reconnection_attempts = 0
                            
                        except ValidationError as e:
                            # Validierungsfehler in der Anfrage
                            logger.warning(f"WebSocket-Validierungsfehler: {str(e)}")
                            await websocket.send_json({
                                "type": "error",
                                "data": {
                                    "message": f"Ungültiges Anfrage-Format: {str(e)}",
                                    "error_code": "VALIDATION_ERROR"
                                }
                            })
                        
                        except Exception as e:
                            # Sonstige Fehler
                            logger.error(f"WebSocket-Verarbeitungsfehler: {str(e)}")
                            await websocket.send_json({
                                "type": "error",
                                "data": {
                                    "message": f"Fehler bei der Verarbeitung der Anfrage: {str(e)}",
                                    "error_code": "PROCESSING_ERROR",
                                    "recoverable": True,  # Client kann versuchen, sich neu zu verbinden
                                    "retry_after_ms": 1000  # 1 Sekunde Wartezeit vor Wiederverbindung
                                }
                            })
                    
                    else:
                        # Unbekannter Nachrichtentyp
                        await websocket.send_json({
                            "type": "error",
                            "data": {
                                "message": f"Unbekannter Nachrichtentyp: {message_type}",
                                "error_code": "UNKNOWN_MESSAGE_TYPE"
                            }
                        })
                
                except json.JSONDecodeError:
                    # Keine gültige JSON-Nachricht
                    logger.warning(f"Ungültiges JSON empfangen: {data[:100]}...")
                    await websocket.send_json({
                        "type": "error",
                        "data": {
                            "message": "Die empfangene Nachricht ist kein gültiges JSON",
                            "error_code": "INVALID_JSON"
                        }
                    })
                
                except Exception as e:
                    # Allgemeiner Fehler
                    logger.error(f"WebSocket-Fehler: {str(e)}")
                    await websocket.send_json({
                        "type": "error",
                        "data": {
                            "message": f"Fehler: {str(e)}",
                            "error_code": "GENERAL_ERROR",
                            "recoverable": True,
                            "retry_after_ms": 2000  # 2 Sekunden Wartezeit vor Wiederverbindung
                        }
                    })
            
            except WebSocketDisconnect:
                # Normale Trennung durch den Client
                logger.info(f"Client hat die Verbindung getrennt: {connection_id}")
                manager.disconnect(connection_id)
                break
                
            except Exception as e:
                # Netzwerk-/Verbindungsfehler
                logger.error(f"Unerwarteter Fehler bei der WebSocket-Kommunikation: {str(e)}")
                # Verbindung gilt als fehlerhaft
                manager.disconnect(connection_id)
                break
    
    except WebSocketDisconnect:
        # Client hat die Verbindung geschlossen
        manager.disconnect(connection_id)
    
    except Exception as e:
        # Unerwarteter Fehler
        logger.error(f"Unerwarteter WebSocket-Fehler: {str(e)}")
        manager.disconnect(connection_id)


# WebSocket-Route für Systemmetriken
@router.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    """
    WebSocket-Endpunkt für Echtzeit-Systemmetriken.
    Sendet regelmäßig Aktualisierungen zu CPU, Speicher und anderen Metriken.
    """
    # API-Key-Validierung vor dem Verbindungsaufbau
    try:
        headers = dict(websocket.headers)
        api_key = headers.get("x-api-key")
        await validate_api_key(api_key)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    connection_id = await manager.connect(websocket)
    
    try:
        # Initialer Systemstatus
        await websocket.send_json({
            "type": "connection_established",
            "data": {
                "connection_id": connection_id,
                "active_connections": manager.get_connection_count(),
                "message": "Verbindung zum Metrik-Stream hergestellt."
            }
        })
        
        # Metriken in Echtzeit streamen
        while True:
            try:
                # System-Metriken sammeln
                import psutil
                
                cpu_percent = psutil.cpu_percent(interval=0.5)
                memory_info = psutil.virtual_memory()
                
                metrics = {
                    "type": "metrics_update",
                    "data": {
                        "timestamp": time.time(),
                        "cpu_percent": cpu_percent,
                        "memory_percent": memory_info.percent,
                        "active_connections": manager.get_connection_count()
                    }
                }
                
                # Metriken senden
                await websocket.send_json(metrics)
                
                # Heartbeat aktualisieren
                await manager.update_heartbeat(connection_id)
                
                # Kurze Pause vor der nächsten Aktualisierung
                await asyncio.sleep(2)
                
            except WebSocketDisconnect:
                # Client hat die Verbindung getrennt
                logger.info(f"Client hat die Verbindung getrennt: {connection_id}")
                manager.disconnect(connection_id)
                break
                
            except Exception as e:
                logger.error(f"Fehler beim Sammeln von Metriken: {str(e)}")
                
                try:
                    await websocket.send_json({
                        "type": "error",
                        "data": {
                            "message": f"Fehler beim Sammeln von Metriken: {str(e)}",
                            "error_code": "METRICS_ERROR",
                            "recoverable": True
                        }
                    })
                    await asyncio.sleep(5)  # Längere Pause nach einem Fehler
                except Exception:
                    # Verbindung ist wahrscheinlich tot
                    manager.disconnect(connection_id)
                    break
    
    except WebSocketDisconnect:
        manager.disconnect(connection_id)
    
    except Exception as e:
        logger.error(f"Unerwarteter WebSocket-Fehler: {str(e)}")
        manager.disconnect(connection_id)


# Beispiel-Client-Code für die Dokumentation
"""
# JavaScript-Beispiel für die Verwendung des WebSocket-API:

// Verbindung zum Knowledge-WebSocket herstellen
const knowledgeSocket = new WebSocket("ws://localhost:8000/api/ws/knowledge");

// Event-Listener für eingehende Nachrichten
knowledgeSocket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
        case "connection_established":
            console.log("Verbindung hergestellt:", message.data.message);
            break;
        
        case "token":
            // Neues Token zur Antwort hinzufügen (Streaming)
            appendToAnswer(message.data.token);
            break;
            
        case "token_final":
            // Letztes Token hinzufügen
            appendToAnswer(message.data.token);
            finishAnswer();
            break;
            
        case "answer_complete":
            // Vollständige Antwort mit Metadaten
            displayCompletedAnswer(message.data);
            break;
            
        case "error":
            console.error("Fehler:", message.data.message);
            displayError(message.data);
            break;
    }
});

// Anfrage senden
function sendQuery(query, maxContextDocs = 5) {
    const queryData = {
        type: "query",
        data: {
            query: query,
            max_context_docs: maxContextDocs
        }
    };
    
    knowledgeSocket.send(JSON.stringify(queryData));
}

// Beispielverwendung:
// sendQuery("Was ist die Hauptstadt von Deutschland?");
""" 