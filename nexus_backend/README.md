# Nexus Backend

Ein wissensbasiertes Backend-System für semantische Suche, Wissensextraktion und strukturierte Antwortgenerierung.

## Features

- Vector-Datenbank für semantische Suche
- Wissensextraktions-Pipeline für verschiedene Dokumententypen
- Prompt-Template-System für Wissensabfragen
- API-Endpunkte für Wissenssuche und -speicherung
- Lösungsgenerator mit strukturierter Antwortgenerierung
- Quellenverwaltung und Zitationssystem
- Zweistufiges Cache-System (Memory + Redis) für optimierte Antwortzeiten
- WebSocket-Unterstützung für Echtzeit-Token-Streaming und System-Metriken
- Authentifizierung mit API-Keys für sichere Zugriffssteuerung

## Installation

1. Python-Umgebung einrichten (Python 3.9+ empfohlen):

```bash
python -m venv venv
source venv/bin/activate  # Unter Windows: venv\Scripts\activate
```

2. Abhängigkeiten installieren:

```bash
pip install -r requirements.txt
```

3. Umgebungsvariablen konfigurieren:

Erstelle eine `.env`-Datei im Hauptverzeichnis mit folgenden Variablen:

```
OPENAI_API_KEY=your_openai_api_key
VECTOR_DB_PATH=./data/vector_db
KNOWLEDGE_BASE_PATH=./data/knowledge_base
REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379/0
CACHE_TTL=86400
API_KEYS=key1,key2,key3
```

## Entwicklung

Starte den Entwicklungsserver:

```bash
cd nexus_backend
uvicorn api.main:app --reload
```

## Projektstruktur

```
nexus_backend/
├── api/                # FastAPI Endpunkte
│   ├── cache.py        # Cache-Management API
│   ├── documents.py    # Dokumenten-API
│   ├── health.py       # Gesundheits-Check-API
│   ├── search.py       # Such-API
│   └── websocket.py    # WebSocket-API für Streaming
├── config/             # Konfiguration und Einstellungen
├── db/                 # Vektordatenbank und SQL-DB-Modelle
├── docs/               # Dokumentation
│   └── cache_system.md # Cache-System-Dokumentation
├── extractors/         # Dokumentenextraktion und -verarbeitung
├── models/             # Pydantic-Modelle und Output-Parser
├── services/           # Backend-Services
│   ├── cache_service.py # Cache-Service für LLM-Antworten
│   ├── llm_service.py   # LLM-Integrationsservice
│   └── vector_db.py     # Vektordatenbank-Service
├── static/             # Statische Dateien (z.B. WebSocket-Demo)
├── utils/              # Hilfsfunktionen
└── tests/              # Automatisierte Tests
    ├── test_cache_api.py     # Tests für Cache-API
    ├── test_cache_service.py # Tests für Cache-Service
    └── test_websocket.py     # Tests für WebSocket-Funktionalität
```

## Nutzung

Nach dem Start des Servers sind folgende Endpunkte verfügbar:

- `GET /api/docs`: Swagger-Dokumentation
- `POST /api/knowledge/search`: Semantische Suche in der Wissensdatenbank
- `POST /api/knowledge/store`: Neue Dokumente zur Wissensdatenbank hinzufügen
- `POST /api/knowledge/query`: Wissensabfrage mit strukturierter Antwort
- `WS /api/ws/knowledge`: WebSocket für Streaming-Wissensabfragen
- `WS /api/ws/metrics`: WebSocket für System-Metriken
- `GET /api/cache/stats`: Cache-Statistiken abrufen (erfordert API-Key)
- `POST /api/cache/clear`: Cache leeren (erfordert API-Key)

## Cache-System

Das Nexus-Backend verwendet ein zweistufiges Cache-System für optimierte Antwortzeiten:

- **Memory-Cache**: Schneller In-Memory-LRU-Cache für häufig abgefragte Antworten
- **Redis-Cache** (optional): Persistenter Cache für dauerhafte Speicherung und Instanzübergreifende Nutzung

Das Cache-System kann über Umgebungsvariablen konfiguriert werden. Weitere Informationen finden Sie in der [Cache-System-Dokumentation](docs/cache_system.md).

## WebSocket-Support

Das System unterstützt WebSocket-Verbindungen für:

- **Token-Streaming**: Antworten werden Token für Token in Echtzeit übertragen
- **System-Metriken**: Überwachung von CPU, Speicher und anderen Systemressourcen
- **Heartbeat und Reconnect**: Automatische Wiederverbindung bei Netzwerkproblemen

Eine einfache WebSocket-Demo ist unter `/static/websocket_demo.html` verfügbar.

## Fehlerbehebung

### Redis-Cache

Bei Problemen mit dem Redis-Cache:

1. Überprüfen Sie, ob Redis läuft: `redis-cli ping`
2. Stellen Sie sicher, dass die Redis-URL korrekt ist
3. Deaktivieren Sie Redis temporär: `REDIS_ENABLED=false`

### API-Keys

Bei Authentifizierungsproblemen:

1. Überprüfen Sie, ob der API-Key im `X-API-Key`-Header übergeben wird
2. Stellen Sie sicher, dass der verwendete Key in den `API_KEYS` konfiguriert ist

## Lizenz

Copyright © 2025 