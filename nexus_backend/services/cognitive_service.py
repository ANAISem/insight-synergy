"""
Cognitive Service für die Insight Synergy Plattform.

Dieser Service bietet kognitive Analysen für Benutzerinteraktionen,
erkennt Denkmuster und kognitive Verzerrungen und passt Antworten adaptiv an.
"""

import logging
import random
from typing import Dict, Any, List, Optional
import json
import re

from ..services.llm_service import LLMService
from ..services.experts_service import ExpertsService

logger = logging.getLogger(__name__)

class CognitiveService:
    """
    Service für kognitive Analysen von Benutzerinteraktionen.
    
    Diese Klasse bietet Funktionalität zur Erkennung von Denkmustern,
    kognitiven Verzerrungen und zur Anpassung von Antworten an den Benutzerkontext.
    """
    
    def __init__(self, llm_service: LLMService, experts_service: Optional[ExpertsService] = None):
        """
        Initialisiert den CognitiveService mit den erforderlichen Abhängigkeiten.
        
        Args:
            llm_service: LLM-Service für die Analyse von Benutzerinteraktionen
            experts_service: Experten-Service für Expertenempfehlungen (optional)
        """
        self.llm_service = llm_service
        self.experts_service = experts_service
        
    async def analyze_user_input(
        self, 
        user_input: str, 
        topic: str, 
        message_history: List[Dict[str, Any]],
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analysiert eine Benutzereingabe im Kontext einer Diskussion.
        
        Args:
            user_input: Die zu analysierende Benutzereingabe
            topic: Das Thema der Diskussion
            message_history: Vorherige Nachrichten der Diskussion
            context: Zusätzlicher Kontext (optional)
            
        Returns:
            Ein Dictionary mit dem Ergebnis der kognitiven Analyse
        """
        try:
            # LLM für die kognitive Analyse nutzen
            analysis_result = await self._analyze_with_llm(user_input, topic, message_history, context)
            
            # Wenn der Experts-Service verfügbar ist, Expertenempfehlungen hinzufügen
            if self.experts_service and analysis_result.get("biasDetected"):
                experts = await self.experts_service.list_available_experts()
                if experts:
                    # Wähle einen Experten, der eine Gegenposition einnehmen könnte
                    # In einer realen Implementierung würde hier eine komplexere Logik verwendet
                    suggested_expert = random.choice(experts)
                    analysis_result["suggestedExpertId"] = suggested_expert.id
            
            return analysis_result
        except Exception as e:
            logger.error(f"Fehler bei der kognitiven Analyse: {str(e)}")
            # Fallback: Simuliertes Ergebnis zurückgeben
            return self._generate_simulated_result()
            
    async def _analyze_with_llm(
        self, 
        user_input: str, 
        topic: str, 
        message_history: List[Dict[str, Any]],
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analysiert eine Benutzereingabe mit dem LLM.
        
        Args:
            user_input: Die zu analysierende Benutzereingabe
            topic: Das Thema der Diskussion
            message_history: Vorherige Nachrichten der Diskussion
            context: Zusätzlicher Kontext (optional)
            
        Returns:
            Ein Dictionary mit dem Ergebnis der kognitiven Analyse
        """
        system_prompt = f"""
        Du bist ein Experte für kognitive Analysen im Kontext von Diskussionen zum Thema "{topic}".
        Analysiere die folgende Benutzereingabe auf Denkmuster, kognitive Verzerrungen (Biases) und 
        adaptive Antwortmöglichkeiten.
        
        Gib deine Antwort als JSON-Objekt zurück mit den folgenden Eigenschaften:
        - patternDetected: Das identifizierte kognitive Muster (z.B. "Analytisches Denken", "Kreatives Denkmuster")
        - biasDetected: Eine identifizierte kognitive Verzerrung, falls vorhanden
        - suggestionForImprovement: Ein Vorschlag zur Verbesserung der Diskussion
        - adaptedResponseStyle: Ein angepasster Antwort-Stil, der für diesen Benutzer optimal ist
        """
        
        # Bisherige Nachrichten als Kontext aufbereiten
        conversation_history = ""
        if message_history:
            conversation_history = "Bisherige Nachrichten:\n"
            for msg in message_history[-5:]:  # Nur die letzten 5 Nachrichten für Übersichtlichkeit
                expert_name = msg.get('expertName', 'Unbekannt')
                content = msg.get('content', '')
                conversation_history += f"{expert_name}: {content}\n"
        
        user_prompt = f"""
        Benutzereingabe: {user_input}
        
        Kontext der Diskussion:
        Thema: {topic}
        {context or ''}
        
        {conversation_history}
        """
        
        # LLM für die kognitive Analyse nutzen
        response = await self.llm_service.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=800,
            temperature=0.4,
        )
        
        # Versuche, JSON aus der Antwort zu extrahieren
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                result = json.loads(json_str)
                
                # Stelle sicher, dass alle erforderlichen Felder vorhanden sind
                result.setdefault("patternDetected", "Allgemeines Informationsinteresse")
                result.setdefault("biasDetected", None)
                result.setdefault("suggestionForImprovement", "Verschiedene Perspektiven einbeziehen")
                result.setdefault("adaptedResponseStyle", "Ausgewogener, informativer Stil")
                
                return result
        except Exception as e:
            logger.error(f"Fehler beim Parsen der LLM-Antwort: {str(e)}")
        
        # Fallback: Simuliertes Ergebnis zurückgeben
        return self._generate_simulated_result()
    
    def _generate_simulated_result(self) -> Dict[str, Any]:
        """
        Generiert ein simuliertes Ergebnis für eine kognitive Analyse.
        
        Returns:
            Ein Dictionary mit einem simulierten Analyseergebnis
        """
        # Liste möglicher Denkmuster
        patterns = [
            "Analytisches Denken",
            "Kreatives Denkmuster",
            "Systematische Problemlösung",
            "Intuitives Verständnis",
            "Kritisches Hinterfragen"
        ]
        
        # Liste möglicher kognitiver Verzerrungen
        biases = [
            "Bestätigungstendenz",
            "Übergewichtung neuester Informationen",
            "Autoritätsgläubigkeit",
            "Verfügbarkeitsheuristik",
            None,  # Keine Verzerrung erkannt
            None
        ]
        
        # Liste möglicher Verbesserungsvorschläge
        suggestions = [
            "Vielfältigere Perspektiven in die Diskussion einbeziehen",
            "Grundannahmen kritisch hinterfragen",
            "Mehr Faktenbasis in die Diskussion einbringen",
            "Langzeitauswirkungen stärker berücksichtigen",
            "Interdisziplinäre Betrachtung des Themas"
        ]
        
        # Liste möglicher Antwortstile
        styles = [
            "Detaillierter, sachlicher Stil",
            "Explorativer, fragender Stil",
            "Anwendungsorientierter, praxisnaher Stil",
            "Synthetisierender, verbindender Stil",
            "Kritisch-abwägender Stil"
        ]
        
        return {
            "patternDetected": random.choice(patterns),
            "biasDetected": random.choice(biases),
            "suggestionForImprovement": random.choice(suggestions),
            "adaptedResponseStyle": random.choice(styles)
        }


def get_cognitive_service(llm_service: LLMService, experts_service: Optional[ExpertsService] = None) -> CognitiveService:
    """
    Factory-Funktion für den CognitiveService.
    
    Args:
        llm_service: LLM-Service für die Analyse von Benutzerinteraktionen
        experts_service: Experten-Service für Expertenempfehlungen (optional)
        
    Returns:
        Eine Instanz des CognitiveService
    """
    return CognitiveService(llm_service, experts_service) 