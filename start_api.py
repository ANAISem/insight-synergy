#!/usr/bin/env python3
"""
Einfaches Startskript für die Insight Synergy API.
Dieses Skript startet die API und gibt ausführliche Fehlerinformationen aus.
"""

import os
import sys
import traceback

# Python-Pfad anpassen
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Umgebungsvariablen setzen
os.environ["LOG_LEVEL"] = "DEBUG"
os.environ["PYTHONPATH"] = current_dir

try:
    # Banner ausgeben
    print("=" * 70)
    print("INSIGHT SYNERGY API".center(70))
    print("=" * 70)
    print(f"Python-Version: {sys.version}")
    print(f"Arbeitsverzeichnis: {os.getcwd()}")
    print(f"Python-Pfad: {sys.path}")
    print("-" * 70)
    
    # Hauptanwendung importieren und starten
    from nexus_backend.app import create_app
    import uvicorn
    
    print("Erstelle Anwendung...")
    app = create_app()
    
    print("Starte Server...")
    uvicorn.run(
        app, 
        host="0.0.0.0",
        port=8000,
        log_level="debug"
    )

except ImportError as e:
    print(f"\n❌ FEHLER BEIM IMPORT: {e}")
    print("\nDetails zum Fehler:")
    traceback.print_exc()
    
    # Versuche festzustellen, welches Modul fehlt
    missing_module = str(e).split("'")[1] if "'" in str(e) else str(e)
    print(f"\nHinweis: Möglicherweise fehlt das Modul '{missing_module}'.")
    print(f"Versuche: pip install {missing_module}")
    
except Exception as e:
    print(f"\n❌ ALLGEMEINER FEHLER: {e}")
    print("\nDetails zum Fehler:")
    traceback.print_exc()

print("\nServer beendet.") 