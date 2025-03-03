#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
DeepSeek-V3-4bit Modelltest

Dieser Test überprüft, ob das DeepSeek-V3-4bit Modell korrekt geladen werden kann
und basale Textgenerierung durchführen kann. Der Test verwendet mlx-lm für die 
Modellausführung auf Apple Silicon.
"""

import os
import sys
import time
import logging
import platform
import asyncio
import importlib.metadata
from typing import Dict, Any, List, Optional
from datetime import datetime
import traceback

# Logging-Konfiguration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("DeepSeek-V3-Test")

# Konfiguration
MODEL_NAME = "mlx-community/DeepSeek-V3-4bit"
MAX_TOKENS = 100
TEMPERATURE = 0.7
TEST_PROMPT = "Erkläre den Unterschied zwischen künstlicher Intelligenz und maschinellem Lernen in drei Sätzen."

async def test_deepseek_v3():
    """Testet die Funktionalität des DeepSeek-V3-4bit Modells."""
    logger.info("Starte DeepSeek-V3-4bit Test...")
    
    try:
        # Überprüfe MLX-Installation
        import mlx.core as mx
        logger.info(f"MLX Version: {mx.__version__}")
        
        # Führe eine einfache MLX-Operation durch, um zu bestätigen, dass MLX funktioniert
        a = mx.array([1, 2, 3])
        b = mx.array([4, 5, 6])
        result = a + b
        logger.info(f"MLX Array-Addition Test: {a} + {b} = {result}")
        logger.info("MLX ist korrekt installiert und funktionsfähig.")
        
        # Überprüfe, ob mlx-lm installiert ist
        try:
            from mlx_lm import load, generate
            logger.info("MLX-LM ist korrekt installiert.")
            
            # Lade das DeepSeek-V3-4bit Modell
            logger.info(f"Versuche, das DeepSeek-V3-4bit Modell zu laden: {MODEL_NAME}")
            start_time = time.time()
            
            # Modell laden
            model, tokenizer = load(MODEL_NAME)
            model_load_time = time.time() - start_time
            logger.info(f"Modell erfolgreich geladen in {model_load_time:.2f} Sekunden.")
            
            # Teste die Textgenerierung
            logger.info("Teste Textgenerierung mit dem Prompt:")
            logger.info(f"\"{TEST_PROMPT}\"")
            
            # Generiere Text
            generation_start_time = time.time()
            result = generate(model, tokenizer, prompt=TEST_PROMPT, max_tokens=MAX_TOKENS, temp=TEMPERATURE)
            generation_time = time.time() - generation_start_time
            
            logger.info(f"Generierter Text ({generation_time:.2f} Sekunden):")
            logger.info("-" * 50)
            logger.info(result)
            logger.info("-" * 50)
            
            # Teste Streaming-Generierung, falls implementiert
            logger.info("Teste Streaming-Textgenerierung...")
            try:
                from mlx_lm.utils import generate_step
                
                tokens = tokenizer.encode(TEST_PROMPT)
                tokens = mx.array([tokenizer.bos_id] + tokens)
                
                logger.info("Streaming-Output:")
                logger.info("-" * 50)
                
                streaming_start_time = time.time()
                generated_text = ""
                
                for i in range(MAX_TOKENS):
                    logits = model.forward(tokens)
                    next_token = generate_step(
                        logits[-1],
                        temperature=TEMPERATURE,
                    )
                    tokens = mx.concatenate([tokens, mx.array([next_token])])
                    
                    new_text = tokenizer.decode(tokens[-1:].tolist())
                    generated_text += new_text
                    print(new_text, end="", flush=True)
                    
                    # Überprüfe auf EOS-Token
                    if next_token == tokenizer.eos_id:
                        break
                
                streaming_time = time.time() - streaming_start_time
                print("\n")
                logger.info("-" * 50)
                logger.info(f"Streaming abgeschlossen in {streaming_time:.2f} Sekunden.")
                
            except (ImportError, AttributeError) as e:
                logger.warning(f"Streaming-Test übersprungen: {str(e)}")
                
            # Test abgeschlossen
            logger.info("DeepSeek-V3-4bit Test erfolgreich abgeschlossen.")
            return True
            
        except ImportError as e:
            logger.error(f"mlx-lm ist nicht installiert: {str(e)}")
            logger.error("Bitte installieren Sie mlx-lm: pip install mlx-lm")
            return False
        except Exception as e:
            logger.error(f"Fehler beim Laden oder Verwenden des DeepSeek-V3-4bit Modells: {str(e)}")
            logger.error(traceback.format_exc())
            return False
    
    except ImportError as e:
        logger.error(f"MLX ist nicht verfügbar: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unerwarteter Fehler: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def get_system_info() -> Dict[str, Any]:
    """Sammelt Systeminformationen."""
    info = {
        "os": platform.system(),
        "os_version": platform.version(),
        "architecture": platform.machine(),
        "python_version": platform.python_version(),
        "timestamp": datetime.now().isoformat(),
    }
    
    # Prüfe, ob es ein Apple Silicon Mac ist
    is_apple_silicon = (platform.system() == "Darwin" and platform.machine() == "arm64")
    info["is_apple_silicon"] = is_apple_silicon
    
    # Prüfe verfügbaren Speicher
    try:
        import shutil
        total, used, free = shutil.disk_usage("/")
        info["disk_total_gb"] = round(total / (2**30), 2)
        info["disk_free_gb"] = round(free / (2**30), 2)
    except Exception as e:
        logger.warning(f"Konnte Speicherinformationen nicht abrufen: {str(e)}")
    
    # Prüfe, ob MLX installiert ist
    try:
        import mlx.core as mx
        info["mlx_version"] = mx.__version__
        info["has_mlx"] = True
    except ImportError:
        info["has_mlx"] = False
        info["mlx_version"] = None
    
    # Prüfe, ob mlx-lm installiert ist
    try:
        import mlx_lm
        info["has_mlx_lm"] = True
        # mlx-lm hat möglicherweise keine __version__ Variable
        try:
            info["mlx_lm_version"] = mlx_lm.__version__
        except AttributeError:
            try:
                info["mlx_lm_version"] = importlib.metadata.version("mlx-lm")
            except importlib.metadata.PackageNotFoundError:
                info["mlx_lm_version"] = "Unbekannt"
    except ImportError:
        info["has_mlx_lm"] = False
        info["mlx_lm_version"] = None
    
    return info

async def main():
    """Hauptfunktion zum Ausführen des Tests."""
    logger.info("=" * 60)
    logger.info("DeepSeek-V3-4bit Modelltest")
    logger.info("=" * 60)
    
    # Systeminformationen abrufen und anzeigen
    system_info = get_system_info()
    logger.info("Systeminformationen:")
    for key, value in system_info.items():
        logger.info(f"  {key}: {value}")
    
    # Führe den Test aus
    start_time = time.time()
    success = await test_deepseek_v3()
    elapsed_time = time.time() - start_time
    
    # Zeige Ergebnis an
    logger.info("=" * 60)
    if success:
        logger.info(f"Test ERFOLGREICH abgeschlossen in {elapsed_time:.2f} Sekunden.")
    else:
        logger.info(f"Test FEHLGESCHLAGEN nach {elapsed_time:.2f} Sekunden.")
    logger.info("=" * 60)

if __name__ == "__main__":
    asyncio.run(main()) 