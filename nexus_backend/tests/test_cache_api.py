"""
Tests für die Cache-API des Nexus-Backends.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import status

from ..app import app
from ..services.cache_service import CacheService, get_cache_service
from ..config import settings

# Test-Client für die FastAPI-Anwendung
@pytest.fixture
def test_client():
    """Test-Client für die FastAPI-Anwendung."""
    return TestClient(app)

# Mock für den Cache-Service
@pytest.fixture
def mock_cache_service():
    """Mock für den Cache-Service."""
    cache_service = AsyncMock(spec=CacheService)
    
    # Methoden-Mocks
    cache_service.get_cache_stats.return_value = {
        "hits": 10,
        "misses": 5,
        "hit_ratio": 0.67,
        "uptime_seconds": 3600,
        "memory_cache_size": 15,
        "redis_enabled": True,
        "redis_info": {
            "used_memory_human": "1MB",
            "connected_clients": 1,
            "uptime_in_days": 1
        }
    }
    cache_service.clear_all_cache = AsyncMock()
    
    return cache_service

# Tests für die Cache-API-Endpunkte
class TestCacheAPI:
    """Tests für die Cache-API-Endpunkte."""
    
    def test_cache_api_unauthorized(self, test_client):
        """Test für nicht autorisierten Zugriff auf die Cache-API."""
        # API-Keys aktivieren für den Test
        original_api_keys = settings.API_KEYS
        settings.API_KEYS = ["test-api-key"]
        
        try:
            # Versuch, ohne API-Key auf die Statistiken zuzugreifen
            response = test_client.get("/api/cache/stats")
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Ungültiger API-Key" in response.text
            
            # Versuch, ohne API-Key den Cache zu leeren
            response = test_client.post("/api/cache/clear")
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Ungültiger API-Key" in response.text
            
        finally:
            # API-Keys zurücksetzen
            settings.API_KEYS = original_api_keys
    
    def test_get_cache_stats(self, test_client, mock_cache_service):
        """Test für den Abruf von Cache-Statistiken."""
        # API-Keys deaktivieren für vereinfachte Tests
        original_api_keys = settings.API_KEYS
        settings.API_KEYS = []
        
        try:
            with patch('nexus_backend.api.cache.get_cache_service', return_value=mock_cache_service):
                response = test_client.get("/api/cache/stats")
                
                # Response prüfen
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                
                # Struktur prüfen
                assert "status" in data
                assert data["status"] == "success"
                assert "stats" in data
                
                # Inhalt prüfen
                stats = data["stats"]
                assert stats["hits"] == 10
                assert stats["misses"] == 5
                assert stats["hit_ratio"] == 0.67
                assert "redis_info" in stats
                
                # CacheService-Methode sollte aufgerufen worden sein
                mock_cache_service.get_cache_stats.assert_called_once()
        
        finally:
            # API-Keys zurücksetzen
            settings.API_KEYS = original_api_keys
    
    def test_clear_cache(self, test_client, mock_cache_service):
        """Test für das Leeren des Caches."""
        # API-Keys deaktivieren für vereinfachte Tests
        original_api_keys = settings.API_KEYS
        settings.API_KEYS = []
        
        try:
            with patch('nexus_backend.api.cache.get_cache_service', return_value=mock_cache_service):
                response = test_client.post("/api/cache/clear")
                
                # Response prüfen
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                
                # Struktur und Inhalt prüfen
                assert "status" in data
                assert data["status"] == "success"
                assert "message" in data
                assert "erfolgreich gelöscht" in data["message"]
                
                # CacheService-Methode sollte aufgerufen worden sein
                mock_cache_service.clear_all_cache.assert_called_once()
        
        finally:
            # API-Keys zurücksetzen
            settings.API_KEYS = original_api_keys
    
    def test_cache_api_with_valid_api_key(self, test_client, mock_cache_service):
        """Test für autorisierten Zugriff auf die Cache-API mit gültigem API-Key."""
        # API-Keys aktivieren für den Test
        original_api_keys = settings.API_KEYS
        settings.API_KEYS = ["test-api-key"]
        
        try:
            with patch('nexus_backend.api.cache.get_cache_service', return_value=mock_cache_service):
                # Mit gültigem API-Key auf die Statistiken zugreifen
                response = test_client.get(
                    "/api/cache/stats",
                    headers={"X-API-Key": "test-api-key"}
                )
                assert response.status_code == status.HTTP_200_OK
                
                # Mit gültigem API-Key den Cache leeren
                response = test_client.post(
                    "/api/cache/clear",
                    headers={"X-API-Key": "test-api-key"}
                )
                assert response.status_code == status.HTTP_200_OK
        
        finally:
            # API-Keys zurücksetzen
            settings.API_KEYS = original_api_keys
    
    def test_cache_api_with_invalid_api_key(self, test_client):
        """Test für nicht autorisierten Zugriff auf die Cache-API mit ungültigem API-Key."""
        # API-Keys aktivieren für den Test
        original_api_keys = settings.API_KEYS
        settings.API_KEYS = ["test-api-key"]
        
        try:
            # Mit ungültigem API-Key auf die Statistiken zugreifen
            response = test_client.get(
                "/api/cache/stats",
                headers={"X-API-Key": "invalid-api-key"}
            )
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            
            # Mit ungültigem API-Key den Cache leeren
            response = test_client.post(
                "/api/cache/clear",
                headers={"X-API-Key": "invalid-api-key"}
            )
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        finally:
            # API-Keys zurücksetzen
            settings.API_KEYS = original_api_keys 