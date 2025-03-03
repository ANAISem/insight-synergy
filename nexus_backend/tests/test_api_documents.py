"""
Tests für die API-Endpunkte zur Dokumentenverwaltung im Nexus-Backend.
"""

import json
import pytest
import uuid
from datetime import datetime
from unittest.mock import patch, MagicMock, AsyncMock

from fastapi.testclient import TestClient
from ..app import app
from ..models.schemas import DocumentCreate, DocumentResponse, MetadataBase
from ..db.vector_db import VectorDB


@pytest.fixture
def test_client():
    """Erstellt einen Test-Client für die FastAPI-App."""
    return TestClient(app)


@pytest.fixture
def sample_document():
    """Erstellt ein Beispieldokument für Tests."""
    return DocumentCreate(
        content="Dies ist ein Testdokument für die API-Tests.",
        metadata=MetadataBase(
            source_type="document",
            source_name="API-Test",
            tags=["test", "api", "dokument"],
            language="de"
        )
    )


@pytest.fixture
def sample_document_response():
    """Erstellt eine Beispiel-Dokumentenantwort für Tests."""
    doc_id = str(uuid.uuid4())
    return DocumentResponse(
        id=doc_id,
        content="Dies ist ein Testdokument für die API-Tests.",
        metadata=MetadataBase(
            source_type="document",
            source_name="API-Test",
            tags=["test", "api", "dokument"],
            language="de",
            created_at=datetime.now(),
            updated_at=None,
            confidence=None,
            source_url=None
        ),
        vector_id=f"chroma-{doc_id}"
    )


class TestDocumentsAPI:
    """Testsuite für die Dokument-API-Endpunkte."""
    
    def test_create_document(self, test_client, sample_document, sample_document_response):
        """Testet das Erstellen eines Dokuments über die API."""
        # Vector-DB-Mock einrichten
        with patch('app.get_vector_db') as mock_get_vector_db:
            mock_db = AsyncMock(spec=VectorDB)
            mock_db.add_document = AsyncMock(return_value=sample_document_response)
            mock_get_vector_db.return_value = mock_db
            
            # API-Anfrage senden
            response = test_client.post(
                "/api/documents",
                json=sample_document.dict()
            )
            
            # Prüfen, ob die Anfrage erfolgreich war
            assert response.status_code == 201
            
            # Prüfen, ob die Antwort korrekt ist
            data = response.json()
            assert data["id"] == sample_document_response.id
            assert data["content"] == sample_document_response.content
            assert data["metadata"]["source_name"] == "API-Test"
            assert "test" in data["metadata"]["tags"]
            
            # Prüfen, ob die Vector-DB-Methode aufgerufen wurde
            mock_db.add_document.assert_called_once()
    
    def test_get_document(self, test_client, sample_document_response):
        """Testet das Abrufen eines Dokuments über die API."""
        doc_id = sample_document_response.id
        
        # Vector-DB-Mock einrichten
        with patch('app.get_vector_db') as mock_get_vector_db:
            mock_db = AsyncMock(spec=VectorDB)
            mock_db.get_document = AsyncMock(return_value=sample_document_response)
            mock_get_vector_db.return_value = mock_db
            
            # API-Anfrage senden
            response = test_client.get(f"/api/documents/{doc_id}")
            
            # Prüfen, ob die Anfrage erfolgreich war
            assert response.status_code == 200
            
            # Prüfen, ob die Antwort korrekt ist
            data = response.json()
            assert data["id"] == doc_id
            assert data["content"] == sample_document_response.content
            
            # Prüfen, ob die Vector-DB-Methode aufgerufen wurde
            mock_db.get_document.assert_called_once_with(doc_id)
    
    def test_get_nonexistent_document(self, test_client):
        """Testet das Abrufen eines nicht existierenden Dokuments."""
        non_existent_id = str(uuid.uuid4())
        
        # Vector-DB-Mock einrichten
        with patch('app.get_vector_db') as mock_get_vector_db:
            mock_db = AsyncMock(spec=VectorDB)
            mock_db.get_document = AsyncMock(return_value=None)
            mock_get_vector_db.return_value = mock_db
            
            # API-Anfrage senden
            response = test_client.get(f"/api/documents/{non_existent_id}")
            
            # Prüfen, ob die Anfrage einen 404-Fehler zurückgibt
            assert response.status_code == 404
            
            # Prüfen, ob die Fehlerantwort korrekt ist
            data = response.json()
            assert data["status"] == "error"
            assert "nicht gefunden" in data["message"]
    
    def test_update_document(self, test_client, sample_document, sample_document_response):
        """Testet das Aktualisieren eines Dokuments über die API."""
        doc_id = sample_document_response.id
        
        # Aktualisierte Daten erstellen
        updated_document = sample_document.copy()
        updated_document.content = "Dies ist ein aktualisiertes Testdokument."
        updated_document.metadata.source_name = "Aktualisierter API-Test"
        
        # Vector-DB-Mock einrichten
        with patch('app.get_vector_db') as mock_get_vector_db:
            mock_db = AsyncMock(spec=VectorDB)
            
            # Angepasste Antwort erstellen
            updated_response = sample_document_response.copy()
            updated_response.content = updated_document.content
            updated_response.metadata.source_name = updated_document.metadata.source_name
            updated_response.metadata.updated_at = datetime.now()
            
            mock_db.update_document = AsyncMock(return_value=updated_response)
            mock_get_vector_db.return_value = mock_db
            
            # API-Anfrage senden
            response = test_client.put(
                f"/api/documents/{doc_id}",
                json=updated_document.dict()
            )
            
            # Prüfen, ob die Anfrage erfolgreich war
            assert response.status_code == 200
            
            # Prüfen, ob die Antwort korrekt ist
            data = response.json()
            assert data["id"] == doc_id
            assert data["content"] == updated_document.content
            assert data["metadata"]["source_name"] == updated_document.metadata.source_name
            assert data["metadata"]["updated_at"] is not None
            
            # Prüfen, ob die Vector-DB-Methode aufgerufen wurde
            mock_db.update_document.assert_called_once()
    
    def test_delete_document(self, test_client):
        """Testet das Löschen eines Dokuments über die API."""
        doc_id = str(uuid.uuid4())
        
        # Vector-DB-Mock einrichten
        with patch('app.get_vector_db') as mock_get_vector_db:
            mock_db = AsyncMock(spec=VectorDB)
            mock_db.delete_document = AsyncMock(return_value=True)
            mock_get_vector_db.return_value = mock_db
            
            # API-Anfrage senden
            response = test_client.delete(f"/api/documents/{doc_id}")
            
            # Prüfen, ob die Anfrage erfolgreich war
            assert response.status_code == 200
            
            # Prüfen, ob die Antwort korrekt ist
            data = response.json()
            assert data["success"] is True
            assert "erfolgreich gelöscht" in data["message"]
            
            # Prüfen, ob die Vector-DB-Methode aufgerufen wurde
            mock_db.delete_document.assert_called_once_with(doc_id)
    
    def test_batch_upload(self, test_client, sample_document, sample_document_response):
        """Testet den Batch-Upload von Dokumenten über die API."""
        # Vector-DB-Mock einrichten
        with patch('app.get_vector_db') as mock_get_vector_db:
            mock_db = AsyncMock(spec=VectorDB)
            
            # Zwei Dokumente als Ergebnis zurückgeben
            doc1 = sample_document_response
            doc2 = sample_document_response.copy()
            doc2.id = str(uuid.uuid4())
            doc2.vector_id = f"chroma-{doc2.id}"
            
            mock_db.add_document = AsyncMock(side_effect=[doc1, doc2])
            mock_get_vector_db.return_value = mock_db
            
            # API-Anfrage senden
            response = test_client.post(
                "/api/documents/batch",
                json={
                    "documents": [
                        sample_document.dict(),
                        sample_document.dict()
                    ]
                }
            )
            
            # Prüfen, ob die Anfrage erfolgreich war
            assert response.status_code == 201
            
            # Prüfen, ob die Antwort korrekt ist
            data = response.json()
            assert data["total_documents"] == 2
            assert data["successful"] == 2
            assert data["failed"] == 0
            assert len(data["document_ids"]) == 2
            assert data["document_ids"][0] == doc1.id
            assert data["document_ids"][1] == doc2.id
            
            # Prüfen, ob die Vector-DB-Methode zweimal aufgerufen wurde
            assert mock_db.add_document.call_count == 2 