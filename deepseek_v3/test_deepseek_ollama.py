#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
DeepSeek-V3 Testskript für Ollama-Integration
Dieses Skript testet die Integration des DeepSeek-V3-Modells mit dem Ollama-Dienst
"""

import os
import sys
import time
import asyncio
from datetime import datetime

# Füge den Pfad zum Ollama-Service hinzu
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from ollama_service import OllamaService
    print("Ollama-Service erfolgreich importiert!")
except ImportError as e:
    print(f"Fehler beim Importieren des Ollama-Service: {e}")
    sys.exit(1)

async def test_deepseek():
    """Teste das DeepSeek-V3-Modell mit Ollama"""
    print("=== DeepSeek-V3 Ollama Test ===")
    print(f"Startzeit: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Initialisiere den Ollama-Service mit dem DeepSeek-Modell
    service = OllamaService(default_model="deepseek:local")
    print(f"Service initialisiert mit Basis-URL: {service.base_url}")
    print(f"Standardmodell: {service.default_model}")
    
    try:
        # Verfügbare Modelle auflisten
        print("\n1. Verfügbare Modelle abrufen...")
        models = await service.list_models()
        print(f"Verfügbare Modelle: {[model.name for model in models.models]}")
        
        # Prüfe, ob DeepSeek verfügbar ist
        if "deepseek:local" not in [model.name for model in models.models]:
            print("⚠️ DeepSeek:local nicht gefunden! Stelle sicher, dass du das Setup-Skript ausgeführt hast.")
            return
        
        # Modellinformationen abrufen
        print("\n2. DeepSeek-Modellinformationen abrufen...")
        try:
            model_info = await service.get_model_info("deepseek:local")
            print(f"Modellinformationen für deepseek:local:")
            print(f"  - Größe: {model_info.size / (1024**3):.1f} GB")
            print(f"  - Letzte Änderung: {model_info.modified_at}")
            print(f"  - Digest: {model_info.digest}")
        except Exception as e:
            print(f"Fehler beim Abrufen der Modellinformationen: {e}")
        
        # Eine einfache Anfrage testen
        print("\n3. Einfache Anfrage testen...")
        prompt = "Erkläre den Unterschied zwischen künstlicher Intelligenz und maschinellem Lernen in drei Sätzen."
        print(f"Prompt: {prompt}")
        
        start_time = time.time()
        response = await service.generate_completion(prompt=prompt, model="deepseek:local")
        elapsed_time = time.time() - start_time
        
        print(f"Antwort (nach {elapsed_time:.2f} Sekunden):")
        print("-" * 50)
        print(response.response)
        print("-" * 50)
        
        # Mit Template testen
        print("\n4. Expertenmodus-Template testen...")
        start_time = time.time()
        response = await service.generate_with_template(
            template_name="expert",
            expertise="Maschinelles Lernen",
            question="Was sind die wichtigsten Unterschiede zwischen überwachtem und unüberwachtem Lernen?"
        )
        elapsed_time = time.time() - start_time
        
        print(f"Antwort (nach {elapsed_time:.2f} Sekunden):")
        print("-" * 50)
        print(response.response)
        print("-" * 50)
        
    except Exception as e:
        print(f"Fehler beim Testen: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Verbindung schließen
        await service.close()
        print("\nTest abgeschlossen!")

if __name__ == "__main__":
    asyncio.run(test_deepseek()) 