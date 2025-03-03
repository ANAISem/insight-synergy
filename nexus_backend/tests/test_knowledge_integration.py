"""
Systemintegrationstests für die Nexus-Wissens-Engine.

Diese Tests prüfen das Zusammenspiel aller Komponenten der Wissensengine, 
einschließlich VectorDB, LLM-Service und Dokumentenverarbeitung.
"""

import asyncio
import os
import pytest
import tempfile
import uuid
from unittest.mock import patch, AsyncMock, MagicMock

from ..db.vector_db import VectorDB
from ..services.llm_service import LLMService
from ..services.knowledge_service import KnowledgeService
from ..models.schemas import (
    DocumentCreate, 
    DocumentResponse, 
    MetadataBase,
    SearchQuery, 
    SearchResponse,
    KnowledgeQuery,
    KnowledgeResponse
)


@pytest.fixture
async def temp_directory():
    """Erstellt ein temporäres Verzeichnis für die Tests."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


@pytest.fixture
async def vector_db(temp_directory):
    """Erstellt eine temporäre Vector-DB-Instanz für die Tests."""
    # Mock für die Embedding-Funktion
    mock_embedding_fn = MagicMock(return_value=[0.1] * 384)  # 384 dimensionale Embeddings
    
    # Vector-DB mit Mock-Embedding-Funktion initialisieren
    db = VectorDB(
        persist_directory=temp_directory,
        embedding_function=mock_embedding_fn,
        collection_name="test_collection"
    )
    
    # Collection zurücksetzen
    await db.reset_collection()
    
    yield db
    
    # Aufräumen
    await db.reset_collection()


@pytest.fixture
async def llm_service():
    """Erstellt einen Mock für den LLM-Service."""
    with patch('nexus_backend.services.llm_service.LLMService') as mock_llm_service:
        service = mock_llm_service.return_value
        service.generate_response = AsyncMock(return_value="Dies ist eine generierte Antwort vom LLM.")
        service.extract_knowledge = AsyncMock(return_value={
            "entities": ["Test-Entity-1", "Test-Entity-2"],
            "relationships": [{"source": "Test-Entity-1", "target": "Test-Entity-2", "type": "related_to"}],
            "summary": "Dies ist eine Zusammenfassung des extrahierten Wissens."
        })
        yield service


@pytest.fixture
async def knowledge_service(vector_db, llm_service):
    """Erstellt einen KnowledgeService mit den Mock-Komponenten."""
    service = KnowledgeService(vector_db=vector_db, llm_service=llm_service)
    yield service


@pytest.fixture
async def sample_documents():
    """Erstellt Beispieldokumente für die Tests."""
    return [
        DocumentCreate(
            content="Python ist eine Programmiersprache, die für ihre einfache Syntax und Lesbarkeit bekannt ist.",
            metadata=MetadataBase(
                source_type="document",
                source_name="Programmierhandbuch",
                tags=["python", "programmierung"],
                language="de"
            )
        ),
        DocumentCreate(
            content="FastAPI ist ein modernes Web-Framework für Python, das auf Starlette und Pydantic basiert.",
            metadata=MetadataBase(
                source_type="document",
                source_name="Web-Entwicklung",
                tags=["fastapi", "web", "python"],
                language="de"
            )
        ),
        DocumentCreate(
            content="Vector-Datenbanken speichern Embeddings und ermöglichen semantische Suche.",
            metadata=MetadataBase(
                source_type="document",
                source_name="Datenbanken",
                tags=["vector-db", "embeddings", "semantic-search"],
                language="de"
            )
        )
    ]


class TestKnowledgeIntegration:
    """Integrationstests für die Wissens-Engine."""
    
    @pytest.mark.asyncio
    async def test_document_ingestion_and_search(self, knowledge_service, sample_documents):
        """Testet die Dokumentenaufnahme und anschließende Suche."""
        # Alle Beispieldokumente in die Datenbank einfügen
        document_responses = []
        for doc in sample_documents:
            response = await knowledge_service.vector_db.add_document(doc)
            document_responses.append(response)
        
        # Prüfen, ob die Dokumente erfolgreich hinzugefügt wurden
        assert len(document_responses) == 3
        for response in document_responses:
            assert isinstance(response, DocumentResponse)
            assert response.id is not None
            assert response.vector_id is not None
        
        # Semantische Suche nach "Python-Programmierung" durchführen
        search_query = SearchQuery(query="Python-Programmierung", limit=2)
        search_results = await knowledge_service.semantic_search(search_query)
        
        # Prüfen, ob die Suchergebnisse korrekt sind
        assert isinstance(search_results, SearchResponse)
        assert len(search_results.results) <= 2  # Maximal 2 Ergebnisse aufgrund des Limits
        assert search_results.query == "Python-Programmierung"
        
        # Da wir Mock-Embeddings verwenden, können wir nicht die genauen Ergebnisse prüfen,
        # aber wir können sicherstellen, dass die Struktur korrekt ist
        for result in search_results.results:
            assert result.document.id is not None
            assert result.document.content is not None
            assert result.score is not None
    
    @pytest.mark.asyncio
    async def test_knowledge_extraction(self, knowledge_service, sample_documents):
        """Testet die Wissensextraktion aus Dokumenten."""
        # Ein Dokument in die Datenbank einfügen
        doc_response = await knowledge_service.vector_db.add_document(sample_documents[0])
        
        # Wissensextraktion für das Dokument durchführen
        extracted_knowledge = await knowledge_service.extract_knowledge_from_document(doc_response.id)
        
        # Prüfen, ob die Wissensextraktion erfolgreich war
        assert extracted_knowledge is not None
        assert "entities" in extracted_knowledge
        assert "relationships" in extracted_knowledge
        assert "summary" in extracted_knowledge
        
        # Mindestens eine Entity sollte extrahiert worden sein
        assert len(extracted_knowledge["entities"]) > 0
        
        # Wenn Beziehungen extrahiert wurden, sollten diese die richtige Struktur haben
        if extracted_knowledge["relationships"]:
            relationship = extracted_knowledge["relationships"][0]
            assert "source" in relationship
            assert "target" in relationship
            assert "type" in relationship
    
    @pytest.mark.asyncio
    async def test_knowledge_query(self, knowledge_service, sample_documents):
        """Testet die Wissensabfrage mit LLM-Unterstützung."""
        # Alle Beispieldokumente in die Datenbank einfügen
        for doc in sample_documents:
            await knowledge_service.vector_db.add_document(doc)
        
        # Wissensabfrage erstellen
        knowledge_query = KnowledgeQuery(
            query="Was ist Python?",
            max_tokens=500,
            use_knowledge_graph=True
        )
        
        # Wissensabfrage durchführen
        response = await knowledge_service.query_knowledge(knowledge_query)
        
        # Prüfen, ob die Antwort korrekt generiert wurde
        assert isinstance(response, KnowledgeResponse)
        assert response.answer is not None
        assert len(response.answer) > 0
        assert response.sources is not None
        
        # Wenn verwendete Quellen zurückgegeben wurden, sollten diese die richtige Struktur haben
        if response.sources:
            source = response.sources[0]
            assert source.document_id is not None
            assert source.relevance is not None
    
    @pytest.mark.asyncio
    async def test_end_to_end_workflow(self, knowledge_service, sample_documents):
        """Testet den vollständigen Workflow von der Dokumentenaufnahme bis zur Wissensabfrage."""
        # 1. Dokumente in die Datenbank einfügen
        for doc in sample_documents:
            await knowledge_service.vector_db.add_document(doc)
        
        # 2. Semantische Suche durchführen
        search_query = SearchQuery(query="Python Web-Entwicklung", limit=2)
        search_results = await knowledge_service.semantic_search(search_query)
        
        # Relevante Dokument-IDs aus den Suchergebnissen extrahieren
        document_ids = [result.document.id for result in search_results.results]
        
        # 3. Wissensextraktion für die gefundenen Dokumente durchführen
        for doc_id in document_ids:
            await knowledge_service.extract_knowledge_from_document(doc_id)
        
        # 4. Wissensabfrage durchführen
        knowledge_query = KnowledgeQuery(
            query="Wie kann ich Python für Web-Entwicklung nutzen?",
            max_tokens=500,
            use_knowledge_graph=True
        )
        
        response = await knowledge_service.query_knowledge(knowledge_query)
        
        # Prüfen, ob der gesamte Workflow erfolgreich war
        assert response.answer is not None
        assert len(response.answer) > 0
        
        # Prüfen, ob die Quellen in der Antwort enthalten sind
        assert response.sources is not None
        
        # Wenn Quellen vorhanden sind, prüfen, ob sie mit den Dokumenten übereinstimmen
        if response.sources:
            source_ids = [source.document_id for source in response.sources]
            # Mindestens eine der Quellen sollte aus unseren Suchergebnissen stammen
            assert any(doc_id in source_ids for doc_id in document_ids) 