from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from ...services.service_factory import get_mistral_service, get_nexus_service

router = APIRouter()
mistral_service = get_mistral_service()
nexus_service = get_nexus_service()

# Pydantic-Modelle für Request und Response
class NexusRequest(BaseModel):
    query: str = Field(..., description="Die Anfrage an The Nexus")
    context: Optional[str] = Field(None, description="Zusätzlicher Kontext für die Anfrage")
    goals: Optional[List[str]] = Field(None, description="Ziele für die Lösungsfindung")
    max_tokens: Optional[int] = Field(3000, description="Maximale Anzahl der Tokens in der Antwort")

class NexusResponse(BaseModel):
    solution: str = Field(..., description="Die generierte Lösung")
    steps: List[str] = Field(..., description="Die durchgeführten Analyseschritte")
    references: Optional[List[str]] = Field(None, description="Verwendete Referenzen")
    model: str = Field(..., description="Das verwendete Modell")

@router.post("/solve", response_model=NexusResponse, summary="Lösung mit The Nexus generieren")
async def generate_solution(request: NexusRequest):
    """
    Generiert eine strukturierte Lösung mit The Nexus
    
    The Nexus ist die zentrale Wissens- und Lösungsmaschine, die:
    1. Automatisch die Problemstellung analysiert
    2. Detaillierte Lösungsansätze generiert
    3. Strukturierte Antworten und Argumentationsketten erstellt
    4. Interaktive Wissensnavigation ermöglicht
    """
    # System-Prompt für The Nexus
    goals_text = ""
    if request.goals:
        goals_text = "Folgende Ziele sollen erreicht werden:\n" + "\n".join([f"- {goal}" for goal in request.goals])
    
    context_text = ""
    if request.context:
        context_text = f"Zusätzlicher Kontext:\n{request.context}\n\n"
    
    system_prompt = f"""
    Du bist The Nexus, eine hochentwickelte Wissens- und Lösungsmaschine. 
    Deine Aufgabe ist es, komplexe Probleme zu analysieren und strukturierte Lösungen zu generieren.
    
    Dein Prozess:
    1. PROBLEMANALYSE: Verstehe die tiefere Problemstellung und identifiziere die Kernfragen
    2. WISSENSMOBILISIERUNG: Stelle relevantes Wissen und Konzepte zusammen
    3. LÖSUNGSENTWICKLUNG: Erstelle mehrere strukturierte Lösungsansätze
    4. VALIDIERUNG: Prüfe die Lösungsansätze auf Plausibilität und Vollständigkeit
    5. SYNTHESE: Formuliere eine umfassende, strukturierte Antwort
    
    {context_text}
    {goals_text}
    
    Präsentiere deine Antwort in einer klar strukturierten Form:
    - Problemanalyse
    - Lösungsansätze
    - Empfehlungen
    - Weitere Schritte
    
    Vermeide vage Aussagen und fokussiere dich auf präzise, umsetzbare Lösungen.
    """
    
    try:
        # Verwende den Mistral-Service für die Antwortgenerierung
        response = await mistral_service.generate_response(
            prompt=request.query,
            system_prompt=system_prompt,
            max_tokens=request.max_tokens
        )
        
        if "error" in response:
            raise HTTPException(status_code=500, detail=response["error"])
        
        # Generiere die Schritte basierend auf dem Nexus-Prozess
        steps = [
            "Problemanalyse durchgeführt",
            "Relevantes Wissen zusammengestellt",
            "Lösungsansätze entwickelt",
            "Validierung der Lösungen abgeschlossen",
            "Umfassende Antwort synthetisiert"
        ]
        
        return {
            "solution": response.get("response", ""),
            "steps": steps,
            "references": [],  # In zukünftigen Versionen können hier tatsächliche Referenzen eingefügt werden
            "model": mistral_service.model_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze", response_model=NexusResponse, summary="Analysiert ein komplexes Problem mit The Nexus")
async def analyze_problem(request: NexusRequest):
    """
    Führt eine tiefgehende Analyse eines komplexen Problems durch
    """
    # System-Prompt für die Analyse
    system_prompt = """
    Du bist The Nexus, eine hochentwickelte Analyse-Engine. Deine Aufgabe ist es, komplexe 
    Probleme und Fragestellungen tiefgehend zu analysieren.
    
    Dein Analyse-Prozess:
    1. IDENTIFIKATION: Identifiziere die Kernproblematik und ihre Bestandteile
    2. KONTEXTUALISIERUNG: Setze das Problem in einen breiteren Kontext
    3. DEKOMPOSITION: Zerlege das Problem in analysierbare Teilprobleme
    4. PERSPEKTIVENWECHSEL: Betrachte das Problem aus verschiedenen Blickwinkeln
    5. SYNTHESE: Führe die Erkenntnisse zu einer Gesamtanalyse zusammen
    
    Präsentiere deine Analyse in einer strukturierten Form mit:
    - Kernproblematik
    - Kontext und Einordnung
    - Teilprobleme und ihre Verknüpfungen
    - Verschiedene Perspektiven
    - Implikationen und Auswirkungen
    """
    
    try:
        # Verwende den Mistral-Service für die Antwortgenerierung
        response = await mistral_service.generate_response(
            prompt=request.query,
            system_prompt=system_prompt,
            max_tokens=request.max_tokens
        )
        
        if "error" in response:
            raise HTTPException(status_code=500, detail=response["error"])
        
        # Generiere die Schritte basierend auf dem Analyse-Prozess
        steps = [
            "Kernproblematik identifiziert",
            "Problem in Kontext gesetzt",
            "Problem in Teilprobleme zerlegt",
            "Verschiedene Perspektiven betrachtet",
            "Gesamtanalyse erstellt"
        ]
        
        return {
            "solution": response.get("response", ""),
            "steps": steps,
            "references": [],  # In zukünftigen Versionen können hier tatsächliche Referenzen eingefügt werden
            "model": mistral_service.model_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 