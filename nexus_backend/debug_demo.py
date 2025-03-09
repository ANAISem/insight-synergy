#!/usr/bin/env python3
"""
Demonstrationsskript für das adaptive Debugging-System.

Dieses Skript zeigt die verschiedenen Funktionen des adaptiven Debugging-Systems:
1. Fehleraufzeichnung und -analyse
2. Automatische Fehlerbehebung
3. Generierung von Debuggingberichten
"""

import os
import sys
import time
import random
import argparse
from typing import Dict, List, Any, Optional

# Stelle sicher, dass das Root-Verzeichnis im Python-Pfad ist
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from nexus_backend.utils.adaptive_debug import (
    debug_function, debug_class, register_fix, get_debug_report
)
from nexus_backend.utils.debug_example import (
    divide_numbers, DataProcessor, unreliable_network_call,
    register_known_fixes, run_examples
)
from nexus_backend.utils.debug_analyzer import DebugAnalyzer


def clear_screen():
    """Löscht den Bildschirm für eine bessere Darstellung."""
    os.system('cls' if os.name == 'nt' else 'clear')


def show_header(title: str):
    """Zeigt eine formatierte Überschrift an."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60 + "\n")


def demonstrate_basic_debugging():
    """Demonstriert grundlegende Debugging-Funktionen."""
    show_header("Demonstration grundlegender Debugging-Funktionen")
    
    print("1. Fehler bei Division durch Null:")
    try:
        result = divide_numbers(10, 0)
        print(f"  Ergebnis: {result}")
    except Exception as e:
        print(f"  Fehler: {e}")
    
    print("\n2. Fehler mit automatischem Fix:")
    # Registriere den Fix für division_by_zero
    register_fix(
        "f1852b366fb08dc794d9932bed21d951",  # Beispiel-ID
        "Verhindert Division durch Null durch Rückgabe von Unendlich",
        """
def fix_function(a, b):
    # Verhindere Division durch Null
    if b == 0:
        print("Automatischer Fix angewendet: Vermeide Division durch Null")
        return float('inf') if a >= 0 else float('-inf')
    return a / b
""",
        automated=True
    )
    
    try:
        result = divide_numbers(10, 0)
        print(f"  Ergebnis mit Auto-Fix: {result}")
    except Exception as e:
        print(f"  Fehler trotz Fix-Versuch: {e}")
    
    print("\n3. Demonstriere Debugging einer Klasse:")
    processor = DataProcessor({"a": 5, "b": 10})
    
    try:
        result = processor.process_item("c")
        print(f"  Ergebnis: {result}")
    except Exception as e:
        print(f"  Fehler: {e}")


def demonstrate_error_patterns():
    """Demonstriert Fehlermuster und Analysen."""
    show_header("Fehlermuster und Analysefunktionen")
    
    print("Generiere verschiedene Fehlertypen für die Analyse...")
    
    # Verwende unreliable_network_call, um verschiedene Fehler zu erzeugen
    for i in range(5):
        try:
            result = unreliable_network_call(f"api.example.com/endpoint{i}", timeout=0.1)
            print(f"  Aufruf {i+1}: Erfolgreich")
        except Exception as e:
            print(f"  Aufruf {i+1}: Fehler - {type(e).__name__}")
    
    # Generiere weitere Fehlertypen
    errors = [
        lambda: divide_numbers(10, 0),
        lambda: divide_numbers(10, "string"),  # TypeError
        lambda: DataProcessor().process_item("missing"),  # KeyError
        lambda: [1, 2, 3][5],  # IndexError
        lambda: open("nicht_existierende_datei.txt"),  # FileNotFoundError
    ]
    
    for i, error_func in enumerate(errors):
        try:
            error_func()
        except Exception as e:
            print(f"  Fehler {i+1}: {type(e).__name__} - {e}")
    
    print("\nEin Debug-Bericht wird erstellt...")
    report = get_debug_report()
    print(f"  Erfasste Fehlertypen: {report['total_error_types']}")
    print(f"  Kritische Fehler: {len(report['critical_errors'])}")


def demonstrate_analyzer():
    """Demonstriert den Debug-Analyzer."""
    show_header("Debug-Analyzer Funktionen")
    
    analyzer = DebugAnalyzer()
    
    print("1. Fehler-Zusammenfassung:")
    analyzer.print_error_summary(limit=5)
    
    print("\n2. Module-Gesundheit:")
    analyzer.print_module_health()
    
    print("\n3. Fix-Empfehlungen:")
    analyzer.generate_fix_recommendations()
    
    print("\n4. Performance-Probleme:")
    analyzer.print_performance_issues()
    
    print("\n5. Exportiere vollständigen Bericht:")
    report_path = analyzer.export_report()
    print(f"  Bericht wurde nach {report_path} exportiert")


def demonstrate_full_cycle():
    """Demonstriert den vollständigen Debugging-Zyklus."""
    show_header("Vollständiger adaptiver Debugging-Zyklus")
    
    # 1. Registriere bekannte Fixes
    print("1. Registriere bekannte Fix-Strategien")
    register_known_fixes()
    
    # 2. Führe Code mit Fehlern aus
    print("\n2. Führe Code mit möglichen Fehlern aus")
    for i in range(3):
        try:
            if i == 0:
                divide_numbers(10, 0)
            elif i == 1:
                processor = DataProcessor({"a": 1})
                processor.calculate_average(["a", "b"])
            else:
                unreliable_network_call("api.example.com/data")
        except Exception as e:
            print(f"  Fehler {i+1}: {type(e).__name__} - {e}")
    
    # 3. Analysiere gesammelte Debugging-Daten
    print("\n3. Analysiere gesammelte Debugging-Daten")
    analyzer = DebugAnalyzer()
    analyzer.print_error_summary(limit=3)
    
    # 4. Generiere Fix-Empfehlungen
    print("\n4. Generiere Fix-Empfehlungen")
    analyzer.generate_fix_recommendations()
    
    # 5. Wende Fixes an
    print("\n5. Wende Fixes automatisch an")
    try:
        result = divide_numbers(10, 0)
        print(f"  Fix erfolgreich: divide_numbers(10, 0) = {result}")
    except Exception as e:
        print(f"  Fix fehlgeschlagen: {e}")
    
    # 6. Überprüfe Ergebnisse
    print("\n6. Überprüfe Ergebnisse und erstelle Bericht")
    report = get_debug_report()
    print(f"  Erfasste Fehlertypen: {report['total_error_types']}")
    if report["critical_errors"]:
        print(f"  Kritische Fehler: {len(report['critical_errors'])}")
        for i, error in enumerate(report["critical_errors"]):
            print(f"    {i+1}. {error['error_type']} in {error['module_name']}")
    else:
        print("  Keine kritischen Fehler gefunden")


def main():
    """Hauptfunktion für das Demo-Skript."""
    parser = argparse.ArgumentParser(
        description="Demonstriert das adaptive Debugging-System"
    )
    
    parser.add_argument(
        "--mode", type=str, choices=["basic", "patterns", "analyzer", "full", "all"],
        default="all", help="Welcher Demo-Modus ausgeführt werden soll"
    )
    
    args = parser.parse_args()
    
    clear_screen()
    show_header("Adaptive Debugging System - Demonstration")
    print("Diese Demo zeigt die Funktionen des adaptiven Debugging-Systems.\n")
    
    if args.mode == "basic" or args.mode == "all":
        demonstrate_basic_debugging()
        if args.mode == "all":
            input("\nDrücke Enter, um fortzufahren...")
            clear_screen()
    
    if args.mode == "patterns" or args.mode == "all":
        demonstrate_error_patterns()
        if args.mode == "all":
            input("\nDrücke Enter, um fortzufahren...")
            clear_screen()
    
    if args.mode == "analyzer" or args.mode == "all":
        demonstrate_analyzer()
        if args.mode == "all":
            input("\nDrücke Enter, um fortzufahren...")
            clear_screen()
    
    if args.mode == "full" or args.mode == "all":
        demonstrate_full_cycle()
    
    print("\n" + "=" * 60)
    print("  Demo abgeschlossen!")
    print("=" * 60)


if __name__ == "__main__":
    main() 