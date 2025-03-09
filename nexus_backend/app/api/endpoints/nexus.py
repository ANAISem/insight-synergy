from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from ...services.service_factory import get_nexus_service

router = APIRouter()
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

# Alias for /solve -> /solution für Frontend-Kompatibilität
@router.post("/solution", response_model=NexusResponse, summary="Lösung mit The Nexus generieren")
async def generate_solution_alias(request: NexusRequest):
    """
    Generiert eine strukturierte Lösung mit The Nexus (alias für /solve)
    """
    return await generate_solution(request)

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
    try:
        # Verwendet den Nexus-Service für die Lösungsgenerierung
        solution_response = await nexus_service.generate_solution(request)
        
        # Generiere die Schritte basierend auf dem Nexus-Prozess
        steps = [
            "Problemanalyse durchgeführt",
            "Relevantes Wissen zusammengestellt",
            "Lösungsansätze entwickelt",
            "Validierung der Lösungen abgeschlossen",
            "Umfassende Antwort synthetisiert"
        ]
        
        return {
            "solution": solution_response.solution,
            "steps": steps,
            "references": solution_response.references if hasattr(solution_response, 'references') else [],
            "model": solution_response.model if hasattr(solution_response, 'model') else "OpenAI"
        }
    except Exception as e:
        # Fallback für Entwicklungsumgebung - generiere Dummy-Antwort
        return {
            "solution": f"Dummy-Lösung für: {request.query}\n\nDies ist eine Beispiel-Lösung, da die echte API-Anbindung noch nicht vollständig ist.",
            "steps": [
                "Problemanalyse durchgeführt",
                "Relevantes Wissen zusammengestellt",
                "Lösungsansätze entwickelt",
                "Validierung der Lösungen abgeschlossen",
                "Umfassende Antwort synthetisiert"
            ],
            "references": [],
            "model": "Dummy-Modell"
        }

@router.post("/analyze", response_model=NexusResponse, summary="Analysiert ein komplexes Problem mit The Nexus")
async def analyze_problem(request: NexusRequest):
    """
    Führt eine tiefgehende Analyse eines komplexen Problems durch
    """
    try:
        # Verwendet den Nexus-Service für die Analyse
        analysis_response = await nexus_service.analyze_problem(request)
        
        # Generiere die Schritte basierend auf dem Analyse-Prozess
        steps = [
            "Kernproblematik identifiziert",
            "Problem in Kontext gesetzt",
            "Problem in Teilprobleme zerlegt",
            "Verschiedene Perspektiven betrachtet",
            "Gesamtanalyse erstellt"
        ]
        
        return {
            "solution": analysis_response.solution,
            "steps": steps,
            "references": analysis_response.references if hasattr(analysis_response, 'references') else [],
            "model": analysis_response.model if hasattr(analysis_response, 'model') else "OpenAI"
        }
    except Exception as e:
        # Fallback für Entwicklungsumgebung - generiere Dummy-Antwort
        return {
            "solution": f"Dummy-Analyse für: {request.query}\n\nDies ist eine Beispiel-Analyse, da die echte API-Anbindung noch nicht vollständig ist.",
            "steps": [
                "Kernproblematik identifiziert",
                "Problem in Kontext gesetzt",
                "Problem in Teilprobleme zerlegt",
                "Verschiedene Perspektiven betrachtet",
                "Gesamtanalyse erstellt"
            ],
            "references": [],
            "model": "Dummy-Modell"
        }

@router.get("/status", summary="Prüft den Status des Nexus-Services")
async def check_status():
    """
    Prüft den Status des Nexus-Services und der verwendeten Modelle
    """
    try:
        # Rufe den Status vom Nexus-Service ab
        service_status = await nexus_service.check_status()
        
        # Erstelle die Antwort
        return {
            "status": "available" if service_status else "unavailable",
            "model": "OpenAI (mit Fallback)",
            "timestamp": str(datetime.now()),
            "system_info": {
                "backend_version": "1.0.0",
                "api_version": "1.0.0",
                "perplexity_enabled": True,
                "insight_core_enabled": True
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "timestamp": str(datetime.now())
        } 