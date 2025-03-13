"""
Perplexity Service für Insight Synergy.

Dieser Service handhabt alle API-Aufrufe an Perplexity AI für fortschrittliche
Faktensuche und Recherche-Funktionen.
"""

import os
import json
import httpx
import asyncio
from typing import Dict, List, Optional, Any, Union
import logging
from dotenv import load_dotenv

# Lokale .env-Datei laden
load_dotenv()

# Logger konfigurieren
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("perplexity_service")

class PerplexityService:
    """
    Service für die Interaktion mit der Perplexity API.
    
    Spezialisiert auf Faktenfindung und tiefgehende Recherche
    mit dem sonar-deep-research Modell.
    """
    
    def __init__(self):
        """Initialisiert den Perplexity Service mit Konfigurationen aus den Umgebungsvariablen."""
        self.api_key = os.getenv("PERPLEXITY_API_KEY")
        self.base_url = os.getenv("PERPLEXITY_API_BASE", "https://api.perplexity.ai")
        self.model = os.getenv("PERPLEXITY_MODEL", "sonar-deep-research")
        self.max_retries = int(os.getenv("PERPLEXITY_MAX_RETRIES", "3"))
        self.timeout = int(os.getenv("PERPLEXITY_TIMEOUT", "15"))
        
        if not self.api_key:
            logger.warning("PERPLEXITY_API_KEY nicht gefunden. Perplexity-Dienste sind nicht verfügbar.")
        else:
            logger.info(f"Perplexity Service initialisiert mit Modell: {self.model}")
    
    async def get_completion(
        self, 
        prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Generiert eine Recherche-basierte Antwort von Perplexity.
        
        Args:
            prompt: Die Frage oder der Rechercheauftrag
            temperature: Optional, steuert die Zufälligkeit der Ausgabe
            max_tokens: Optional, maximale Anzahl der Ausgabe-Tokens
            
        Returns:
            Die generierte Antwort mit recherchierten Fakten
        """
        if not self.api_key:
            raise ValueError("Perplexity API Key nicht konfiguriert.")
        
        # Standardwerte aus Umgebungsvariablen verwenden, wenn nicht explizit angegeben
        temperature = temperature if temperature is not None else float(os.getenv("PERPLEXITY_TEMPERATURE", "0.0"))
        max_tokens = max_tokens or int(os.getenv("PERPLEXITY_MAX_TOKENS", "4000"))
        
        # API-Anfrage vorbereiten
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "Du bist ein Assistent für intensive Faktenrecherche. Finde relevante, präzise und aktuelle Informationen. Gib detaillierte Antworten mit Quellen, wo möglich."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        # Anfrage senden mit Wiederholungslogik
        attempts = 0
        last_error = None
        
        while attempts < self.max_retries:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=payload
                    )
                    response.raise_for_status()
                    result = response.json()
                    
                    # Antwort extrahieren
                    return result["choices"][0]["message"]["content"]
            
            except Exception as e:
                attempts += 1
                last_error = e
                logger.warning(f"Fehler bei Perplexity-Anfrage (Versuch {attempts}): {str(e)}")
                
                # Kurze Pause vor dem nächsten Versuch
                await asyncio.sleep(1)
        
        # Wenn alle Versuche fehlschlagen
        error_message = f"Fehler bei Perplexity-Anfrage nach {self.max_retries} Versuchen: {str(last_error)}"
        logger.error(error_message)
        raise Exception(error_message)
    
    async def research_topic(self, topic: str, depth: str = "detailed") -> Dict[str, Any]:
        """
        Führt eine umfassende Recherche zu einem Thema durch.
        
        Args:
            topic: Das zu recherchierende Thema
            depth: Detailgrad der Recherche ("brief", "detailed", "comprehensive")
            
        Returns:
            Dictionary mit recherchierten Informationen, inkl. Quellen
        """
        depth_prompts = {
            "brief": "Gib einen kurzen Überblick zum Thema mit den wichtigsten Fakten",
            "detailed": "Führe eine detaillierte Recherche durch und liefere wichtige Aspekte, Fakten und Zusammenhänge",
            "comprehensive": "Führe eine umfassende, tiefgehende Recherche durch. Beleuchte verschiedene Aspekte, Standpunkte und liefere detaillierte Informationen mit Quellen"
        }
        
        depth_instruction = depth_prompts.get(depth, depth_prompts["detailed"])
        
        prompt = f"""
        {depth_instruction} zum Thema: {topic}
        
        Strukturiere deine Antwort wie folgt:
        1. Überblick: Kurze Zusammenfassung des Themas
        2. Hauptfakten: Die wichtigsten Fakten und Erkenntnisse
        3. Details: Relevante Informationen, aufgeschlüsselt nach Aspekten
        4. Quellen: Verweise auf Websites, Studien, Artikel (falls verfügbar)
        
        Formatiere die Ausgabe als JSON mit den folgenden Schlüsseln:
        "overview", "key_facts" (Array), "details" (Dictionary mit Aspekten als Schlüssel), "sources" (Array)
        """
        
        try:
            result = await self.get_completion(prompt)
            
            # JSON aus der Antwort extrahieren und parsen
            result = result.strip()
            if result.startswith("```json"):
                result = result[7:]
            if result.endswith("```"):
                result = result[:-3]
                
            research_data = json.loads(result.strip())
            
            # Hinzufügen von Metadaten
            research_data["topic"] = topic
            research_data["depth"] = depth
            research_data["model"] = self.model
            
            return research_data
            
        except Exception as e:
            logger.error(f"Fehler bei der Themenrecherche: {str(e)}")
            # Strukturiertes Ergebnis mit Fehlermeldung zurückgeben
            return {
                "topic": topic,
                "error": str(e),
                "overview": f"Fehler bei der Recherche zum Thema '{topic}'",
                "key_facts": ["Keine Fakten verfügbar aufgrund eines Fehlers"],
                "details": {"error": str(e)},
                "sources": []
            }
    
    async def fact_check(self, statement: str) -> Dict[str, Any]:
        """
        Überprüft die Richtigkeit einer Aussage.
        
        Args:
            statement: Die zu überprüfende Aussage
            
        Returns:
            Dictionary mit Informationen zur Richtigkeit der Aussage
        """
        prompt = f"""
        Überprüfe die folgende Aussage auf ihre Richtigkeit:
        
        "{statement}"
        
        Führe dazu eine gründliche Faktenrecherche durch und bewerte die Aussage.
        Gib das Ergebnis als JSON mit folgenden Schlüsseln zurück:
        - "verdict": Eine Bewertung ("true", "partly_true", "false", "misleading", "unverifiable")
        - "explanation": Eine Erklärung zur Bewertung
        - "facts": Ein Array mit relevanten Fakten
        - "sources": Ein Array mit Quellen für die Überprüfung
        """
        
        try:
            result = await self.get_completion(prompt)
            
            # JSON aus der Antwort extrahieren und parsen
            result = result.strip()
            if result.startswith("```json"):
                result = result[7:]
            if result.endswith("```"):
                result = result[:-3]
                
            fact_check_data = json.loads(result.strip())
            
            # Originalaussage hinzufügen
            fact_check_data["statement"] = statement
            
            return fact_check_data
            
        except Exception as e:
            logger.error(f"Fehler beim Faktencheck: {str(e)}")
            # Strukturiertes Ergebnis mit Fehlermeldung zurückgeben
            return {
                "statement": statement,
                "verdict": "unverifiable",
                "explanation": f"Der Faktencheck konnte aufgrund eines technischen Problems nicht durchgeführt werden: {str(e)}",
                "facts": [],
                "sources": []
            } 