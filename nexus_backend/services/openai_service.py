"""
OpenAI Service für Insight Synergy.

Dieser Service handhabt alle API-Aufrufe an OpenAI und bietet eine zentrale
Schnittstelle für die Kommunikation mit den OpenAI-Modellen.
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
logger = logging.getLogger("openai_service")

class OpenAIService:
    """
    Service für die Interaktion mit OpenAI API.
    
    Unterstützt verschiedene Modelle und bietet Fallback-Mechanismen
    bei API-Problemen.
    """
    
    def __init__(self):
        """Initialisiert den OpenAI Service mit Konfigurationen aus den Umgebungsvariablen."""
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.base_url = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
        self.primary_model = os.getenv("PRIMARY_MODEL", "gpt-o1-mini")
        self.fallback_model = os.getenv("FALLBACK_MODEL", "gpt-4o-mini")
        self.max_retries = int(os.getenv("OPENAI_MAX_RETRIES", "3"))
        self.timeout = int(os.getenv("OPENAI_TIMEOUT", "20"))
        
        self.enable_fallback = os.getenv("ENABLE_MODEL_FALLBACK", "true").lower() == "true"
        
        if not self.api_key:
            logger.warning("OPENAI_API_KEY nicht gefunden. OpenAI-Dienste sind nicht verfügbar.")
        else:
            logger.info(f"OpenAI Service initialisiert mit Primärmodell: {self.primary_model}")
    
    async def get_completion(
        self, 
        user_message: str, 
        system_message: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Union[str, asyncio.StreamReader]:
        """
        Generiert eine Textantwort von OpenAI basierend auf dem Eingabetext.
        
        Args:
            user_message: Der Text, auf den das Modell antworten soll
            system_message: Optionale Systemanweisung für das Modell
            model: Optional, verwendet das angegebene Modell statt des Standardmodells
            temperature: Optional, steuert die Zufälligkeit der Ausgabe
            max_tokens: Optional, maximale Anzahl der Ausgabe-Tokens
            stream: Wenn True, streamt die Antwort, anstatt sie vollständig zurückzugeben
            
        Returns:
            Bei stream=False: Die generierte Textantwort
            Bei stream=True: Ein StreamReader-Objekt zum Streamen der Antwort
        """
        if not self.api_key:
            raise ValueError("OpenAI API Key nicht konfiguriert.")
        
        # Standardwerte aus Umgebungsvariablen verwenden, wenn nicht explizit angegeben
        model = model or self.primary_model
        temperature = temperature if temperature is not None else float(os.getenv("OPENAI_TEMPERATURE", "0.2"))
        max_tokens = max_tokens or int(os.getenv("OPENAI_MAX_TOKENS", "4000"))
        
        # API-Anfrage vorbereiten
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Nachrichten-Array erstellen
        messages = []
        
        if system_message:
            messages.append({
                "role": "system",
                "content": system_message
            })
        
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        # Anfrage senden mit Wiederholungslogik
        attempts = 0
        last_error = None
        
        while attempts < self.max_retries:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    if stream:
                        response = await client.post(
                            f"{self.base_url}/chat/completions",
                            headers=headers,
                            json=payload,
                            stream=True
                        )
                        response.raise_for_status()
                        return response.aiter_lines()
                    else:
                        response = await client.post(
                            f"{self.base_url}/chat/completions",
                            headers=headers,
                            json=payload
                        )
                        response.raise_for_status()
                        result = response.json()
                        return result["choices"][0]["message"]["content"]
            
            except Exception as e:
                attempts += 1
                last_error = e
                logger.warning(f"Fehler bei OpenAI-Anfrage (Versuch {attempts}): {str(e)}")
                
                # Fallback zu robusterem Modell, wenn aktiviert
                if attempts == self.max_retries - 1 and model == self.primary_model and self.enable_fallback:
                    logger.info(f"Fallback zu Modell {self.fallback_model}")
                    model = self.fallback_model
                    payload["model"] = model
                
                # Kurze Pause vor dem nächsten Versuch
                await asyncio.sleep(1)
        
        # Wenn alle Versuche fehlschlagen
        error_message = f"Fehler bei OpenAI-Anfrage nach {self.max_retries} Versuchen: {str(last_error)}"
        logger.error(error_message)
        raise Exception(error_message)
    
    async def get_embeddings(self, texts: List[str], model: str = "text-embedding-ada-002") -> List[List[float]]:
        """
        Generiert Einbettungen für eine Liste von Texten.
        
        Args:
            texts: Liste von Texten, für die Einbettungen generiert werden sollen
            model: Das zu verwendende Einbettungsmodell
            
        Returns:
            Liste von Einbettungsvektoren
        """
        if not self.api_key:
            raise ValueError("OpenAI API Key nicht konfiguriert.")
        
        if not texts:
            return []
        
        # API-Anfrage vorbereiten
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "input": texts
        }
        
        # Anfrage senden mit Wiederholungslogik
        attempts = 0
        last_error = None
        
        while attempts < self.max_retries:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        f"{self.base_url}/embeddings",
                        headers=headers,
                        json=payload
                    )
                    response.raise_for_status()
                    result = response.json()
                    
                    # Einbettungen extrahieren
                    embeddings = [item["embedding"] for item in result["data"]]
                    return embeddings
            
            except Exception as e:
                attempts += 1
                last_error = e
                logger.warning(f"Fehler bei Einbettungsanfrage (Versuch {attempts}): {str(e)}")
                
                # Kurze Pause vor dem nächsten Versuch
                await asyncio.sleep(1)
        
        # Wenn alle Versuche fehlschlagen
        error_message = f"Fehler bei Einbettungsanfrage nach {self.max_retries} Versuchen: {str(last_error)}"
        logger.error(error_message)
        raise Exception(error_message)
    
    async def analyze_sentiment(self, text: str) -> Dict[str, float]:
        """
        Analysiert die Stimmung in einem Text.
        
        Args:
            text: Der zu analysierende Text
            
        Returns:
            Dictionary mit Stimmungswerten (positiv, negativ, neutral)
        """
        prompt = f"""
        Analysiere die Stimmung im folgenden Text und bestimme die Wahrscheinlichkeit für 
        positive, negative und neutrale Stimmung. Gib das Ergebnis als JSON mit den Schlüsseln
        "positive", "negative" und "neutral" zurück, wobei die Werte Zahlen zwischen 0 und 1 sind
        und sich zu 1 summieren.
        
        Text: {text}
        
        JSON:
        """
        
        try:
            result = await self.get_completion(
                user_message=prompt,
                system_message="Du bist ein Experte für Textanalyse und Sentimentanalyse. Antworte nur mit validem JSON."
            )
            
            # JSON aus der Antwort extrahieren und parsen
            result = result.strip()
            if result.startswith("```json"):
                result = result[7:]
            if result.endswith("```"):
                result = result[:-3]
                
            sentiment_data = json.loads(result.strip())
            
            # Sicherstellen, dass die erwarteten Schlüssel vorhanden sind
            if not all(key in sentiment_data for key in ["positive", "negative", "neutral"]):
                raise ValueError("Unvollständige Sentiment-Daten in der Antwort")
                
            return sentiment_data
            
        except Exception as e:
            logger.error(f"Fehler bei der Stimmungsanalyse: {str(e)}")
            # Standardwerte zurückgeben
            return {"positive": 0.33, "negative": 0.33, "neutral": 0.34}
    
    async def moderate_content(self, text: str) -> Dict[str, Any]:
        """
        Überprüft Text auf problematische Inhalte mit OpenAIs Moderation-API.
        
        Args:
            text: Der zu überprüfende Text
            
        Returns:
            Moderationsergebnis mit Flaggen für verschiedene Inhaltskategorien
        """
        if not self.api_key:
            raise ValueError("OpenAI API Key nicht konfiguriert.")
        
        # API-Anfrage vorbereiten
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "input": text
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/moderations",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
                
                # Moderationsergebnis extrahieren
                moderation_result = result["results"][0]
                return {
                    "flagged": moderation_result["flagged"],
                    "categories": moderation_result["categories"],
                    "category_scores": moderation_result["category_scores"]
                }
                
        except Exception as e:
            logger.error(f"Fehler bei der Inhaltsmoderation: {str(e)}")
            # Standardwerte zurückgeben
            return {
                "flagged": False,
                "categories": {},
                "category_scores": {}
            } 