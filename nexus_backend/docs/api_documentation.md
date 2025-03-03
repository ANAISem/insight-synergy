# Nexus-Backend API-Dokumentation

Diese Dokumentation beschreibt die verfügbaren API-Endpunkte des Nexus-Backends für die Integration mit Frontend-Anwendungen.

## Basis-URL

```
http://localhost:8000/api
```

## Authentifizierung

Die API verwendet Token-basierte Authentifizierung. Um auf geschützte Endpunkte zuzugreifen, muss ein gültiger JWT-Token im Authorization-Header mitgesendet werden:

```
Authorization: Bearer <token>
```

### Login

```
POST /auth/login
```

**Request:**
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid-string",
    "username": "user@example.com",
    "full_name": "Max Mustermann"
  }
}
```

## Dokumente

### Neues Dokument erstellen

```
POST /documents
```

**Request:**
```json
{
  "content": "Dies ist der Inhalt des Dokuments.",
  "metadata": {
    "source_type": "document",
    "source_name": "Beispieldokument",
    "tags": ["beispiel", "dokument"],
    "language": "de"
  }
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "content": "Dies ist der Inhalt des Dokuments.",
  "metadata": {
    "source_type": "document",
    "source_name": "Beispieldokument",
    "tags": ["beispiel", "dokument"],
    "language": "de",
    "created_at": "2023-03-01T12:00:00Z",
    "updated_at": null,
    "confidence": null,
    "source_url": null
  },
  "vector_id": "chroma-vector-id"
}
```

### Batch-Upload von Dokumenten

```
POST /documents/batch
```

**Request:**
```json
{
  "documents": [
    {
      "content": "Dokument 1 Inhalt",
      "metadata": {
        "source_type": "document",
        "source_name": "Dokument 1"
      }
    },
    {
      "content": "Dokument 2 Inhalt",
      "metadata": {
        "source_type": "document",
        "source_name": "Dokument 2"
      }
    }
  ]
}
```

**Response:**
```json
{
  "total_documents": 2,
  "successful": 2,
  "failed": 0,
  "document_ids": ["uuid-1", "uuid-2"],
  "errors": []
}
```

### Dokument abfragen

```
GET /documents/{document_id}
```

**Response:**
```json
{
  "id": "uuid-string",
  "content": "Dies ist der Inhalt des Dokuments.",
  "metadata": {
    "source_type": "document",
    "source_name": "Beispieldokument",
    "tags": ["beispiel", "dokument"],
    "language": "de",
    "created_at": "2023-03-01T12:00:00Z",
    "updated_at": null,
    "confidence": null,
    "source_url": null
  },
  "vector_id": "chroma-vector-id"
}
```

### Dokument aktualisieren

```
PUT /documents/{document_id}
```

**Request:**
```json
{
  "content": "Aktualisierter Inhalt des Dokuments.",
  "metadata": {
    "source_type": "document",
    "source_name": "Aktualisiertes Beispieldokument",
    "tags": ["beispiel", "aktualisiert"],
    "language": "de"
  }
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "content": "Aktualisierter Inhalt des Dokuments.",
  "metadata": {
    "source_type": "document",
    "source_name": "Aktualisiertes Beispieldokument",
    "tags": ["beispiel", "aktualisiert"],
    "language": "de",
    "created_at": "2023-03-01T12:00:00Z",
    "updated_at": "2023-03-02T15:30:00Z",
    "confidence": null,
    "source_url": null
  },
  "vector_id": "chroma-vector-id"
}
```

### Dokument löschen

```
DELETE /documents/{document_id}
```

**Response:**
```json
{
  "success": true,
  "message": "Dokument erfolgreich gelöscht."
}
```

### Alle Dokumente abfragen

```
GET /documents?limit=20&offset=0&tag=beispiel
```

**Parameter:**
- `limit` (optional): Anzahl der zurückzugebenden Dokumente (Standard: 20)
- `offset` (optional): Offset für Pagination (Standard: 0)
- `tag` (optional): Filtern nach Tag
- `source_type` (optional): Filtern nach Quellentyp
- `language` (optional): Filtern nach Sprache

**Response:**
```json
{
  "total": 45,
  "offset": 0,
  "limit": 20,
  "documents": [
    {
      "id": "uuid-1",
      "content": "Inhalt des ersten Dokuments...",
      "metadata": { ... }
    },
    {
      "id": "uuid-2",
      "content": "Inhalt des zweiten Dokuments...",
      "metadata": { ... }
    },
    ...
  ]
}
```

## Suche

### Semantische Suche

```
POST /search
```

**Request:**
```json
{
  "query": "Was ist Vektorsuche?",
  "limit": 5,
  "filters": {
    "source_type": ["document", "website"],
    "tags": ["vektoren", "suche"],
    "min_confidence": 0.7
  }
}
```

**Response:**
```json
{
  "query": "Was ist Vektorsuche?",
  "results": [
    {
      "document_id": "uuid-1",
      "content": "Vektorsuche ist eine Methode zur Suche...",
      "metadata": { ... },
      "score": 0.92,
      "distance": 0.08
    },
    {
      "document_id": "uuid-2",
      "content": "Bei der Vektorsuche werden Texte in...",
      "metadata": { ... },
      "score": 0.85,
      "distance": 0.15
    },
    ...
  ],
  "total_results": 5,
  "execution_time_ms": 120
}
```

### Wissensgenerierung

```
POST /knowledge
```

**Request:**
```json
{
  "query": "Erkläre die Funktionsweise von semantischer Suche",
  "max_tokens": 500,
  "include_sources": true,
  "filters": {
    "min_confidence": 0.7
  }
}
```

**Response:**
```json
{
  "query": "Erkläre die Funktionsweise von semantischer Suche",
  "answer": "Semantische Suche funktioniert durch Umwandlung von Texten in numerische Vektoren...",
  "citations": [
    {
      "document_id": "uuid-1",
      "content_snippet": "...Texte werden in hochdimensionale Vektoren umgewandelt...",
      "metadata": { ... },
      "score": 0.92
    },
    {
      "document_id": "uuid-2",
      "content_snippet": "...ähnliche Vektoren werden durch geringen Abstand im Vektorraum repräsentiert...",
      "metadata": { ... },
      "score": 0.85
    }
  ],
  "execution_time_ms": 850
}
```

## WebSocket-API

Das Nexus-Backend bietet eine WebSocket-Schnittstelle für Echtzeitkommunikation.

### Verbindung herstellen

```
ws://localhost:8000/ws/chat?token=<jwt-token>
```

### Nachrichtenformat

**Client -> Server**
```json
{
  "type": "message",
  "content": "Wie funktioniert semantische Suche?",
  "session_id": "optional-session-id"
}
```

**Server -> Client**
```json
{
  "type": "message",
  "content": "Semantische Suche funktioniert durch...",
  "role": "assistant",
  "timestamp": "2023-03-01T12:34:56Z",
  "message_id": "msg-uuid"
}
```

### Stream-Nachrichten

**Server -> Client (Teilantworten bei langem Text)**
```json
{
  "type": "stream",
  "content": "Semantische ",
  "message_id": "msg-uuid",
  "done": false
}
```

```json
{
  "type": "stream",
  "content": "Suche funktioniert ",
  "message_id": "msg-uuid",
  "done": false
}
```

```json
{
  "type": "stream",
  "content": "durch...",
  "message_id": "msg-uuid",
  "done": true
}
```

## Gesundheitsstatus

### API-Status prüfen

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "components": {
    "vector_db": "ok",
    "llm_service": "ok",
    "database": "ok"
  },
  "uptime_seconds": 3600
}
```

## Fehlerbehandlung

Alle API-Endpunkte geben im Fehlerfall standardisierte Fehlermeldungen zurück:

```json
{
  "status": "error",
  "error_code": "document_not_found",
  "message": "Das angeforderte Dokument wurde nicht gefunden",
  "details": {
    "document_id": "requested-uuid"
  }
}
```

Häufige HTTP-Statuscodes:
- `400 Bad Request`: Ungültige Anfrageparameter
- `401 Unauthorized`: Fehlende oder ungültige Authentifizierung
- `403 Forbidden`: Keine Berechtigung für die angeforderte Aktion
- `404 Not Found`: Ressource nicht gefunden
- `500 Internal Server Error`: Serverfehler 