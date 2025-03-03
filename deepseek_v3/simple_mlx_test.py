#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Einfacher MLX-Test für Apple Silicon
====================================

Diese Datei testet die grundlegenden MLX-Funktionen auf Apple Silicon,
ohne die komplexeren Komponenten wie mlx-lm oder transformers.
"""

import os
import sys
import time
import logging
import platform
from datetime import datetime
from typing import Dict, Any, List

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("mlx-basic-test")

def test_mlx_basic():
    """Testet die grundlegenden MLX-Funktionen ohne LLM-Komponenten."""
    logger.info("Starte einfachen MLX-Test")
    logger.info(f"System: {platform.system()} {platform.release()} ({platform.machine()})")
    logger.info(f"Python-Version: {platform.python_version()}")
    
    try:
        # Teste, ob MLX installiert ist
        logger.info("Prüfe MLX-Installation...")
        import mlx
        import mlx.core as mx
        import mlx.nn as nn
        logger.info(f"MLX Version: {mx.__version__}")
        
        # Einfacher MLX-Array-Operationstest
        logger.info("Führe einfache MLX-Array-Operationen aus...")
        x = mx.array([1, 2, 3, 4])
        y = mx.array([5, 6, 7, 8])
        z = x + y
        logger.info(f"Array-Test: {x} + {y} = {z}")
        
        # Matrix-Multiplikation
        logger.info("Teste Matrix-Multiplikation...")
        a = mx.random.normal((3, 4))
        b = mx.random.normal((4, 5))
        c = mx.matmul(a, b)
        logger.info(f"Matrix-Multiplikation: Formt von a={a.shape}, b={b.shape} → c={c.shape}")
        
        # Einfaches MLX-Modell erstellen
        logger.info("Erstelle einfaches neuronales Netzwerk...")
        
        class SimpleNN(nn.Module):
            def __init__(self, input_dim, hidden_dim, output_dim):
                super().__init__()
                self.fc1 = nn.Linear(input_dim, hidden_dim)
                self.fc2 = nn.Linear(hidden_dim, output_dim)
                
            def __call__(self, x):
                x = self.fc1(x)
                x = mx.maximum(0, x)  # ReLU
                x = self.fc2(x)
                return x
        
        input_dim = 5
        hidden_dim = 10
        output_dim = 2
        
        model = SimpleNN(input_dim, hidden_dim, output_dim)
        
        # Testinput erzeugen
        test_input = mx.random.normal((2, input_dim))
        
        # Forward pass
        logger.info("Führe Forward-Pass durch...")
        output = model(test_input)
        logger.info(f"Modellausgabe-Form: {output.shape}")
        
        # Geschwindigkeit testen
        logger.info("Teste MLX-Geschwindigkeit mit einer größeren Matrix-Multiplikation...")
        
        # Größere Matrices für Geschwindigkeitstest
        size = 1000
        start_time = time.time()
        
        big_a = mx.random.normal((size, size))
        big_b = mx.random.normal((size, size))
        big_c = mx.matmul(big_a, big_b)
        
        # Force evaluation (MLX ist lazy)
        _ = big_c.tolist()
        
        end_time = time.time()
        logger.info(f"Große {size}x{size} Matrix-Multiplikation: {end_time - start_time:.4f} Sekunden")
        
        logger.info("MLX-Test erfolgreich abgeschlossen!")
        return True
    
    except ImportError as e:
        logger.error(f"MLX oder eine erforderliche Bibliothek konnte nicht importiert werden: {e}")
        logger.error("Bitte installieren Sie MLX mit: pip install mlx")
        return False
    
    except Exception as e:
        logger.error(f"Unerwarteter Fehler: {e}")
        logger.error(f"Fehlertyp: {type(e).__name__}")
        return False

def get_system_info() -> Dict[str, Any]:
    """Sammelt Systeminformationen für Diagnose."""
    info = {
        "os": platform.system(),
        "os_version": platform.release(),
        "architecture": platform.machine(),
        "python_version": platform.python_version(),
        "timestamp": datetime.now().isoformat()
    }
    
    # Prüfe, ob Apple Silicon
    if platform.system() == "Darwin" and platform.machine() == "arm64":
        info["is_apple_silicon"] = True
    else:
        info["is_apple_silicon"] = False
    
    # Speicherplatz prüfen
    if platform.system() == "Darwin":
        try:
            import shutil
            total, used, free = shutil.disk_usage("/")
            info["disk_total_gb"] = total / (1024**3)
            info["disk_free_gb"] = free / (1024**3)
        except:
            pass
    
    return info

def main():
    """Hauptfunktion zum Testen von MLX."""
    print("\n" + "=" * 70)
    print(f"MLX-Basistest - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70 + "\n")
    
    # Systeminfo anzeigen
    system_info = get_system_info()
    print("Systeminformationen:")
    print(f"  Betriebssystem:  {system_info['os']} {system_info['os_version']}")
    print(f"  Architektur:     {system_info['architecture']}")
    print(f"  Python-Version:  {system_info['python_version']}")
    print(f"  Apple Silicon:   {'Ja' if system_info.get('is_apple_silicon') else 'Nein'}")
    
    if "disk_total_gb" in system_info:
        print(f"  Speicherplatz:   {system_info['disk_free_gb']:.1f} GB frei " + 
              f"von {system_info['disk_total_gb']:.1f} GB")
    
    # MLX Version prüfen
    try:
        import mlx.core as mx
        mlx_version = mx.__version__
        print(f"  MLX Version:     {mlx_version}")
    except ImportError:
        print("  MLX Version:     Nicht installiert")
    except Exception as e:
        print(f"  MLX Version:     Fehler beim Prüfen: {e}")
    
    print()
    
    # MLX-Test durchführen
    success = test_mlx_basic()
    
    print("\n" + "=" * 70)
    if success:
        print("✅ Test erfolgreich abgeschlossen! MLX funktioniert korrekt auf diesem System.")
    else:
        print("❌ Test fehlgeschlagen. Bitte prüfen Sie die Fehlerausgaben.")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main() 