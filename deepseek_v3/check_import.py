#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Modultests für mlx-lm Import

Dieser Test überprüft verschiedene Möglichkeiten, wie das mlx-lm Modul importiert werden kann
und welche Fehler auftreten, falls es nicht gefunden wird.
"""

import sys
import os
import importlib
import importlib.util
import traceback
import pkgutil

print(f"Python Version: {sys.version}")
print(f"Aktuelles Verzeichnis: {os.getcwd()}")
print(f"PYTHONPATH: {sys.path}")

print("\n=== Teste verschiedene Import-Varianten ===")

# Variante 1: Direkter Import
print("\n== Versuch 1: import mlx_lm ==")
try:
    import mlx_lm
    print(f"✅ mlx_lm erfolgreich importiert: {mlx_lm.__file__}")
    print(f"Version: {getattr(mlx_lm, '__version__', 'Keine Version gefunden')}")
except ImportError as e:
    print(f"❌ Import fehlgeschlagen: {e}")
    print(traceback.format_exc())

# Variante 2: Import mit Bindestrich
print("\n== Versuch 2: import mlx-lm (mit importlib) ==")
try:
    mod = importlib.import_module("mlx-lm")
    print(f"✅ mlx-lm erfolgreich importiert: {mod.__file__}")
except ImportError as e:
    print(f"❌ Import fehlgeschlagen: {e}")
    print(traceback.format_exc())

# Variante 3: Überprüfe, ob Modul gefunden werden kann
print("\n== Versuch 3: importlib.util.find_spec ==")
spec1 = importlib.util.find_spec("mlx_lm")
spec2 = importlib.util.find_spec("mlx-lm")
print(f"mlx_lm spec: {spec1}")
print(f"mlx-lm spec: {spec2}")

# Variante 4: Liste aller installierten Module
print("\n== Versuch 4: Liste aller verfügbaren Module ==")
print("Module, die 'mlx' enthalten:")
for module in pkgutil.iter_modules():
    if "mlx" in module.name:
        print(f"  {module.name}")

# Variante 5: Überprüfe site-packages Verzeichnis
print("\n== Versuch 5: Prüfe site-packages Verzeichnis ==")
site_packages = [p for p in sys.path if "site-packages" in p]
for sp in site_packages:
    print(f"Inhalt von {sp}:")
    try:
        files = os.listdir(sp)
        mlx_files = [f for f in files if "mlx" in f.lower()]
        for f in mlx_files:
            print(f"  {f}")
    except Exception as e:
        print(f"  Fehler beim Lesen des Verzeichnisses: {e}")

print("\n== Import-Test abgeschlossen ==") 