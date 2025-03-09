import aiohttp
import asyncio
import json
import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from ..core.api_config import api_config

logger = logging.getLogger(__name__)

class RateLimiter:
    """Rate Limiter für API-Anfragen"""
    
    def __init__(self, max_requests: int, time_window: int = 60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = []
        
    async def acquire(self):
        """Prüft und aktualisiert das Rate Limit"""
        now = datetime.now()
        self.requests = [ts for ts in self.requests if now - ts < timedelta(seconds=self.time_window)]
        
        if len(self.requests) >= self.max_requests:
            sleep_time = (self.requests[0] + timedelta(seconds=self.time_window) - now).total_seconds()
            if sleep_time > 0:
                logger.warning(f"Rate limit erreicht. Warte {sleep_time:.2f} Sekunden...")
                await asyncio.sleep(sleep_time)
        
        self.requests.append(now)

class APIClient:
    """Client für externe API-Anfragen mit Rate Limiting und Fallback"""
    
    def __init__(self):
        self.perplexity_limiter = RateLimiter(api_config.RATE_LIMIT_PERPLEXITY)
        self.openai_limiter = RateLimiter(api_config.RATE_LIMIT_OPENAI)
    
    async def fetch_facts(self, query: str) -> Optional[str]:
        """Holt Fakten von der Perplexity API mit dem sonar-deep-research Modell"""
        if not api_config.PERPLEXITY_API_KEY:
            logger.warning("Perplexity API Key nicht konfiguriert")
            return None
            
        try:
            await self.perplexity_limiter.acquire()
            
            headers = {
                "Authorization": f"Bearer {api_config.PERPLEXITY_API_KEY}",
                "Content-Type": "application/json"
            }
            
            # Optimierter Prompt für Perplexity sonar-deep-research
            research_query = f"Führe eine umfassende Recherche zu folgender Anfrage durch und erstelle einen detaillierten Bericht mit allen relevanten Fakten, Daten und Informationen: {query}"
            
            # API-Anfrage für das Chat-Completion-Modell
            data = {
                "model": api_config.PERPLEXITY_MODEL,
                "messages": [
                    {"role": "system", "content": "Du bist ein Experte für detaillierte Faktenrecherche. Führe eine gründliche Recherche durch und fasse die wichtigsten Fakten und Informationen zusammen."},
                    {"role": "user", "content": research_query}
                ],
                "temperature": api_config.PERPLEXITY_TEMPERATURE,
                "max_tokens": api_config.PERPLEXITY_MAX_TOKENS
            }
            
            async with aiohttp.ClientSession() as session:
                for attempt in range(api_config.PERPLEXITY_MAX_RETRIES):
                    try:
                        async with session.post(
                            f"{api_config.PERPLEXITY_API_BASE}/chat/completions",
                            headers=headers,
                            json=data,
                            timeout=api_config.PERPLEXITY_TIMEOUT
                        ) as response:
                            if response.status == 200:
                                result = await response.json()
                                
                                # Extrahiere die Antwort aus dem Chat-Completion-Format
                                if result and "choices" in result and len(result["choices"]) > 0:
                                    facts = result["choices"][0]["message"]["content"]
                                    
                                    # Formatiere die Fakten für bessere Lesbarkeit
                                    formatted_facts = "## RECHERCHEERGEBNISSE:\n\n"
                                    formatted_facts += facts
                                    
                                    logger.info(f"Perplexity Recherche abgeschlossen mit {api_config.PERPLEXITY_MODEL}")
                                    return formatted_facts
                                else:
                                    logger.error("Unerwartetes Antwortformat von Perplexity API")
                            else:
                                error_text = await response.text()
                                logger.error(f"Perplexity API Fehler: {error_text}")
                    except asyncio.TimeoutError:
                        logger.warning(f"Perplexity API Timeout (Versuch {attempt+1}/{api_config.PERPLEXITY_MAX_RETRIES})")
                        if attempt < api_config.PERPLEXITY_MAX_RETRIES - 1:
                            await asyncio.sleep(1)
                            continue
                        logger.error("Perplexity API endgültiger Timeout")
                    except Exception as e:
                        logger.error(f"Perplexity API Fehler: {str(e)}")
                        if attempt < api_config.PERPLEXITY_MAX_RETRIES - 1:
                            await asyncio.sleep(1)
                            continue
                logger.warning("Perplexity Recherche fehlgeschlagen nach allen Versuchen")
                return None
        except Exception as e:
            logger.error(f"Fehler bei der Faktenrecherche: {str(e)}")
            return None
    
    async def generate_answer(self, query: str, context: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Generiert eine Antwort mit Fallback-Logik:
        1. o1 mini (Standard)
        2. 4o mini (erster Fallback)
        3. IS Core (zweiter Fallback)
        """
        logger.info("Starte Antwortgenerierung mit mehrstufigem Fallback-Mechanismus")
        
        # Versuch mit primärem Modell (o1 mini)
        response = await self._generate_openai_answer(
            query, 
            context, 
            model=api_config.PRIMARY_MODEL
        )
        
        # Tracking des genutzten Modells
        used_model = api_config.PRIMARY_MODEL
        
        # Erster Fallback zu 4o mini, wenn o1 mini fehlschlägt
        if response is None and api_config.ENABLE_MODEL_FALLBACK:
            logger.info(f"Fallback zum sekundären Modell {api_config.FALLBACK_MODEL}")
            response = await self._generate_openai_answer(
                query, 
                context, 
                model=api_config.FALLBACK_MODEL
            )
            if response is not None:
                used_model = api_config.FALLBACK_MODEL
        
        # Zweiter Fallback zu IS Core, wenn beide OpenAI-Modelle fehlschlagen
        if response is None and api_config.ENABLE_INSIGHT_CORE_FALLBACK and api_config.IS_CORE_ENABLED:
            logger.info("Fallback zu Insight Synergy Core")
            response = await self._generate_is_core_answer(query, context)
            if response is not None:
                used_model = "insight-synergy-core"
        
        if response is not None:
            logger.info(f"Antwort erfolgreich generiert mit Modell: {used_model}")
        else:
            logger.error("Keine Antwort konnte generiert werden - alle Fallbacks fehlgeschlagen")
            
        return response
    
    async def _generate_openai_answer(
        self, 
        query: str, 
        context: Optional[str] = None, 
        model: str = api_config.PRIMARY_MODEL
    ) -> Optional[Dict[str, Any]]:
        """Generiert eine Antwort mit OpenAI-Modellen (o1 mini oder 4o mini) basierend auf Perplexity-Recherche"""
        if not api_config.OPENAI_API_KEY:
            logger.warning("OpenAI API Key nicht konfiguriert")
            return None
            
        try:
            await self.openai_limiter.acquire()
            
            headers = {
                "Authorization": f"Bearer {api_config.OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            
            # Optimierter System-Prompt für faktenbasierte Antworten mit o1/4o mini
            system_content = """Du bist eine präzise und faktenorientierte KI, die ausschließlich auf verifizierte Informationen zurückgreift.
- Beziehe dich nur auf die bereitgestellten Rechercheergebnisse
- Strukturiere deine Antwort klar und verständlich
- Wenn du etwas nicht aus den Rechercheergebnissen ableiten kannst, gib ehrlich an, dass du es nicht weißt
- Füge keine spekulativen Informationen hinzu"""
            
            messages = [
                {"role": "system", "content": system_content}
            ]
            
            # Wenn relevante Fakten recherchiert wurden, füge sie als separaten Kontext hinzu
            if context and api_config.COMBINE_PERPLEXITY_WITH_OPENAI:
                # Teile den Kontext in kleinere Abschnitte auf, falls er zu lang ist
                context_parts = []
                max_context_length = api_config.MAX_CONTEXT_LENGTH
                
                if len(context) > max_context_length:
                    # Einfache Aufteilung nach Absätzen, falls der Kontext zu groß ist
                    paragraphs = context.split("\n\n")
                    current_part = ""
                    
                    for paragraph in paragraphs:
                        if len(current_part) + len(paragraph) + 2 <= max_context_length:
                            current_part += paragraph + "\n\n"
                        else:
                            if current_part:
                                context_parts.append(current_part)
                            current_part = paragraph + "\n\n"
                    
                    if current_part:
                        context_parts.append(current_part)
                else:
                    context_parts = [context]
                
                # Füge jeden Kontextteil als separate Nachricht hinzu
                for i, part in enumerate(context_parts):
                    part_indicator = f"Teil {i+1}/{len(context_parts)}: " if len(context_parts) > 1 else ""
                    messages.append({"role": "user", "content": f"Hier sind Rechercheergebnisse zu deiner Anfrage {part_indicator}\n\n{part}"})
                
                # Füge die eigentliche Anfrage hinzu
                messages.append({"role": "user", "content": f"Basierend auf diesen Rechercheergebnissen, beantworte bitte folgende Frage detailliert und strukturiert: {query}"})
            else:
                messages.append({"role": "user", "content": query})
            
            data = {
                "model": model,
                "messages": messages,
                "temperature": api_config.OPENAI_TEMPERATURE,
                "max_tokens": api_config.OPENAI_MAX_TOKENS
            }
            
            logger.info(f"Starte OpenAI-Anfrage mit Modell {model}")
            
            async with aiohttp.ClientSession() as session:
                for attempt in range(api_config.OPENAI_MAX_RETRIES):
                    try:
                        async with session.post(
                            f"{api_config.OPENAI_API_BASE}/chat/completions",
                            headers=headers,
                            json=data,
                            timeout=api_config.OPENAI_TIMEOUT
                        ) as response:
                            if response.status == 200:
                                result = await response.json()
                                # Modell-Name für Tracking-Zwecke überschreiben
                                result["model"] = model
                                logger.info(f"OpenAI-Anfrage erfolgreich mit Modell {model}")
                                return result
                            else:
                                error_text = await response.text()
                                logger.error(f"OpenAI API Fehler mit {model}: {error_text}")
                    except asyncio.TimeoutError:
                        logger.warning(f"OpenAI API Timeout mit {model} (Versuch {attempt+1}/{api_config.OPENAI_MAX_RETRIES})")
                        if attempt < api_config.OPENAI_MAX_RETRIES - 1:
                            await asyncio.sleep(1)
                            continue
                        logger.error(f"OpenAI API endgültiger Timeout mit {model}")
                    except Exception as e:
                        logger.error(f"OpenAI API Fehler mit {model}: {str(e)}")
                        if attempt < api_config.OPENAI_MAX_RETRIES - 1:
                            await asyncio.sleep(1)
                            continue
                logger.warning(f"OpenAI-Anfrage fehlgeschlagen mit Modell {model} nach allen Versuchen")
                return None
        except Exception as e:
            logger.error(f"Fehler bei der Antwortgenerierung mit {model}: {str(e)}")
            return None
    
    async def _generate_is_core_answer(self, query: str, context: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Generiert eine Antwort mit Insight Synergy Core (lokaler Fallback)"""
        try:
            logger.info("Starte Insight Synergy Core Fallback-Anfrage")
            
            # System-Prompt für faktenbezogene Antworten
            system_prompt = "Du bist eine KI, die ausschließlich auf fundierte Fakten basiert."
            user_message = query
            
            # Wenn Kontext vorhanden ist, füge ihn hinzu
            if context and api_config.COMBINE_PERPLEXITY_WITH_OPENAI:
                user_message = f"Hier sind relevante Rechercheergebnisse:\n\n{context}\n\nBasierend auf diesen Informationen, beantworte folgende Frage: {query}"
            
            data = {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "temperature": api_config.IS_CORE_TEMPERATURE,
                "max_tokens": api_config.IS_CORE_MAX_TOKENS
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    api_config.IS_CORE_ENDPOINT,
                    json=data,
                    timeout=api_config.IS_CORE_TIMEOUT
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info("Insight Synergy Core Anfrage erfolgreich")
                        
                        # Konvertiere IS Core Antwort ins OpenAI-Format für einheitliche Verarbeitung
                        return {
                            "choices": [
                                {
                                    "message": {
                                        "content": result.get("completion", ""),
                                        "role": "assistant"
                                    },
                                    "finish_reason": "stop"
                                }
                            ],
                            "model": "insight-synergy-core",
                            "usage": {
                                "total_tokens": result.get("token_count", 0)
                            }
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"IS Core API Fehler: {error_text}")
                        return None
        except asyncio.TimeoutError:
            logger.error(f"Insight Synergy Core Timeout nach {api_config.IS_CORE_TIMEOUT} Sekunden")
            return None
        except Exception as e:
            logger.error(f"Fehler bei der Antwortgenerierung mit IS Core: {str(e)}")
            return None 