"""
Tests für den Cache-Service des Nexus-Backends.
Überprüft sowohl Memory-Cache als auch Redis-Cache Funktionalität.
"""

import asyncio
import json
import pytest
import time
from unittest.mock import AsyncMock, patch, MagicMock

from ..services.cache_service import CacheService, get_cache_service
from ..config import settings

# Fixtures für die Tests
@pytest.fixture
def cache_service():
    """Erstellt eine Instanz des CacheService für Tests."""
    service = CacheService()
    # Redis für Tests deaktivieren
    service.redis_enabled = False
    return service

@pytest.fixture
def mock_redis_client():
    """Erstellt einen Mock für den Redis-Client."""
    mock_client = AsyncMock()
    mock_client.get.return_value = None
    mock_client.setex.return_value = True
    mock_client.delete.return_value = 1
    mock_client.scan.return_value = (0, [])
    mock_client.ping.return_value = True
    mock_client.info.return_value = {
        "used_memory_human": "1MB",
        "connected_clients": 1,
        "uptime_in_days": 1
    }
    return mock_client

@pytest.fixture
def redis_cache_service(mock_redis_client):
    """Erstellt eine Instanz des CacheService mit Mock-Redis-Client."""
    service = CacheService()
    service.redis_enabled = True
    service.redis_client = mock_redis_client
    return service

@pytest.fixture
def sample_documents():
    """Beispieldokumente für Cache-Tests."""
    return [
        {
            "id": "doc1",
            "text": "Dies ist ein Testdokument.",
            "metadata": {"source_name": "Test Quelle"},
            "score": 0.9
        },
        {
            "id": "doc2",
            "text": "Dies ist ein weiteres Testdokument.",
            "metadata": {"source_name": "Test Quelle 2"},
            "score": 0.8
        }
    ]

@pytest.fixture
def sample_response():
    """Beispielantwort für Cache-Tests."""
    return {
        "answer": "Dies ist eine Testantwort.",
        "confidence": 0.95,
        "processing_time": 0.5,
        "model": "test-model"
    }

# Tests für die grundlegende Cache-Funktionalität
class TestCacheService:
    """Tests für die grundlegende Cache-Funktionalität."""

    def test_init(self, cache_service):
        """Test für die Initialisierung des CacheService."""
        assert cache_service.memory_cache is not None
        assert cache_service.redis_enabled is False
        assert cache_service.cache_ttl > 0
        assert "hits" in cache_service.stats
        assert "misses" in cache_service.stats

    def test_generate_cache_key(self, cache_service):
        """Test für die _generate_cache_key-Methode."""
        query = "Testanfrage"
        context_hash = "123456"
        params = {"model": "test-model"}
        
        key1 = cache_service._generate_cache_key(query, context_hash, params)
        key2 = cache_service._generate_cache_key(query, context_hash, params)
        
        # Gleiche Eingabe sollte den gleichen Schlüssel erzeugen
        assert key1 == key2
        
        # Unterschiedliche Eingabe sollte unterschiedliche Schlüssel erzeugen
        key3 = cache_service._generate_cache_key("AndereAnfrage", context_hash, params)
        assert key1 != key3

    def test_hash_documents(self, cache_service, sample_documents):
        """Test für die _hash_documents-Methode."""
        hash1 = cache_service._hash_documents(sample_documents)
        hash2 = cache_service._hash_documents(sample_documents)
        
        # Gleiche Dokumente sollten den gleichen Hash erzeugen
        assert hash1 == hash2
        
        # Unterschiedliche Dokumente sollten unterschiedliche Hashes erzeugen
        modified_docs = sample_documents.copy()
        modified_docs[0]["text"] = "Geänderter Text"
        hash3 = cache_service._hash_documents(modified_docs)
        assert hash1 != hash3

    @pytest.mark.asyncio
    async def test_memory_cache_operations(self, cache_service, sample_documents, sample_response):
        """Test für Memory-Cache-Operationen (get_from_cache, add_to_cache)."""
        query = "Testanfrage"
        params = {"model": "test-model"}
        
        # Anfänglich sollte keine Antwort im Cache sein
        result = await cache_service.get_from_cache(query, sample_documents, params)
        assert result is None
        assert cache_service.stats["misses"] == 1
        
        # Antwort zum Cache hinzufügen
        await cache_service.add_to_cache(query, sample_documents, sample_response, params)
        
        # Jetzt sollte die Antwort im Cache sein
        result = await cache_service.get_from_cache(query, sample_documents, params)
        assert result is not None
        assert result["answer"] == sample_response["answer"]
        assert cache_service.stats["hits"] == 1
        
        # Cache-Eintrag invalidieren
        await cache_service.invalidate_cache(query=query)
        
        # Nach Invalidierung sollte keine Antwort im Cache sein
        result = await cache_service.get_from_cache(query, sample_documents, params)
        assert result is None
        assert cache_service.stats["misses"] == 2

    @pytest.mark.asyncio
    async def test_clear_all_cache(self, cache_service, sample_documents, sample_response):
        """Test für die clear_all_cache-Methode."""
        query1 = "Testanfrage 1"
        query2 = "Testanfrage 2"
        params = {"model": "test-model"}
        
        # Zwei Antworten zum Cache hinzufügen
        await cache_service.add_to_cache(query1, sample_documents, sample_response, params)
        await cache_service.add_to_cache(query2, sample_documents, sample_response, params)
        
        # Beide Antworten sollten im Cache sein
        assert await cache_service.get_from_cache(query1, sample_documents, params) is not None
        assert await cache_service.get_from_cache(query2, sample_documents, params) is not None
        
        # Cache leeren
        await cache_service.clear_all_cache()
        
        # Nach dem Leeren sollten keine Antworten im Cache sein
        assert await cache_service.get_from_cache(query1, sample_documents, params) is None
        assert await cache_service.get_from_cache(query2, sample_documents, params) is None
        
        # Statistiken sollten zurückgesetzt sein
        assert cache_service.stats["hits"] == 0
        assert cache_service.stats["misses"] > 0  # Mindestens die zwei Abfragen nach dem Leeren


# Tests für Redis-Cache-Funktionalität
class TestRedisCacheService:
    """Tests für die Redis-Cache-Funktionalität."""
    
    @pytest.mark.asyncio
    async def test_redis_init(self, mock_redis_client):
        """Test für die Redis-Initialisierung."""
        with patch('redis.asyncio.Redis.from_url', return_value=mock_redis_client):
            service = CacheService()
            service.redis_enabled = True
            await service._init_redis()
            
            assert service.redis_client is not None
            mock_redis_client.ping.assert_called_once()

    @pytest.mark.asyncio
    async def test_redis_get_from_cache(self, redis_cache_service, sample_documents, sample_response):
        """Test für die get_from_cache-Methode mit Redis."""
        query = "Testanfrage"
        params = {"model": "test-model"}
        
        # Mock für Redis get-Methode konfigurieren
        redis_cache_service.redis_client.get.return_value = json.dumps(sample_response)
        
        # Antwort aus Redis abrufen
        result = await redis_cache_service.get_from_cache(query, sample_documents, params)
        
        # Redis get sollte aufgerufen worden sein
        redis_cache_service.redis_client.get.assert_called_once()
        
        # Ergebnis sollte korrekt sein
        assert result is not None
        assert result["answer"] == sample_response["answer"]
        assert redis_cache_service.stats["hits"] == 1

    @pytest.mark.asyncio
    async def test_redis_add_to_cache(self, redis_cache_service, sample_documents, sample_response):
        """Test für die add_to_cache-Methode mit Redis."""
        query = "Testanfrage"
        params = {"model": "test-model"}
        
        # Antwort zum Redis-Cache hinzufügen
        await redis_cache_service.add_to_cache(query, sample_documents, sample_response, params)
        
        # Redis setex sollte aufgerufen worden sein
        redis_cache_service.redis_client.setex.assert_called_once()
        
        # Prüfen, ob die richtigen Parameter übergeben wurden
        args, kwargs = redis_cache_service.redis_client.setex.call_args
        assert len(args) == 3
        assert args[1] == redis_cache_service.cache_ttl
        
        # JSON-String dekodieren und prüfen
        decoded = json.loads(args[2])
        assert decoded["answer"] == sample_response["answer"]

    @pytest.mark.asyncio
    async def test_redis_invalidate_cache(self, redis_cache_service):
        """Test für die invalidate_cache-Methode mit Redis."""
        query = "Testanfrage"
        
        # Cache-Eintrag invalidieren
        await redis_cache_service.invalidate_cache(query=query)
        
        # Redis delete sollte aufgerufen worden sein
        redis_cache_service.redis_client.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_redis_clear_all_cache(self, redis_cache_service):
        """Test für die clear_all_cache-Methode mit Redis."""
        # Mock für Redis scan-Methode konfigurieren
        redis_cache_service.redis_client.scan.return_value = (0, ["llm:cache:key1", "llm:cache:key2"])
        
        # Gesamten Cache leeren
        await redis_cache_service.clear_all_cache()
        
        # Redis scan und delete sollten aufgerufen worden sein
        redis_cache_service.redis_client.scan.assert_called_once()
        redis_cache_service.redis_client.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_cache_stats(self, redis_cache_service):
        """Test für die get_cache_stats-Methode mit Redis."""
        # Statistiken abrufen
        stats = await redis_cache_service.get_cache_stats()
        
        # Redis info sollte aufgerufen worden sein
        redis_cache_service.redis_client.info.assert_called_once()
        
        # Statistiken sollten die erwarteten Felder enthalten
        assert "hits" in stats
        assert "misses" in stats
        assert "redis_info" in stats
        assert "used_memory_human" in stats["redis_info"]

    @pytest.mark.asyncio
    async def test_redis_error_handling(self, redis_cache_service, sample_documents):
        """Test für die Fehlerbehandlung von Redis-Operationen."""
        query = "Testanfrage"
        
        # Mock für Redis-Fehler konfigurieren
        redis_cache_service.redis_client.get.side_effect = Exception("Redis-Verbindungsfehler")
        
        # Trotz Redis-Fehler sollte die Methode keine Exception werfen
        result = await redis_cache_service.get_from_cache(query, sample_documents)
        
        # Das Ergebnis sollte None sein (Cache-Miss)
        assert result is None
        assert redis_cache_service.stats["misses"] == 1


# Tests für die Factory-Funktion
@pytest.mark.asyncio
async def test_get_cache_service():
    """Test für die get_cache_service-Factory-Funktion."""
    with patch('nexus_backend.services.cache_service.CacheService') as mock_service_class:
        # Mock-Instanz erstellen
        mock_service = AsyncMock()
        mock_service_class.return_value = mock_service
        
        # Factory-Funktion aufrufen
        service1 = await get_cache_service()
        service2 = await get_cache_service()
        
        # CacheService sollte nur einmal erstellt werden (Singleton)
        mock_service_class.assert_called_once()
        
        # Beide Aufrufe sollten dieselbe Instanz zurückgeben
        assert service1 is service2 