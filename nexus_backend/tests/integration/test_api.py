import pytest
import requests
import json
import time

API_URL = "http://localhost:80"  # NGINX-Port, der auf die Backend-Services weiterleitet

@pytest.fixture(scope="module")
def auth_token():
    # Hier würde normalerweise ein echter Login erfolgen
    # Für Testzwecke verwenden wir einen Dummy-Token
    return "test_token"

def test_health_check():
    """Test, ob der Health-Check-Endpunkt korrekt funktioniert."""
    response = requests.get(f"{API_URL}/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_search_endpoint(auth_token):
    """Test, ob der Search-Endpunkt korrekt funktioniert."""
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "query": "Test Suchanfrage",
        "limit": 5
    }
    response = requests.post(f"{API_URL}/api/search", headers=headers, json=payload)
    assert response.status_code == 200
    assert "results" in response.json()

def test_analyze_endpoint(auth_token):
    """Test, ob der Analyze-Endpunkt mit Mistral korrekt funktioniert."""
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "request_id": "test_id_123",
        "payload": "Dies ist ein Testtext für die Mistral-API."
    }
    response = requests.post(f"{API_URL}/api/analyze", headers=headers, json=payload)
    assert response.status_code == 200
    # Je nach Implementierung können wir hier weitere Assertions hinzufügen

def test_caching_performance():
    """Test, ob das Caching korrekt funktioniert und die Performance verbessert."""
    headers = {"Authorization": f"Bearer {auth_token()}"}
    payload = {
        "request_id": "cache_test_id",
        "payload": "Dies ist ein Text für den Caching-Test."
    }
    
    # Erste Anfrage (sollte langsamer sein)
    start_time = time.time()
    first_response = requests.post(f"{API_URL}/api/analyze", headers=headers, json=payload)
    first_request_time = time.time() - start_time
    
    # Zweite Anfrage (sollte aus dem Cache kommen und schneller sein)
    start_time = time.time()
    second_response = requests.post(f"{API_URL}/api/analyze", headers=headers, json=payload)
    second_request_time = time.time() - start_time
    
    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert second_request_time < first_request_time  # Die zweite Anfrage sollte schneller sein 