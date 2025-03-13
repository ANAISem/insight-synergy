"""
LLM-Service für die Antwortgenerierung im Nexus-Backend.
Stellt Funktionalität zur Verfügung, um Anfragen mit Large Language Models zu beantworten.
"""

import os
from typing import Dict, Any, List, Optional, Callable, AsyncGenerator, Union
import asyncio
import json
import time
from functools import lru_cache

from dotenv import load_dotenv
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.llms import OpenAI, HuggingFacePipeline
from langchain.schema import Document
from langchain_community.chat_models import ChatOpenAI
from langchain.callbacks.manager import CallbackManager
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.callbacks.base import BaseCallbackHandler

from ..utils.logging import get_logger
from ..config import get_settings
# Cache-Service importieren
from ..services.cache_service import get_cache_service

# Lade Umgebungsvariablen
load_dotenv()

logger = get_logger(__name__)
settings = get_settings()


class TokenStreamingCallbackHandler(BaseCallbackHandler):
    """Callback-Handler für das Streaming von LLM-Tokens."""
    
    def __init__(self, stream_callback: Callable[[str, bool], None]):
        """
        Initialisiert den Streaming-Callback-Handler.
        
        Args:
            stream_callback: Callback-Funktion, die für jedes Token aufgerufen wird
        """
        self.stream_callback = stream_callback
        self.full_response = ""
    
    def on_llm_new_token(self, token: str, **kwargs):
        """Wird aufgerufen, wenn ein neues Token vom LLM empfangen wird."""
        self.full_response += token
        if asyncio.iscoroutinefunction(self.stream_callback):
            asyncio.create_task(self.stream_callback(token, False))
        else:
            self.stream_callback(token, False)
    
    def on_llm_end(self, response, **kwargs):
        """Wird aufgerufen, wenn die LLM-Generierung abgeschlossen ist."""
        if asyncio.iscoroutinefunction(self.stream_callback):
            asyncio.create_task(self.stream_callback("", True))
        else:
            self.stream_callback("", True)
    
    def on_llm_error(self, error, **kwargs):
        """Wird aufgerufen, wenn ein Fehler bei der LLM-Generierung auftritt."""
        logger.error(f"LLM-Fehler beim Streaming: {str(error)}")


class LLMService:
    """Service zur Antwortgenerierung mit Large Language Models."""
    
    def __init__(
        self,
        model_name: str = None,
        provider: str = None,
        temperature: float = 0.3,
        max_tokens: int = 1024,
        use_streaming: bool = False
    ):
        """
        Initialisiert den LLM-Service.
        
        Args:
            model_name: Name des zu verwendenden LLM-Modells
            provider: Anbieter des LLM (openai, huggingface)
            temperature: Kreativitätsfaktor (0.0 bis 1.0)
            max_tokens: Maximale Anzahl von Tokens in der Antwort
            use_streaming: Ob Streaming-Antworten verwendet werden sollen
        """
        self.model_name = model_name or settings.llm_model_name
        self.provider = provider or settings.llm_provider
        self.temperature = temperature or settings.llm_temperature
        self.max_tokens = max_tokens or settings.llm_max_tokens
        self.use_streaming = use_streaming

        # API-Schlüssel
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.huggingface_api_key = os.getenv("HUGGINGFACE_API_KEY")
        
        # LLM-Instanz initialisieren
        self.llm = self._initialize_llm()
        
        # Prompt-Templates
        self.answer_prompt = self._create_answer_prompt()
        
        logger.info(f"LLM-Service initialisiert mit Modell: {self.model_name} (Anbieter: {self.provider})")
    
    def _initialize_llm(self):
        """Initialisiert das passende LLM basierend auf Provider und Modellname."""
        try:
            callback_manager = CallbackManager([StreamingStdOutCallbackHandler()]) if self.use_streaming else None
            
            if self.provider == "openai":
                if not self.openai_api_key:
                    raise ValueError("OPENAI_API_KEY nicht gefunden in Umgebungsvariablen")
                
                if "gpt-3.5" in self.model_name or "gpt-4" in self.model_name:
                    return ChatOpenAI(
                        model_name=self.model_name,
                        temperature=self.temperature,
                        max_tokens=self.max_tokens,
                        openai_api_key=self.openai_api_key,
                        streaming=self.use_streaming,
                        callback_manager=callback_manager
                    )
                else:
                    return OpenAI(
                        model_name=self.model_name,
                        temperature=self.temperature,
                        max_tokens=self.max_tokens,
                        openai_api_key=self.openai_api_key,
                        streaming=self.use_streaming,
                        callback_manager=callback_manager
                    )
                    
            elif self.provider == "huggingface":
                if not self.huggingface_api_key:
                    raise ValueError("HUGGINGFACE_API_KEY nicht gefunden in Umgebungsvariablen")
                
                try:
                    from transformers import pipeline
                    
                    hf_pipeline = pipeline(
                        "text-generation",
                        model=self.model_name,
                        tokenizer=self.model_name,
                        max_new_tokens=self.max_tokens,
                        temperature=self.temperature
                    )
                    
                    return HuggingFacePipeline(pipeline=hf_pipeline)
                    
                except ImportError:
                    raise ImportError("Transformers Bibliothek nicht installiert. Bitte installiere: pip install transformers")
            
            else:
                raise ValueError(f"Unbekannter LLM-Provider: {self.provider}")
                
        except Exception as e:
            logger.error(f"Fehler bei der Initialisierung des LLM: {str(e)}")
            return self._create_mock_llm()
    
    def _create_mock_llm(self):
        """Erstellt einen Mock-LLM für Tests ohne tatsächliche API-Verbindung."""
        from langchain.llms.fake import FakeListLLM
        
        return FakeListLLM(
            responses=[
                "Dies ist eine Testantwort vom Mock-LLM. Im produktiven Einsatz würde hier eine echte Antwort vom LLM stehen."
            ]
        )
    
    def _create_answer_prompt(self):
        """Erstellt das Prompt-Template für die Antwortgenerierung."""
        template = """
        Du bist ein KI-Assistent, der präzise und hilfreiche Antworten auf Fragen gibt.
        
        Beantworte die folgende Frage basierend auf den bereitgestellten Kontextinformationen.
        Wenn die Antwort nicht im bereitgestellten Kontext enthalten ist, sage "Basierend auf den verfügbaren Informationen kann ich diese Frage nicht beantworten."
        
        Gib deine Antwort in einem höflichen, informativen und prägnanten Stil.
        
        Kontext:
        {context}
        
        Frage:
        {query}
        
        Antwort:
        """
        
        return PromptTemplate(
            input_variables=["context", "query"],
            template=template
        )
    
    def _prepare_context_from_documents(self, documents: List[Dict[str, Any]]) -> str:
        """
        Bereitet den Kontext aus den gefundenen Dokumenten vor.
        
        Args:
            documents: Liste der gefundenen Dokumente aus der Vektordatenbank
            
        Returns:
            Formatierter Kontext als String
        """
        if not documents:
            return "Keine Kontextinformationen verfügbar."
        
        # Sortiere nach Relevanz (Score)
        sorted_docs = sorted(documents, key=lambda x: x.get("score", 0), reverse=True)
        
        # Formatiere jeden Eintrag
        context_parts = []
        for i, doc in enumerate(sorted_docs):
            content = doc.get("text", "")
            source = doc.get("metadata", {}).get("source_name", "Unbekannte Quelle")
            
            context_part = f"[{i+1}] {content}\nQuelle: {source}\n"
            context_parts.append(context_part)
        
        return "\n".join(context_parts)
    
    async def generate_answer(
        self,
        query: str,
        context_documents: List[Dict[str, Any]],
        response_format: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generiert eine Antwort basierend auf der Anfrage und den Kontextdokumenten.
        
        Args:
            query: Die Benutzeranfrage
            context_documents: Relevante Dokumente aus der Vektordatenbank
            response_format: Optionales Format für die Antwort (Text, JSON)
            
        Returns:
            Dictionary mit generierter Antwort und Metadaten
        """
        try:
            start_time = time.time()
            
            # Kontext vorbereiten
            context = self._prepare_context_from_documents(context_documents)
            
            # Chain für die Antwortgenerierung erstellen
            chain = LLMChain(
                llm=self.llm,
                prompt=self.answer_prompt
            )
            
            # Antwort generieren
            answer = await asyncio.to_thread(
                chain.run,
                context=context,
                query=query
            )
            
            # Konfidenz berechnen (vereinfachte Implementierung)
            # In der Praxis würde hier eine komplexere Heuristik verwendet werden
            confidence = min(0.95, 0.5 + (0.1 * len(context_documents)) if context_documents else 0.2)
            
            # Spezielle Formatierung, falls benötigt
            if response_format == "json":
                try:
                    # Versuchen, die Antwort als JSON zu formatieren
                    json_answer = json.loads(answer) if isinstance(answer, str) and answer.strip().startswith("{") else {
                        "answer": answer
                    }
                    answer = json.dumps(json_answer, ensure_ascii=False, indent=2)
                except:
                    answer = json.dumps({"answer": answer}, ensure_ascii=False, indent=2)
            
            processing_time = time.time() - start_time
            
            logger.info(f"Antwort generiert für: '{query}' (Dauer: {processing_time:.3f}s)")
            
            return {
                "answer": answer,
                "confidence": confidence,
                "processing_time": processing_time,
                "model": self.model_name
            }
            
        except Exception as e:
            logger.error(f"Fehler bei der Antwortgenerierung: {str(e)}")
            return {
                "answer": f"Es tut mir leid, aber bei der Verarbeitung Ihrer Anfrage ist ein Fehler aufgetreten: {str(e)}",
                "confidence": 0.0,
                "processing_time": 0.0,
                "model": self.model_name
            }
    
    async def generate_answer_streaming(
        self,
        query: str,
        context_documents: List[Dict[str, Any]],
        response_format: Optional[str] = None,
        stream_callback: Optional[Callable[[str, bool], None]] = None
    ) -> Dict[str, Any]:
        """
        Generiert eine Antwort mit Token-Streaming basierend auf der Anfrage und den Kontextdokumenten.
        
        Args:
            query: Die Benutzeranfrage
            context_documents: Relevante Dokumente aus der Vektordatenbank
            response_format: Optionales Format für die Antwort (Text, JSON)
            stream_callback: Callback-Funktion für das Streaming der Tokens
            
        Returns:
            Dictionary mit generierter Antwort und Metadaten
        """
        try:
            start_time = time.time()
            
            # Cache-Service abrufen
            cache_service = await get_cache_service()
            
            # Cache-Parameter vorbereiten
            cache_params = {
                "model": self.model_name,
                "provider": self.provider,
                "temperature": self.temperature,
                "response_format": response_format
            }
            
            # Prüfen, ob die Antwort im Cache ist
            cached_response = await cache_service.get_from_cache(
                query=query,
                context_documents=context_documents,
                params=cache_params
            )
            
            # Wenn eine gecachte Antwort vorhanden ist, diese zurückgeben
            if cached_response:
                logger.info(f"Cache-Hit für Anfrage: '{query[:50]}...'")
                
                # Falls ein Streaming-Callback existiert, simuliere Streaming mit der gecachten Antwort
                if stream_callback:
                    # Antwort in kleinere Tokens aufteilen für natürliches Streaming
                    answer = cached_response.get("answer", "")
                    
                    # Tokenize anhand von Leerzeichen und Satzzeichen
                    import re
                    tokens = re.findall(r'\w+|[.,!?;]', answer)
                    
                    # Tokens streamen mit variablen Pausen für natürlicheres Erscheinungsbild
                    for i, token in enumerate(tokens):
                        is_final = i == len(tokens) - 1
                        
                        # Token um Leerzeichen erweitern
                        streaming_token = token
                        if i < len(tokens) - 1 and not token in ".,!?;":
                            streaming_token += " "
                        
                        # Token an Callback senden
                        if asyncio.iscoroutinefunction(stream_callback):
                            await stream_callback(streaming_token, is_final)
                        else:
                            stream_callback(streaming_token, is_final)
                        
                        # Variable Pause für natürliches Erscheinungsbild
                        if not is_final:
                            pause_time = 0.02  # Basiswert
                            
                            # Längere Pause nach Satzzeichen
                            if token in ".!?":
                                pause_time = 0.3
                            elif token in ",;":
                                pause_time = 0.1
                                
                            await asyncio.sleep(pause_time)
                
                return cached_response
            
            # Wenn keine gecachte Antwort vorhanden ist, generiere eine neue
            
            # Kontext vorbereiten
            context = self._prepare_context_from_documents(context_documents)
            
            # Streaming-Callback-Handler hinzufügen
            streaming_handler = TokenStreamingCallbackHandler(stream_callback) if stream_callback else None
            
            # Temporäres LLM mit Streaming erstellen
            streaming_llm = None
            
            if self.provider == "openai":
                from langchain_openai import ChatOpenAI
                
                streaming_llm = ChatOpenAI(
                    model_name=self.model_name,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                    openai_api_key=self.openai_api_key,
                    streaming=True,
                    callbacks=[streaming_handler] if streaming_handler else None
                )
                
            elif self.provider == "huggingface":
                logger.warning(f"Streaming für Provider {self.provider} nicht verfügbar. Fallback auf synchrone Generierung.")
                streaming_llm = self.llm
            
            else:
                logger.warning(f"Streaming für Provider {self.provider} nicht verfügbar. Fallback auf synchrone Generierung.")
                streaming_llm = self.llm
            
            # Chain für die Antwortgenerierung erstellen
            chain = LLMChain(
                llm=streaming_llm,
                prompt=self.answer_prompt
            )
            
            # Antwort generieren
            full_answer = ""
            answer = await asyncio.to_thread(
                chain.run,
                context=context,
                query=query
            )
            
            # Die vollständige Antwort ist entweder die vom Callback gesammelte oder die direkt zurückgegebene
            if streaming_handler and hasattr(streaming_handler, "full_response"):
                full_answer = streaming_handler.full_response
            else:
                full_answer = answer
            
            # Konfidenz berechnen
            confidence = min(0.95, 0.5 + (0.1 * len(context_documents)) if context_documents else 0.2)
            
            processing_time = time.time() - start_time
            
            logger.info(f"Streaming-Antwort generiert für: '{query}' (Dauer: {processing_time:.3f}s)")
            
            result = {
                "answer": full_answer,
                "confidence": confidence,
                "processing_time": processing_time,
                "model": self.model_name,
                "streaming": True
            }
            
            # Antwort im Cache speichern
            await cache_service.add_to_cache(
                query=query,
                context_documents=context_documents,
                response=result,
                params=cache_params
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Fehler bei der Streaming-Antwortgenerierung: {str(e)}")
            
            # Fehlermeldung auch über Streaming senden, falls Callback verfügbar
            error_message = f"Es tut mir leid, aber bei der Verarbeitung Ihrer Anfrage ist ein Fehler aufgetreten: {str(e)}"
            
            if stream_callback:
                if asyncio.iscoroutinefunction(stream_callback):
                    await stream_callback(error_message, True)
                else:
                    stream_callback(error_message, True)
            
            return {
                "answer": error_message,
                "confidence": 0.0,
                "processing_time": 0.0,
                "model": self.model_name,
                "streaming": False
            }
    
    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.7
    ) -> str:
        """
        Generiert eine einfache Antwort auf ein Prompt.
        
        Args:
            system_prompt: Systemprompt für die Anfrage
            user_prompt: Prompt des Benutzers
            max_tokens: Maximale Anzahl an Token (default: 1000)
            temperature: Temperatur für die Antwortgenerierung (default: 0.7)
            
        Returns:
            Die generierte Antwort als String
        """
        try:
            import os
            import openai
            from openai import OpenAI
            
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.warning("Kein OpenAI API-Key gefunden, verwende Fallback-Antwort")
                return self._generate_mock_response(system_prompt, user_prompt)
            
            # OpenAI-Client erstellen
            client = OpenAI(api_key=api_key)
            
            # Verwende das konfigurierte Modell
            model_name = os.getenv("PRIMARY_MODEL", "gpt-o1-mini")
            
            # Anfrage an OpenAI senden
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            # Antwort extrahieren
            answer = response.choices[0].message.content
            return answer
            
        except Exception as e:
            logger.error(f"Fehler bei der Generierung einer Antwort: {str(e)}")
            
            # Bei Fehler versuche Fallback-Modell, falls konfiguriert
            try:
                if os.getenv("ENABLE_MODEL_FALLBACK", "true").lower() == "true":
                    logger.info("Versuche Fallback-Modell")
                    fallback_model = os.getenv("FALLBACK_MODEL", "gpt-4o-mini")
                    
                    client = OpenAI(api_key=api_key)
                    response = client.chat.completions.create(
                        model=fallback_model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        max_tokens=max_tokens,
                        temperature=temperature
                    )
                    
                    answer = response.choices[0].message.content
                    return answer
            except Exception as fallback_error:
                logger.error(f"Fehler beim Fallback-Modell: {str(fallback_error)}")
            
            # Wenn alles fehlschlägt, generiere Mock-Antwort
            return self._generate_mock_response(system_prompt, user_prompt)
    
    def _generate_mock_response(self, system_prompt: str, user_prompt: str) -> str:
        """
        Generiert eine Mock-Antwort für den Fall, dass die LLM-Anfrage fehlschlägt.
        
        Args:
            system_prompt: Systemprompt für die Anfrage
            user_prompt: Prompt des Benutzers
            
        Returns:
            Eine simulierte Antwort
        """
        import random
        
        # Extrahiere Schlüsselwörter aus dem Prompt
        keywords = [word for word in user_prompt.split() if len(word) > 4]
        if not keywords:
            keywords = ["Thema"]
        
        # Liste möglicher Antwortvorlagen
        templates = [
            f"Als Experte für dieses {random.choice(keywords) if keywords else 'Thema'} kann ich Ihnen mitteilen, dass es mehrere Faktoren zu berücksichtigen gibt. Es ist wichtig, einen ausgewogenen Ansatz zu verfolgen.",
            f"Ihre Frage zu {random.choice(keywords) if keywords else 'diesem Thema'} ist interessant. Aus verschiedenen Perspektiven betrachtet, gibt es mehrere wichtige Aspekte zu beachten.",
            f"Bei der Betrachtung von {random.choice(keywords) if keywords else 'diesem Thema'} sollten wir einen systematischen Ansatz verfolgen und verschiedene Aspekte berücksichtigen.",
            f"Es gibt verschiedene Facetten von {random.choice(keywords) if keywords else 'diesem Thema'}, die berücksichtigt werden sollten. Eine differenzierte Betrachtung ist wichtig."
        ]
        
        return random.choice(templates)


@lru_cache()
def get_llm_service() -> LLMService:
    """
    Factory-Funktion, die eine zwischengespeicherte Instanz des LLM-Service zurückgibt.
    Wird für Dependency Injection in FastAPI verwendet.
    """
    settings = get_settings()
    return LLMService(
        model_name=settings.llm_model_name,
        provider=settings.llm_provider,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens
    ) 