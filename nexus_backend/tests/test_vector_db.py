"""
Tests für die Vektordatenbank-Komponente des Nexus-Backends.
"""

import os
import pytest
import tempfile
import shutil
from unittest.mock import patch, MagicMock

from ..db.vector_db import VectorDB
from ..models.schemas import DocumentCreate, MetadataBase, DocumentResponse


class TestVectorDB:
    """Testsuite für die Vektordatenbank-Implementierung."""
    
    @pytest.fixture
    def temp_dir(self):
        """Erstellt ein temporäres Verzeichnis für die Vektordatenbank."""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def vector_db(self, temp_dir):
        """Erstellt eine Vektordatenbank-Instanz für Tests."""
        return VectorDB(
            persist_directory=temp_dir,
            collection_name="test_collection",
            embedding_model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            create_if_not_exists=True
        )
    
    @pytest.mark.asyncio
    async def test_initialization(self, vector_db, temp_dir):
        """Testet die Initialisierung der Vektordatenbank."""
        # Prüfen, ob das Verzeichnis erstellt wurde
        assert os.path.exists(temp_dir)
        
        # Prüfen, ob die Konfiguration korrekt ist
        assert vector_db.collection_name == "test_collection"
        assert vector_db.embedding_model_name == "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        
        # Initialisierung der Datenbank testen
        with patch.object(vector_db, "_initialize_embedding_function") as mock_init_embeddings:
            await vector_db.initialize()
            mock_init_embeddings.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_add_document(self, vector_db):
        """Testet das Hinzufügen eines Dokuments zur Vektordatenbank."""
        # Mock für ChromaDB-Collection
        mock_collection = MagicMock()
        vector_db._collection = mock_collection
        
        # Mock für Embedding-Funktion
        vector_db._embedding_function = MagicMock()
        
        # Testdokument erstellen
        document = DocumentCreate(
            content="Dies ist ein Testdokument",
            metadata=MetadataBase(
                source_type="document",
                source_name="Test",
                tags=["test", "dokument"]
            )
        )
        
        # Dokument hinzufügen
        with patch.object(vector_db, "_get_or_create_collection", return_value=mock_collection):
            result = await vector_db.add_document(document)
            
            # Prüfen, ob das Dokument zur Collection hinzugefügt wurde
            mock_collection.add.assert_called_once()
            
            # Prüfen, ob das Ergebnis eine DocumentResponse ist
            assert isinstance(result, DocumentResponse)
            assert result.content == "Dies ist ein Testdokument"
            assert result.metadata.source_name == "Test"
            assert "test" in result.metadata.tags
    
    @pytest.mark.asyncio
    async def test_search_documents(self, vector_db):
        """Testet die Suche nach Dokumenten in der Vektordatenbank."""
        # Mock für ChromaDB-Collection
        mock_collection = MagicMock()
        vector_db._collection = mock_collection
        
        # Mock-Suchergebnis erstellen
        mock_collection.query.return_value = {
            'ids': [['doc1', 'doc2']],
            'documents': [['Inhalt des ersten Dokuments', 'Inhalt des zweiten Dokuments']],
            'metadatas': [[
                {
                    'source_type': 'document',
                    'source_name': 'Test 1',
                    'tags': ['test'],
                    'language': 'de'
                },
                {
                    'source_type': 'document',
                    'source_name': 'Test 2',
                    'tags': ['test'],
                    'language': 'de'
                }
            ]],
            'distances': [[0.1, 0.2]]
        }
        
        # Suche durchführen
        with patch.object(vector_db, "_get_or_create_collection", return_value=mock_collection):
            results = await vector_db.search_documents(
                query_text="Testsuche",
                limit=2
            )
            
            # Prüfen, ob die Suche aufgerufen wurde
            mock_collection.query.assert_called_once()
            
            # Prüfen, ob die Ergebnisse korrekt verarbeitet wurden
            assert len(results) == 2
            assert results[0].document_id == "doc1"
            assert results[0].content == "Inhalt des ersten Dokuments"
            assert results[0].score > 0  # Score sollte berechnet worden sein
    
    @pytest.mark.asyncio
    async def test_delete_document(self, vector_db):
        """Testet das Löschen eines Dokuments aus der Vektordatenbank."""
        # Mock für ChromaDB-Collection
        mock_collection = MagicMock()
        vector_db._collection = mock_collection
        
        # Dokument löschen
        with patch.object(vector_db, "_get_or_create_collection", return_value=mock_collection):
            await vector_db.delete_document("test_doc_id")
            
            # Prüfen, ob delete aufgerufen wurde
            mock_collection.delete.assert_called_once_with(ids=["test_doc_id"])
    
    @pytest.mark.asyncio
    async def test_update_document(self, vector_db):
        """Testet das Aktualisieren eines Dokuments in der Vektordatenbank."""
        # Mock für ChromaDB-Collection
        mock_collection = MagicMock()
        vector_db._collection = mock_collection
        
        # Testdokument erstellen
        document = DocumentCreate(
            content="Dies ist ein aktualisiertes Testdokument",
            metadata=MetadataBase(
                source_type="document",
                source_name="Test aktualisiert",
                tags=["test", "aktualisiert"]
            )
        )
        
        # Dokument aktualisieren
        with patch.object(vector_db, "_get_or_create_collection", return_value=mock_collection):
            with patch.object(vector_db, "delete_document"):
                result = await vector_db.update_document("test_doc_id", document)
                
                # Prüfen, ob das alte Dokument gelöscht wurde
                vector_db.delete_document.assert_called_once_with("test_doc_id")
                
                # Prüfen, ob ein neues Dokument hinzugefügt wurde
                mock_collection.add.assert_called_once()
                
                # Prüfen, ob das Ergebnis korrekt ist
                assert isinstance(result, DocumentResponse)
                assert result.content == "Dies ist ein aktualisiertes Testdokument"
                assert result.metadata.source_name == "Test aktualisiert"
                assert "aktualisiert" in result.metadata.tags 