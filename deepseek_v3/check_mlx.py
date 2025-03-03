#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MLX Überprüfungsskript
Dieses Skript überprüft, ob MLX korrekt installiert ist und auf dem System funktioniert.
"""

import os
import sys
import platform
import time
from datetime import datetime

# Versuche MLX zu importieren
try:
    print("Versuche MLX zu importieren...")
    import mlx.core as mx
    print(f"MLX Version: {mx.__version__} erfolgreich importiert!")
    
    # Führe eine einfache MLX-Operation durch
    a = mx.array([1, 2, 3])
    b = mx.array([4, 5, 6])
    result = a + b
    print(f"MLX Test erfolgreich: {a} + {b} = {result}")
    
    # Überprüfe Temp-Verzeichniszugriff
    temp_dir = "/tmp/mlx_models"
    os.makedirs(temp_dir, exist_ok=True)
    print(f"Temp-Verzeichnis {temp_dir} erstellt/überprüft")
    
    # Versuche, eine kleine Datei im Temp-Verzeichnis zu schreiben
    test_file = os.path.join(temp_dir, "test_file.txt")
    with open(test_file, "w") as f:
        f.write(f"MLX Test: {datetime.now().isoformat()}")
    print(f"Test-Datei erfolgreich erstellt: {test_file}")
    
    # Lese die Datei wieder
    with open(test_file, "r") as f:
        content = f.read()
    print(f"Dateiinhalt: {content}")
    
    # Systeminformationen
    print("\nSysteminformationen:")
    print(f"OS: {platform.system()} {platform.version()}")
    print(f"Python: {platform.python_version()}")
    print(f"Architektur: {platform.machine()}")
    
    # Überprüfe, ob es ein Apple Silicon Mac ist
    is_apple_silicon = (platform.system() == "Darwin" and platform.machine() == "arm64")
    print(f"Apple Silicon: {is_apple_silicon}")
    
    print("\nTest ERFOLGREICH abgeschlossen!")
    
except ImportError as e:
    print(f"MLX konnte nicht importiert werden: {e}")
    print("Bitte installieren Sie MLX mit 'pip install mlx'")
    sys.exit(1)
    
except Exception as e:
    print(f"Fehler beim Testen von MLX: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1) 