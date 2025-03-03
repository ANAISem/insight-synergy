# Nexus Knowledge Backend

Ein Backend-System für semantische Suche und Knowledge Management mit Vector-DB und Retrieval-Augmented Generation (RAG).

## Überblick

Das Nexus Knowledge Backend ist eine leistungsstarke Plattform für die Verwaltung und Abfrage von Wissen mit Hilfe moderner KI-Technologien. Das System kombiniert Vektordatenbanken für semantische Suche mit LLM-basierter Antwortgenerierung (RAG) und bietet eine flexible API für die Integration in verschiedene Anwendungsfälle.

### Hauptfunktionen

- 🔍 **Semantische Suche**: Finde relevante Dokumente basierend auf dem Bedeutungskontext, nicht nur auf Schlüsselwörtern
- 📚 **Wissensdatenverwaltung**: Speichere, aktualisiere und kategorisiere Dokumente in einer Vektordatenbank
- 🤖 **LLM-Integration**: Generiere präzise Antworten auf Fragen basierend auf dem gespeicherten Wissen
- 🔄 **RAG-Pipeline**: Kombiniere Retrieval und Generierung für faktenbasierte Antworten
- 🌐 **REST-API**: Einfache Integration in bestehende Systeme
- 📡 **WebSocket-Support**: Echtzeit-Streaming von LLM-Antworten und Systemmetriken

## Technologie-Stack

- **FastAPI**: Moderne, schnelle API mit automatischer Dokumentation
- **WebSockets**: Echtzeit-Kommunikation für Streaming-Antworten
- **ChromaDB**: Vektordatenbank für die effiziente Speicherung und Abfrage von Embeddings
- **Sentence-Transformers**: Hochwertige Text-Embeddings für semantische Ähnlichkeit
- **LangChain**: Framework für die Nutzung von LLMs in einer anwendungsorientierten Pipeline
- **OpenAI, HuggingFace & Mistral**: Unterstützung für verschiedene LLM-Anbieter

## Installation

### Voraussetzungen

- Python 3.9 oder höher
- pip (Python-Paketmanager)
- Virtuelle Umgebung (empfohlen)

### Einrichtung

1. Repository klonen:
   ```bash
   git clone https://github.com/yourusername/nexus-backend.git
   cd nexus-backend
   ```

2. Virtuelle Umgebung erstellen und aktivieren:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # oder
   venv\Scripts\activate  # Windows
   ```

3. Abhängigkeiten installieren:
   ```bash
   pip install -r requirements.txt
   ```

4. Umgebungsvariablen konfigurieren:
   ```bash
   cp .env.example .env
   # Bearbeite die .env-Datei mit deinen Einstellungen
   ```

## Verwendung

### Server starten

```bash
python main.py
```

Optionen:
- `--host`: Host-Adresse (Standard: 0.0.0.0)
- `--port`: Port (Standard: 8000)
- `--reload`: Auto-Reload bei Codeänderungen aktivieren
- `--debug`: Debug-Modus aktivieren
- `--workers`: Anzahl der Worker-Prozesse (Standard: 1)

### API-Endpunkte

Nach dem Start steht die API-Dokumentation unter:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

Hauptendpunkte:

- **Dokumente**:
  - `POST /api/documents`: Dokument erstellen
  - `GET /api/documents/{doc_id}`: Dokument abrufen
  - `PUT /api/documents/{doc_id}`: Dokument aktualisieren
  - `DELETE /api/documents/{doc_id}`: Dokument löschen
  - `GET /api/documents`: Dokumente auflisten
  - `POST /api/documents/batch`: Batch-Upload

- **Suche**:
  - `POST /api/search`: Semantische Suche
  - `POST /api/knowledge`: RAG-basierte Wissensabfrage

- **WebSockets**:
  - `WS /api/ws/knowledge`: Streaming-Wissensabfragen
  - `WS /api/ws/metrics`: Echtzeit-Systemmetriken

- **System**:
  - `GET /api/health`: Gesundheitszustand des Systems prüfen
  - `GET /api/metrics`: Systemmetriken abrufen
  - `GET /static/websocket_demo.html`: WebSocket-Demo-Interface

### WebSocket-Demo

Das System bietet eine integrierte WebSocket-Demo-Seite, die du unter `http://localhost:8000/static/websocket_demo.html` aufrufen kannst. Diese Demo zeigt:

1. Echtzeit-Systemmetriken (CPU, Speicher, aktive Verbindungen)
2. RAG-basierte Wissensabfragen mit Token-Streaming
3. Quellenangaben für generierte Antworten

### Beispielanfragen

#### Dokument hinzufügen

```bash
curl -X POST "http://localhost:8000/api/documents" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Berlin ist die Hauptstadt von Deutschland.",
    "metadata": {
      "source_type": "document",
      "source_name": "Geographie-Lexikon",
      "tags": ["geographie", "deutschland"]
    }
  }'
```

#### Semantische Suche

```bash
curl -X POST "http://localhost:8000/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Was ist die Hauptstadt von Deutschland?",
    "max_results": 3
  }'
```

#### WebSocket-Wissensabfrage (JavaScript)

```javascript
// WebSocket-Verbindung herstellen
const ws = new WebSocket("ws://localhost:8000/api/ws/knowledge");

// Nachricht senden, wenn Verbindung geöffnet ist
ws.onopen = function() {
  const query = {
    type: "query",
    data: {
      query: "Beschreibe Berlin.",
      max_context_docs: 5
    }
  };
  ws.send(JSON.stringify(query));
};

// Antwort empfangen
ws.onmessage = function(event) {
  const message = JSON.parse(event.data);
  
  if (message.type === "token") {
    // Einzelnes Token der Antwort anzeigen (Streaming)
    process.stdout.write(message.data.token);
  } else if (message.type === "answer_complete") {
    // Vollständige Antwort mit Metadaten
    console.log("\n\nAntwort vollständig:", message.data);
  }
};
```

## Architektur

Das System ist modular aufgebaut und besteht aus mehreren Komponenten:

1. **API-Layer**: FastAPI-Anwendung mit REST- und WebSocket-Endpunkten
2. **Service-Layer**: Kernfunktionalitäten für Vektordatenbank und LLM-Integration
3. **Datenmodelle**: Pydantic-Modelle für API-Anfragen und -Antworten
4. **WebSocket-Manager**: Verwaltung von Echtzeit-Verbindungen und Streaming
5. **Konfiguration**: Einstellungen und Umgebungsvariablen
6. **Logging**: Umfassende Protokollierung für Debugging und Monitoring

## LLM-Konfiguration

### OpenAI

Das System unterstützt standardmäßig OpenAI-Modelle. Konfiguriere sie in der `.env`-Datei:

```
LLM_PROVIDER=openai
LLM_MODEL_NAME=gpt-3.5-turbo
OPENAI_API_KEY=your-api-key
```

### Mistral & HuggingFace

Für Mistral oder andere HuggingFace-Modelle:

```
LLM_PROVIDER=huggingface
LLM_MODEL_NAME=mistralai/Mixtral-8x7B-Instruct-v0.1
HUGGINGFACE_API_KEY=your-api-key
```

Für Mistral über die HuggingFace Inference API:

```
LLM_PROVIDER=huggingface
LLM_MODEL_NAME=mistralai/Mixtral-8x7B-Instruct-v0.1
HUGGINGFACE_API_KEY=your-api-key
HUGGINGFACE_INFERENCE_ENDPOINT=https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1
```

### Lokale LLMs

Für lokale Modelle mit Ollama:

```
LLM_PROVIDER=local
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL_NAME=mistral
```

Oder mit llama.cpp:

```
LLM_PROVIDER=local
USE_LLAMACPP=true
LLAMACPP_MODEL_PATH=/path/to/your/model.gguf
```

## WebSocket-Protokoll

### Verbindung zum Knowledge-WebSocket

Der Client stellt eine Verbindung zu `ws://host:port/api/ws/knowledge` her.

### Nachrichten-Typen (Client → Server)

1. **Query-Anfrage**:
   ```json
   {
     "type": "query",
     "data": {
       "query": "Deine Frage hier",
       "max_context_docs": 5,
       "filter_criteria": { "optional": "filter" }
     }
   }
   ```

2. **Ping-Anfrage**:
   ```json
   {
     "type": "ping"
   }
   ```

### Nachrichten-Typen (Server → Client)

1. **Verbindung bestätigt**:
   ```json
   {
     "type": "connection_established",
     "data": {
       "connection_id": "conn_123",
       "message": "Verbindung hergestellt."
     }
   }
   ```

2. **Token-Streaming** (wird für jeden Token gesendet):
   ```json
   {
     "type": "token",
     "data": {
       "token": "Teil"
     }
   }
   ```

3. **Vollständige Antwort**:
   ```json
   {
     "type": "answer_complete",
     "data": {
       "query": "Original-Anfrage",
       "answer": "Vollständige Antwort",
       "citations": [...],
       "confidence": 0.95,
       "processing_time_ms": 1250,
       "context_docs_count": 3
     }
   }
   ```

## Best Practices

- **Datenqualität**: Die Qualität der gespeicherten Dokumente beeinflusst maßgeblich die Qualität der Suche und Antwortgenerierung.
- **Chunking**: Für optimale Ergebnisse sollten große Dokumente in kleinere Chunks aufgeteilt werden.
- **Metadata**: Nutze Metadaten für die Filterung und Organisation von Dokumenten.
- **WebSocket-Timeouts**: Achte auf angemessene Timeouts für WebSocket-Verbindungen, besonders bei langsamen LLMs.
- **LLM-Caching**: Aktiviere Caching für häufige Anfragen, um API-Kosten zu reduzieren.

## Roadmap

- [x] WebSocket-Support für Streaming-Antworten
- [x] Mistral und lokale LLM-Integration
- [ ] Benutzerauthentifizierung und -autorisierung
- [ ] Automatische Textextraktion aus verschiedenen Dateiformaten
- [ ] Erweiterte Filterung und Facettensuche
- [ ] Feinabstimmung der LLM-Modelle auf spezifische Domänen
- [ ] Automatisierte Tests und CI/CD-Pipeline

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe [LICENSE](LICENSE) für Details.

## Kontakt

Bei Fragen oder Beiträgen zum Projekt erstelle bitte ein Issue oder eine Pull-Request im Repository. 