"""
API-Routen für Diskussionen in der Cognitive Loop AI.

Dieser Modul definiert die API-Endpunkte für die Verwaltung von Diskussionen,
einschließlich der Initialisierung, des Beitragens und der Analyse von Diskussionen.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from ..models.schemas import (
    Discussion,
    DiscussionMessage,
    DiscussionAnalysis,
    DiscussionCreateRequest,
    MessageCreateRequest,
    ExpertResponseRequest,
    DiscussionProgressRequest,
    ExpertProfile
)
from ..services.discussion_service import DiscussionService
from ..services.experts_service import ExpertsService
from ..dependencies import get_discussion_service, get_experts_service

# Router für Diskussions-Endpunkte initialisieren
router = APIRouter(
    prefix="/discussions",
    tags=["discussions"],
    responses={
        404: {"description": "Nicht gefunden"},
        400: {"description": "Ungültige Anfrage"},
        500: {"description": "Serverfehler"}
    }
)

logger = logging.getLogger(__name__)


@router.post(
    "",
    response_model=Discussion,
    status_code=status.HTTP_201_CREATED,
    summary="Erstellt eine neue Diskussion",
    description="Erstellt eine neue Diskussion mit einer initialen Frage und optionalen Expertenparametern."
)
async def create_discussion(
    request: DiscussionCreateRequest,
    discussion_service: DiscussionService = Depends(get_discussion_service)
):
    """
    Erstellt eine neue Diskussion mit einer initialen Frage.
    
    Args:
        request: DiscussionCreateRequest mit Titel, Beschreibung, initialer Frage und optionalen Experten
        discussion_service: Injizierter DiscussionService
        
    Returns:
        Erstellte Discussion
    """
    try:
        discussion, _ = await discussion_service.create_discussion(
            title=request.title,
            description=request.description,
            initial_question=request.initial_question,
            topic_id=request.topic_id,
            expert_ids=request.initial_experts
        )
        return discussion
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Fehler beim Erstellen einer Diskussion: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler beim Erstellen der Diskussion")


@router.get(
    "",
    response_model=List[Discussion],
    summary="Listet Diskussionen auf",
    description="Ruft eine Liste von Diskussionen mit optionaler Filterung und Paginierung ab."
)
async def list_discussions(
    limit: int = 10,
    offset: int = 0,
    status: Optional[str] = None,
    discussion_service: DiscussionService = Depends(get_discussion_service)
):
    """
    Listet Diskussionen mit optionaler Filterung und Paginierung auf.
    
    Args:
        limit: Maximale Anzahl der zurückzugebenden Diskussionen
        offset: Anzahl der zu überspringenden Diskussionen (für Paginierung)
        status: Optionaler Filter für den Diskussionsstatus
        discussion_service: Injizierter DiscussionService
        
    Returns:
        Liste von Diskussionen
    """
    try:
        return await discussion_service.list_discussions(
            limit=limit,
            offset=offset,
            status=status
        )
    except Exception as e:
        logger.error(f"Fehler beim Abrufen von Diskussionen: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler beim Abrufen der Diskussionen")


@router.get(
    "/{discussion_id}",
    response_model=Discussion,
    summary="Ruft eine Diskussion ab",
    description="Ruft eine Diskussion anhand ihrer ID ab."
)
async def get_discussion(
    discussion_id: str,
    discussion_service: DiscussionService = Depends(get_discussion_service)
):
    """
    Ruft eine Diskussion anhand ihrer ID ab.
    
    Args:
        discussion_id: ID der abzurufenden Diskussion
        discussion_service: Injizierter DiscussionService
        
    Returns:
        Discussion-Objekt
    """
    discussion = await discussion_service.get_discussion(discussion_id)
    if not discussion:
        raise HTTPException(status_code=404, detail=f"Diskussion mit ID {discussion_id} wurde nicht gefunden")
    return discussion


@router.get(
    "/{discussion_id}/messages",
    response_model=List[DiscussionMessage],
    summary="Ruft Nachrichten einer Diskussion ab",
    description="Ruft alle Nachrichten einer Diskussion mit optionaler Paginierung ab."
)
async def get_discussion_messages(
    discussion_id: str,
    limit: int = 50,
    before_id: Optional[str] = None,
    discussion_service: DiscussionService = Depends(get_discussion_service)
):
    """
    Ruft Nachrichten einer Diskussion ab.
    
    Args:
        discussion_id: ID der Diskussion
        limit: Maximale Anzahl der zurückzugebenden Nachrichten
        before_id: Optionale ID, um nur Nachrichten vor einer bestimmten Nachricht abzurufen
        discussion_service: Injizierter DiscussionService
        
    Returns:
        Liste von DiscussionMessage-Objekten
    """
    try:
        # Prüfen, ob die Diskussion existiert
        discussion = await discussion_service.get_discussion(discussion_id)
        if not discussion:
            raise HTTPException(status_code=404, detail=f"Diskussion mit ID {discussion_id} wurde nicht gefunden")
        
        # Nachrichten abrufen
        messages = await discussion_service.get_messages(
            discussion_id=discussion_id,
            limit=limit
        )
        
        return messages
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fehler beim Abrufen von Nachrichten: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler beim Abrufen der Nachrichten")


@router.post(
    "/{discussion_id}/messages",
    response_model=DiscussionMessage,
    status_code=status.HTTP_201_CREATED,
    summary="Fügt eine Nachricht zu einer Diskussion hinzu",
    description="Fügt eine neue Nachricht eines Benutzers zu einer bestehenden Diskussion hinzu."
)
async def add_message(
    discussion_id: str,
    request: MessageCreateRequest,
    discussion_service: DiscussionService = Depends(get_discussion_service)
):
    """
    Fügt eine neue Nachricht zu einer Diskussion hinzu.
    
    Args:
        discussion_id: ID der Diskussion
        request: MessageCreateRequest mit dem Nachrichteninhalt und Absenderinformationen
        discussion_service: Injizierter DiscussionService
        
    Returns:
        Erstellte DiscussionMessage
    """
    try:
        # Prüfen, ob die Diskussion existiert
        discussion = await discussion_service.get_discussion(discussion_id)
        if not discussion:
            raise HTTPException(status_code=404, detail=f"Diskussion mit ID {discussion_id} wurde nicht gefunden")
        
        # Nachricht hinzufügen
        message = await discussion_service.add_message(
            discussion_id=discussion_id,
            content=request.content,
            sender_id=request.sender_id,
            sender_type=request.sender_type,
            references=request.references
        )
        
        return message
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fehler beim Hinzufügen einer Nachricht: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler beim Hinzufügen der Nachricht")


@router.post(
    "/{discussion_id}/expert-response",
    response_model=List[DiscussionMessage],
    summary="Generiert Expertenantworten",
    description="Generiert adaptive Antworten von Experten auf eine Nachricht in einer Diskussion."
)
async def generate_expert_response(
    discussion_id: str,
    request: ExpertResponseRequest,
    discussion_service: DiscussionService = Depends(get_discussion_service)
):
    """
    Generiert Expertenantworten auf eine Nachricht in einer Diskussion.
    
    Args:
        discussion_id: ID der Diskussion
        request: ExpertResponseRequest mit message_id, expertise_areas und focus_points
        discussion_service: Injizierter DiscussionService
        
    Returns:
        Liste von generierten DiscussionMessage-Objekten
    """
    try:
        # Prüfen, ob die Diskussion existiert
        discussion = await discussion_service.get_discussion(discussion_id)
        if not discussion:
            raise HTTPException(status_code=404, detail=f"Diskussion mit ID {discussion_id} wurde nicht gefunden")
        
        # Expertenantworten generieren
        messages = await discussion_service.generate_adaptive_response(
            discussion_id=discussion_id,
            message_id=request.message_id,
            expertise_areas=request.expertise_areas,
            focus_points=request.focus_points,
            max_experts=request.max_experts or 3
        )
        
        return messages
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fehler bei der Generierung von Expertenantworten: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler bei der Generierung von Expertenantworten")


@router.get(
    "/{discussion_id}/analysis",
    response_model=DiscussionAnalysis,
    summary="Ruft die Analyse einer Diskussion ab",
    description="Ruft die aktuelle Analyse einer Diskussion ab, einschließlich Schlüsselerkenntnissen und Bias-Bewertung."
)
async def get_discussion_analysis(
    discussion_id: str,
    discussion_service: DiscussionService = Depends(get_discussion_service)
):
    """
    Ruft die Analyse einer Diskussion ab.
    
    Args:
        discussion_id: ID der Diskussion
        discussion_service: Injizierter DiscussionService
        
    Returns:
        DiscussionAnalysis-Objekt
    """
    try:
        # Prüfen, ob die Diskussion existiert
        discussion = await discussion_service.get_discussion(discussion_id)
        if not discussion:
            raise HTTPException(status_code=404, detail=f"Diskussion mit ID {discussion_id} wurde nicht gefunden")
        
        # Diskussionsanalyse abrufen
        analysis = await discussion_service.get_discussion_analysis(discussion_id)
        if not analysis:
            # Wenn keine Analyse existiert, erstelle eine neue
            analysis = await discussion_service.update_discussion_analysis(discussion_id)
        
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Diskussionsanalyse: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler beim Abrufen der Diskussionsanalyse")


@router.post(
    "/{discussion_id}/progress",
    response_model=DiscussionAnalysis,
    summary="Aktualisiert und gibt die Fortschrittsanalyse zurück",
    description="Aktualisiert die Analyse einer Diskussion und gibt detaillierte Fortschrittsinformationen zurück."
)
async def update_discussion_progress(
    discussion_id: str,
    request: DiscussionProgressRequest,
    discussion_service: DiscussionService = Depends(get_discussion_service)
):
    """
    Aktualisiert und gibt die Fortschrittsanalyse einer Diskussion zurück.
    
    Args:
        discussion_id: ID der Diskussion
        request: DiscussionProgressRequest mit optionalen focus_areas und detailed_analysis
        discussion_service: Injizierter DiscussionService
        
    Returns:
        Aktualisierte DiscussionAnalysis
    """
    try:
        # Prüfen, ob die Diskussion existiert
        discussion = await discussion_service.get_discussion(discussion_id)
        if not discussion:
            raise HTTPException(status_code=404, detail=f"Diskussion mit ID {discussion_id} wurde nicht gefunden")
        
        # Diskussionsanalyse aktualisieren
        analysis = await discussion_service.update_discussion_analysis(discussion_id)
        
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fehler bei der Aktualisierung der Diskussionsanalyse: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler bei der Aktualisierung der Diskussionsanalyse")


@router.post(
    "/{discussion_id}/close",
    response_model=Discussion,
    summary="Schließt eine Diskussion",
    description="Markiert eine Diskussion als geschlossen und generiert optional eine Zusammenfassung."
)
async def close_discussion(
    discussion_id: str,
    summary: Optional[str] = None,
    discussion_service: DiscussionService = Depends(get_discussion_service)
):
    """
    Schließt eine Diskussion.
    
    Args:
        discussion_id: ID der Diskussion
        summary: Optionale Zusammenfassung der Diskussion
        discussion_service: Injizierter DiscussionService
        
    Returns:
        Aktualisiertes Discussion-Objekt
    """
    try:
        # Diskussion schließen
        discussion = await discussion_service.close_discussion(
            discussion_id=discussion_id,
            summary=summary
        )
        
        return discussion
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Fehler beim Schließen der Diskussion: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler beim Schließen der Diskussion")


@router.get(
    "/search",
    response_model=List[Discussion],
    summary="Sucht nach Diskussionen",
    description="Sucht nach Diskussionen basierend auf einem Suchbegriff."
)
async def search_discussions(
    query: str,
    limit: int = 10,
    discussion_service: DiscussionService = Depends(get_discussion_service)
):
    """
    Sucht nach Diskussionen basierend auf einem Suchbegriff.
    
    Args:
        query: Suchbegriff
        limit: Maximale Anzahl der Ergebnisse
        discussion_service: Injizierter DiscussionService
        
    Returns:
        Liste von gefundenen Diskussionen
    """
    try:
        return await discussion_service.search_discussions(
            query=query,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Fehler bei der Suche nach Diskussionen: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler bei der Suche nach Diskussionen")


# Router für Experten-Endpunkte initialisieren
experts_router = APIRouter(
    prefix="/",
    tags=["experts"],
    responses={
        404: {"description": "Nicht gefunden"},
        400: {"description": "Ungültige Anfrage"},
        500: {"description": "Serverfehler"}
    }
)


@experts_router.get(
    "profiles",
    response_model=List[ExpertProfile],
    summary="Listet verfügbare Experten auf",
    description="Ruft eine Liste aller verfügbaren Experten in der Cognitive Loop AI ab."
)
async def list_experts(
    experts_service: ExpertsService = Depends(get_experts_service)
):
    """
    Listet alle verfügbaren Experten auf.
    
    Args:
        experts_service: Injizierter ExpertsService
        
    Returns:
        Liste von ExpertProfile-Objekten
    """
    try:
        return await experts_service.list_available_experts()
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Experten: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler beim Abrufen der Experten")


@experts_router.get(
    "suggested",
    response_model=List[ExpertProfile],
    summary="Schlägt geeignete Experten für ein Thema vor",
    description="Schlägt geeignete Experten für ein bestimmtes Thema vor."
)
async def get_suggested_experts(
    topic: str,
    count: int = 3,
    experts_service: ExpertsService = Depends(get_experts_service)
):
    """
    Schlägt geeignete Experten für ein bestimmtes Thema vor.
    
    Args:
        topic: Das Thema, für das Experten vorgeschlagen werden sollen
        count: Anzahl der gewünschten Experten (Standard: 3)
        experts_service: Injizierter ExpertsService
        
    Returns:
        Liste von ExpertProfile-Objekten
    """
    experts = await experts_service.get_all_experts()
    # In einer echten Implementierung würden wir hier eine Filterung basierend auf dem Thema durchführen
    # Für diese Implementierung wählen wir einfach zufällig count Experten aus
    import random
    suggested_experts = random.sample(experts, min(count, len(experts)))
    
    return suggested_experts


class CreateExpertRequest(BaseModel):
    """Request-Modell für die Erstellung eines benutzerdefinierten Experten."""
    name: str
    expertise_area: str
    description: str
    bias_profile: Optional[dict] = None
    confidence_level: Optional[float] = None
    avatar_url: Optional[str] = None


@experts_router.post(
    "",
    response_model=ExpertProfile,
    status_code=status.HTTP_201_CREATED,
    summary="Erstellt einen benutzerdefinierten Experten",
    description="Erstellt einen neuen benutzerdefinierten Experten mit spezifischen Eigenschaften."
)
async def create_custom_expert(
    request: CreateExpertRequest,
    experts_service: ExpertsService = Depends(get_experts_service)
):
    """
    Erstellt einen benutzerdefinierten Experten.
    
    Args:
        request: CreateExpertRequest mit den Eigenschaften des Experten
        experts_service: Injizierter ExpertsService
        
    Returns:
        Erstelltes ExpertProfile
    """
    try:
        expert = await experts_service.create_custom_expert(
            name=request.name,
            expertise_area=request.expertise_area,
            description=request.description,
            bias_profile=request.bias_profile,
            confidence_level=request.confidence_level,
            avatar_url=request.avatar_url
        )
        return expert
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Fehler bei der Erstellung eines benutzerdefinierten Experten: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler bei der Erstellung des Experten")


class BiasAdjustmentRequest(BaseModel):
    """Request-Modell für die Anpassung der Bias-Profile eines Experten."""
    bias_adjustments: dict


@experts_router.put(
    "/{expert_id}/bias",
    response_model=ExpertProfile,
    summary="Passt die Bias-Profile eines Experten an",
    description="Modifiziert die Bias-Profile eines Experten, um seine Perspektive anzupassen."
)
async def adjust_expert_bias(
    expert_id: str,
    request: BiasAdjustmentRequest,
    experts_service: ExpertsService = Depends(get_experts_service)
):
    """
    Passt die Bias-Profile eines Experten an.
    
    Args:
        expert_id: ID des Experten
        request: BiasAdjustmentRequest mit den Bias-Anpassungen
        experts_service: Injizierter ExpertsService
        
    Returns:
        Aktualisiertes ExpertProfile
    """
    try:
        # Prüfen, ob der Experte existiert
        expert = await experts_service.get_expert_profile(expert_id)
        if not expert:
            raise HTTPException(status_code=404, detail=f"Experte mit ID {expert_id} wurde nicht gefunden")
        
        # Bias-Profile anpassen
        updated_expert = await experts_service.adjust_expert_bias(
            expert_id=expert_id,
            bias_adjustments=request.bias_adjustments
        )
        
        return updated_expert
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fehler bei der Anpassung der Bias-Profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Fehler bei der Anpassung der Bias-Profile")


# WebSocket-Endpunkt für Echtzeit-Diskussionsaktualisierungen
class ConnectionManager:
    """Manager für WebSocket-Verbindungen."""
    
    def __init__(self):
        # Aktive Verbindungen nach Diskussions-ID
        self.active_connections: dict = {}
    
    async def connect(self, websocket: WebSocket, discussion_id: str):
        """Verbindet einen neuen WebSocket-Client."""
        await websocket.accept()
        if discussion_id not in self.active_connections:
            self.active_connections[discussion_id] = []
        self.active_connections[discussion_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, discussion_id: str):
        """Trennt einen WebSocket-Client."""
        if discussion_id in self.active_connections:
            if websocket in self.active_connections[discussion_id]:
                self.active_connections[discussion_id].remove(websocket)
    
    async def broadcast(self, message: dict, discussion_id: str):
        """Sendet eine Nachricht an alle verbundenen Clients einer Diskussion."""
        if discussion_id in self.active_connections:
            for connection in self.active_connections[discussion_id]:
                await connection.send_json(message)


manager = ConnectionManager()


@router.websocket("/{discussion_id}/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    discussion_id: str,
    discussion_service: DiscussionService = Depends(get_discussion_service)
):
    """
    WebSocket-Endpunkt für Echtzeit-Aktualisierungen einer Diskussion.
    
    Args:
        websocket: WebSocket-Verbindung
        discussion_id: ID der Diskussion
        discussion_service: Injizierter DiscussionService
    """
    # Prüfen, ob die Diskussion existiert
    discussion = await discussion_service.get_discussion(discussion_id)
    if not discussion:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Client verbinden
    await manager.connect(websocket, discussion_id)
    
    try:
        # Initiale Diskussionsdaten senden
        messages = await discussion_service.get_messages(discussion_id)
        analysis = await discussion_service.get_discussion_analysis(discussion_id)
        
        await websocket.send_json({
            "type": "initial_data",
            "discussion": discussion.dict(),
            "messages": [msg.dict() for msg in messages],
            "analysis": analysis.dict() if analysis else None
        })
        
        # Auf Nachrichten vom Client warten
        while True:
            data = await websocket.receive_json()
            
            # Nachrichtentyp verarbeiten
            if data.get("type") == "new_message":
                # Neue Nachricht hinzufügen
                message_data = data.get("message", {})
                
                message = await discussion_service.add_message(
                    discussion_id=discussion_id,
                    content=message_data.get("content", ""),
                    sender_id=message_data.get("sender_id", "user"),
                    sender_type=message_data.get("sender_type", "user"),
                    references=message_data.get("references", [])
                )
                
                # Aktualisierte Daten an alle Clients senden
                await manager.broadcast(
                    {
                        "type": "new_message",
                        "message": message.dict()
                    },
                    discussion_id
                )
                
                # Wenn es eine Benutzernachricht ist, automatisch Expertenantworten generieren
                if message.sender_type == "user":
                    try:
                        expert_messages = await discussion_service.generate_adaptive_response(
                            discussion_id=discussion_id,
                            message_id=message.id
                        )
                        
                        # Expertenantworten an alle Clients senden
                        for expert_message in expert_messages:
                            await manager.broadcast(
                                {
                                    "type": "expert_response",
                                    "message": expert_message.dict()
                                },
                                discussion_id
                            )
                        
                        # Aktualisierte Analyse senden
                        analysis = await discussion_service.get_discussion_analysis(discussion_id)
                        await manager.broadcast(
                            {
                                "type": "analysis_update",
                                "analysis": analysis.dict()
                            },
                            discussion_id
                        )
                    except Exception as e:
                        logger.error(f"Fehler bei der Generierung von Expertenantworten: {str(e)}")
            
            elif data.get("type") == "request_analysis":
                # Aktualisierte Analyse senden
                analysis = await discussion_service.update_discussion_analysis(discussion_id)
                await websocket.send_json({
                    "type": "analysis_update",
                    "analysis": analysis.dict()
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, discussion_id)
    except Exception as e:
        logger.error(f"WebSocket-Fehler: {str(e)}")
        manager.disconnect(websocket, discussion_id) 