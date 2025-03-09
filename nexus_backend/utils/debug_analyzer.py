"""
Debug-Analyzer CLI für das adaptive Debugging-System.

Dieses Modul stellt ein Kommandozeilen-Tool zur Verfügung, das:
1. Debugging-Statistiken anzeigt
2. Fehlerberichte generiert
3. Architekturanalysen durchführt
4. Optimierungsvorschläge basierend auf gesammelten Debugging-Daten macht
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import textwrap
import sqlite3
from tabulate import tabulate

# Stelle sicher, dass das Modul im Pfad ist
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from nexus_backend.utils.adaptive_debug import (
    debugger, KnowledgeBase, DebugStats, get_debug_report
)
from nexus_backend.utils.logging import get_logger

logger = get_logger("debug_analyzer")


class DebugAnalyzer:
    """Hauptklasse für die Analyse von Debugging-Daten."""
    
    def __init__(self):
        self.kb = KnowledgeBase()
        self.stats = DebugStats()
        self.db_path = Path("logs/debug_knowledge.db")
        
    def print_error_summary(self, limit: int = 10, sort_by: str = "occurrences"):
        """Zeigt eine Zusammenfassung der häufigsten Fehler an."""
        if not self.db_path.exists():
            print("Keine Debugging-Datenbank gefunden. Führe zuerst das System aus, um Fehler zu sammeln.")
            return
        
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Hole Daten aus der Datenbank
        cursor.execute("""
        SELECT e.error_id, e.error_type, e.error_message, e.module_name, e.severity, 
               COUNT(f.id) as fix_count
        FROM error_knowledge e
        LEFT JOIN fix_strategies f ON e.error_id = f.error_id
        GROUP BY e.error_id
        """)
        
        results = cursor.fetchall()
        
        if not results:
            print("Keine Fehler in der Datenbank gefunden.")
            return
        
        # Konvertiere zu einer Liste von Dictionaries für einfachere Verarbeitung
        errors = []
        for row in results:
            error_id, error_type, error_message, module_name, severity, fix_count = row
            
            # Hole Statistiken
            stats_data = self.stats.stats.get(error_id, {})
            occurrences = stats_data.get("occurrences", 0)
            last_occurrence = stats_data.get("last_occurrence", "N/A")
            success_rate = 0
            
            if "fix_attempts" in stats_data and stats_data["fix_attempts"] > 0:
                success_rate = (stats_data.get("successful_fixes", 0) / 
                               stats_data["fix_attempts"]) * 100
            
            # Kürze lange Fehlermeldungen
            if error_message and len(error_message) > 50:
                error_message = error_message[:47] + "..."
            
            errors.append({
                "error_id": error_id,
                "error_type": error_type,
                "message": error_message,
                "module": module_name,
                "severity": severity,
                "occurrences": occurrences,
                "last_seen": last_occurrence,
                "fixes": fix_count,
                "success_rate": success_rate
            })
        
        # Sortiere nach dem angegebenen Feld
        if sort_by == "severity":
            severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "unknown": 4}
            errors.sort(key=lambda x: severity_order.get(x["severity"], 999))
        else:
            errors.sort(key=lambda x: x.get(sort_by, 0), reverse=True)
        
        # Begrenze auf die angegebene Anzahl
        errors = errors[:limit]
        
        # Formatiere die Ausgabe
        headers = ["Typ", "Modul", "Meldung", "Schwere", "Anzahl", "Fixes", "Erfolgsrate"]
        rows = [
            [
                e["error_type"], 
                e["module"], 
                e["message"], 
                e["severity"], 
                e["occurrences"], 
                e["fixes"],
                f"{e['success_rate']:.1f}%" if isinstance(e['success_rate'], (int, float)) else "N/A"
            ]
            for e in errors
        ]
        
        print("\n=== Fehler-Zusammenfassung ===\n")
        print(tabulate(rows, headers=headers, tablefmt="pretty"))
        print(f"\nTotal unique errors: {len(results)}")
        
        conn.close()
    
    def print_critical_issues(self):
        """Zeigt kritische Probleme basierend auf gesammelten Daten an."""
        report = get_debug_report()
        
        if not report["critical_errors"]:
            print("Keine kritischen Fehler gefunden.")
            return
        
        print("\n=== Kritische Probleme ===\n")
        
        for i, error in enumerate(report["critical_errors"]):
            print(f"{i+1}. {error['error_type']}: {error['error_message']}")
            print(f"   Module: {error['module_name']}")
            print(f"   Severity: {error['severity']}")
            print(f"   Root cause: {error['root_cause']}")
            
            if error["fix_strategy"]:
                print(f"   Fix verfügbar: {error['fix_strategy']['description']}")
                print(f"   Automatisch anwendbar: {'Ja' if error['fix_strategy']['automated'] else 'Nein'}")
            else:
                print("   Kein Fix verfügbar")
            
            print("")
    
    def print_module_health(self):
        """Analysiert die Gesundheit verschiedener Module basierend auf Fehlermustern."""
        error_patterns = self.stats.get_error_patterns()
        
        if not error_patterns:
            print("Keine Moduldaten verfügbar.")
            return
        
        print("\n=== Modul-Gesundheitsanalyse ===\n")
        
        # Sammle Modul-Statistiken
        module_stats = []
        for module, errors in error_patterns.items():
            error_count = len(errors)
            
            # Analysiere Schweregrade
            severities = {"critical": 0, "high": 0, "medium": 0, "low": 0, "unknown": 0}
            
            for error_id in errors:
                error_knowledge = self.kb.get_error_knowledge(error_id)
                if error_knowledge:
                    severity = error_knowledge["severity"]
                    severities[severity] = severities.get(severity, 0) + 1
            
            # Berechne Gesundheitsnote (0-100) basierend auf Fehleranzahl und Schweregrad
            health_score = 100
            health_score -= severities.get("critical", 0) * 20
            health_score -= severities.get("high", 0) * 10
            health_score -= severities.get("medium", 0) * 5
            health_score -= severities.get("low", 0) * 2
            health_score = max(0, health_score)
            
            module_stats.append({
                "module": module,
                "error_count": error_count,
                "critical": severities.get("critical", 0),
                "high": severities.get("high", 0),
                "medium": severities.get("medium", 0),
                "low": severities.get("low", 0),
                "health_score": health_score
            })
        
        # Sortiere nach Gesundheitsscore
        module_stats.sort(key=lambda x: x["health_score"])
        
        # Formatiere die Ausgabe
        headers = ["Modul", "Fehler", "Kritisch", "Hoch", "Mittel", "Niedrig", "Gesundheit"]
        rows = [
            [
                m["module"], 
                m["error_count"], 
                m["critical"], 
                m["high"], 
                m["medium"], 
                m["low"],
                f"{m['health_score']}%"
            ]
            for m in module_stats
        ]
        
        print(tabulate(rows, headers=headers, tablefmt="pretty"))
        
        # Problematische Module hervorheben
        problematic = [m for m in module_stats if m["health_score"] < 50]
        if problematic:
            print("\nProblematische Module, die Aufmerksamkeit benötigen:")
            for module in problematic:
                print(f" - {module['module']} (Gesundheit: {module['health_score']}%)")
                if module["critical"] > 0:
                    print(f"   * Hat {module['critical']} kritische Fehler!")
                
                # Empfehlungen basierend auf dem Score
                if module["health_score"] < 30:
                    print("   * Empfehlung: Vollständige Überarbeitung erforderlich")
                elif module["health_score"] < 50:
                    print("   * Empfehlung: Detaillierte Code-Review und Tests hinzufügen")
                else:
                    print("   * Empfehlung: Kleinere Verbesserungen zur Fehlerbehandlung")
    
    def generate_fix_recommendations(self):
        """Generiert Empfehlungen für unfixierte Fehler basierend auf Fehlermustern."""
        if not self.db_path.exists():
            print("Keine Debugging-Datenbank gefunden.")
            return
        
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Finde Fehler ohne Fix-Strategien
        cursor.execute("""
        SELECT e.error_id, e.error_type, e.error_message, e.module_name, e.root_cause
        FROM error_knowledge e
        LEFT JOIN (
            SELECT error_id, COUNT(*) as fix_count
            FROM fix_strategies
            GROUP BY error_id
        ) f ON e.error_id = f.error_id
        WHERE f.fix_count IS NULL OR f.fix_count = 0
        """)
        
        results = cursor.fetchall()
        
        if not results:
            print("Alle bekannten Fehler haben bereits Fix-Strategien.")
            return
        
        print("\n=== Fix-Empfehlungen ===\n")
        
        for i, (error_id, error_type, error_message, module_name, root_cause) in enumerate(results):
            print(f"{i+1}. {error_type} in {module_name}")
            print(f"   Meldung: {error_message}")
            print(f"   Ursache: {root_cause}")
            
            # Generiere empfohlenen Fix basierend auf dem Fehlertyp
            if error_type == "KeyError":
                print("   Empfohlener Fix: Exception-Handling für fehlende Schlüssel")
                print("""   Beispiel-Code:
    try:
        value = data[key]
    except KeyError:
        value = None  # oder ein Standardwert
                """)
            elif error_type == "TypeError":
                print("   Empfohlener Fix: Typüberprüfung vor der Verwendung")
                print("""   Beispiel-Code:
    if not isinstance(value, (int, float)):
        value = 0  # oder eine andere Konvertierung
                """)
            elif error_type == "ZeroDivisionError":
                print("   Empfohlener Fix: Überprüfung auf Null vor Division")
                print("""   Beispiel-Code:
    if denominator != 0:
        result = numerator / denominator
    else:
        result = float('inf')  # oder ein anderer Standardwert
                """)
            elif error_type == "IndexError":
                print("   Empfohlener Fix: Indexüberprüfung vor dem Zugriff")
                print("""   Beispiel-Code:
    if 0 <= index < len(array):
        value = array[index]
    else:
        value = None  # oder ein Standardwert
                """)
            elif "Timeout" in error_type or "timeout" in error_message.lower():
                print("   Empfohlener Fix: Verbesserte Timeout-Behandlung")
                print("""   Beispiel-Code:
    try:
        result = function_with_timeout(timeout=increased_timeout)
    except TimeoutError:
        result = cached_result or default_value
                """)
            else:
                print("   Empfohlener Fix: Geeignetes Exception-Handling implementieren")
                print("""   Beispiel-Code:
    try:
        # Risikobehafteter Code
    except Exception as e:
        logger.error(f"Fehler aufgetreten: {e}")
        # Geeignete Fallback-Logik
                """)
            
            print("")
        
        print(f"Total unfixierte Fehler: {len(results)}")
        conn.close()
    
    def print_performance_issues(self):
        """Identifiziert Performance-Probleme basierend auf Debugging-Daten."""
        if not self.db_path.exists():
            print("Keine Debugging-Datenbank gefunden.")
            return
        
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        print("\n=== Performance-Probleme ===\n")
        
        # Hier würden in einer vollständigen Implementierung Performance-Metriken
        # aus den Logging-Daten extrahiert werden. Als Beispiel:
        print("Top 5 häufigste Fehlerquellen (potenzielle Performance-Bottlenecks):")
        
        cursor.execute("""
        SELECT module_name, COUNT(*) as error_count 
        FROM error_knowledge 
        GROUP BY module_name 
        ORDER BY error_count DESC 
        LIMIT 5
        """)
        
        results = cursor.fetchall()
        
        if results:
            for i, (module, count) in enumerate(results):
                print(f"{i+1}. {module}: {count} Fehler")
        else:
            print("Keine Fehlerdaten verfügbar.")
        
        conn.close()
    
    def export_report(self, output_path: str = "logs/debug_report.json"):
        """Exportiert einen umfassenden Debugging-Bericht als JSON."""
        report = get_debug_report()
        
        # Erweitere den Bericht mit zusätzlichen Informationen
        error_patterns = self.stats.get_error_patterns()
        
        # Berechne Modul-Gesundheit
        module_health = {}
        for module, errors in error_patterns.items():
            critical_count = 0
            high_count = 0
            medium_count = 0
            low_count = 0
            
            for error_id in errors:
                error_knowledge = self.kb.get_error_knowledge(error_id)
                if error_knowledge:
                    severity = error_knowledge["severity"]
                    if severity == "critical":
                        critical_count += 1
                    elif severity == "high":
                        high_count += 1
                    elif severity == "medium":
                        medium_count += 1
                    elif severity == "low":
                        low_count += 1
            
            # Berechne Gesundheitsscore (0-100)
            health_score = 100
            health_score -= critical_count * 20
            health_score -= high_count * 10
            health_score -= medium_count * 5
            health_score -= low_count * 2
            health_score = max(0, health_score)
            
            module_health[module] = {
                "health_score": health_score,
                "error_count": len(errors),
                "critical_count": critical_count,
                "high_count": high_count,
                "medium_count": medium_count,
                "low_count": low_count
            }
        
        # Erweitere den Bericht
        report["module_health"] = module_health
        report["export_time"] = datetime.now().isoformat()
        
        # Speichere als JSON
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\nBericht exportiert nach: {output_path}")
        return output_path


def main():
    """Hauptfunktion für den Kommandozeilen-Zugriff."""
    parser = argparse.ArgumentParser(
        description="Adaptives Debugging-Analysewerkzeug für Insight Synergy",
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Befehl")
    
    # Befehl: summary
    summary_parser = subparsers.add_parser(
        "summary", 
        help="Zeigt eine Zusammenfassung der Fehler an"
    )
    summary_parser.add_argument(
        "--limit", type=int, default=10,
        help="Maximale Anzahl anzuzeigender Fehler (Standard: 10)"
    )
    summary_parser.add_argument(
        "--sort", choices=["occurrences", "severity", "fixes"], 
        default="occurrences",
        help="Sortierkriterium (Standard: occurrences)"
    )
    
    # Befehl: critical
    subparsers.add_parser(
        "critical", 
        help="Listet kritische Probleme auf"
    )
    
    # Befehl: modules
    subparsers.add_parser(
        "modules", 
        help="Analysiert die Gesundheit der Module"
    )
    
    # Befehl: fixes
    subparsers.add_parser(
        "fixes", 
        help="Generiert Fix-Empfehlungen für unfixierte Fehler"
    )
    
    # Befehl: performance
    subparsers.add_parser(
        "performance", 
        help="Identifiziert Performance-Probleme"
    )
    
    # Befehl: export
    export_parser = subparsers.add_parser(
        "export", 
        help="Exportiert einen vollständigen Bericht"
    )
    export_parser.add_argument(
        "--output", type=str, default="logs/debug_report.json",
        help="Pfad für die Export-Datei (Standard: logs/debug_report.json)"
    )
    
    # Befehl: all
    subparsers.add_parser(
        "all", 
        help="Führt alle Analysen durch und erstellt einen Bericht"
    )
    
    args = parser.parse_args()
    
    analyzer = DebugAnalyzer()
    
    if args.command == "summary":
        analyzer.print_error_summary(limit=args.limit, sort_by=args.sort)
    
    elif args.command == "critical":
        analyzer.print_critical_issues()
    
    elif args.command == "modules":
        analyzer.print_module_health()
    
    elif args.command == "fixes":
        analyzer.generate_fix_recommendations()
    
    elif args.command == "performance":
        analyzer.print_performance_issues()
    
    elif args.command == "export":
        analyzer.export_report(output_path=args.output)
    
    elif args.command == "all" or args.command is None:
        print("\n===== Umfassende Debugging-Analyse =====\n")
        
        analyzer.print_error_summary()
        analyzer.print_critical_issues()
        analyzer.print_module_health()
        analyzer.generate_fix_recommendations()
        analyzer.print_performance_issues()
        
        report_path = analyzer.export_report()
        print(f"\nVollständiger Bericht wurde nach {report_path} exportiert.")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main() 