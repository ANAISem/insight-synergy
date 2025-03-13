"""
Perplexity API Client für die Insight Synergy Plattform.

Stellt eine Schnittstelle zur Perplexity API für Faktenrecherche bereit.
"""

import os
import logging
import json
import aiohttp
import asyncio
from typing import Dict, Any, Optional, List
from functools import lru_cache

from dotenv import load_dotenv

# Lade Umgebungsvariablen
load_dotenv()

logger = logging.getLogger(__name__)

class PerplexityAPI:
    """
    Client für die Perplexity API zur Faktenrecherche.
    
    Diese Klasse stellt eine Schnittstelle zur Perplexity API bereit,
    die für die Faktenrecherche und Quellenvalidierung verwendet wird.
    """
    
    def __init__(
        self,
        api_key: str,
        api_base: str = "https://api.perplexity.ai",
        model: str = "sonar-deep-research",
        max_retries: int = 3,
        timeout: int = 15,
        max_tokens: int = 4000,
        temperature: float = 0.0
    ):
        """
        Initialisiert den Perplexity API Client.
        
        Args:
            api_key: API-Key für die Perplexity API
            api_base: Basis-URL der API
            model: Zu verwendendes Modell
            max_retries: Maximale Anzahl an Wiederholungsversuchen
            timeout: Timeout für API-Anfragen in Sekunden
            max_tokens: Maximale Anzahl an Tokens in der Antwort
            temperature: Temperatur für die Antwortgenerierung (0.0 - 1.0)
        """
        self.api_key = api_key
        self.api_base = api_base
        self.model = model
        self.max_retries = max_retries
        self.timeout = timeout
        self.max_tokens = max_tokens
        self.temperature = temperature
        
    async def query(self, query: str) -> str:
        """
        Sendet eine Anfrage an die Perplexity API.
        
        Args:
            query: Die Anfrage für die Faktenrecherche
            
        Returns:
            Die Antwort der Perplexity API als String
        
        Raises:
            Exception: Bei Fehler in der API-Kommunikation
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": self.model,
            "query": query,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature
        }
        
        for attempt in range(self.max_retries + 1):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{self.api_base}/query",
                        headers=headers,
                        json=data,
                        timeout=self.timeout
                    ) as response:
                        if response.status == 200:
                            result = await response.json()
                            return result.get("answer", "")
                        elif response.status == 429:
                            logger.warning(f"Rate limit erreicht. Warte vor Wiederholung... (Versuch {attempt+1}/{self.max_retries+1})")
                            await asyncio.sleep(2 ** attempt)  # Exponentielles Backoff
                        else:
                            error_text = await response.text()
                            logger.error(f"Perplexity API Fehler: Status {response.status}, {error_text}")
                            if attempt == self.max_retries:
                                raise Exception(f"Perplexity API Fehler: Status {response.status}, {error_text}")
                            await asyncio.sleep(1)
            except asyncio.TimeoutError:
                logger.warning(f"Timeout bei der Anfrage an Perplexity API. Versuch {attempt+1}/{self.max_retries+1}")
                if attempt == self.max_retries:
                    raise Exception("Timeout bei der Anfrage an Perplexity API nach mehreren Versuchen.")
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Fehler bei der Anfrage an Perplexity API: {str(e)}")
                if attempt == self.max_retries:
                    raise
                await asyncio.sleep(1)
        
        # Sollte nie hier ankommen
        raise Exception("Unerwarteter Fehler bei der Anfrage an Perplexity API.")


@lru_cache()
def get_perplexity_api() -> Optional[PerplexityAPI]:
    """
    Factory-Funktion für die Perplexity API.
    
    Returns:
        Eine Instanz der PerplexityAPI oder None, wenn keine API-Konfiguration verfügbar ist
    """
    api_key = os.getenv("PERPLEXITY_API_KEY")
    
    if not api_key:
        logger.warning("Perplexity API-Key nicht gefunden. Die Faktenrecherche über Perplexity ist deaktiviert.")
        return None
    
    try:
        return PerplexityAPI(
            api_key=api_key,
            api_base=os.getenv("PERPLEXITY_API_BASE", "https://api.perplexity.ai"),
            model=os.getenv("PERPLEXITY_MODEL", "sonar-deep-research"),
            max_retries=int(os.getenv("PERPLEXITY_MAX_RETRIES", "3")),
            timeout=int(os.getenv("PERPLEXITY_TIMEOUT", "15")),
            max_tokens=int(os.getenv("PERPLEXITY_MAX_TOKENS", "4000")),
            temperature=float(os.getenv("PERPLEXITY_TEMPERATURE", "0.0"))
        )
    except Exception as e:
        logger.error(f"Fehler bei der Initialisierung der Perplexity API: {str(e)}")
        return None 