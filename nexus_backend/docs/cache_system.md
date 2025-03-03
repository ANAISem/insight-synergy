# Cache-System für das Nexus-Backend

Das Nexus-Backend verwendet ein zweistufiges Cache-System, um die Antwortzeiten zu verbessern und die Belastung der LLM-Dienste zu reduzieren. Diese Dokumentation erläutert die Funktionsweise und Konfiguration des Cache-Systems.

## Übersicht

Das Cache-System besteht aus zwei Ebenen:

1. **Memory-Cache**: Ein schneller In-Memory-LRU-Cache für häufig abgefragte Antworten
2. **Redis-Cache** (optional): Ein persistenter Cache für dauerhafte Speicherung und Instanzübergreifende Nutzung

## Funktionsweise

Wenn eine Anfrage an den LLM-Service gestellt wird, durchläuft sie die folgenden Schritte:

1. **Cache-Key-Generierung**: Aus der Benutzeranfrage, dem Kontext und den Parametern wird ein eindeutiger Schlüssel generiert
2. **Cache-Prüfung**: Das System prüft zuerst den Memory-Cache und dann den Redis-Cache (falls aktiviert)
3. **Bei Cache-Hit**: Die gespeicherte Antwort wird zurückgegeben (mit simuliertem Streaming, falls erforderlich)
4. **Bei Cache-Miss**: Die Anfrage wird an das LLM weitergeleitet, und die Antwort wird im Cache gespeichert

## Konfiguration

Die Cache-Konfiguration erfolgt über die Systemeinstellungen und Umgebungsvariablen:

| Einstellung | Beschreibung | Standard |
|-------------|--------------|----------|
| `REDIS_ENABLED` | Aktiviert den Redis-Cache | `False` |
| `REDIS_URL` | URL für die Redis-Verbindung | `redis://localhost:6379/0` |
| `CACHE_TTL` | Lebensdauer der Cache-Einträge in Sekunden | `86400` (24h) |
| `ALWAYS_CACHE_LLM` | Speichert alle LLM-Antworten im Cache | `False` |

## API-Endpunkte

Das Cache-System bietet folgende API-Endpunkte:

### Cache-Statistiken abrufen

```
GET /api/cache/stats
```

Dieser Endpunkt liefert Statistiken über den Cache-Zustand, einschließlich Trefferrate, Anzahl der Cache-Einträge und (bei aktiviertem Redis) Redis-Speichernutzung.

**Beispielantwort:**

```json
{
  "status": "success",
  "stats": {
    "hits": 153,
    "misses": 47,
    "hit_ratio": 0.765,
    "uptime_seconds": 3600,
    "memory_cache_size": 200,
    "redis_enabled": true,
    "redis_info": {
      "used_memory_human": "15.2M",
      "connected_clients": 1,
      "uptime_in_days": 3
    },
    "redis_cache_size": 250
  }
}
```

### Cache leeren

```
POST /api/cache/clear
```

Dieser Endpunkt löscht alle Cache-Einträge (sowohl im Memory-Cache als auch im Redis-Cache).

**Beispielantwort:**

```json
{
  "status": "success",
  "message": "Cache erfolgreich gelöscht"
}
```

## Authentifizierung

Beide Cache-API-Endpunkte erfordern eine API-Key-Authentifizierung. Der API-Key muss im `X-API-Key`-Header übermittelt werden:

```bash
curl -X GET http://localhost:8000/api/cache/stats \
  -H "X-API-Key: your-api-key-here"
```

## Verwendung im Code

### Cache-Service-Instanz abrufen

```python
from nexus_backend.services.cache_service import get_cache_service

async def my_function():
    cache_service = await get_cache_service()
    # Cache-Service verwenden...
```

### Auf Cache-Einträge zugreifen

```python
# Cache-Eintrag abrufen
cached_response = await cache_service.get_from_cache(
    query="Was ist die Hauptstadt von Deutschland?",
    context_documents=documents,
    params={"model": "gpt-3.5-turbo"}
)

# Cache-Eintrag hinzufügen
await cache_service.add_to_cache(
    query="Was ist die Hauptstadt von Deutschland?",
    context_documents=documents,
    response=llm_response,
    params={"model": "gpt-3.5-turbo"}
)
```

### Cache-Einträge invalidieren

```python
# Einzelnen Cache-Eintrag invalidieren
await cache_service.invalidate_cache(query="Was ist die Hauptstadt von Deutschland?")

# Alle Cache-Einträge mit einem bestimmten Präfix invalidieren
await cache_service.invalidate_cache(prefix="llm:cache:kategorie:")

# Gesamten Cache leeren
await cache_service.clear_all_cache()
```

## Streaming-Unterstützung

Das Cache-System unterstützt auch Streaming-Antworten. Wenn eine gecachte Antwort für eine Streaming-Anfrage gefunden wird, wird das Streaming simuliert, indem die Antwort in kleinere Tokens aufgeteilt und mit kurzen Pausen gesendet wird. Dies sorgt für ein natürliches Erscheinungsbild der Antwort beim Client, auch wenn sie aus dem Cache kommt.

## Performance-Empfehlungen

1. **Cache-TTL anpassen**: Für Produktionen mit sich häufig ändernden Daten sollte eine kürzere TTL (z.B. 3600 Sekunden = 1 Stunde) eingestellt werden
2. **Selektives Caching**: Die Einstellung `ALWAYS_CACHE_LLM=False` bewirkt, dass nur hochwertige Antworten (Konfidenz > 0.7) gecacht werden
3. **Redis-Konfiguration**: Für Produktionsumgebungen sollte Redis mit Persistenz konfiguriert werden, um Cache-Verluste bei Neustarts zu vermeiden
4. **Memory-Cache-Größe**: Die Memory-Cache-Größe (standardmäßig 1000 Einträge) kann bei Bedarf angepasst werden, indem der CacheService modifiziert wird

## Debugging und Monitoring

Die Cache-Nutzung wird im Log protokolliert. Folgende Log-Einträge sind relevant:

- `Cache-Hit (Memory): ...`: Eine Antwort wurde im Memory-Cache gefunden
- `Cache-Hit (Redis): ...`: Eine Antwort wurde im Redis-Cache gefunden
- `Cache-Miss: ...`: Keine Antwort im Cache gefunden
- `In Redis gespeichert: ...`: Eine Antwort wurde im Redis-Cache gespeichert
- `Caching übersprungen - niedrige Konfidenz: ...`: Antwort wurde wegen niedriger Konfidenz nicht gecacht

## Beispiel für WebSocket-Integration

Der folgende Code zeigt, wie das Cache-System in eine WebSocket-Implementierung integriert werden kann:

```python
# Prüfen, ob die Antwort im Cache ist
cached_response = await cache_service.get_from_cache(
    query=knowledge_query.query,
    context_documents=context_docs,
    params={"model": self.model_name}
)

# Wenn eine gecachte Antwort vorhanden ist, diese streamen
if cached_response:
    logger.info(f"Cache-Hit für Anfrage: '{query[:50]}...'")
    
    # Antwort in kleinere Tokens aufteilen für natürliches Streaming
    answer = cached_response.get("answer", "")
    tokens = re.findall(r'\w+|[.,!?;]', answer)
    
    # Tokens streamen mit variablen Pausen
    for i, token in enumerate(tokens):
        is_final = i == len(tokens) - 1
        streaming_token = token + (" " if i < len(tokens) - 1 and not token in ".,!?;" else "")
        await stream_callback(streaming_token, is_final)
        
        if not is_final:
            await asyncio.sleep(0.02)  # Kurze Pause für natürliches Erscheinungsbild
            
    return cached_response
``` 