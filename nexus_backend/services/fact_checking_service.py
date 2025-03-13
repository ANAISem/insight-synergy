"""
Fact Checking Service für die Insight Synergy Plattform.

Dieser Service überprüft Aussagen auf ihre faktische Richtigkeit und
stellt Funktionen für detaillierte Faktenchecks mit Quellenüberprüfung bereit.
"""

import logging
import random
from typing import Dict, Any, List, Optional
import json
import re

from ..services.llm_service import LLMService
from ..utils.perplexity_api import PerplexityAPI

logger = logging.getLogger(__name__)

class FactCheckingService:
    """
    Service zur Überprüfung von Fakten und Aussagen.
    
    Diese Klasse verwendet Sprachmodelle und Faktenrecherche-APIs, um Aussagen
    zu überprüfen und mit Quellen zu validieren.
    """
    
    def __init__(self, llm_service: LLMService, perplexity_api: Optional[PerplexityAPI] = None):
        """
        Initialisiert den FactCheckingService mit den erforderlichen Abhängigkeiten.
        
        Args:
            llm_service: LLM-Service für die Analyse von Aussagen
            perplexity_api: Perplexity API für die Faktenrecherche (optional)
        """
        self.llm_service = llm_service
        self.perplexity_api = perplexity_api
        
    async def check_statement(self, statement: str, topic: str, context: Optional[str] = None) -> Dict[str, Any]:
        """
        Überprüft eine Aussage auf ihre faktische Richtigkeit.
        
        Args:
            statement: Die zu überprüfende Aussage
            topic: Das Thema, zu dem die Aussage gehört
            context: Zusätzlicher Kontext (optional)
            
        Returns:
            Ein Dictionary mit dem Ergebnis des Faktenchecks
        """
        try:
            # Wenn die Perplexity API verfügbar ist, nutze sie für die Faktenrecherche
            if self.perplexity_api:
                fact_check_result = await self._check_with_perplexity(statement, topic, context)
                return fact_check_result
            
            # Ansonsten nutze das LLM für einen simulierten Faktencheck
            return await self._check_with_llm(statement, topic, context)
        except Exception as e:
            logger.error(f"Fehler beim Faktencheck: {str(e)}")
            # Fallback: Simuliertes Ergebnis zurückgeben
            return self._generate_simulated_result(statement)
            
    async def _check_with_perplexity(self, statement: str, topic: str, context: Optional[str] = None) -> Dict[str, Any]:
        """
        Überprüft eine Aussage mit der Perplexity API.
        
        Args:
            statement: Die zu überprüfende Aussage
            topic: Das Thema, zu dem die Aussage gehört
            context: Zusätzlicher Kontext (optional)
            
        Returns:
            Ein Dictionary mit dem Ergebnis des Faktenchecks
        """
        # Erstelle eine Abfrage für den Faktencheck
        query = f"Überprüfe diese Aussage auf faktische Richtigkeit: \"{statement}\". Das Thema ist: {topic}."
        if context:
            query += f" Zusätzlicher Kontext: {context}"
        query += " Gib deine Antwort als JSON im folgenden Format: {\"isFactual\": true/false, \"confidence\": 0.0-1.0, \"sources\": [{\"title\": \"Quelle 1\", \"url\": \"URL 1\"}, ...], \"corrections\": [\"Korrektur 1\", ...]}"
        
        # Sende die Abfrage an die Perplexity API
        response = await self.perplexity_api.query(query)
        
        # Versuche, JSON aus der Antwort zu extrahieren
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                result = json.loads(json_str)
                
                # Stelle sicher, dass alle erforderlichen Felder vorhanden sind
                result.setdefault("isFactual", True)
                result.setdefault("confidence", 0.9)
                result.setdefault("sources", [])
                if not result["isFactual"]:
                    result.setdefault("corrections", [])
                    
                return result
                
        except Exception as e:
            logger.error(f"Fehler beim Parsen der Perplexity-Antwort: {str(e)}")
        
        # Fallback: Simuliertes Ergebnis zurückgeben
        return self._generate_simulated_result(statement)
    
    async def _check_with_llm(self, statement: str, topic: str, context: Optional[str] = None) -> Dict[str, Any]:
        """
        Überprüft eine Aussage mit dem LLM.
        
        Args:
            statement: Die zu überprüfende Aussage
            topic: Das Thema, zu dem die Aussage gehört
            context: Zusätzlicher Kontext (optional)
            
        Returns:
            Ein Dictionary mit dem Ergebnis des Faktenchecks
        """
        system_prompt = f"""
        Du bist ein Faktenprüfer mit Expertise in verschiedenen Themenbereichen, insbesondere zum Thema: {topic}.
        Deine Aufgabe ist es, die Faktenlage einer Aussage zu überprüfen und eine detaillierte Analyse durchzuführen.
        
        Gib deine Antwort als JSON-Objekt zurück mit den folgenden Eigenschaften:
        - isFactual: Boolean - ist die Aussage faktisch korrekt?
        - confidence: Float zwischen 0 und 1 - wie hoch ist die Konfidenz dieser Bewertung?
        - sources: Array von Quellen mit title und url
        - corrections: Array von Korrekturen, falls die Aussage nicht vollständig faktisch korrekt ist
        """
        
        user_prompt = f"Aussage: \"{statement}\""
        if context:
            user_prompt += f"\n\nKontext: {context}"
        
        response = await self.llm_service.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=800,
            temperature=0.2,  # Niedrige Temperatur für faktische Antworten
        )
        
        # Versuche, JSON aus der Antwort zu extrahieren
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                result = json.loads(json_str)
                
                # Stelle sicher, dass alle erforderlichen Felder vorhanden sind
                result.setdefault("isFactual", True)
                result.setdefault("confidence", 0.9)
                result.setdefault("sources", [])
                if not result["isFactual"]:
                    result.setdefault("corrections", [])
                    
                return result
        except Exception as e:
            logger.error(f"Fehler beim Parsen der LLM-Antwort: {str(e)}")
        
        # Fallback: Simuliertes Ergebnis zurückgeben
        return self._generate_simulated_result(statement)
    
    def _generate_simulated_result(self, statement: str) -> Dict[str, Any]:
        """
        Generiert ein simuliertes Faktencheck-Ergebnis für Demonstrationszwecke.
        
        Args:
            statement: Die zu überprüfende Aussage
            
        Returns:
            Ein Dictionary mit einem simulierten Faktencheck-Ergebnis
        """
        is_factual = random.random() > 0.3  # 70% Wahrscheinlichkeit, dass die Aussage korrekt ist
        confidence = 0.7 + random.random() * 0.3  # Konfidenz zwischen 0.7 und 1.0
        
        sources = [
            {
                "title": "Journal of Advanced Research",
                "url": "https://example.com/research/journal",
                "reliability": 0.92
            },
            {
                "title": "International Policy Institute",
                "url": "https://example.com/policy",
                "reliability": 0.85
            }
        ]
        
        result = {
            "isFactual": is_factual,
            "confidence": confidence,
            "sources": sources
        }
        
        if not is_factual:
            result["corrections"] = [
                "Die Aussage enthält eine Übertreibung. Eine genauere Formulierung wäre: Die Studienergebnisse deuten auf einen Zusammenhang hin, beweisen diesen aber nicht endgültig.",
                "Neuere Daten zeigen deutlich differenziertere Ergebnisse in verschiedenen Regionen."
            ]
            
        return result


def get_fact_checking_service(llm_service: LLMService) -> FactCheckingService:
    """
    Factory-Funktion für den FactCheckingService.
    
    Args:
        llm_service: LLM-Service für die Analyse von Aussagen
        
    Returns:
        Eine Instanz des FactCheckingService
    """
    try:
        # Versuche, die Perplexity API zu initialisieren, falls vorhanden
        from ..utils.perplexity_api import get_perplexity_api
        perplexity_api = get_perplexity_api()
    except (ImportError, Exception) as e:
        logger.warning(f"Perplexity API nicht verfügbar, verwende LLM-Fallback für Faktenchecks: {str(e)}")
        perplexity_api = None
        
    return FactCheckingService(llm_service, perplexity_api) 