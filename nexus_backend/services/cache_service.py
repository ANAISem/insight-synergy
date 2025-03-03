"""
Cache-Service für LLM-Antworten und Vektordatenbank-Anfragen.
Verbessert die Antwortzeiten und reduziert die Belastung der LLM-Dienste.
"""

import json
import time
import asyncio
import hashlib
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import lru
import redis.asyncio as redis

from ..utils.logging import get_logger
from ..config import settings

logger = get_logger(__name__)

class CacheService:
    """Service zum Caching von LLM-Antworten und Vektordatenbank-Anfragen."""
    
    def __init__(self):
        # In-Memory-LRU-Cache für schnelle Antworten (Kapazität: 1000 Einträge)
        self.memory_cache = lru.LRU(1000)
        
        # Redis-Client für persistenten Cache
        self.redis_client = None
        
        # Flag, ob Redis-Cache aktiviert ist
        self.redis_enabled = settings.REDIS_ENABLED
        
        # Cache-TTL in Sekunden (Standard: 24 Stunden)
        self.cache_ttl = settings.CACHE_TTL or 86400
        
        # Semaphore für gleichzeitige Cache-Zugriffe
        self.cache_semaphore = asyncio.Semaphore(10)
        
        # LLM-Antworten immer cachen? (Boolean)
        self.always_cache_llm = settings.ALWAYS_CACHE_LLM
        
        # Cache-Statistiken
        self.stats = {
            "hits": 0,
            "misses": 0,
            "last_reset": time.time()
        }
        
        if self.redis_enabled:
            # Redis-Client initialisieren
            self._init_redis()
    
    async def _init_redis(self):
        """Initialisiert den Redis-Client."""
        try:
            self.redis_client = redis.Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                encoding="utf-8"
            )
            # Ping zur Verbindungsprüfung
            await self.redis_client.ping()
            logger.info("Redis-Cache erfolgreich verbunden")
        except Exception as e:
            logger.error(f"Fehler beim Verbinden mit Redis: {str(e)}")
            self.redis_enabled = False
    
    def _generate_cache_key(self, query: str, context_hash: Optional[str] = None, params: Optional[Dict[str, Any]] = None) -> str:
        """
        Generiert einen eindeutigen Cache-Schlüssel für eine Anfrage.
        
        Args:
            query: Die Benutzeranfrage
            context_hash: Optional, Hash des Kontexts (für deterministische Ergebnisse)
            params: Optional, zusätzliche Parameter, die die Antwort beeinflussen
            
        Returns:
            cache_key: Eindeutiger Cache-Schlüssel
        """
        # Normalisieren des Querys (Whitespace entfernen, Kleinbuchstaben)
        normalized_query = query.strip().lower()
        
        # JSON-Serialisierung der Parameter
        params_str = json.dumps(params or {}, sort_keys=True) if params else ""
        
        # Hash-Input vorbereiten
        hash_input = f"{normalized_query}:{context_hash or ''}:{params_str}"
        
        # SHA-256-Hash berechnen
        hash_obj = hashlib.sha256(hash_input.encode('utf-8'))
        return f"llm:cache:{hash_obj.hexdigest()}"
    
    def _hash_documents(self, documents: List[Dict[str, Any]]) -> str:
        """
        Erzeugt einen Hash für eine Liste von Dokumenten.
        
        Args:
            documents: Liste von Dokumentenobjekten
            
        Returns:
            doc_hash: Hash der Dokumente
        """
        # Reduzieren der Dokumente auf die wesentlichen Informationen
        doc_data = []
        for doc in documents:
            doc_data.append({
                "id": doc.get("id", ""),
                "text": doc.get("text", ""),
                "score": doc.get("score", 0)
            })
        
        # JSON-Serialisierung und Hash-Berechnung
        doc_json = json.dumps(doc_data, sort_keys=True)
        hash_obj = hashlib.sha256(doc_json.encode('utf-8'))
        return hash_obj.hexdigest()
    
    async def get_from_cache(self, query: str, context_documents: List[Dict[str, Any]], params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Versucht, eine gecachte Antwort für eine Anfrage abzurufen.
        
        Args:
            query: Die Benutzeranfrage
            context_documents: Die Kontextdokumente für die Anfrage
            params: Zusätzliche Parameter
            
        Returns:
            cached_response: Die gecachte Antwort oder None, wenn keine im Cache
        """
        # Semaphore für gleichzeitige Zugriffe
        async with self.cache_semaphore:
            # Context-Hash berechnen
            context_hash = self._hash_documents(context_documents)
            
            # Cache-Schlüssel generieren
            cache_key = self._generate_cache_key(query, context_hash, params)
            
            # Zuerst im Memory-Cache suchen (schnell)
            if cache_key in self.memory_cache:
                cached_item = self.memory_cache[cache_key]
                # Prüfen, ob der Cache-Eintrag abgelaufen ist
                if time.time() - cached_item.get("timestamp", 0) <= self.cache_ttl:
                    self.stats["hits"] += 1
                    logger.debug(f"Cache-Hit (Memory): {query[:50]}...")
                    return cached_item.get("data")
            
            # Als nächstes im Redis-Cache suchen (wenn aktiviert)
            if self.redis_enabled and self.redis_client:
                try:
                    cached_json = await self.redis_client.get(cache_key)
                    if cached_json:
                        cached_item = json.loads(cached_json)
                        # Auch in den Memory-Cache schreiben für schnelleren Zugriff
                        self.memory_cache[cache_key] = {
                            "data": cached_item,
                            "timestamp": time.time()
                        }
                        self.stats["hits"] += 1
                        logger.debug(f"Cache-Hit (Redis): {query[:50]}...")
                        return cached_item
                except Exception as e:
                    logger.error(f"Redis-Cache-Fehler: {str(e)}")
            
            # Kein Cache-Hit
            self.stats["misses"] += 1
            logger.debug(f"Cache-Miss: {query[:50]}...")
            return None
    
    async def add_to_cache(self, query: str, context_documents: List[Dict[str, Any]], response: Dict[str, Any], params: Optional[Dict[str, Any]] = None):
        """
        Speichert eine Antwort im Cache.
        
        Args:
            query: Die Benutzeranfrage
            context_documents: Die Kontextdokumente für die Anfrage
            response: Die zu cachende Antwort
            params: Zusätzliche Parameter
        """
        # Semaphore für gleichzeitige Zugriffe
        async with self.cache_semaphore:
            # Prüfen, ob Caching aktiviert ist
            if not self.always_cache_llm:
                confidence = response.get("confidence", 0)
                # Nur hochwertige Antworten cachen
                if confidence < 0.7:
                    logger.debug(f"Caching übersprungen - niedrige Konfidenz ({confidence}): {query[:50]}...")
                    return
            
            # Context-Hash berechnen
            context_hash = self._hash_documents(context_documents)
            
            # Cache-Schlüssel generieren
            cache_key = self._generate_cache_key(query, context_hash, params)
            
            # Im Memory-Cache speichern
            self.memory_cache[cache_key] = {
                "data": response,
                "timestamp": time.time()
            }
            
            # Im Redis-Cache speichern (wenn aktiviert)
            if self.redis_enabled and self.redis_client:
                try:
                    response_json = json.dumps(response)
                    await self.redis_client.setex(
                        cache_key,
                        self.cache_ttl,
                        response_json
                    )
                    logger.debug(f"In Redis gespeichert: {query[:50]}...")
                except Exception as e:
                    logger.error(f"Redis-Cache-Speicherfehler: {str(e)}")
    
    async def invalidate_cache(self, query: Optional[str] = None, prefix: Optional[str] = None):
        """
        Invalidiert Cache-Einträge basierend auf Query oder Präfix.
        
        Args:
            query: Optional, spezifische Anfrage zum Invalidieren
            prefix: Optional, Schlüsselpräfix zum Invalidieren
        """
        # Semaphore für gleichzeitige Zugriffe
        async with self.cache_semaphore:
            if query:
                # Spezifischen Eintrag invalidieren
                cache_key = self._generate_cache_key(query)
                if cache_key in self.memory_cache:
                    del self.memory_cache[cache_key]
                
                if self.redis_enabled and self.redis_client:
                    try:
                        await self.redis_client.delete(cache_key)
                    except Exception as e:
                        logger.error(f"Redis-Cache-Invalidierungsfehler: {str(e)}")
            
            elif prefix:
                # Alle Einträge mit Präfix invalidieren
                # Memory-Cache
                keys_to_delete = [k for k in self.memory_cache.keys() if k.startswith(prefix)]
                for key in keys_to_delete:
                    del self.memory_cache[key]
                
                # Redis-Cache
                if self.redis_enabled and self.redis_client:
                    try:
                        pattern = f"{prefix}*"
                        cursor = 0
                        while True:
                            cursor, keys = await self.redis_client.scan(cursor, match=pattern, count=100)
                            if keys:
                                await self.redis_client.delete(*keys)
                            if cursor == 0:
                                break
                    except Exception as e:
                        logger.error(f"Redis-Cache-Batch-Invalidierungsfehler: {str(e)}")
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """
        Gibt Cache-Statistiken zurück.
        
        Returns:
            stats: Cache-Statistiken (Hits, Misses, etc.)
        """
        stats = {
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "hit_ratio": 0.0,
            "uptime_seconds": int(time.time() - self.stats["last_reset"]),
            "memory_cache_size": len(self.memory_cache),
            "redis_enabled": self.redis_enabled
        }
        
        total = stats["hits"] + stats["misses"]
        if total > 0:
            stats["hit_ratio"] = stats["hits"] / total
        
        # Redis-Statistiken hinzufügen, wenn verfügbar
        if self.redis_enabled and self.redis_client:
            try:
                info = await self.redis_client.info()
                stats["redis_info"] = {
                    "used_memory_human": info.get("used_memory_human"),
                    "connected_clients": info.get("connected_clients"),
                    "uptime_in_days": info.get("uptime_in_days")
                }
                
                # Anzahl der LLM-Cache-Einträge in Redis zählen
                cursor = 0
                count = 0
                pattern = "llm:cache:*"
                while True:
                    cursor, keys = await self.redis_client.scan(cursor, match=pattern, count=100)
                    count += len(keys)
                    if cursor == 0:
                        break
                
                stats["redis_cache_size"] = count
            except Exception as e:
                stats["redis_error"] = str(e)
        
        return stats
    
    async def clear_all_cache(self):
        """Löscht den gesamten Cache (Memory und Redis)."""
        # Semaphore für gleichzeitige Zugriffe
        async with self.cache_semaphore:
            # Memory-Cache leeren
            self.memory_cache.clear()
            
            # Redis-Cache leeren
            if self.redis_enabled and self.redis_client:
                try:
                    # Nur LLM-Cache-Einträge löschen
                    cursor = 0
                    pattern = "llm:cache:*"
                    while True:
                        cursor, keys = await self.redis_client.scan(cursor, match=pattern, count=100)
                        if keys:
                            await self.redis_client.delete(*keys)
                        if cursor == 0:
                            break
                except Exception as e:
                    logger.error(f"Redis-Cache-Löschfehler: {str(e)}")
            
            # Statistiken zurücksetzen
            self.stats = {
                "hits": 0,
                "misses": 0,
                "last_reset": time.time()
            }
            
            logger.info("Gesamter LLM-Cache gelöscht")


# Singleton-Instanz des CacheService
_cache_service = None

async def get_cache_service() -> CacheService:
    """
    Factory-Funktion für den CacheService.
    Stellt sicher, dass nur eine Instanz erstellt wird.
    
    Returns:
        cache_service: Die Singleton-Instanz des CacheService
    """
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
        if _cache_service.redis_enabled:
            await _cache_service._init_redis()
    return _cache_service 