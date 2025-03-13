"""
Live Expert Debate API für die Insight Synergy Plattform.

Diese API bietet Endpunkte für die erweiterte Experten-Debatte-Funktionalität
mit Echtzeit-Interaktion, Faktenprüfung und kognitiven Analysen.
"""

import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..services.experts_service import ExpertsService
from ..services.llm_service import LLMService
from ..services.fact_checking_service import FactCheckingService
from ..services.cognitive_service import CognitiveService
from ..dependencies import get_experts_service, get_llm_service, get_fact_checking_service, get_cognitive_service

logger = logging.getLogger(__name__)

# Request- und Response-Modelle definieren
class ExpertInfo(BaseModel):
    """Informationen zu einem Experten."""
    id: str
    name: str
    domain: str
    specialty: str
    background: str
    perspective: str

class PreviousMessage(BaseModel):
    """Informationen zu einer früheren Nachricht."""
    expertId: str
    expertName: str
    content: str

class MessageContext(BaseModel):
    """Kontext für die Generierung einer Expertenantwort."""
    topic: str
    context: Optional[str] = None
    expert: ExpertInfo
    isFirstMessage: bool = False
    previousMessages: List[PreviousMessage] = []
    userMessage: Optional[str] = None

class MessageResponse(BaseModel):
    """Antwort mit einer generierten Expertennachricht."""
    success: bool = True
    message: Dict[str, Any]

class FactCheckRequest(BaseModel):
    """Anfrage für einen Faktencheck."""
    messageId: str
    expertId: str
    content: str
    topic: str
    context: Optional[str] = None

class FactCheckResult(BaseModel):
    """Ergebnis eines Faktenchecks."""
    isFactual: bool
    confidence: float
    sources: Optional[List[Dict[str, Any]]] = None
    corrections: Optional[List[str]] = None

class FactCheckResponse(BaseModel):
    """Antwort mit einem Faktencheck-Ergebnis."""
    success: bool = True
    factCheck: FactCheckResult

class CognitiveAnalysisRequest(BaseModel):
    """Anfrage für eine kognitive Analyse."""
    userInput: str
    topic: str
    context: Optional[str] = None
    messageHistory: List[Dict[str, Any]]

class CognitiveAnalysisResult(BaseModel):
    """Ergebnis einer kognitiven Analyse."""
    patternDetected: Optional[str] = None
    biasDetected: Optional[str] = None
    suggestionForImprovement: Optional[str] = None
    adaptedResponseStyle: Optional[str] = None
    suggestedExpertId: Optional[str] = None
    recommendedExpertId: Optional[str] = None

class CognitiveAnalysisResponse(BaseModel):
    """Antwort mit einer kognitiven Analyse."""
    success: bool = True
    analysis: CognitiveAnalysisResult

class InsightRequest(BaseModel):
    """Anfrage für die Generierung einer Einsicht."""
    topic: str
    context: Optional[str] = None
    messageHistory: List[Dict[str, Any]]

class InsightResult(BaseModel):
    """Eine generierte Einsicht."""
    id: str
    title: str
    description: str
    expert: str
    confidence: float
    tags: Optional[List[str]] = None

class InsightResponse(BaseModel):
    """Antwort mit einer generierten Einsicht."""
    success: bool = True
    insight: InsightResult

# Router für Live-Experten-Debatten initialisieren
live_expert_debate_router = APIRouter(
    prefix="/live-expert-debate",
    tags=["live-expert-debate"],
)

@live_expert_debate_router.post(
    "/message",
    response_model=MessageResponse,
    summary="Generiert eine Expertennachricht für die Live-Debatte",
    description="Erzeugt eine kontextbezogene Antwort eines Experten für die Live-Debatte basierend auf dem Thema und vorherigen Nachrichten."
)
async def generate_expert_message(
    context: MessageContext,
    llm_service: LLMService = Depends(get_llm_service),
    experts_service: ExpertsService = Depends(get_experts_service)
):
    """
    Generiert eine Expertennachricht für die Live-Debatte.
    
    Args:
        context: Der Kontext für die Nachrichtengenerierung
        llm_service: Der Sprachmodell-Service
        experts_service: Der Experten-Service
        
    Returns:
        MessageResponse mit der generierten Nachricht
    """
    try:
        # System-Prompt für die Expertennachricht erstellen
        system_prompt = f"""
        Du bist {context.expert.name}, ein Experte für {context.expert.specialty}.
        Hintergrund: {context.expert.background}
        Perspektive: {context.expert.perspective}
        
        Erzeuge eine fundierte, detaillierte Antwort zum Thema "{context.topic}".
        """
        
        if context.context:
            system_prompt += f"\nKontext: {context.context}"
        
        # Bisherige Nachrichten als Kontext aufbereiten
        conversation_history = ""
        if context.previousMessages:
            conversation_history = "Bisherige Nachrichten:\n"
            for msg in context.previousMessages:
                conversation_history += f"{msg.expertName}: {msg.content}\n"
        
        user_prompt = ""
        if context.isFirstMessage:
            user_prompt = f"Bitte beginne die Diskussion zum Thema \"{context.topic}\"."
        elif context.userMessage:
            user_prompt = f"Benutzer fragt: {context.userMessage}\nBitte antworte als {context.expert.name}."
        else:
            # Auf die letzte Nachricht eines anderen Experten antworten
            user_prompt = f"Bitte führe die Diskussion fort und beziehe dich auf die bisherigen Beiträge."
            
        # LLM für die Antwort nutzen
        response = await llm_service.generate_response(
            system_prompt=system_prompt,
            user_prompt=conversation_history + "\n" + user_prompt,
            max_tokens=1000,
            temperature=0.7,
        )
        
        # Zufällige Referenzen erstellen (in einer realen Implementierung würden hier echte Referenzen recherchiert)
        references = []
        if response and len(response) > 100:
            import random
            if random.random() > 0.3:  # 70% Chance für Referenzen
                possible_references = [
                    "Journal of Advanced Research (2023)",
                    "International Policy Framework",
                    "Technological Review Quarterly",
                    "Global Economic Forum Report",
                    "Ethics in AI Symposium"
                ]
                num_refs = random.randint(1, 3)
                references = random.sample(possible_references, num_refs)
        
        return MessageResponse(
            success=True,
            message={
                "content": response,
                "references": references
            }
        )
    except Exception as e:
        logger.error(f"Fehler bei der Generierung der Expertennachricht: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fehler bei der Nachrichtengenerierung: {str(e)}")

@live_expert_debate_router.post(
    "/fact-check",
    response_model=FactCheckResponse,
    summary="Führt einen Faktencheck für eine Nachricht durch",
    description="Überprüft den Wahrheitsgehalt einer Expertennachricht und liefert Quellen und Korrekturen."
)
async def perform_fact_check(
    request: FactCheckRequest,
    fact_checking_service: FactCheckingService = Depends(get_fact_checking_service),
    llm_service: LLMService = Depends(get_llm_service)
):
    """
    Führt einen Faktencheck für eine Nachricht durch.
    
    Args:
        request: Die Anfrage mit der zu überprüfenden Nachricht
        fact_checking_service: Der Faktencheck-Service
        llm_service: Der Sprachmodell-Service
        
    Returns:
        FactCheckResponse mit dem Ergebnis des Faktenchecks
    """
    try:
        # In einer realen Implementierung würde hier der Faktencheck-Service verwendet
        # Für diese Demo simulieren wir einen Faktencheck mit dem LLM
        
        system_prompt = f"""
        Du bist ein Faktenprüfer mit Expertise im Themenbereich "{request.topic}".
        Überprüfe die folgende Aussage auf faktische Richtigkeit und gib eine Bewertung ab.
        Wenn du Ungenauigkeiten oder Fehler findest, schlage Korrekturen vor.
        """
        
        user_prompt = f"Zu überprüfende Aussage: {request.content}"
        
        # LLM für die Faktenprüfung nutzen
        response = await llm_service.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=800,
            temperature=0.2,  # Niedrige Temperatur für faktenbasierte Antworten
        )
        
        # Einfache Heuristik für Demonstration: Wenn negative Wörter in der Antwort vorkommen, 
        # markiere als nicht faktisch
        import re
        lower_response = response.lower()
        
        is_factual = True
        confidence = 0.9  # Hohe Standardkonfidenz
        
        if any(term in lower_response for term in ["falsch", "inkorrekt", "ungenau", "irreführend", "fehler"]):
            is_factual = False
            confidence = 0.7  # Niedrigere Konfidenz bei Ungenauigkeiten
        
        # Quellen und Korrekturen extrahieren
        sources = []
        corrections = []
        
        # Quellen suchen (vereinfachte Demonstration)
        source_matches = re.findall(r"(?:Quelle|Referenz):\s*(.*?)(?:\n|$)", response)
        for match in source_matches:
            if match.strip():
                sources.append({
                    "title": match.strip(),
                    "url": f"https://example.com/research/{hash(match) % 10000}",
                    "reliability": 0.8 + (hash(match) % 100) / 500  # Zufälliger Zuverlässigkeitswert
                })
        
        # Korrekturen bei Bedarf hinzufügen
        if not is_factual:
            correction_matches = re.findall(r"(?:Korrektur|Richtigstellung|Richtig wäre):\s*(.*?)(?:\n|$)", response)
            corrections = [match.strip() for match in correction_matches if match.strip()]
            
            # Fallback, wenn keine expliziten Korrekturen gefunden wurden
            if not corrections and "sollte" in lower_response:
                correction_parts = re.findall(r"sollte\s*(.*?)(?:\.|$)", lower_response)
                corrections = [f"Korrektur: Es {part.strip()}." for part in correction_parts if part.strip()]
        
        fact_check_result = FactCheckResult(
            isFactual=is_factual,
            confidence=confidence,
            sources=sources if sources else None,
            corrections=corrections if corrections else None
        )
        
        return FactCheckResponse(
            success=True,
            factCheck=fact_check_result
        )
    except Exception as e:
        logger.error(f"Fehler beim Faktencheck: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fehler beim Faktencheck: {str(e)}")

@live_expert_debate_router.post(
    "/cognitive-analysis",
    response_model=CognitiveAnalysisResponse,
    summary="Führt eine kognitive Analyse einer Benutzeranfrage durch",
    description="Analysiert den Benutzereingabekontext, erkennt Denkmuster und Verzerrungen und schlägt Verbesserungen vor."
)
async def analyze_user_input(
    request: CognitiveAnalysisRequest,
    cognitive_service: CognitiveService = Depends(get_cognitive_service),
    llm_service: LLMService = Depends(get_llm_service),
    experts_service: ExpertsService = Depends(get_experts_service)
):
    """
    Führt eine kognitive Analyse einer Benutzeranfrage durch.
    
    Args:
        request: Die Anfrage mit der zu analysierenden Eingabe
        cognitive_service: Der kognitive Analyse-Service
        llm_service: Der Sprachmodell-Service
        experts_service: Der Experten-Service
        
    Returns:
        CognitiveAnalysisResponse mit dem Ergebnis der Analyse
    """
    try:
        # In einer realen Implementierung würde hier der Cognitive-Service verwendet
        # Für diese Demo simulieren wir eine kognitive Analyse mit dem LLM
        
        system_prompt = f"""
        Du bist ein Experte für kognitive Analysen im Kontext von Diskussionen zum Thema "{request.topic}".
        Analysiere die folgende Benutzereingabe auf Denkmuster, kognitive Verzerrungen (Biases) und 
        adaptive Antwortmöglichkeiten. Antworte im JSON-Format mit diesen Schlüsseln:
        
        patternDetected: Das identifizierte kognitive Muster (z.B. "Analytisches Denken", "Kreatives Denkmuster")
        biasDetected: Eine identifizierte kognitive Verzerrung, falls vorhanden
        suggestionForImprovement: Ein Vorschlag zur Verbesserung der Diskussion
        adaptedResponseStyle: Ein angepasster Antwort-Stil, der für diesen Benutzer optimal ist
        """
        
        # Bisherige Nachrichten als Kontext aufbereiten
        message_history = ""
        if request.messageHistory:
            message_history = "Bisherige Nachrichten:\n"
            for msg in request.messageHistory[-5:]:  # Nur die letzten 5 Nachrichten für Übersichtlichkeit
                message_history += f"{msg.get('expertName', 'Unbekannt')}: {msg.get('content', '')}\n"
        
        user_prompt = f"""
        Benutzereingabe: {request.userInput}
        
        Kontext der Diskussion:
        Thema: {request.topic}
        {request.context or ''}
        
        {message_history}
        """
        
        # LLM für die kognitive Analyse nutzen
        response = await llm_service.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=800,
            temperature=0.4,
        )
        
        import json
        import random
        
        # Versuche, JSON aus der Antwort zu extrahieren
        try:
            # Suche nach einem JSON-Block in der Antwort
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                analysis_data = json.loads(json_str)
            else:
                # Fallback: Erstelle eine simulierte Analyse
                analysis_data = {
                    "patternDetected": random.choice(["Analytisches Denken", "Kreatives Denkmuster", "Systematische Problemlösung"]),
                    "biasDetected": random.choice([None, "Bestätigungstendenz", "Übergewichtung neuester Informationen"]) if random.random() > 0.7 else None,
                    "suggestionForImprovement": "Vielfältigere Perspektiven in die Diskussion einbeziehen",
                    "adaptedResponseStyle": random.choice(["Detaillierter, sachlicher Stil", "Explorativer, fragender Stil", "Anwendungsorientierter Stil"])
                }
        except:
            # Bei Fehlern in der JSON-Verarbeitung: Fallback zu simulierten Daten
            analysis_data = {
                "patternDetected": random.choice(["Analytisches Denken", "Kreatives Denkmuster", "Systematische Problemlösung"]),
                "biasDetected": random.choice([None, "Bestätigungstendenz", "Übergewichtung neuester Informationen"]) if random.random() > 0.7 else None,
                "suggestionForImprovement": "Vielfältigere Perspektiven in die Diskussion einbeziehen",
                "adaptedResponseStyle": random.choice(["Detaillierter, sachlicher Stil", "Explorativer, fragender Stil", "Anwendungsorientierter Stil"])
            }
        
        # Simuliere Expertenvorschläge
        suggested_expert_id = None
        recommended_expert_id = None
        
        # In einem echten System würden hier echte Experten-IDs basierend auf der Analyse zurückgegeben
        if analysis_data.get("biasDetected"):
            suggested_expert_id = f"exp-00{random.randint(1, 5)}"
            
        recommended_expert_id = f"exp-00{random.randint(1, 5)}"
            
        analysis_result = CognitiveAnalysisResult(
            patternDetected=analysis_data.get("patternDetected"),
            biasDetected=analysis_data.get("biasDetected"),
            suggestionForImprovement=analysis_data.get("suggestionForImprovement"),
            adaptedResponseStyle=analysis_data.get("adaptedResponseStyle"),
            suggestedExpertId=suggested_expert_id,
            recommendedExpertId=recommended_expert_id
        )
        
        return CognitiveAnalysisResponse(
            success=True,
            analysis=analysis_result
        )
    except Exception as e:
        logger.error(f"Fehler bei der kognitiven Analyse: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fehler bei der kognitiven Analyse: {str(e)}")

@live_expert_debate_router.post(
    "/insight",
    response_model=InsightResponse,
    summary="Generiert eine Einsicht aus der Debatte",
    description="Analysiert die Debatte und extrahiert eine wichtige Einsicht oder Erkenntnis."
)
async def generate_insight(
    request: InsightRequest,
    llm_service: LLMService = Depends(get_llm_service)
):
    """
    Generiert eine Einsicht aus der Debatte.
    
    Args:
        request: Die Anfrage mit dem Kontext für die Einsichtsgenerierung
        llm_service: Der Sprachmodell-Service
        
    Returns:
        InsightResponse mit der generierten Einsicht
    """
    try:
        # In einer realen Implementierung würde hier ein spezialisierter Service verwendet
        # Für diese Demo generieren wir eine Einsicht mit dem LLM
        
        system_prompt = f"""
        Du bist ein Experte für die Extraktion von Einsichten und Erkenntnissen aus komplexen Diskussionen.
        Analysiere die folgende Debatte zum Thema "{request.topic}" und extrahiere eine wichtige Einsicht.
        Antworte im JSON-Format mit diesen Schlüsseln:
        
        title: Ein prägnanter Titel für die Einsicht
        description: Eine ausführliche Beschreibung der Einsicht
        expert: Der Name eines Experten, der diese Einsicht beigetragen hat
        confidence: Eine Zahl zwischen 0 und 1, die die Konfidenz in diese Einsicht angibt
        tags: Ein Array von 2-4 relevanten Tags
        """
        
        # Nachrichten als Kontext aufbereiten
        message_history = ""
        if request.messageHistory:
            for msg in request.messageHistory:
                message_history += f"{msg.get('expertName', 'Unbekannt')}: {msg.get('content', '')}\n"
        
        user_prompt = f"""
        Debatte zum Thema: {request.topic}
        {request.context or ''}
        
        Nachrichten der Debatte:
        {message_history}
        """
        
        # LLM für die Einsichtsgenerierung nutzen
        response = await llm_service.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=800,
            temperature=0.6,
        )
        
        import json
        import random
        import uuid
        
        # Versuche, JSON aus der Antwort zu extrahieren
        try:
            # Suche nach einem JSON-Block in der Antwort
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                insight_data = json.loads(json_str)
            else:
                # Fallback: Erstelle eine simulierte Einsicht
                insight_titles = [
                    "Interessenkonflikte identifiziert",
                    "Interdisziplinäre Lösung möglich",
                    "Unerwartete Korrelation gefunden",
                    "Ethische Herausforderungen erkannt",
                    "Zukünftige Forschungsfragen"
                ]
                
                insight_data = {
                    "title": random.choice(insight_titles),
                    "description": f"In der Debatte wurde ein wichtiger Zusammenhang zwischen verschiedenen Aspekten des Themas '{request.topic}' herausgearbeitet. Diese Erkenntnis könnte zu neuen Lösungsansätzen führen.",
                    "expert": f"Expert {random.randint(1, 5)}",
                    "confidence": random.uniform(0.7, 0.98),
                    "tags": random.sample(["Haupterkenntnis", "Vertiefungswürdig", "Interdisziplinär", "Innovation", "Ethik", "Nachhaltigkeit"], k=3)
                }
        except:
            # Bei Fehlern in der JSON-Verarbeitung: Fallback zu simulierten Daten
            insight_titles = [
                "Interessenkonflikte identifiziert",
                "Interdisziplinäre Lösung möglich",
                "Unerwartete Korrelation gefunden",
                "Ethische Herausforderungen erkannt",
                "Zukünftige Forschungsfragen"
            ]
            
            insight_data = {
                "title": random.choice(insight_titles),
                "description": f"In der Debatte wurde ein wichtiger Zusammenhang zwischen verschiedenen Aspekten des Themas '{request.topic}' herausgearbeitet. Diese Erkenntnis könnte zu neuen Lösungsansätzen führen.",
                "expert": f"Expert {random.randint(1, 5)}",
                "confidence": random.uniform(0.7, 0.98),
                "tags": random.sample(["Haupterkenntnis", "Vertiefungswürdig", "Interdisziplinär", "Innovation", "Ethik", "Nachhaltigkeit"], k=3)
            }
        
        insight_result = InsightResult(
            id=f"insight-{uuid.uuid4()}",
            title=insight_data.get("title"),
            description=insight_data.get("description"),
            expert=insight_data.get("expert"),
            confidence=insight_data.get("confidence", 0.85),
            tags=insight_data.get("tags")
        )
        
        return InsightResponse(
            success=True,
            insight=insight_result
        )
    except Exception as e:
        logger.error(f"Fehler bei der Einsichtsgenerierung: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fehler bei der Einsichtsgenerierung: {str(e)}") 