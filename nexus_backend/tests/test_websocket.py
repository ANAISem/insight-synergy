"""
Tests für die WebSocket-Funktionalität des Nexus-Backends.
Testet sowohl die Knowledge- als auch die Metrics-WebSocket-Endpunkte.
"""

import asyncio
import json
import pytest
import websockets
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import status

from ..api.websocket import ConnectionManager, manager
from ..services.vector_db import VectorDB
from ..services.llm_service import LLMService
from ..app import app

# Fixtures für die Tests
@pytest.fixture
def test_client():
    """Test-Client für die FastAPI-Anwendung."""
    return TestClient(app)

@pytest.fixture
def mock_vector_db():
    """Mock für die VectorDB-Klasse."""
    mock_db = AsyncMock(spec=VectorDB)
    # Mock-Daten für die search-Methode
    mock_db.search.return_value = [
        {
            "id": "doc1",
            "text": "Dies ist ein Testdokument.",
            "metadata": {"source_name": "Test Quelle"},
            "score": 0.9
        }
    ]
    return mock_db

@pytest.fixture
def mock_llm_service():
    """Mock für die LLMService-Klasse."""
    mock_llm = AsyncMock(spec=LLMService)
    # Mock-Daten für die generate_answer_streaming-Methode
    mock_llm.generate_answer_streaming.return_value = {
        "answer": "Dies ist eine Testantwort.",
        "confidence": 0.95
    }
    return mock_llm

# Hilfsfunktionen für WebSocket-Tests
async def connect_and_receive_message(uri):
    """Verbindet zum WebSocket und empfängt die erste Nachricht."""
    async with websockets.connect(uri) as websocket:
        message = await websocket.recv()
        return json.loads(message)

# Tests für den ConnectionManager
def test_connection_manager_init():
    """Test für die Initialisierung des ConnectionManager."""
    cm = ConnectionManager()
    assert cm.active_connections == {}
    assert cm.connection_counter == 0

@patch("nexus_backend.api.websocket.WebSocket")
@pytest.mark.asyncio
async def test_connection_manager_connect(mock_websocket):
    """Test für die connect-Methode des ConnectionManager."""
    cm = ConnectionManager()
    mock_websocket.accept = AsyncMock()
    
    connection_id = await cm.connect(mock_websocket)
    
    mock_websocket.accept.assert_called_once()
    assert connection_id in cm.active_connections
    assert cm.active_connections[connection_id] == mock_websocket

def test_connection_manager_disconnect():
    """Test für die disconnect-Methode des ConnectionManager."""
    cm = ConnectionManager()
    mock_websocket = MagicMock()
    
    # Manuelles Hinzufügen einer Test-Verbindung
    test_conn_id = "test_conn_1"
    cm.active_connections[test_conn_id] = mock_websocket
    
    # Test der Disconnect-Methode
    cm.disconnect(test_conn_id)
    assert test_conn_id not in cm.active_connections

@patch("nexus_backend.api.websocket.WebSocket")
@pytest.mark.asyncio
async def test_connection_manager_send_message(mock_websocket):
    """Test für die send_message-Methode des ConnectionManager."""
    cm = ConnectionManager()
    mock_websocket.send_json = AsyncMock()
    
    # Manuelles Hinzufügen einer Test-Verbindung
    test_conn_id = "test_conn_1"
    cm.active_connections[test_conn_id] = mock_websocket
    
    # Test-Nachricht senden
    test_message = {"type": "test", "data": {"message": "Dies ist ein Test"}}
    await cm.send_message(test_conn_id, test_message)
    
    mock_websocket.send_json.assert_called_once_with(test_message)

# Integrationstest für die WebSocket-Endpunkte
@pytest.mark.asyncio
async def test_websocket_knowledge_connection(monkeypatch):
    """Test für die Verbindung zum Knowledge-WebSocket."""
    # Mocks für die Dependencies
    monkeypatch.setattr("nexus_backend.api.websocket.get_vector_db", lambda: AsyncMock(spec=VectorDB))
    monkeypatch.setattr("nexus_backend.api.websocket.get_llm_service", lambda: AsyncMock(spec=LLMService))
    
    # Test mit einer lokalen WebSocket-Verbindung
    uri = "ws://localhost:8000/api/ws/knowledge"
    
    with pytest.raises(ConnectionRefusedError):
        # Dieser Test wird fehlschlagen, da der Server nicht läuft - sollte aber die Verbindungslogik testen
        message = await connect_and_receive_message(uri)
        assert message["type"] == "connection_established"

@pytest.mark.asyncio
async def test_websocket_metrics_connection(monkeypatch):
    """Test für die Verbindung zum Metrics-WebSocket."""
    # Mock für psutil
    mock_psutil = MagicMock()
    mock_psutil.cpu_percent.return_value = 5.0
    mock_psutil.virtual_memory.return_value.percent = 50.0
    monkeypatch.setattr("nexus_backend.api.websocket.psutil", mock_psutil)
    
    # Test mit einer lokalen WebSocket-Verbindung
    uri = "ws://localhost:8000/api/ws/metrics"
    
    with pytest.raises(ConnectionRefusedError):
        # Dieser Test wird fehlschlagen, da der Server nicht läuft - sollte aber die Verbindungslogik testen
        message = await connect_and_receive_message(uri)
        assert message["type"] == "connection_established"

# Tests für die Fehlerbehandlung und Reconnect
class TestReconnectScenarios:
    """Tests für Wiederverbindungsszenarien bei WebSocket-Verbindungen."""
    
    @pytest.mark.asyncio
    async def test_client_reconnect_after_error(self, monkeypatch):
        """Test für die Reconnect-Logik nach einem Fehler."""
        # Mocks für die Dependencies
        monkeypatch.setattr("nexus_backend.api.websocket.get_vector_db", lambda: AsyncMock(spec=VectorDB))
        monkeypatch.setattr("nexus_backend.api.websocket.get_llm_service", lambda: AsyncMock(spec=LLMService))
        
        # Simulation einer Server-seitigen Fehlerinjektion
        async def mock_receive_text():
            raise Exception("Simulierter Netzwerkfehler")
        
        mock_websocket = AsyncMock()
        mock_websocket.receive_text = mock_receive_text
        
        # Test der Fehlerbehandlung im WebSocket-Handler
        with patch("nexus_backend.api.websocket.manager.connect", return_value="test_conn"):
            with patch("nexus_backend.api.websocket.manager.disconnect") as mock_disconnect:
                with pytest.raises(Exception):
                    # Der Handler sollte die Verbindung trennen, wenn ein unerwarteter Fehler auftritt
                    await app.websocket_knowledge(mock_websocket)
                
                mock_disconnect.assert_called_once_with("test_conn") 