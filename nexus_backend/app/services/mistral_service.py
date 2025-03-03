import httpx
import json
import asyncio
from loguru import logger
import os
from typing import Dict, List, Any, Optional, Union
import time
import random
from pydantic import BaseModel

from ..core.config import settings
from ..core.logging import get_logger

logger = get_logger(__name__)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2000
    system_prompt: Optional[str] = None

class ChatResponse(BaseModel):
    id: str
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]

class MistralService:
    """
    Service für die Interaktion mit dem Mistral 7B Modell über Ollama
    """
    
    def __init__(self):
        # Ollama API URL aus Umgebungsvariablen oder Standardwert
        self.api_base_url = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api")
        self.model_name = os.getenv("MISTRAL_MODEL_NAME", "mistral")
        self.timeout = httpx.Timeout(timeout=60.0)  # 60 Sekunden Timeout
        self.use_local = os.getenv("USE_LOCAL_MODEL", "true").lower() == "true"
        
        # Lade Prompt-Templates
        self.templates = self._load_templates()
        logger.info(f"MistralService initialized with model: {self.model_name}, use_local: {self.use_local}")
        
    def _load_templates(self) -> Dict[str, str]:
        """Lädt Prompt-Templates aus der Datei"""
        try:
            template_path = os.path.join(os.path.dirname(__file__), "../templates/mistral_templates.json")
            if os.path.exists(template_path):
                with open(template_path, "r") as f:
                    return json.load(f)
            else:
                logger.warning(f"Template file not found at {template_path}")
                return self._get_default_templates()
        except Exception as e:
            logger.error(f"Error loading templates: {str(e)}")
            return self._get_default_templates()
            
    def _get_default_templates(self) -> Dict[str, str]:
        """Liefert Standard-Templates zurück"""
        return {
            "nexus_solution": "Du bist The Nexus, eine hochspezialisierte KI für komplexe Problemlösungen. Deine Aufgabe ist es, präzise, detaillierte und umsetzbare Lösungen zu generieren. Analysiere das folgende Problem und liefere eine strukturierte Lösung:\n\nProblem: {query}\n{context}",
            "nexus_analysis": "Du bist The Nexus, eine analytische KI für tiefgehende Problemanalysen. Deine Aufgabe ist es, das folgende Problem zu analysieren, in seine Komponenten zu zerlegen und eine strukturierte Analyse zu erstellen:\n\nZu analysieren: {query}\n{context}",
            "cognitive_loop": "Du bist ein KI-Assistent, der komplexe Fragen beantwortet und beim Wissenserwerb hilft. Beantworte die folgende Frage detailliert und verständlich:\n\nFrage: {query}"
        }
    
    def get_template(self, template_name: str, **kwargs) -> str:
        """Holt ein Template und füllt es mit den übergebenen Variablen"""
        if template_name not in self.templates:
            logger.warning(f"Template '{template_name}' not found, using default")
            return kwargs.get("query", "")
            
        template = self.templates[template_name]
        
        # Formatiere alle übergebenen Variablen in das Template
        for key, value in kwargs.items():
            if isinstance(value, (list, dict)):
                # Für komplexe Typen
                placeholder = f"{{{key}}}"
                if placeholder in template:
                    template = template.replace(placeholder, str(value))
            elif value is not None:
                # Für einfache Typen
                placeholder = f"{{{key}}}"
                if placeholder in template:
                    template = template.replace(placeholder, str(value))
        
        return template
    
    async def _make_request(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Hilfsmethode für HTTP-Anfragen an die Ollama API
        """
        url = f"{self.api_base_url}/{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=data)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP-Fehler: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Anfragefehler: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unerwarteter Fehler: {str(e)}")
            raise
    
    async def generate_response(self, request: ChatRequest) -> Dict[str, Any]:
        """Generiert eine Antwort vom Mistral-Modell"""
        start_time = time.time()
        
        # System-Prompt hinzufügen, falls vorhanden
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        
        # Nachrichten hinzufügen
        for message in request.messages:
            messages.append({"role": message.role, "content": message.content})
        
        # Payload vorbereiten
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens
        }
        
        try:
            logger.info(f"Anfrage an Mistral 7B gesendet: {request.messages[0].content[:50]}...")
            response = await self._make_request("generate", payload)
            logger.info(f"Antwort von Mistral 7B erhalten: {response.get('response', '')[:50]}...")
            
            processing_time = time.time() - start_time
            logger.info(f"Response generated in {processing_time:.2f}s")
            
            # Füge Metadaten hinzu
            if response and "usage" in response:
                response["processing_time"] = processing_time
                
            return response
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            # Fehler im Response-Format zurückgeben
            return {
                "error": True,
                "message": str(e),
                "processing_time": time.time() - start_time
            }
    
    async def chat_completion(self, 
                             messages: List[Dict[str, str]], 
                             temperature: float = 0.7,
                             max_tokens: int = 2000) -> Dict[str, Any]:
        """
        Führt einen Chat mit dem Mistral-Modell durch
        
        Args:
            messages: Liste von Nachrichten im Format [{"role": "user", "content": "..."}, ...]
        """
        # Extrahiere System-Prompt, wenn vorhanden
        system_prompt = None
        filtered_messages = []
        
        for message in messages:
            if message["role"] == "system":
                system_prompt = message["content"]
            else:
                filtered_messages.append(message)
        
        # Formatiere den Chat-Verlauf als einzelnen Prompt
        chat_history = ""
        for message in filtered_messages:
            prefix = "[User]: " if message["role"] == "user" else "[Assistant]: "
            chat_history += f"{prefix}{message['content']}\n"
        
        # Füge Präfix für die nächste Antwort hinzu
        chat_history += "[Assistant]: "
        
        return await self.generate_response(
            request=ChatRequest(
                messages=[ChatMessage(role="user", content=chat_history)],
                temperature=temperature,
                max_tokens=max_tokens
            )
        )
    
    async def is_available(self) -> bool:
        """
        Überprüft, ob das Mistral-Modell verfügbar ist
        """
        try:
            # Einfache Anfrage zur Überprüfung der Verfügbarkeit
            await self._make_request("generate", {
                "model": self.model_name,
                "prompt": "Hi",
                "max_tokens": 1
            })
            return True
        except Exception as e:
            logger.error(f"Mistral-Modell nicht verfügbar: {str(e)}")
            return False
    
    async def get_model_info(self) -> Dict[str, Any]:
        """
        Ruft Informationen über das Mistral-Modell ab
        """
        try:
            # In Ollama können wir Details über das Modell abrufen
            url = f"{self.api_base_url}/show"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json={"name": self.model_name})
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der Modellinformationen: {str(e)}")
            return {"error": str(e)}

# Singleton-Instanz
mistral_service = MistralService() 