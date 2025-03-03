from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from ...services.service_factory import get_mistral_service

router = APIRouter()
mistral_service = get_mistral_service()

# Pydantic-Modelle für Request und Response
class Message(BaseModel):
    role: str = Field(..., description="Die Rolle des Nachrichtensenders (user, assistant oder system)")
    content: str = Field(..., description="Der Inhalt der Nachricht")

class ChatRequest(BaseModel):
    messages: List[Message] = Field(..., description="Liste der Chat-Nachrichten")
    temperature: Optional[float] = Field(0.7, description="Temperatur für die Antwortgenerierung (0.0 - 1.0)")
    max_tokens: Optional[int] = Field(2000, description="Maximale Anzahl der Tokens in der Antwort")

class ChatResponse(BaseModel):
    response: str = Field(..., description="Die generierte Antwort")
    usage: Optional[Dict[str, Any]] = Field(None, description="Nutzungsinformationen")
    model: str = Field(..., description="Das verwendete Modell")

class TextGenerationRequest(BaseModel):
    prompt: str = Field(..., description="Der Prompt für die Textgenerierung")
    system_prompt: Optional[str] = Field(None, description="Der System-Prompt für die Textgenerierung")
    temperature: Optional[float] = Field(0.7, description="Temperatur für die Antwortgenerierung (0.0 - 1.0)")
    max_tokens: Optional[int] = Field(2000, description="Maximale Anzahl der Tokens in der Antwort")

class StatusResponse(BaseModel):
    status: str = Field(..., description="Der Status des Mistral-Modells")
    model_name: str = Field(..., description="Der Name des Modells")
    details: Optional[Dict[str, Any]] = Field(None, description="Zusätzliche Details")

@router.post("/chat", response_model=ChatResponse, summary="Chat mit Mistral 7B")
async def chat_with_mistral(request: ChatRequest):
    """
    Führt einen Chat mit dem Mistral 7B Modell durch
    """
    try:
        response = await mistral_service.chat_completion(
            messages=[msg.dict() for msg in request.messages],
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        if "error" in response:
            raise HTTPException(status_code=500, detail=response["error"])
        
        return {
            "response": response.get("response", ""),
            "usage": {
                "prompt_tokens": response.get("prompt_tokens", 0),
                "completion_tokens": response.get("completion_tokens", 0),
                "total_tokens": response.get("total_tokens", 0)
            },
            "model": mistral_service.model_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate", response_model=ChatResponse, summary="Generiert Text mit Mistral 7B")
async def generate_text(request: TextGenerationRequest):
    """
    Generiert Text basierend auf einem Prompt mit dem Mistral 7B Modell
    """
    try:
        response = await mistral_service.generate_response(
            prompt=request.prompt,
            system_prompt=request.system_prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        if "error" in response:
            raise HTTPException(status_code=500, detail=response["error"])
        
        return {
            "response": response.get("response", ""),
            "usage": {
                "prompt_tokens": response.get("prompt_tokens", 0),
                "completion_tokens": response.get("completion_tokens", 0),
                "total_tokens": response.get("total_tokens", 0)
            },
            "model": mistral_service.model_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status", response_model=StatusResponse, summary="Prüft den Status des Mistral-Modells")
async def check_mistral_status():
    """
    Überprüft den Status des Mistral 7B Modells
    """
    is_available = await mistral_service.is_available()
    status = "available" if is_available else "unavailable"
    
    details = None
    if is_available:
        try:
            details = await mistral_service.get_model_info()
        except:
            pass
    
    return {
        "status": status,
        "model_name": mistral_service.model_name,
        "details": details
    }

@router.post("/cognitive-loop", response_model=ChatResponse, summary="Führt einen Cognitive Loop mit Mistral 7B durch")
async def cognitive_loop(request: ChatRequest):
    """
    Führt einen Cognitive Loop mit dem Mistral 7B Modell durch.
    
    Der Cognitive Loop durchläuft mehrere Schritte:
    1. Frage verstehen
    2. Kontext analysieren
    3. Wissensdatenbank durchsuchen
    4. Informationen verknüpfen
    5. Antwort generieren
    """
    # System-Prompt für Cognitive Loop
    system_prompt = """
    Du bist ein intelligenter Assistent, der einen strukturierten "Cognitive Loop" durchführt, 
    um Fragen zu beantworten. Folge diesem Prozess:
    
    1. VERSTEHEN: Analysiere die Frage und identifiziere Schlüsselkonzepte
    2. KONTEXT: Berücksichtige relevanten Kontext und Hintergrundwissen
    3. WISSEN: Greife auf dein Fachwissen zu diesem Thema zu
    4. VERKNÜPFEN: Verbinde verschiedene Informationen miteinander
    5. ANTWORTEN: Formuliere eine strukturierte, klare Antwort
    
    Denke Schritt für Schritt und erkläre deinen Denkprozess.
    """
    
    # Füge den System-Prompt hinzu
    messages = [Message(role="system", content=system_prompt)]
    messages.extend(request.messages)
    
    # Verwende den normalen Chat-Endpunkt mit dem Cognitive Loop System-Prompt
    cognitive_request = ChatRequest(
        messages=messages,
        temperature=request.temperature,
        max_tokens=request.max_tokens
    )
    
    return await chat_with_mistral(cognitive_request) 