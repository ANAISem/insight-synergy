"""
API-Routen für die semantische Suche im Nexus-Backend.
Ermöglicht die Durchführung von Ähnlichkeitssuchen in der Vektordatenbank.
"""

from fastapi import APIRouter, Depends, HTTPException, status
import time
from typing import Dict, Any, Optional

from ..models.schemas import (
    SearchQuery, 
    SearchResponse,
    SearchResult,
    DocumentResponse,
    ErrorResponse,
    KnowledgeQuery,
    KnowledgeResponse,
    CitationInfo
)
from ..services.vector_db import VectorDB, get_vector_db
from ..services.llm_service import LLMService, get_llm_service
from ..utils.logging import get_logger
from models.analysis_request import AnalysisRequest
from services.mistral_service import call_mistral_api
from dependencies import verify_token

logger = get_logger(__name__)

router = APIRouter()


@router.post(
    "/search", 
    response_model=SearchResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Ungültige Anfrage"},
        500: {"model": ErrorResponse, "description": "Serverfehler"}
    }
)
async def semantic_search(
    search_query: SearchQuery,
    vector_db: VectorDB = Depends(get_vector_db)
):
    """
    Führt eine semantische Ähnlichkeitssuche in der Wissensdatenbank durch.
    
    - **search_query**: Die Suchanfrage mit Filteroptionen
    
    Gibt die Suchergebnisse zurück, sortiert nach Relevanz.
    """
    try:
        start_time = time.time()
        
        # Semantische Suche in der Vektordatenbank durchführen
        search_results = await vector_db.search(
            query=search_query.query,
            limit=search_query.max_results,
            filter_criteria=search_query.filter_criteria
        )
        
        # Ergebnisse in die Antwortstruktur umwandeln
        results = []
        for result in search_results:
            # Dokument-Antwort erstellen
            doc_response = DocumentResponse(
                id=result["id"],
                content=result["text"],
                metadata=result["metadata"],
                embedding_model=vector_db.embedding_model_name,
                vector_id=result.get("vector_id")
            )
            
            # Suchergebnis mit Score erstellen
            search_result = SearchResult(
                document=doc_response,
                score=result["score"]
            )
            
            results.append(search_result)
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        # Antwort zusammenstellen
        response = SearchResponse(
            results=results,
            query=search_query.query,
            total_results=len(results),
            processing_time_ms=processing_time_ms
        )
        
        logger.info(f"Suche durchgeführt: '{search_query.query}' (Ergebnisse: {len(results)}, Dauer: {processing_time_ms:.2f}ms)")
        return response
        
    except Exception as e:
        logger.error(f"Fehler bei der semantischen Suche: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler bei der semantischen Suche: {str(e)}"
        )


@router.post(
    "/knowledge", 
    response_model=KnowledgeResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Ungültige Anfrage"},
        500: {"model": ErrorResponse, "description": "Serverfehler"}
    }
)
async def query_knowledge(
    knowledge_query: KnowledgeQuery,
    vector_db: VectorDB = Depends(get_vector_db),
    llm_service: LLMService = Depends(get_llm_service)
):
    """
    Führt eine RAG-basierte Wissensabfrage durch und generiert eine Antwort.
    
    - **knowledge_query**: Die Wissensabfrage mit Optionen
    
    Gibt eine generierte Antwort mit Quellenzitaten zurück.
    """
    try:
        start_time = time.time()
        
        # Semantische Suche in der Vektordatenbank durchführen
        context_docs = await vector_db.search(
            query=knowledge_query.query,
            limit=knowledge_query.max_context_docs,
            filter_criteria=knowledge_query.filter_criteria
        )
        
        if not context_docs:
            logger.warning(f"Keine Kontextdokumente gefunden für: '{knowledge_query.query}'")
            # Wir generieren trotzdem eine Antwort, aber ohne Kontext
        
        # Antwort mit LLM generieren
        llm_response = await llm_service.generate_answer(
            query=knowledge_query.query,
            context_documents=context_docs,
            response_format=knowledge_query.response_format
        )
        
        # Zitationen erstellen
        citations = []
        for doc in context_docs:
            if doc["score"] >= 0.2:  # Nur relevante Dokumente zitieren
                citation = CitationInfo(
                    document_id=doc["id"],
                    content_snippet=doc["text"][:200] + ("..." if len(doc["text"]) > 200 else ""),
                    source_name=doc["metadata"].get("source_name"),
                    source_url=doc["metadata"].get("source_url"),
                    relevance_score=doc["score"]
                )
                citations.append(citation)
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        # Antwort zusammenstellen
        response = KnowledgeResponse(
            query=knowledge_query.query,
            answer=llm_response["answer"],
            citations=citations,
            confidence=llm_response["confidence"],
            processing_time_ms=processing_time_ms,
            context_docs_count=len(context_docs)
        )
        
        logger.info(
            f"Wissensabfrage beantwortet: '{knowledge_query.query}' "
            f"(Kontextdokumente: {len(context_docs)}, Konfidenz: {llm_response['confidence']:.2f}, "
            f"Dauer: {processing_time_ms:.2f}ms)"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Fehler bei der Wissensabfrage: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler bei der Wissensabfrage: {str(e)}"
        )

@router.post("/analyze", dependencies=[Depends(verify_token)])
async def analyze(request: AnalysisRequest):
    result = call_mistral_api(request.dict())
    return result 