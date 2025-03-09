"""
Adaptives Debugging-Modul für Insight Synergy.

Dieses Modul implementiert ein selbstlernendes Debugging-System, das:
1. Fehler automatisch erkennt und kategorisiert
2. Root-Cause-Analysis (RCA) durchführt
3. Self-Healing-Code generiert
4. Aus vergangenen Fehlern und Lösungen lernt
5. Kontinuierliche Verbesserung der Fehlerbehebungsstrategien ermöglicht
"""

import os
import sys
import json
import time
import inspect
import traceback
import hashlib
from typing import Dict, List, Optional, Tuple, Any, Callable, Union
from datetime import datetime
from pathlib import Path
import logging
from functools import wraps
from collections import defaultdict
import sqlite3
import pickle
import threading

from .logging import get_logger

# Hauptlogger für das Debugging-System
logger = get_logger("adaptive_debug")

# Pfad zur Debugging-Datenbank
DB_PATH = Path("logs/adaptive_debug.db")
DEBUG_STATS_PATH = Path("logs/debug_stats.json")
DEBUG_KNOWLEDGE_PATH = Path("logs/debug_knowledge.db")

# Stellen Sie sicher, dass die Verzeichnisse existieren
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


class DebugStats:
    """Klasse für die Sammlung und Analyse von Debugging-Statistiken."""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(DebugStats, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.stats = defaultdict(lambda: {
            "occurrences": 0,
            "last_occurrence": None,
            "fix_attempts": 0,
            "successful_fixes": 0,
            "avg_fix_time": 0,
            "severity": "unknown",
            "modules_affected": set(),
            "related_errors": set()
        })
        
        self.load_stats()
        self._initialized = True
    
    def load_stats(self):
        """Lädt Statistiken aus der JSON-Datei, falls vorhanden."""
        if DEBUG_STATS_PATH.exists():
            try:
                with open(DEBUG_STATS_PATH, 'r', encoding='utf-8') as f:
                    raw_stats = json.load(f)
                    
                # Konvertiere zu defaultdict mit Sets
                for error_id, stats in raw_stats.items():
                    self.stats[error_id] = stats
                    if "modules_affected" in stats:
                        self.stats[error_id]["modules_affected"] = set(stats["modules_affected"])
                    if "related_errors" in stats:
                        self.stats[error_id]["related_errors"] = set(stats["related_errors"])
                        
                logger.info(f"Debugging-Statistiken geladen: {len(self.stats)} Fehlertypen")
            except Exception as e:
                logger.error(f"Fehler beim Laden der Debugging-Statistiken: {e}")
    
    def save_stats(self):
        """Speichert Statistiken in eine JSON-Datei."""
        try:
            # Konvertiere Sets zu Listen für JSON-Serialisierung
            serializable_stats = {}
            for error_id, stats in self.stats.items():
                serializable_stats[error_id] = {**stats}
                if "modules_affected" in stats:
                    serializable_stats[error_id]["modules_affected"] = list(stats["modules_affected"])
                if "related_errors" in stats:
                    serializable_stats[error_id]["related_errors"] = list(stats["related_errors"])
            
            with open(DEBUG_STATS_PATH, 'w', encoding='utf-8') as f:
                json.dump(serializable_stats, f, ensure_ascii=False, indent=2)
                
            logger.debug(f"Debugging-Statistiken gespeichert: {len(self.stats)} Fehlertypen")
        except Exception as e:
            logger.error(f"Fehler beim Speichern der Debugging-Statistiken: {e}")
    
    def update_error_stats(self, error_id: str, module_name: str, 
                          severity: str = "medium", related_error: str = None):
        """Aktualisiert die Statistiken für einen Fehler."""
        with self._lock:
            if error_id not in self.stats:
                self.stats[error_id] = {
                    "occurrences": 0,
                    "last_occurrence": None,
                    "fix_attempts": 0,
                    "successful_fixes": 0,
                    "avg_fix_time": 0,
                    "severity": severity,
                    "modules_affected": set(),
                    "related_errors": set()
                }
                
            stats = self.stats[error_id]
            stats["occurrences"] += 1
            stats["last_occurrence"] = datetime.now().isoformat()
            stats["modules_affected"].add(module_name)
            stats["severity"] = severity
            
            if related_error:
                stats["related_errors"].add(related_error)
            
            self.save_stats()
    
    def update_fix_stats(self, error_id: str, successful: bool, fix_time: float):
        """Aktualisiert die Statistiken für einen Fix-Versuch."""
        with self._lock:
            if error_id in self.stats:
                stats = self.stats[error_id]
                stats["fix_attempts"] += 1
                
                if successful:
                    stats["successful_fixes"] += 1
                
                # Aktualisiere durchschnittliche Fix-Zeit
                if stats["avg_fix_time"] == 0:
                    stats["avg_fix_time"] = fix_time
                else:
                    stats["avg_fix_time"] = (
                        (stats["avg_fix_time"] * (stats["fix_attempts"] - 1)) + fix_time
                    ) / stats["fix_attempts"]
                
                self.save_stats()
    
    def get_critical_errors(self, threshold: int = 5) -> List[str]:
        """Gibt eine Liste kritischer Fehler zurück."""
        critical_errors = []
        
        for error_id, stats in self.stats.items():
            # Kritisch, wenn viele Vorkommen oder niedrige Erfolgsrate bei Fixes
            if (stats["occurrences"] >= threshold or 
                (stats["fix_attempts"] > 2 and 
                 stats["successful_fixes"] / stats["fix_attempts"] < 0.5)):
                critical_errors.append(error_id)
                
        return critical_errors
    
    def get_related_errors(self, error_id: str) -> List[str]:
        """Gibt verwandte Fehler für einen bestimmten Fehler zurück."""
        if error_id in self.stats:
            return list(self.stats[error_id]["related_errors"])
        return []
    
    def get_error_patterns(self) -> Dict[str, List[str]]:
        """Analysiert Muster in Fehlern, um Gruppen zu identifizieren."""
        module_error_map = defaultdict(list)
        
        # Gruppiere Fehler nach betroffenen Modulen
        for error_id, stats in self.stats.items():
            for module in stats["modules_affected"]:
                module_error_map[module].append(error_id)
        
        return dict(module_error_map)


class KnowledgeBase:
    """Datenbank für die Speicherung von Debugging-Wissen und Fix-Strategien."""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(KnowledgeBase, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.conn = None
        self.init_db()
        self._initialized = True
    
    def init_db(self):
        """Initialisiert die SQLite-Datenbank für die Knowledgebase."""
        try:
            self.conn = sqlite3.connect(str(DEBUG_KNOWLEDGE_PATH), check_same_thread=False)
            cursor = self.conn.cursor()
            
            # Erstelle Tabellen, falls sie nicht existieren
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS error_knowledge (
                error_id TEXT PRIMARY KEY,
                error_message TEXT,
                error_type TEXT,
                module_name TEXT,
                stack_context TEXT,
                root_cause TEXT,
                severity TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')
            
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS fix_strategies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                error_id TEXT,
                fix_description TEXT,
                fix_code TEXT,
                automated BOOLEAN,
                success_rate REAL DEFAULT 0.0,
                execution_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (error_id) REFERENCES error_knowledge (error_id)
            )
            ''')
            
            self.conn.commit()
            logger.info("Debugging Knowledge-Base initialisiert")
        except Exception as e:
            logger.error(f"Fehler bei der Initialisierung der Knowledge-Base: {e}")
    
    def add_error_knowledge(self, error_id: str, error_message: str, error_type: str, 
                           module_name: str, stack_context: str, root_cause: str = None,
                           severity: str = "medium"):
        """Fügt neues Wissen über einen Fehler hinzu."""
        try:
            with self._lock:
                cursor = self.conn.cursor()
                
                # Prüfe, ob der Fehler bereits existiert
                cursor.execute("SELECT error_id FROM error_knowledge WHERE error_id = ?", (error_id,))
                exists = cursor.fetchone()
                
                current_time = datetime.now().isoformat()
                
                if exists:
                    # Aktualisiere vorhandenen Eintrag
                    cursor.execute('''
                    UPDATE error_knowledge 
                    SET error_message = ?, error_type = ?, module_name = ?, 
                        stack_context = ?, root_cause = ?, severity = ?, updated_at = ?
                    WHERE error_id = ?
                    ''', (error_message, error_type, module_name, stack_context, 
                          root_cause, severity, current_time, error_id))
                else:
                    # Erstelle neuen Eintrag
                    cursor.execute('''
                    INSERT INTO error_knowledge 
                    (error_id, error_message, error_type, module_name, stack_context, root_cause, severity)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (error_id, error_message, error_type, module_name, 
                          stack_context, root_cause, severity))
                
                self.conn.commit()
                logger.debug(f"Error-Knowledge aktualisiert: {error_id}")
        except Exception as e:
            logger.error(f"Fehler beim Hinzufügen von Error-Knowledge: {e}")
    
    def add_fix_strategy(self, error_id: str, fix_description: str, fix_code: str, 
                        automated: bool = False):
        """Fügt eine neue Fix-Strategie für einen bekannten Fehler hinzu."""
        try:
            with self._lock:
                cursor = self.conn.cursor()
                current_time = datetime.now().isoformat()
                
                cursor.execute('''
                INSERT INTO fix_strategies 
                (error_id, fix_description, fix_code, automated, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ''', (error_id, fix_description, fix_code, automated, current_time, current_time))
                
                self.conn.commit()
                logger.debug(f"Fix-Strategie hinzugefügt für: {error_id}")
        except Exception as e:
            logger.error(f"Fehler beim Hinzufügen einer Fix-Strategie: {e}")
    
    def update_fix_result(self, strategy_id: int, success: bool):
        """Aktualisiert die Erfolgsrate einer Fix-Strategie."""
        try:
            with self._lock:
                cursor = self.conn.cursor()
                
                # Hole aktuelle Daten
                cursor.execute('''
                SELECT success_rate, execution_count FROM fix_strategies WHERE id = ?
                ''', (strategy_id,))
                
                result = cursor.fetchone()
                if not result:
                    logger.warning(f"Fix-Strategie nicht gefunden: ID {strategy_id}")
                    return
                
                current_rate, count = result
                count += 1
                
                # Berechne neue Erfolgsrate
                if count == 1:
                    new_rate = 1.0 if success else 0.0
                else:
                    new_rate = ((current_rate * (count - 1)) + (1.0 if success else 0.0)) / count
                
                # Aktualisiere Datenbank
                cursor.execute('''
                UPDATE fix_strategies
                SET success_rate = ?, execution_count = ?, updated_at = ?
                WHERE id = ?
                ''', (new_rate, count, datetime.now().isoformat(), strategy_id))
                
                self.conn.commit()
                logger.debug(f"Fix-Strategie Ergebnis aktualisiert: ID {strategy_id}, Erfolg: {success}")
        except Exception as e:
            logger.error(f"Fehler beim Aktualisieren des Fix-Ergebnisses: {e}")
    
    def get_best_fix_strategy(self, error_id: str) -> Tuple[int, str, str, bool]:
        """Gibt die beste Fix-Strategie für einen Fehler zurück."""
        try:
            cursor = self.conn.cursor()
            
            cursor.execute('''
            SELECT id, fix_description, fix_code, automated 
            FROM fix_strategies
            WHERE error_id = ?
            ORDER BY success_rate DESC, execution_count DESC
            LIMIT 1
            ''', (error_id,))
            
            result = cursor.fetchone()
            if result:
                return result  # (id, fix_description, fix_code, automated)
            return None
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der besten Fix-Strategie: {e}")
            return None
    
    def get_error_knowledge(self, error_id: str) -> Dict[str, Any]:
        """Gibt das Wissen über einen bestimmten Fehler zurück."""
        try:
            cursor = self.conn.cursor()
            
            cursor.execute('''
            SELECT error_id, error_message, error_type, module_name, 
                   stack_context, root_cause, severity
            FROM error_knowledge
            WHERE error_id = ?
            ''', (error_id,))
            
            result = cursor.fetchone()
            if result:
                return {
                    "error_id": result[0],
                    "error_message": result[1],
                    "error_type": result[2],
                    "module_name": result[3],
                    "stack_context": result[4],
                    "root_cause": result[5],
                    "severity": result[6]
                }
            return None
        except Exception as e:
            logger.error(f"Fehler beim Abrufen von Error-Knowledge: {e}")
            return None


class RootCauseAnalyzer:
    """Klasse für die Durchführung von Root-Cause-Analysis (RCA)."""
    
    def __init__(self):
        self.kb = KnowledgeBase()
        self.stats = DebugStats()
    
    def analyze_exception(self, exc_info: Tuple[type, Exception, Any], 
                          module_name: str) -> str:
        """Analysiert eine Exception und ermittelt mögliche Ursachen."""
        exc_type, exc_value, exc_tb = exc_info
        
        # Extrahiere Stack-Informationen
        stack_frames = traceback.extract_tb(exc_tb)
        stack_summary = []
        
        for frame in stack_frames:
            stack_summary.append({
                "file": frame.filename,
                "line": frame.lineno,
                "name": frame.name,
                "code": frame.line
            })
        
        # Erstelle Fehler-ID basierend auf Exception-Typ und Nachricht
        error_message = str(exc_value)
        error_type = exc_type.__name__
        
        # Hash-basierte Fehler-ID, die den Typ und die Nachricht berücksichtigt
        error_id = hashlib.md5(f"{error_type}:{error_message}:{module_name}".encode()).hexdigest()
        
        # Bestimme den Schweregrad des Fehlers
        severity = self._determine_severity(exc_type, error_message, stack_summary)
        
        # Aktualisiere Statistiken
        self.stats.update_error_stats(error_id, module_name, severity)
        
        # Extrahiere Kontext aus dem Stack
        stack_context = json.dumps(stack_summary)
        
        # Führe Root-Cause-Analysis durch
        root_cause = self._find_root_cause(error_type, error_message, stack_summary)
        
        # Speichere Wissen in der Knowledgebase
        self.kb.add_error_knowledge(
            error_id, error_message, error_type, module_name,
            stack_context, root_cause, severity
        )
        
        return error_id
    
    def _determine_severity(self, exc_type, error_message, stack_summary) -> str:
        """Bestimmt den Schweregrad eines Fehlers."""
        # Kritische Fehler
        if exc_type in (SystemError, MemoryError, SystemExit, KeyboardInterrupt):
            return "critical"
            
        # Security-Fehler
        if "security" in error_message.lower() or "permission" in error_message.lower():
            return "critical"
            
        # Datenbank-Fehler
        if "database" in error_message.lower() or "sql" in error_message.lower():
            return "high"
            
        # API-Fehler
        if "api" in error_message.lower() or "http" in error_message.lower():
            return "high"
            
        # Standard-Fehler
        return "medium"
    
    def _find_root_cause(self, error_type, error_message, stack_summary) -> str:
        """Führt eine einfache Root-Cause-Analysis durch."""
        causes = []
        
        # Typspezifische Analyse
        if error_type == "TypeError":
            causes.append("Möglicherweise werden inkompatible Datentypen verwendet.")
        elif error_type == "ValueError":
            causes.append("Möglicherweise werden ungültige Werte übergeben.")
        elif error_type == "KeyError":
            causes.append("Ein benötigter Dictionary-Schlüssel existiert nicht.")
        elif error_type == "IndexError":
            causes.append("Zugriff außerhalb der gültigen Indexgrenzen einer Liste/Sequenz.")
        elif error_type == "AttributeError":
            causes.append("Das angeforderte Attribut oder die Methode existiert nicht am Objekt.")
        elif error_type == "ImportError" or error_type == "ModuleNotFoundError":
            causes.append("Ein benötigtes Modul konnte nicht importiert werden.")
        elif error_type == "FileNotFoundError":
            causes.append("Die angeforderte Datei existiert nicht.")
        elif error_type == "PermissionError":
            causes.append("Unzureichende Berechtigungen für den Zugriff auf eine Ressource.")
        elif error_type == "TimeoutError":
            causes.append("Eine Operation hat das Zeitlimit überschritten.")
        elif error_type == "ConnectionError":
            causes.append("Ein Verbindungsproblem ist aufgetreten.")
        
        # Nachrichtenbasierte Analyse
        if "division by zero" in error_message:
            causes.append("Division durch Null.")
        elif "NoneType" in error_message and "has no attribute" in error_message:
            causes.append("Es wird versucht, auf ein Attribut von 'None' zuzugreifen.")
        elif "JSON" in error_message and "decode" in error_message:
            causes.append("Ungültiges JSON-Format.")
        elif "timed out" in error_message:
            causes.append("Die Operation hat zu lange gedauert und wurde abgebrochen.")
        elif "already exists" in error_message:
            causes.append("Eine Ressource mit diesem Namen existiert bereits.")
        elif "not found" in error_message:
            causes.append("Die angeforderte Ressource wurde nicht gefunden.")
        
        # Stacktrace-basierte Analyse
        api_calls = any("api" in frame.get("file", "").lower() for frame in stack_summary)
        db_calls = any("db" in frame.get("file", "").lower() for frame in stack_summary)
        file_operations = any(("open(" in frame.get("code", "") or "write(" in frame.get("code", "")) 
                              for frame in stack_summary)
        
        if api_calls:
            causes.append("Fehler bei API-Anfragen oder -Antworten.")
        if db_calls:
            causes.append("Fehler bei Datenbankoperationen.")
        if file_operations:
            causes.append("Fehler bei Dateioperationen.")
        
        if not causes:
            return "Unbekannte Ursache, weitere Analyse erforderlich."
            
        return " ".join(causes)


class SelfHealingCode:
    """Implementiert Self-Healing-Code-Mechanismen."""
    
    def __init__(self):
        self.kb = KnowledgeBase()
        self.stats = DebugStats()
    
    def try_auto_fix(self, error_id: str) -> Optional[Callable]:
        """Versucht, einen Fehler automatisch zu beheben."""
        fix_strategy = self.kb.get_best_fix_strategy(error_id)
        
        if not fix_strategy or not fix_strategy[3]:  # Überprüft automated-Flag
            return None
        
        strategy_id, description, fix_code, _ = fix_strategy
        
        try:
            # Vorsicht: Dynamische Code-Ausführung ist potenziell gefährlich!
            # In einer Produktionsumgebung sollten weitere Sicherheitsmaßnahmen implementiert werden.
            fix_function = {}
            exec(fix_code, fix_function)
            
            if "fix_function" in fix_function:
                logger.info(f"Automatischer Fix für {error_id} gefunden: {description}")
                return (strategy_id, fix_function["fix_function"])
            
            logger.warning(f"Automatischer Fix für {error_id} enthält keine 'fix_function'")
            return None
        except Exception as e:
            logger.error(f"Fehler beim Ausführen des automatischen Fixes für {error_id}: {e}")
            self.kb.update_fix_result(strategy_id, False)
            return None


class AdaptiveDebugger:
    """Hauptklasse für das adaptive Debugging-System."""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(AdaptiveDebugger, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.rca = RootCauseAnalyzer()
        self.self_healing = SelfHealingCode()
        self.stats = DebugStats()
        self.kb = KnowledgeBase()
        
        self._initialized = True
    
    def debug_function(self, func):
        """Dekorator für das adaptive Debugging von Funktionen."""
        @wraps(func)
        def wrapper(*args, **kwargs):
            module_name = func.__module__
            function_name = func.__name__
            
            try:
                start_time = time.time()
                result = func(*args, **kwargs)
                end_time = time.time()
                
                # Überwache lange Ausführungszeiten
                if end_time - start_time > 1.0:  # Über 1 Sekunde
                    logger.warning(
                        f"Performance-Warnung: {module_name}.{function_name} "
                        f"dauerte {end_time - start_time:.2f} Sekunden."
                    )
                
                return result
            except Exception as exc:
                # Nehme Exception-Informationen
                exc_info = sys.exc_info()
                
                # Analysiere den Fehler
                error_id = self.rca.analyze_exception(exc_info, f"{module_name}.{function_name}")
                
                logger.error(
                    f"Fehler in {module_name}.{function_name}: {exc}",
                    extra={"error_id": error_id}
                )
                
                # Versuche automatischen Fix
                start_fix_time = time.time()
                fix_result = self.self_healing.try_auto_fix(error_id)
                
                if fix_result:
                    strategy_id, fix_func = fix_result
                    
                    try:
                        # Versuche den Fix auszuführen
                        fixed_result = fix_func(*args, **kwargs)
                        
                        end_fix_time = time.time()
                        fix_time = end_fix_time - start_fix_time
                        
                        # Aktualisiere Statistiken
                        self.stats.update_fix_stats(error_id, True, fix_time)
                        self.kb.update_fix_result(strategy_id, True)
                        
                        logger.info(
                            f"Automatischer Fix für {error_id} erfolgreich angewendet "
                            f"({fix_time:.2f} Sekunden)"
                        )
                        
                        return fixed_result
                    except Exception as fix_exc:
                        end_fix_time = time.time()
                        fix_time = end_fix_time - start_fix_time
                        
                        # Aktualisiere Statistiken
                        self.stats.update_fix_stats(error_id, False, fix_time)
                        self.kb.update_fix_result(strategy_id, False)
                        
                        logger.error(
                            f"Automatischer Fix für {error_id} fehlgeschlagen: {fix_exc}"
                        )
                
                # Wenn kein automatischer Fix möglich ist, wirf die ursprüngliche Exception
                raise
                
        return wrapper
    
    def debug_class(self, cls):
        """Dekorator für das adaptive Debugging von Klassen."""
        # Finde alle Methoden der Klasse
        for name, method in inspect.getmembers(cls, inspect.isfunction):
            # Überspringe spezielle Methoden wie __init__
            if not name.startswith('__'):
                setattr(cls, name, self.debug_function(method))
        return cls
    
    def register_fix(self, error_id: str, description: str, fix_code: str, 
                    automated: bool = False):
        """Registriert eine neue Fix-Strategie in der Knowledgebase."""
        self.kb.add_fix_strategy(error_id, description, fix_code, automated)
        logger.info(f"Neue Fix-Strategie für {error_id} registriert: {description}")
    
    def get_debug_report(self) -> Dict[str, Any]:
        """Erstellt einen Bericht über den aktuellen Debugging-Zustand."""
        critical_errors = self.stats.get_critical_errors()
        error_patterns = self.stats.get_error_patterns()
        
        # Sammle Details für kritische Fehler
        critical_error_details = []
        for error_id in critical_errors:
            error_knowledge = self.kb.get_error_knowledge(error_id)
            if error_knowledge:
                fix_strategy = self.kb.get_best_fix_strategy(error_id)
                fix_details = None
                
                if fix_strategy:
                    strategy_id, description, _, automated = fix_strategy
                    fix_details = {
                        "strategy_id": strategy_id,
                        "description": description,
                        "automated": automated
                    }
                
                critical_error_details.append({
                    "error_id": error_id,
                    "error_type": error_knowledge["error_type"],
                    "error_message": error_knowledge["error_message"],
                    "module_name": error_knowledge["module_name"],
                    "root_cause": error_knowledge["root_cause"],
                    "severity": error_knowledge["severity"],
                    "fix_strategy": fix_details
                })
        
        # Erstelle Bericht
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_error_types": len(self.stats.stats),
            "critical_errors": critical_error_details,
            "error_patterns": {
                module: len(errors) for module, errors in error_patterns.items()
            }
        }
        
        return report


# Erstelle eine Singleton-Instanz
debugger = AdaptiveDebugger()

# Expose wichtige Dekoratoren und Funktionen
debug_function = debugger.debug_function
debug_class = debugger.debug_class
register_fix = debugger.register_fix
get_debug_report = debugger.get_debug_report 