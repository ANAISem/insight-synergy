"""
Cognitive Loop API-Endpunkte für Insight Synergy.

Diese API ermöglicht die Durchführung komplexer KI-Debatten mit mehreren Experten.
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
import random
import time
from datetime import datetime

# Eigene Modelle und Dienste
from nexus_backend.utils.logging import get_logger
from nexus_backend.services.openai_service import OpenAIService
from nexus_backend.services.perplexity_service import PerplexityService
from nexus_backend.utils.adaptive_debug import debugger

# Router für kognitive Funktionen - WICHTIG: Diese Variable muss "router" heißen!
router = APIRouter()
cognitive_router = router

# Router für Experten-Funktionalität - Diese muss separat exportiert werden
experts_router = APIRouter()

# Logger einrichten
logger = get_logger("cognitive_api")

# Modelle für Request/Response
class ExpertProfile(BaseModel):
    name: str
    expertise: str
    background: str
    perspective: Optional[str] = None
    bias: Optional[str] = None
    personality: Optional[str] = None

class DebateRequest(BaseModel):
    topic: str
    context: Optional[str] = None
    experts: List[ExpertProfile] = Field(min_items=2, max_items=5)
    max_rounds: Optional[int] = 3
    debate_style: Optional[str] = "Collaborative"

class ExpertResponse(BaseModel):
    expert_name: str
    content: str
    references: Optional[List[str]] = None
    confidence: Optional[float] = None
    timestamp: str

class DebateRound(BaseModel):
    round_number: int
    responses: List[ExpertResponse]
    meta_analysis: Optional[str] = None

class DebateResponse(BaseModel):
    topic: str
    debate_id: str
    status: str
    rounds: List[DebateRound]
    summary: Optional[str] = None

# Hilfsfunktionen
def generate_debate_id():
    """Erzeugt eine eindeutige Debate-ID."""
    return f"debate-{int(time.time())}-{random.randint(1000, 9999)}"

def get_timestamp():
    """Erzeugt einen Zeitstempel im ISO-Format."""
    return datetime.now().isoformat()

# Dienste initialisieren
openai_service = OpenAIService()
perplexity_service = PerplexityService()

# Endpunkte für Debatte
@router.post("/debate", response_model=DebateResponse, tags=["cognitive-loop"])
async def create_debate(request: DebateRequest):
    """
    Startet eine neue Experten-Debatte zum angegebenen Thema.
    
    - **topic**: Das Hauptthema der Debatte
    - **context**: Zusätzlicher Kontext oder Hintergrundinformationen
    - **experts**: Liste der Experten mit ihren Profilen
    - **max_rounds**: Maximale Anzahl der Diskussionsrunden
    - **debate_style**: Stil der Debatte (Collaborative, Adversarial, Analytical)
    """
    logger.info(f"Neue Debatte gestartet: {request.topic}")
    
    # Debate-ID generieren
    debate_id = generate_debate_id()
    
    # Erste Runde initialisieren
    initial_responses = []
    
    try:
        # Für jeden Experten eine initiale Antwort generieren
        for expert in request.experts:
            # System-Prompt für den Experten aufbauen
            system_prompt = f"""
            Du bist {expert.name}, ein Experte in {expert.expertise} mit folgendem Hintergrund: {expert.background}.
            """
            
            if expert.perspective:
                system_prompt += f" Deine Perspektive ist: {expert.perspective}."
            
            if expert.bias:
                system_prompt += f" Beachte folgende Tendenzen in deiner Argumentation: {expert.bias}."
            
            if expert.personality:
                system_prompt += f" Dein Kommunikationsstil: {expert.personality}."
            
            # Anfrage an LLM stellen
            if os.getenv("ALWAYS_USE_PERPLEXITY_FIRST", "false").lower() == "true":
                # Fakten mit Perplexity sammeln
                facts_response = await perplexity_service.get_completion(
                    f"Sammle wichtige Fakten zum Thema: {request.topic}. {request.context or ''}"
                )
                
                # Antwort mit OpenAI generieren
                expert_response = await openai_service.get_completion(
                    user_message=f"Das Thema ist: {request.topic}. {request.context or ''}\n\nWichtige Fakten: {facts_response}\n\nGib eine fundierte Perspektive zu diesem Thema.",
                    system_message=system_prompt
                )
            else:
                # Direkt mit OpenAI
                expert_response = await openai_service.get_completion(
                    user_message=f"Das Thema ist: {request.topic}. {request.context or ''}\n\nGib eine fundierte Perspektive zu diesem Thema.",
                    system_message=system_prompt
                )
            
            # Antwort zum Ergebnis hinzufügen
            initial_responses.append(
                ExpertResponse(
                    expert_name=expert.name,
                    content=expert_response,
                    timestamp=get_timestamp(),
                    confidence=0.95  # Beispielwert
                )
            )
    
    except Exception as e:
        logger.error(f"Fehler beim Erstellen der Debatte: {str(e)}")
        error_id = debugger.log_error(e, "create_debate")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Generieren der Expertenantworten: {str(e)}. Error ID: {error_id}"
        )
    
    # Debatte-Objekt erstellen
    debate = DebateResponse(
        topic=request.topic,
        debate_id=debate_id,
        status="active",
        rounds=[
            DebateRound(
                round_number=1,
                responses=initial_responses
            )
        ],
        summary=None  # Wird nach Abschluss generiert
    )
    
    return debate

@router.post("/debate/{debate_id}/next-round", response_model=DebateRound)
async def next_debate_round(
    debate_id: str, 
    current_state: DebateResponse = Body(...)
):
    """
    Generiert die nächste Runde der Debatte basierend auf dem aktuellen Zustand.
    
    - **debate_id**: ID der laufenden Debatte
    - **current_state**: Aktueller Zustand der Debatte mit allen bisherigen Runden
    """
    logger.info(f"Nächste Debattenrunde für {debate_id} angefordert")
    
    # Aktuelle Rundennummer bestimmen
    current_round = len(current_state.rounds)
    next_round_number = current_round + 1
    
    # Prüfen, ob maximale Rundenzahl erreicht ist
    if current_round >= 5:  # Hardcoded Limit
        raise HTTPException(
            status_code=400,
            detail="Maximale Anzahl an Debattenrunden erreicht"
        )
    
    # Bisherige Diskussion extrahieren
    discussion_history = ""
    for round_data in current_state.rounds:
        discussion_history += f"Runde {round_data.round_number}:\n"
        for response in round_data.responses:
            discussion_history += f"{response.expert_name}: {response.content}\n\n"
    
    # Experten-Profile extrahieren
    experts = []
    for expert_response in current_state.rounds[0].responses:
        experts.append({"name": expert_response.expert_name})
    
    # Nächste Runde generieren
    next_round_responses = []
    
    try:
        for expert in experts:
            # System-Prompt für den Experten
            system_prompt = f"""
            Du bist {expert['name']}, ein Experte in der aktuellen Debatte.
            Beziehe dich in deiner Antwort auf die bisherigen Standpunkte der anderen Experten.
            Vertiefe deine Argumentation und gehe auf die wichtigsten Punkte der anderen Experten ein.
            """
            
            # User-Prompt mit bisheriger Diskussion
            user_prompt = f"""
            Thema: {current_state.topic}
            
            Bisherige Diskussion:
            {discussion_history}
            
            Bitte gib deine Antwort für Runde {next_round_number}. Berücksichtige die Argumente der anderen Experten und entwickle deine Position weiter.
            """
            
            # Antwort generieren
            expert_response = await openai_service.get_completion(
                user_message=user_prompt,
                system_message=system_prompt
            )
            
            # Antwort zum Ergebnis hinzufügen
            next_round_responses.append(
                ExpertResponse(
                    expert_name=expert['name'],
                    content=expert_response,
                    timestamp=get_timestamp(),
                    confidence=0.92  # Beispielwert
                )
            )
        
        # Meta-Analyse für diese Runde generieren
        meta_analysis_prompt = f"""
        Analysiere die Diskussion in Runde {next_round_number} zum Thema "{current_state.topic}":
        
        {', '.join([f"{resp.expert_name}: {resp.content}" for resp in next_round_responses])}
        
        Fasse die Hauptargumente zusammen, identifiziere Übereinstimmungen und Meinungsverschiedenheiten,
        und bewerte die Qualität der Argumentation.
        """
        
        meta_analysis = await openai_service.get_completion(
            user_message=meta_analysis_prompt,
            system_message="Du bist ein neutraler Moderator und Analyst für eine Expertendebatte."
        )
        
    except Exception as e:
        logger.error(f"Fehler bei der Generierung der nächsten Runde: {str(e)}")
        error_id = debugger.log_error(e, "next_debate_round")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei der Generierung der nächsten Runde: {str(e)}. Error ID: {error_id}"
        )
    
    # Neue Runde erstellen
    new_round = DebateRound(
        round_number=next_round_number,
        responses=next_round_responses,
        meta_analysis=meta_analysis
    )
    
    return new_round

@router.post("/debate/{debate_id}/summary", response_model=dict)
async def generate_debate_summary(
    debate_id: str, 
    debate_state: DebateResponse = Body(...)
):
    """
    Generiert eine Zusammenfassung der gesamten Debatte.
    
    - **debate_id**: ID der Debatte
    - **debate_state**: Vollständiger Zustand der Debatte mit allen Runden
    """
    logger.info(f"Zusammenfassung für Debatte {debate_id} angefordert")
    
    # Gesamte Diskussion extrahieren
    full_discussion = f"Thema: {debate_state.topic}\n\n"
    
    for round_data in debate_state.rounds:
        full_discussion += f"Runde {round_data.round_number}:\n"
        for response in round_data.responses:
            full_discussion += f"{response.expert_name}: {response.content}\n\n"
        
        if round_data.meta_analysis:
            full_discussion += f"Meta-Analyse: {round_data.meta_analysis}\n\n"
    
    try:
        # Zusammenfassung generieren
        summary_prompt = f"""
        Erstelle eine umfassende Zusammenfassung der folgenden Expertendebatte:
        
        {full_discussion}
        
        Deine Zusammenfassung sollte folgende Punkte enthalten:
        1. Die Hauptstandpunkte jedes Experten
        2. Die wichtigsten Übereinstimmungen und Meinungsverschiedenheiten
        3. Die Entwicklung der Argumente über die Debattenrunden hinweg
        4. Eine Schlussfolgerung, welche Erkenntnisse die Debatte insgesamt gebracht hat
        """
        
        summary = await openai_service.get_completion(
            user_message=summary_prompt,
            system_message="Du bist ein neutraler Analyst, der Expertendebatten zusammenfasst und die wichtigsten Erkenntnisse herausarbeitet."
        )
        
        # Schlussfolgerungen generieren
        conclusions_prompt = f"""
        Basierend auf der folgenden Expertendebatte zum Thema "{debate_state.topic}":
        
        {full_discussion}
        
        Extrahiere die 3-5 wichtigsten Schlussfolgerungen oder Erkenntnisse aus der Debatte.
        Formuliere diese als prägnante Punkte.
        """
        
        conclusions = await openai_service.get_completion(
            user_message=conclusions_prompt,
            system_message="Du bist ein analytischer Experte, der die wichtigsten Erkenntnisse und Schlussfolgerungen aus komplexen Debatten extrahiert."
        )
        
    except Exception as e:
        logger.error(f"Fehler bei der Generierung der Zusammenfassung: {str(e)}")
        error_id = debugger.log_error(e, "generate_debate_summary")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei der Generierung der Zusammenfassung: {str(e)}. Error ID: {error_id}"
        )
    
    return {
        "debate_id": debate_id,
        "topic": debate_state.topic,
        "summary": summary,
        "conclusions": conclusions,
        "rounds_count": len(debate_state.rounds),
        "generated_at": get_timestamp()
    }

# Expertenfunktionen
@experts_router.get("/suggested", tags=["experts"])
async def get_suggested_experts(
    topic: str,
    count: int = 3
):
    """
    Schlägt geeignete Experten für ein bestimmtes Thema vor.
    
    - **topic**: Das Thema, für das Experten vorgeschlagen werden sollen
    - **count**: Anzahl der gewünschten Experten (Standard: 3)
    """
    logger.info(f"Experten für Thema '{topic}' angefordert")
    
    try:
        # Experten mit OpenAI generieren
        experts_prompt = f"""
        Schlage {count} geeignete Experten für eine Debatte zum Thema "{topic}" vor.
        
        Für jeden Experten gib folgende Informationen an:
        1. Name und Titel
        2. Fachgebiet/Expertise
        3. Beruflicher Hintergrund
        4. Besondere Perspektive auf das Thema
        
        Die Experten sollten unterschiedliche Perspektiven und Fachgebiete repräsentieren, um eine umfassende Debatte zu ermöglichen.
        Formatiere die Ausgabe als JSON-Array mit den Feldern name, expertise, background und perspective für jeden Experten.
        """
        
        experts_response = await openai_service.get_completion(
            user_message=experts_prompt,
            system_message="Du bist ein Assistent, der geeignete Experten für komplexe Debatten vorschlägt. Formatiere die Ausgabe als JSON."
        )
        
        # Versuche, die Antwort als JSON zu parsen
        import json
        from json import JSONDecodeError
        
        try:
            experts_data = json.loads(experts_response)
        except JSONDecodeError:
            # Fallback: Versuche, den JSON-Teil aus der Antwort zu extrahieren
            json_start = experts_response.find("[")
            json_end = experts_response.rfind("]") + 1
            
            if json_start >= 0 and json_end > json_start:
                json_string = experts_response[json_start:json_end]
                experts_data = json.loads(json_string)
            else:
                raise ValueError("Konnte keine validen JSON-Daten aus der Antwort extrahieren")
        
        return {
            "topic": topic,
            "experts": experts_data,
            "generated_at": get_timestamp()
        }
        
    except Exception as e:
        logger.error(f"Fehler beim Vorschlagen von Experten: {str(e)}")
        error_id = debugger.log_error(e, "get_suggested_experts")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Generieren von Expertenvorschlägen: {str(e)}. Error ID: {error_id}"
        )

# Weitere Endpunkte für Experten
@experts_router.get("/profiles", tags=["experts"])
async def get_expert_profiles():
    """Gibt eine Liste vordefinierter Expertenprofile zurück."""
    # Vordefinierte Expertenprofile
    predefined_experts = [
        {
            "name": "Prof. Dr. Marie Schmidt",
            "expertise": "Klimawissenschaft",
            "background": "Leiterin des Instituts für Klimaforschung, 15 Jahre Erfahrung in der Klimamodellierung",
            "perspective": "Befürwortet strikte Klimaschutzmaßnahmen"
        },
        {
            "name": "Dr. Thomas Weber",
            "expertise": "Wirtschaftswissenschaften",
            "background": "Ökonom mit Fokus auf Umweltökonomie, ehemaliger Berater der Industrie",
            "perspective": "Legt Wert auf wirtschaftliche Nachhaltigkeit bei Klimaschutzmaßnahmen"
        },
        {
            "name": "Sarah Müller",
            "expertise": "Umweltaktivismus",
            "background": "Gründerin einer Umwelt-NGO, langjährige Erfahrung in der Klimapolitik",
            "perspective": "Vertritt die Interessen zukünftiger Generationen"
        },
        {
            "name": "Prof. Dr. Alexander Bauer",
            "expertise": "Energietechnik",
            "background": "Forschung im Bereich erneuerbare Energien, mehrere Patente in Solartechnologie",
            "perspective": "Technikoptimist mit Fokus auf innovative Lösungen"
        },
        {
            "name": "Dr. Lisa Chen",
            "expertise": "Internationale Entwicklung",
            "background": "Tätig bei der UNO, spezialisiert auf Klimagerechtigkeit",
            "perspective": "Vertritt die Perspektive von Entwicklungsländern"
        }
    ]
    
    return {
        "experts": predefined_experts,
        "count": len(predefined_experts)
    } 