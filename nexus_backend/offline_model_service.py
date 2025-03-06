#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import asyncio
import httpx
import uvicorn
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Konfiguration
DEFAULT_PORT = 8001
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api")
MISTRAL_MODEL = os.getenv("MISTRAL_MODEL_NAME", "mistral")
DEFAULT_MAX_TOKENS = 2000
DEFAULT_TEMPERATURE = 0.7

# FastAPI App
app = FastAPI(
    title="Insight Synergy Offline Service",
    description="Lokaler Service für die Insight Synergy App mit Offline-Unterstützung",
    version="1.0.0",
)

# CORS-Konfiguration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Verbindungen für WebSockets
active_connections: List[WebSocket] = []

# Modelle
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2000
    system_prompt: Optional[str] = None

class ModelInfo(BaseModel):
    name: str
    status: str
    description: Optional[str] = None

# Health Check
@app.get("/health")
async def health_check():
    try:
        # Prüfen, ob Ollama erreichbar ist
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{OLLAMA_API_URL}/tags")
            if response.status_code == 200:
                # Prüfen, ob das Mistral-Modell verfügbar ist
                models = response.json().get("models", [])
                mistral_available = any(model.get("name") == MISTRAL_MODEL for model in models)
                
                if mistral_available:
                    return {
                        "status": "ok",
                        "ollama_status": "running",
                        "mistral_model": "available",
                        "offline_mode": True,
                        "version": "1.0.0"
                    }
                else:
                    return {
                        "status": "warning",
                        "ollama_status": "running",
                        "mistral_model": "not_available",
                        "message": f"Mistral-Modell '{MISTRAL_MODEL}' nicht gefunden",
                        "offline_mode": True,
                        "version": "1.0.0"
                    }
    except Exception as e:
        return {
            "status": "error",
            "ollama_status": "not_running",
            "message": f"Fehler bei der Verbindung zu Ollama: {str(e)}",
            "offline_mode": True,
            "version": "1.0.0"
        }

# Models-Endpunkt
@app.get("/models")
async def get_models():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_API_URL}/tags")
            if response.status_code == 200:
                models = []
                for model in response.json().get("models", []):
                    models.append(ModelInfo(
                        name=model.get("name", "unknown"),
                        status="loaded" if model.get("name") == MISTRAL_MODEL else "available",
                        description=model.get("description", "")
                    ))
                return models
            else:
                raise HTTPException(status_code=response.status_code, detail="Fehler beim Abrufen der Modelle")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler bei der Verbindung zu Ollama: {str(e)}")

# Chat-Endpunkt
@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # Chat-Verlauf zusammenbauen
        prompt = ""
        
        # System-Prompt hinzufügen, falls vorhanden
        if request.system_prompt:
            prompt += f"System: {request.system_prompt}\n\n"
        
        # Nachrichten hinzufügen
        for message in request.messages:
            prefix = "User: " if message.role == "user" else "Assistant: "
            prompt += f"{prefix}{message.content}\n"
        
        # Prompt erstellen, der das Modell als Assistant antworten lässt
        prompt += "Assistant: "
        
        # Request an Ollama senden
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_API_URL}/generate",
                json={
                    "model": MISTRAL_MODEL,
                    "prompt": prompt,
                    "temperature": request.temperature,
                    "max_tokens": request.max_tokens,
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "id": "offline-" + result.get("id", ""),
                    "model": MISTRAL_MODEL,
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": result.get("response", "")
                            },
                            "finish_reason": "stop"
                        }
                    ],
                    "usage": {
                        "prompt_tokens": result.get("prompt_tokens", 0),
                        "completion_tokens": result.get("completion_tokens", 0),
                        "total_tokens": result.get("prompt_tokens", 0) + result.get("completion_tokens", 0)
                    },
                    "offline_mode": True
                }
            else:
                raise HTTPException(status_code=response.status_code, 
                                   detail="Fehler bei der Kommunikation mit Ollama")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler bei der Generierung: {str(e)}")

# WebSocket für Chat
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # Willkommensnachricht senden
        await websocket.send_json({
            "type": "connection_established",
            "data": {
                "message": "Verbindung hergestellt zum Offline-Modus mit lokalem Mistral-Modell"
            }
        })
        
        # Empfange Nachrichten
        while True:
            try:
                # Auf Nachrichten vom Client warten
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                json_data = json.loads(data)
                
                if json_data.get("type") == "ping":
                    # Auf Ping mit Pong antworten
                    await websocket.send_json({"type": "pong"})
                
                elif json_data.get("type") == "query":
                    # Chat-Anfrage verarbeiten
                    query_data = json_data.get("data", {})
                    query = query_data.get("query", "")
                    
                    # Streaming-Antwort generieren
                    async with httpx.AsyncClient(timeout=60.0) as client:
                        response = await client.post(
                            f"{OLLAMA_API_URL}/generate",
                            json={
                                "model": MISTRAL_MODEL,
                                "prompt": query,
                                "temperature": query_data.get("temperature", DEFAULT_TEMPERATURE),
                                "max_tokens": query_data.get("max_tokens", DEFAULT_MAX_TOKENS),
                                "stream": True
                            }
                        )
                        
                        if response.status_code == 200:
                            # Stream verarbeiten
                            full_response = ""
                            
                            async for line in response.aiter_lines():
                                if line.strip():
                                    try:
                                        chunk = json.loads(line)
                                        token = chunk.get("response", "")
                                        full_response += token
                                        
                                        # Token senden
                                        await websocket.send_json({
                                            "type": "token",
                                            "data": {
                                                "token": token
                                            }
                                        })
                                    except json.JSONDecodeError:
                                        continue
                            
                            # Vollständige Antwort senden
                            await websocket.send_json({
                                "type": "answer_complete",
                                "data": {
                                    "query": query,
                                    "answer": full_response,
                                    "offline_mode": True
                                }
                            })
                        else:
                            # Fehlermeldung senden
                            await websocket.send_json({
                                "type": "error",
                                "data": {
                                    "message": "Fehler bei der Kommunikation mit Ollama"
                                }
                            })
            
            except asyncio.TimeoutError:
                # Heartbeat senden
                await websocket.send_json({"type": "heartbeat"})
            
            except Exception as e:
                print(f"Fehler beim Verarbeiten der WebSocket-Nachricht: {e}")
                # Fehlermeldung an Client senden
                try:
                    await websocket.send_json({
                        "type": "error",
                        "data": {
                            "message": f"Fehler: {str(e)}"
                        }
                    })
                except:
                    break
    
    except Exception as e:
        print(f"WebSocket-Verbindung geschlossen wegen: {e}")
    
    finally:
        # Verbindung aus der Liste entfernen
        if websocket in active_connections:
            active_connections.remove(websocket)

if __name__ == "__main__":
    # Port aus Umgebungsvariable oder Standardwert
    port = int(os.environ.get("PORT", DEFAULT_PORT))
    
    print(f"Starte Insight Synergy Offline Service auf Port {port}...")
    print(f"Verwende Ollama API URL: {OLLAMA_API_URL}")
    print(f"Verwende Mistral-Modell: {MISTRAL_MODEL}")
    
    # Server starten
    uvicorn.run(app, host="0.0.0.0", port=port) 