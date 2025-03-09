# Nexus Backend

Backend-Server für die Insight Synergy Anwendung.

## Installation

```bash
# Abhängigkeiten installieren
pip install -r requirements.txt

# .env-Datei erstellen (aus .env.example kopieren)
cp .env.example .env

# API-Keys eintragen
# Öffne .env und füge deine API-Keys ein:
# PERPLEXITY_API_KEY=dein_api_key
# OPENAI_API_KEY=dein_api_key
```

## Konfiguration

Die Konfiguration erfolgt über die `.env`-Datei:

- **PORT**: Port für den Backend-Server (Standard: 3000)
- **PERPLEXITY_MODEL**: Das zu verwendende Perplexity-Modell (Standard: sonar-deep-research)
- **PRIMARY_MODEL**: Das primäre OpenAI-Modell (Standard: gpt-o1-mini)
- **FALLBACK_MODEL**: Das Fallback-OpenAI-Modell (Standard: gpt-4o-mini)

## Starten des Backends

```bash
# Starten des Backends
cd nexus_backend
python -m app.main
```

## Starten des Insight Synergy Core (für Fallback)

Der Insight Synergy Core ist ein lokales System, das als Fallback verwendet wird, wenn die OpenAI-Modelle nicht verfügbar sind.

```bash
# Navigiere zum Hauptverzeichnis
cd ..

# Starte den Insight Synergy Core
cd src
npm run start-core
```

## API-Endpunkte

Das Backend bietet die folgenden API-Endpunkte:

### Nexus-Endpunkte

- `POST /api/nexus/solution` - Generiert eine Lösung für ein Problem
- `POST /api/nexus/analyze` - Analysiert ein Problem
- `GET /api/nexus/status` - Prüft den Status des Nexus-Services

### Such-Endpunkte

- `GET /api/search` - Sucht nach Dokumenten
- `GET /api/search/suggestions` - Generiert Suchvorschläge

### Wissens-Endpunkte

- `POST /api/knowledge/query` - Führt eine Wissensabfrage durch

### Dokument-Endpunkte

- `POST /api/documents` - Erstellt ein neues Dokument
- `GET /api/documents` - Ruft Dokumente ab
- `GET /api/documents/{document_id}` - Ruft ein Dokument ab

## Verbindung mit dem Frontend

Das Frontend verbindet sich automatisch mit dem Backend, solange der Backend-Server auf Port 3000 läuft. Der Port ist in der Frontend-Konfiguration auf Port 3000 festgelegt (siehe `nexus_frontend/lib/core/constants/api_constants.dart`).

```dart
static const String baseUrl = 'http://localhost:3000';
``` 