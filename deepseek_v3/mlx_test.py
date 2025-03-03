#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MLX DeepSeek-V3-4bit Testdatei
==============================

Diese Datei testet die grundlegenden MLX-Funktionen und versucht,
das mlx-community/DeepSeek-V3-4bit Modell zu laden und zu verwenden.
"""

import os
import sys
import time
import logging
import platform
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List

# Konfiguration
MODEL_NAME = "mlx-community/DeepSeek-V3-4bit"
MAX_TOKENS = 256
TEMPERATURE = 0.7

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("mlx-test")

async def test_mlx():
    """Testet die grundlegenden MLX-Funktionen und versucht, das DeepSeek-V3-4bit Modell zu laden."""
    logger.info(f"Starte MLX-Test für {MODEL_NAME}")
    logger.info(f"System: {platform.system()} {platform.release()} ({platform.machine()})")
    logger.info(f"Python-Version: {platform.python_version()}")
    
    try:
        # Teste, ob MLX installiert ist
        logger.info("Prüfe MLX-Installation...")
        import mlx
        import mlx.core as mx
        logger.info(f"MLX Version: {mx.__version__}")
        
        # Einfacher MLX-Operationstest
        logger.info("Führe einfache MLX-Operationen aus...")
        x = mx.array([1, 2, 3, 4])
        y = mx.array([5, 6, 7, 8])
        z = x + y
        logger.info(f"MLX Test: {x} + {y} = {z}")
        
        # Teste, ob mlx-lm installiert ist
        logger.info("Prüfe mlx-lm Installation...")
        try:
            import mlx_lm
            logger.info(f"MLX-LM Version: {mlx_lm.__version__}")
        except ImportError as e:
            logger.error(f"MLX-LM konnte nicht importiert werden: {e}")
            logger.error("Bitte installieren Sie mlx-lm mit: pip install mlx-lm")
            return False
        
        # Versuche, das Modell zu laden
        logger.info(f"Versuche, das Modell {MODEL_NAME} zu laden...")
        start_time = time.time()
        
        try:
            from mlx_lm.utils import load
            model, tokenizer = load(MODEL_NAME)
            load_time = time.time() - start_time
            logger.info(f"Modell in {load_time:.2f} Sekunden geladen!")
            
            # Versuche, Text zu generieren
            logger.info("Versuche, Text zu generieren...")
            test_prompt = "Erkläre mir, was Künstliche Intelligenz ist, in drei Sätzen:"
            
            logger.info(f"Prompt: {test_prompt}")
            start_time = time.time()
            
            from mlx_lm.utils import generate
            generation_result = generate(
                model=model,
                tokenizer=tokenizer,
                prompt=test_prompt,
                max_tokens=MAX_TOKENS,
                temp=TEMPERATURE
            )
            
            generation_time = time.time() - start_time
            logger.info(f"Text in {generation_time:.2f} Sekunden generiert!")
            logger.info(f"Generierter Text: {generation_result}")
            
            # Versuche, Text zu streamen
            logger.info("Versuche, Text zu streamen...")
            test_prompt = "Schreibe ein kurzes Gedicht über Künstliche Intelligenz:"
            
            logger.info(f"Prompt: {test_prompt}")
            start_time = time.time()
            
            from mlx_lm.utils import stream_generate
            logger.info("Ausgabe:")
            print(f"\n{test_prompt}")
            
            for token in stream_generate(
                model=model,
                tokenizer=tokenizer,
                prompt=test_prompt,
                max_tokens=MAX_TOKENS,
                temp=TEMPERATURE
            ):
                print(token, end="", flush=True)
            
            print("\n")
            generation_time = time.time() - start_time
            logger.info(f"Streaming in {generation_time:.2f} Sekunden abgeschlossen!")
            
            logger.info("MLX-Test erfolgreich abgeschlossen!")
            return True
        
        except ImportError as e:
            logger.error(f"Import-Fehler: {e}")
            logger.error("Die mlx-lm Bibliothek scheint Probleme zu haben.")
            if "huggingface_hub" in str(e):
                logger.info("Versuche, huggingface_hub zu installieren...")
                import subprocess
                subprocess.run([sys.executable, "-m", "pip", "install", "huggingface_hub"], check=True)
                logger.info("Bitte starten Sie den Test erneut.")
            return False
        
        except Exception as e:
            logger.error(f"Fehler beim Laden des Modells: {e}")
            logger.error(f"Fehlertyp: {type(e).__name__}")
            return False
    
    except ImportError as e:
        logger.error(f"MLX oder eine erforderliche Bibliothek konnte nicht importiert werden: {e}")
        logger.error("Bitte installieren Sie MLX mit: pip install mlx")
        logger.error("Und mlx-lm mit: pip install mlx-lm")
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
    
    # Prüfe installierten Pakete
    try:
        import pkg_resources
        packages = {pkg.key: pkg.version for pkg in pkg_resources.working_set}
        info["packages"] = packages
        
        # MLX Version prüfen
        info["mlx_installed"] = "mlx" in packages
        info["mlx_version"] = packages.get("mlx", "nicht installiert")
        
        # MLX-LM Version prüfen
        info["mlx_lm_installed"] = "mlx-lm" in packages
        info["mlx_lm_version"] = packages.get("mlx-lm", "nicht installiert")
    except:
        info["packages"] = "Konnte Paketinformationen nicht abrufen"
    
    return info

async def main():
    """Hauptfunktion zum Testen von MLX und DeepSeek-V3-4bit."""
    print("\n" + "=" * 70)
    print(f"MLX DeepSeek-V3-4bit Test - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70 + "\n")
    
    # Systeminfo anzeigen
    system_info = get_system_info()
    print("Systeminformationen:")
    print(f"  Betriebssystem:  {system_info['os']} {system_info['os_version']}")
    print(f"  Architektur:     {system_info['architecture']}")
    print(f"  Python-Version:  {system_info['python_version']}")
    print(f"  Apple Silicon:   {'Ja' if system_info.get('is_apple_silicon') else 'Nein'}")
    
    # MLX Version prüfen
    try:
        import mlx.core as mx
        mlx_version = mx.__version__
        print(f"  MLX Version:     {mlx_version}")
    except ImportError:
        print("  MLX Version:     Nicht installiert")
    except Exception as e:
        print(f"  MLX Version:     Fehler beim Prüfen: {e}")
    
    # MLX-LM Version prüfen
    try:
        import mlx_lm
        mlx_lm_version = mlx_lm.__version__
        print(f"  MLX-LM Version:  {mlx_lm_version}")
    except ImportError:
        print("  MLX-LM Version:  Nicht installiert")
    except Exception as e:
        print(f"  MLX-LM Version:  Fehler beim Prüfen: {e}")
    
    print()
    
    # MLX-Test durchführen
    success = await test_mlx()
    
    print("\n" + "=" * 70)
    if success:
        print("✅ Test erfolgreich abgeschlossen! MLX und DeepSeek-V3-4bit funktionieren.")
    else:
        print("❌ Test fehlgeschlagen. Bitte prüfen Sie die Fehlerausgaben.")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    asyncio.run(main()) 