# Insight Synergy WebSocket-Server (Python)

Ein einfacher WebSocket-Server für die Insight Synergy App, der sowohl WebSocket- als auch HTTP-Anfragen unterstützt.

## Funktionen

- WebSocket-Verbindung für Echtzeit-Kommunikation
- HTTP-Fallback für Umgebungen ohne WebSocket-Unterstützung
- Nachrichtenverlauf für neue Verbindungen
- Broadcast-Nachrichten an alle verbundenen Clients
- Statusendpunkt für Server-Monitoring

## Installation

Um den Server zu installieren, führen Sie die folgenden Befehle aus:

```bash
# In das Server-Verzeichnis wechseln
cd server

# Python-Abhängigkeiten installieren
pip3 install -r requirements.txt
```

## Server starten

Den Server können Sie mit folgendem Befehl starten:

```bash
python3 server.py
```

## Endpunkte

Der Server bietet die folgenden Endpunkte:

- WebSocket: `ws://localhost:8090/ws`
- HTTP API: `http://localhost:8090/api`
  - `POST /api/message` - Nachricht senden
  - `GET /api/status` - Server-Status abfragen

## Nachrichtenformat

### WebSocket-Nachrichten an den Server senden:

```json
{
  "type": "message",
  "data": {
    "content": "Nachrichteninhalt",
    "sender": "user"
  }
}
```

### Empfangenes Format:

```json
{
  "type": "message",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "content": "Antwort vom Server",
    "sender": "assistant",
    "timestamp": "2023-12-01T12:34:56.789Z"
  }
}
```

## Fehlermeldungen

Bei Fehlern sendet der Server eine Nachricht im folgenden Format:

```json
{
  "type": "error",
  "message": "Fehlermeldung"
}
```

## Debugging-Tipps

- Überprüfen Sie die Konsolenausgabe des Servers für detaillierte Logs
- Verwenden Sie den Status-Endpunkt, um zu überprüfen, ob der Server läuft
- Bei Verbindungsproblemen prüfen Sie, ob der Port 8090 frei ist 