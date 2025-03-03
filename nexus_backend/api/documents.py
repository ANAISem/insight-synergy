"""
API-Routen für die Dokumentenverwaltung im Nexus-Backend.
Ermöglicht CRUD-Operationen für Dokumente in der Vektordatenbank.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from pydantic import UUID4
import uuid
import time
from datetime import datetime

from ..models.schemas import (
    DocumentCreate, 
    DocumentResponse, 
    DocumentBatchUploadRequest,
    DocumentBatchUploadResponse,
    ErrorResponse
)
from ..services.vector_db import VectorDB, get_vector_db
from ..utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.post(
    "/documents", 
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Ungültige Anfrage"},
        500: {"model": ErrorResponse, "description": "Serverfehler"}
    }
)
async def create_document(
    document: DocumentCreate,
    vector_db: VectorDB = Depends(get_vector_db)
):
    """
    Erstellt ein neues Dokument in der Vektordatenbank.
    
    - **document**: Das Dokument, das erstellt werden soll
    
    Gibt das erstellte Dokument mit seiner generierten ID zurück.
    """
    try:
        start_time = time.time()
        
        # ID generieren, falls keine angegeben wurde
        doc_id = document.id or str(uuid.uuid4())
        
        # Metadaten aktualisieren
        if not document.metadata.created_at:
            document.metadata.created_at = datetime.now()
        
        document.metadata.updated_at = datetime.now()
        
        # Dokument in der Vektordatenbank speichern
        vector_id = await vector_db.add_document(
            doc_id=doc_id,
            text=document.content,
            metadata=document.metadata.dict()
        )
        
        # Antwort vorbereiten
        response = DocumentResponse(
            id=doc_id,
            content=document.content,
            metadata=document.metadata,
            embedding_model=vector_db.embedding_model_name,
            vector_id=vector_id
        )
        
        logger.info(f"Dokument erstellt: {doc_id} (Dauer: {time.time() - start_time:.3f}s)")
        return response
        
    except Exception as e:
        logger.error(f"Fehler beim Erstellen des Dokuments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Erstellen des Dokuments: {str(e)}"
        )


@router.post(
    "/documents/batch", 
    response_model=DocumentBatchUploadResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Ungültige Anfrage"},
        500: {"model": ErrorResponse, "description": "Serverfehler"}
    }
)
async def batch_upload_documents(
    batch: DocumentBatchUploadRequest,
    vector_db: VectorDB = Depends(get_vector_db)
):
    """
    Lädt mehrere Dokumente in einem Batch hoch.
    
    - **batch**: Die Liste der hochzuladenden Dokumente
    
    Gibt eine Zusammenfassung der erfolgreichen und fehlgeschlagenen Uploads zurück.
    """
    start_time = time.time()
    success_count = 0
    failed_count = 0
    document_ids = []
    
    try:
        for doc in batch.documents:
            try:
                # ID generieren, falls keine angegeben wurde
                doc_id = doc.id or str(uuid.uuid4())
                
                # Metadaten aktualisieren
                if not doc.metadata.created_at:
                    doc.metadata.created_at = datetime.now()
                
                doc.metadata.updated_at = datetime.now()
                
                # Dokument in der Vektordatenbank speichern
                await vector_db.add_document(
                    doc_id=doc_id,
                    text=doc.content,
                    metadata=doc.metadata.dict()
                )
                
                document_ids.append(doc_id)
                success_count += 1
                
            except Exception as e:
                logger.error(f"Fehler beim Hochladen des Dokuments im Batch: {str(e)}")
                failed_count += 1
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        logger.info(f"Batch-Upload abgeschlossen: {success_count} erfolgreich, {failed_count} fehlgeschlagen")
        return DocumentBatchUploadResponse(
            success_count=success_count,
            failed_count=failed_count,
            document_ids=document_ids,
            processing_time_ms=processing_time_ms
        )
        
    except Exception as e:
        logger.error(f"Fehler beim Batch-Upload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Batch-Upload: {str(e)}"
        )


@router.get(
    "/documents/{doc_id}", 
    response_model=DocumentResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Dokument nicht gefunden"},
        500: {"model": ErrorResponse, "description": "Serverfehler"}
    }
)
async def get_document(
    doc_id: str,
    vector_db: VectorDB = Depends(get_vector_db)
):
    """
    Ruft ein Dokument anhand seiner ID ab.
    
    - **doc_id**: Die ID des abzurufenden Dokuments
    
    Gibt das Dokument zurück, wenn es gefunden wurde.
    """
    try:
        doc = await vector_db.get_document(doc_id)
        
        if not doc:
            logger.warning(f"Dokument nicht gefunden: {doc_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dokument mit ID {doc_id} nicht gefunden"
            )
        
        # Dokument in die Antwortstruktur umwandeln
        response = DocumentResponse(
            id=doc_id,
            content=doc["text"],
            metadata=doc["metadata"],
            embedding_model=vector_db.embedding_model_name,
            vector_id=doc.get("vector_id")
        )
        
        logger.info(f"Dokument abgerufen: {doc_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fehler beim Abrufen des Dokuments {doc_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Abrufen des Dokuments: {str(e)}"
        )


@router.put(
    "/documents/{doc_id}", 
    response_model=DocumentResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Dokument nicht gefunden"},
        500: {"model": ErrorResponse, "description": "Serverfehler"}
    }
)
async def update_document(
    doc_id: str,
    document: DocumentCreate,
    vector_db: VectorDB = Depends(get_vector_db)
):
    """
    Aktualisiert ein bestehendes Dokument.
    
    - **doc_id**: Die ID des zu aktualisierenden Dokuments
    - **document**: Die neuen Daten für das Dokument
    
    Gibt das aktualisierte Dokument zurück.
    """
    try:
        # Prüfen, ob das Dokument existiert
        existing_doc = await vector_db.get_document(doc_id)
        
        if not existing_doc:
            logger.warning(f"Dokument nicht gefunden: {doc_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dokument mit ID {doc_id} nicht gefunden"
            )
        
        # Metadaten aktualisieren
        document.metadata.updated_at = datetime.now()
        
        if not document.metadata.created_at:
            # Behalte das ursprüngliche Erstellungsdatum bei
            document.metadata.created_at = existing_doc.get("metadata", {}).get("created_at", datetime.now())
        
        # Dokument in der Vektordatenbank aktualisieren
        vector_id = await vector_db.update_document(
            doc_id=doc_id,
            text=document.content,
            metadata=document.metadata.dict()
        )
        
        # Antwort vorbereiten
        response = DocumentResponse(
            id=doc_id,
            content=document.content,
            metadata=document.metadata,
            embedding_model=vector_db.embedding_model_name,
            vector_id=vector_id
        )
        
        logger.info(f"Dokument aktualisiert: {doc_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fehler beim Aktualisieren des Dokuments {doc_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Aktualisieren des Dokuments: {str(e)}"
        )


@router.delete(
    "/documents/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        404: {"model": ErrorResponse, "description": "Dokument nicht gefunden"},
        500: {"model": ErrorResponse, "description": "Serverfehler"}
    }
)
async def delete_document(
    doc_id: str,
    vector_db: VectorDB = Depends(get_vector_db)
):
    """
    Löscht ein Dokument anhand seiner ID.
    
    - **doc_id**: Die ID des zu löschenden Dokuments
    
    Gibt keine Daten zurück (204 No Content).
    """
    try:
        # Prüfen, ob das Dokument existiert
        existing_doc = await vector_db.get_document(doc_id)
        
        if not existing_doc:
            logger.warning(f"Dokument nicht gefunden: {doc_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dokument mit ID {doc_id} nicht gefunden"
            )
        
        # Dokument aus der Vektordatenbank löschen
        await vector_db.delete_document(doc_id)
        
        logger.info(f"Dokument gelöscht: {doc_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fehler beim Löschen des Dokuments {doc_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Löschen des Dokuments: {str(e)}"
        )


@router.get(
    "/documents",
    response_model=List[DocumentResponse],
    responses={
        500: {"model": ErrorResponse, "description": "Serverfehler"}
    }
)
async def list_documents(
    skip: int = Query(0, description="Anzahl der zu überspringenden Dokumente"),
    limit: int = Query(100, description="Maximale Anzahl der zurückzugebenden Dokumente"),
    filter_metadata: Optional[Dict[str, Any]] = None,
    vector_db: VectorDB = Depends(get_vector_db)
):
    """
    Listet alle Dokumente mit optionaler Filterung und Paginierung auf.
    
    - **skip**: Anzahl der zu überspringenden Dokumente (für Paginierung)
    - **limit**: Maximale Anzahl der zurückzugebenden Dokumente
    - **filter_metadata**: Optionale Filterkriterien für Metadaten
    
    Gibt eine Liste von Dokumenten zurück.
    """
    try:
        documents = await vector_db.list_documents(
            skip=skip,
            limit=limit,
            filter_metadata=filter_metadata
        )
        
        # Dokumente in die Antwortstruktur umwandeln
        response = [
            DocumentResponse(
                id=doc["id"],
                content=doc["text"],
                metadata=doc["metadata"],
                embedding_model=vector_db.embedding_model_name,
                vector_id=doc.get("vector_id")
            )
            for doc in documents
        ]
        
        logger.info(f"Dokumente aufgelistet: {len(response)} Ergebnisse")
        return response
        
    except Exception as e:
        logger.error(f"Fehler beim Auflisten der Dokumente: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Auflisten der Dokumente: {str(e)}"
        ) 