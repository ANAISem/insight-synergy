from fastapi import APIRouter, Body, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

router = APIRouter()

class DocumentCreateRequest(BaseModel):
    title: str = Field(..., description="Der Titel des Dokuments")
    content: str = Field(..., description="Der Inhalt des Dokuments")
    tags: Optional[List[str]] = Field(None, description="Tags für das Dokument")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Zusätzliche Metadaten")

class DocumentResponse(BaseModel):
    id: str = Field(..., description="Die ID des Dokuments")
    title: str = Field(..., description="Der Titel des Dokuments")
    content: str = Field(..., description="Der Inhalt des Dokuments")
    tags: List[str] = Field(..., description="Tags für das Dokument")
    created_at: str = Field(..., description="Erstellungsdatum")
    updated_at: str = Field(..., description="Aktualisierungsdatum")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Zusätzliche Metadaten")

@router.post("/", response_model=DocumentResponse, summary="Dokument erstellen")
async def create_document(document: DocumentCreateRequest):
    """
    Erstellt ein neues Dokument in der Wissensdatenbank.
    Diese Dummy-Implementierung gibt ein fest definiertes Ergebnis zurück.
    """
    # Dummy-Implementierung für Frontend-Tests
    return {
        "id": "doc-" + datetime.now().strftime("%Y%m%d%H%M%S"),
        "title": document.title,
        "content": document.content,
        "tags": document.tags or [],
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "metadata": document.metadata or {}
    }

@router.get("/", response_model=List[DocumentResponse], summary="Dokumente abrufen")
async def get_documents(
    limit: int = Query(10, description="Maximale Anzahl der zurückgegebenen Dokumente"),
    offset: int = Query(0, description="Offset für Pagination"),
    tag: Optional[str] = Query(None, description="Filtern nach Tag")
):
    """
    Ruft Dokumente aus der Wissensdatenbank ab.
    Diese Dummy-Implementierung gibt fest definierte Ergebnisse zurück.
    """
    # Dummy-Implementierung für Frontend-Tests
    docs = [
        {
            "id": "doc-20230801123456",
            "title": "Beispiel-Dokument 1",
            "content": "Dies ist der Inhalt von Beispiel-Dokument 1...",
            "tags": ["beispiel", "dokument"],
            "created_at": "2023-08-01T12:34:56Z",
            "updated_at": "2023-08-01T12:34:56Z",
            "metadata": {}
        },
        {
            "id": "doc-20230802123456",
            "title": "Beispiel-Dokument 2",
            "content": "Dies ist der Inhalt von Beispiel-Dokument 2...",
            "tags": ["beispiel", "dokument", "wichtig"],
            "created_at": "2023-08-02T12:34:56Z",
            "updated_at": "2023-08-02T12:34:56Z",
            "metadata": {"priority": "high"}
        }
    ]
    
    # Filtern nach Tag, falls angegeben
    if tag:
        docs = [doc for doc in docs if tag in doc["tags"]]
    
    # Pagination anwenden
    paginated_docs = docs[offset:offset+limit]
    
    return paginated_docs

@router.get("/{document_id}", response_model=DocumentResponse, summary="Dokument abrufen")
async def get_document(document_id: str):
    """
    Ruft ein Dokument anhand seiner ID ab.
    Diese Dummy-Implementierung gibt ein fest definiertes Ergebnis zurück.
    """
    # Dummy-Implementierung für Frontend-Tests
    return {
        "id": document_id,
        "title": f"Dokument {document_id}",
        "content": f"Dies ist der Inhalt von Dokument {document_id}...",
        "tags": ["beispiel", "dokument"],
        "created_at": "2023-08-01T12:34:56Z",
        "updated_at": "2023-08-01T12:34:56Z",
        "metadata": {}
    } 