"""
Leistungsoptimierer für die Vektordatenbank.

Dieser Modul enthält Klassen und Funktionen zur automatischen Überwachung und
Optimierung der Vektordatenbank-Leistung basierend auf Nutzungsmustern.
"""

import time
import logging
import asyncio
from typing import Dict, List, Optional, Tuple, Any, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
import psutil
import threading
import statistics

from .vector_db import VectorDB


logger = logging.getLogger(__name__)


@dataclass
class QueryMetrics:
    """Speichert Metriken für eine einzelne Datenbankabfrage."""
    query_type: str  # 'search', 'add', 'update', 'delete'
    execution_time: float  # in Sekunden
    result_count: int  # Anzahl der zurückgegebenen Ergebnisse
    vector_dimension: int  # Dimensionen des Vektors
    timestamp: datetime  # Zeitstempel der Abfrage
    memory_usage: float  # Speichernutzung in MB
    query_params: Dict[str, Any]  # Parameter der Abfrage


class PerformanceOptimizer:
    """
    Überwacht und optimiert die Leistung der Vektordatenbank.
    
    Diese Klasse sammelt Metriken zu Datenbankabfragen, analysiert Leistungsmuster
    und führt automatische Optimierungen durch, um die Gesamtleistung zu verbessern.
    """
    
    def __init__(
        self, 
        vector_db: VectorDB,
        optimization_interval: int = 3600,  # 1 Stunde
        metrics_history_size: int = 1000,
        slow_query_threshold: float = 2.0,  # 2 Sekunden
        memory_alert_threshold: float = 85.0,  # 85% der verfügbaren Speichernutzung
        enable_auto_optimization: bool = True
    ):
        """
        Initialisiert den PerformanceOptimizer.
        
        Args:
            vector_db: Die zu überwachende VectorDB-Instanz
            optimization_interval: Intervall für automatische Optimierungen in Sekunden
            metrics_history_size: Maximale Anzahl zu speichernder Abfragemetriken
            slow_query_threshold: Schwellenwert für langsame Abfragen in Sekunden
            memory_alert_threshold: Schwellenwert für Speicherauslastung in Prozent
            enable_auto_optimization: Ob automatische Optimierungen aktiviert werden sollen
        """
        self.vector_db = vector_db
        self.optimization_interval = optimization_interval
        self.metrics_history_size = metrics_history_size
        self.slow_query_threshold = slow_query_threshold
        self.memory_alert_threshold = memory_alert_threshold
        self.enable_auto_optimization = enable_auto_optimization
        
        self.query_metrics: List[QueryMetrics] = []
        self.optimization_lock = threading.Lock()
        self.last_optimization_time = datetime.now()
        
        # Statistiken zur Datenbankleistung
        self.stats = {
            "total_queries": 0,
            "slow_queries": 0,
            "avg_query_time": 0.0,
            "peak_memory_usage": 0.0,
            "optimization_count": 0,
            "last_optimization": None
        }
        
        # Wenn automatische Optimierung aktiviert ist, starten wir den Optimierungsprozess
        if self.enable_auto_optimization:
            self._start_auto_optimization()
    
    def _start_auto_optimization(self):
        """Startet einen Hintergrund-Task für regelmäßige Optimierungen."""
        optimizer_thread = threading.Thread(
            target=self._run_optimizer_loop,
            daemon=True
        )
        optimizer_thread.start()
        logger.info("Automatische Vektordatenbank-Optimierung wurde gestartet")
    
    def _run_optimizer_loop(self):
        """Kontinuierliche Schleife für regelmäßige Optimierungen."""
        while True:
            time.sleep(self.optimization_interval)
            with self.optimization_lock:
                asyncio.run(self.optimize_database())
    
    async def record_query(
        self,
        query_type: str,
        start_time: float,
        end_time: float,
        result_count: int,
        vector_dimension: int,
        query_params: Dict[str, Any]
    ):
        """
        Zeichnet Metriken für eine Datenbankabfrage auf.
        
        Args:
            query_type: Art der Abfrage (search, add, update, delete)
            start_time: Startzeit der Abfrage in Sekunden
            end_time: Endzeit der Abfrage in Sekunden
            result_count: Anzahl der zurückgegebenen Ergebnisse
            vector_dimension: Dimensionalität des Vektors
            query_params: Parameter der Abfrage
        """
        execution_time = end_time - start_time
        memory_usage = psutil.Process().memory_info().rss / (1024 * 1024)  # in MB
        
        # Neue Abfragemetrik erstellen
        metric = QueryMetrics(
            query_type=query_type,
            execution_time=execution_time,
            result_count=result_count,
            vector_dimension=vector_dimension,
            timestamp=datetime.now(),
            memory_usage=memory_usage,
            query_params=query_params
        )
        
        # Liste der Metriken aktualisieren
        with self.optimization_lock:
            self.query_metrics.append(metric)
            if len(self.query_metrics) > self.metrics_history_size:
                self.query_metrics.pop(0)  # Älteste Metrik entfernen
            
            # Statistiken aktualisieren
            self.stats["total_queries"] += 1
            if execution_time > self.slow_query_threshold:
                self.stats["slow_queries"] += 1
                logger.warning(
                    f"Langsame {query_type}-Abfrage erkannt: {execution_time:.2f}s, "
                    f"Parameter: {query_params}"
                )
            
            # Durchschnittliche Abfragezeit berechnen
            all_times = [m.execution_time for m in self.query_metrics]
            self.stats["avg_query_time"] = sum(all_times) / len(all_times)
            
            # Höchste Speichernutzung überwachen
            if memory_usage > self.stats["peak_memory_usage"]:
                self.stats["peak_memory_usage"] = memory_usage
            
            # Speicherwarnung ausgeben, wenn nötig
            memory_percent = psutil.virtual_memory().percent
            if memory_percent > self.memory_alert_threshold:
                logger.warning(
                    f"Hohe Speicherauslastung erkannt: {memory_percent:.1f}% "
                    f"({memory_usage:.1f} MB für Prozess)"
                )
                
                # Bei hoher Speichernutzung sofortige Optimierung durchführen
                if datetime.now() - self.last_optimization_time > timedelta(minutes=5):
                    await self.optimize_database(force=True)
        
    async def optimize_database(self, force: bool = False):
        """
        Führt Datenbankoptimierungen basierend auf gesammelten Metriken durch.
        
        Args:
            force: Wenn True, führt die Optimierung aus, unabhängig von Zeitintervallen
        """
        if not force and (datetime.now() - self.last_optimization_time < timedelta(seconds=self.optimization_interval)):
            return
        
        logger.info("Starte Vektordatenbank-Optimierung")
        optimization_start_time = time.time()
        optimizations_applied = []
        
        try:
            # 1. Prüfen, ob eine Neuindexierung notwendig ist
            if await self._should_reindex():
                logger.info("Führe Neuindexierung der Vektordatenbank durch")
                await self.vector_db.reset_collection()
                optimizations_applied.append("collection_reindexing")
            
            # 2. Verwaiste Vektoren entfernen
            orphaned_count = await self._clean_orphaned_vectors()
            if orphaned_count > 0:
                logger.info(f"{orphaned_count} verwaiste Vektoren wurden entfernt")
                optimizations_applied.append("orphaned_vectors_removed")
            
            # 3. Cache-Optimierung basierend auf häufigen Anfragen
            if await self._optimize_cache():
                logger.info("Cache-Optimierung angewendet")
                optimizations_applied.append("cache_optimization")
            
            # Statistiken aktualisieren
            self.last_optimization_time = datetime.now()
            self.stats["optimization_count"] += 1
            self.stats["last_optimization"] = self.last_optimization_time
            
            optimization_time = time.time() - optimization_start_time
            logger.info(
                f"Vektordatenbank-Optimierung abgeschlossen in {optimization_time:.2f}s. "
                f"Angewendete Optimierungen: {', '.join(optimizations_applied)}"
            )
            
            return {
                "success": True,
                "optimizations_applied": optimizations_applied,
                "execution_time": optimization_time
            }
        
        except Exception as e:
            logger.error(f"Fehler bei der Datenbankoptimierung: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _should_reindex(self) -> bool:
        """
        Prüft, ob die Sammlung neu indiziert werden sollte.
        
        Returns:
            True, wenn eine Neuindexierung empfohlen wird
        """
        if not self.query_metrics:
            return False
        
        # Leistungskennzahlen analysieren
        recent_metrics = [m for m in self.query_metrics 
                         if (datetime.now() - m.timestamp) < timedelta(hours=24)]
        
        if not recent_metrics:
            return False
        
        search_metrics = [m for m in recent_metrics if m.query_type == 'search']
        
        if not search_metrics:
            return False
        
        # Hohe Ausführungszeiten bei Suchabfragen identifizieren
        search_times = [m.execution_time for m in search_metrics]
        avg_search_time = statistics.mean(search_times)
        
        # Wenn die durchschnittliche Suchzeit über 1 Sekunde liegt und
        # mindestens 50 Suchvorgänge durchgeführt wurden, Neuindexierung empfehlen
        return avg_search_time > 1.0 and len(search_metrics) >= 50
    
    async def _clean_orphaned_vectors(self) -> int:
        """
        Entfernt verwaiste Vektoren, die keinem Dokument mehr zugeordnet sind.
        
        Returns:
            Anzahl der entfernten verwaisten Vektoren
        """
        # Implementierung zur Identifizierung und Entfernung verwaister Vektoren
        # Diese würde mit der spezifischen Vector-DB-Implementation interagieren
        
        # Beispiel: In dieser Dummy-Implementation simulieren wir einfach die Entfernung
        orphaned_count = 0
        
        # TODO: Implementiere tatsächliche Identifizierung und Entfernung
        # basierend auf der verwendeten Vektordatenbank
        
        return orphaned_count
    
    async def _optimize_cache(self) -> bool:
        """
        Optimiert den Vector-DB-Cache basierend auf häufigen Anfragen.
        
        Returns:
            True, wenn Cache-Optimierungen angewendet wurden
        """
        # Cache-Optimierung für die spezifische Vector-DB-Implementation
        # Dies hängt von der verwendeten Vektordatenbank ab (ChromaDB, etc.)
        
        # Beispiel: In dieser Dummy-Implementation geben wir einfach "True" zurück
        # TODO: Implementiere tatsächliche Cache-Optimierung
        
        return True
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Gibt aktuelle Leistungsstatistiken zurück.
        
        Returns:
            Wörterbuch mit Leistungsstatistiken
        """
        with self.optimization_lock:
            # Aktuelle Statistiken in einem neuen Wörterbuch kopieren
            stats = dict(self.stats)
            
            # Hinzufügen detaillierterer Statistiken nach Abfragetyp
            if self.query_metrics:
                # Nach Abfragetyp gruppieren
                metrics_by_type = {}
                for metric in self.query_metrics:
                    if metric.query_type not in metrics_by_type:
                        metrics_by_type[metric.query_type] = []
                    metrics_by_type[metric.query_type].append(metric)
                
                # Statistiken pro Abfragetyp berechnen
                stats["metrics_by_type"] = {}
                for query_type, metrics in metrics_by_type.items():
                    times = [m.execution_time for m in metrics]
                    counts = [m.result_count for m in metrics]
                    
                    stats["metrics_by_type"][query_type] = {
                        "count": len(metrics),
                        "avg_time": statistics.mean(times) if times else 0,
                        "max_time": max(times) if times else 0,
                        "min_time": min(times) if times else 0,
                        "avg_result_count": statistics.mean(counts) if counts else 0
                    }
                
                # Aktuelle Speichernutzung
                stats["current_memory_usage"] = psutil.Process().memory_info().rss / (1024 * 1024)
                stats["system_memory_percent"] = psutil.virtual_memory().percent
            
            return stats


# Decorator für die Leistungsüberwachung von VectorDB-Methoden
def monitor_performance(query_type: str, vector_dimension: int = 384):
    """
    Decorator zum Überwachen der Leistung von VectorDB-Methoden.
    
    Args:
        query_type: Art der Abfrage (search, add, update, delete)
        vector_dimension: Dimensionalität der verwendeten Vektoren
    
    Returns:
        Decorierte Funktion, die Leistungsmetriken aufzeichnet
    """
    def decorator(func):
        async def wrapper(self, *args, **kwargs):
            # Abfrageparameter extrahieren
            query_params = {}
            
            # Für verschiedene Abfragetypen die relevanten Parameter extrahieren
            if query_type == "search":
                if args and isinstance(args[0], str):
                    query_params["query"] = args[0]
                if "limit" in kwargs:
                    query_params["limit"] = kwargs["limit"]
            elif query_type in ["add", "update"]:
                if args and hasattr(args[0], "content"):
                    query_params["content_length"] = len(args[0].content)
            elif query_type == "delete":
                if args:
                    query_params["id"] = args[0]
            
            # Zeit messen
            start_time = time.time()
            result = await func(self, *args, **kwargs)
            end_time = time.time()
            
            # Wenn die Instanz einen Performance-Optimizer hat, Metriken aufzeichnen
            if hasattr(self, "performance_optimizer"):
                result_count = 0
                
                # Bestimmen der Ergebnisanzahl je nach Abfragetyp
                if query_type == "search" and hasattr(result, "results"):
                    result_count = len(result.results)
                elif query_type in ["add", "update", "delete"]:
                    result_count = 1
                
                # Metriken aufzeichnen
                await self.performance_optimizer.record_query(
                    query_type=query_type,
                    start_time=start_time,
                    end_time=end_time, 
                    result_count=result_count,
                    vector_dimension=vector_dimension,
                    query_params=query_params
                )
            
            return result
        return wrapper
    return decorator 