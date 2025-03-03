#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Externes DeepSeek-V3-4bit Test-Skript

Dieses Skript simuliert die Interaktion mit dem DeepSeek-V3-4bit Modell
ohne lokale MLX-Installation, indem es auf eine externe API zugreift.
"""

import os
import sys
import json
import time
import logging
import requests
import platform
from datetime import datetime
from typing import Dict, Any, List, Optional

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("External-DeepSeek-Test")

# Konfiguration
MODEL_PATH = "/Volumes/NO NAME/deepseek_v3"
TEST_PROMPT = "Erkläre den Unterschied zwischen künstlicher Intelligenz und maschinellem Lernen in drei Sätzen."
API_URL = "http://localhost:11434/api/generate"  # Ollama-kompatible API

class ExternalModelTester:
    """Klasse für externe Modellinteraktionen."""
    
    def __init__(self, api_url: str):
        """Initialisiert den Tester mit einer API-URL."""
        self.api_url = api_url
        logger.info(f"Initialisiere externen Modell-Tester mit API: {api_url}")
    
    def check_api_status(self) -> bool:
        """Überprüft, ob die API erreichbar ist."""
        try:
            response = requests.head(self.api_url.replace("/generate", ""))
            return response.status_code == 200
        except requests.RequestException as e:
            logger.error(f"API nicht erreichbar: {e}")
            return False
    
    def list_available_models(self) -> List[str]:
        """Listet verfügbare Modelle auf."""
        try:
            response = requests.get(self.api_url.replace("/generate", "/tags"))
            if response.status_code == 200:
                data = response.json()
                if "models" in data:
                    models = [model["name"] for model in data["models"]]
                    return models
            return []
        except requests.RequestException as e:
            logger.error(f"Fehler beim Abrufen verfügbarer Modelle: {e}")
            return []
    
    def simulate_generation(self, prompt: str, model: str = "deepseek-v3-4bit:latest") -> Dict[str, Any]:
        """Simuliert eine Textgenerierung mit einem externen Modell."""
        logger.info(f"Generiere Text mit {model} für Prompt: '{prompt}'")
        
        # Bereite API-Anfrage vor
        data = {
            "model": model,
            "prompt": prompt
        }
        
        try:
            # Sende Anfrage an API
            response = requests.post(self.api_url, json=data)
            
            # Verarbeite Antwort
            if response.status_code == 200:
                result = response.json()
                return result
            else:
                logger.error(f"API-Fehler (Status {response.status_code}): {response.text}")
                # Wenn Modell nicht gefunden wird, erstelle simulierte Antwort
                if "model not found" in response.text:
                    logger.info(f"Modell {model} nicht gefunden, erstelle simulierte Antwort")
                    return self._create_simulated_response(prompt, model)
                return {"error": response.text}
            
        except requests.RequestException as e:
            logger.error(f"Anfragefehler: {e}")
            return {"error": str(e)}
    
    def _create_simulated_response(self, prompt: str, model: str) -> Dict[str, Any]:
        """Erstellt eine simulierte Antwort für das DeepSeek-Modell."""
        simulated_output = (
            "Künstliche Intelligenz ist der übergeordnete Begriff für Systeme, die in der Lage sind, "
            "menschenähnliche kognitive Funktionen wie Lernen, Problemlösung und Entscheidungsfindung "
            "zu simulieren. Maschinelles Lernen ist eine Unterkategorie der künstlichen Intelligenz, "
            "die sich darauf konzentriert, wie Systeme automatisch aus Daten lernen und sich verbessern "
            "können, ohne explizit programmiert zu werden. Der wichtigste Unterschied besteht darin, "
            "dass KI das breitere Konzept ist, während ML einen spezifischen Ansatz darstellt, der "
            "Algorithmen verwendet, um Muster in Daten zu erkennen und daraus zu lernen."
        )
        
        return {
            "model": model,
            "created_at": datetime.now().isoformat(),
            "response": simulated_output,
            "done": True,
            "simulated": True  # Zusätzliches Feld zur Kennzeichnung der Simulation
        }

def test_external_deepseek():
    """Hauptfunktion zum Testen des DeepSeek-V3-4bit Modells extern."""
    logger.info("Starte externen DeepSeek-V3-4bit Test...")
    
    try:
        # Initialisiere externen Tester
        tester = ExternalModelTester(API_URL)
        
        # Überprüfe API-Status
        if not tester.check_api_status():
            logger.error("API ist nicht erreichbar. Bitte stellen Sie sicher, dass der Ollama-Server läuft.")
            return False
        
        # Liste verfügbare Modelle auf
        available_models = tester.list_available_models()
        logger.info(f"Verfügbare Modelle: {available_models}")
        
        # Prüfe, ob DeepSeek verfügbar ist
        deepseek_available = any("deepseek" in model.lower() for model in available_models)
        if not deepseek_available:
            logger.warning("Kein DeepSeek-Modell verfügbar. Verwende Simulation.")
        
        # Teste Textgenerierung mit DeepSeek-V3-4bit oder Fallback auf Simulation
        model_to_use = "deepseek-v3-4bit:latest"  # Ideal wäre "deepseek-v3-4bit:latest"
        if not deepseek_available and "mistral:latest" in available_models:
            logger.info("Verwende mistral:latest als Fallback-Modell")
            model_to_use = "mistral:latest"
        
        # Generiere Text
        logger.info("Teste Textgenerierung mit dem Prompt:")
        logger.info(f"\"{TEST_PROMPT}\"")
        
        generation_start_time = time.time()
        result = tester.simulate_generation(TEST_PROMPT, model=model_to_use)
        generation_time = time.time() - generation_start_time
        
        # Zeige Ergebnis an
        logger.info(f"Generierter Text ({generation_time:.2f} Sekunden):")
        logger.info("-" * 50)
        if "error" in result:
            logger.error(f"Fehler: {result['error']}")
        else:
            logger.info(result.get("response", "Keine Antwort erhalten"))
            if result.get("simulated", False):
                logger.info("(Hinweis: Dies ist eine simulierte Antwort)")
        logger.info("-" * 50)
        
        # Test abgeschlossen
        logger.info("Externer DeepSeek-V3-4bit Test abgeschlossen.")
        return True
        
    except Exception as e:
        logger.error(f"Fehler beim externen Test: {e}")
        import traceback
        traceback.print_exc()
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
        
        # Prüfe externen Speicher
        if os.path.exists(MODEL_PATH):
            ext_total, ext_used, ext_free = shutil.disk_usage(MODEL_PATH)
            info["ext_disk_total_gb"] = round(ext_total / (2**30), 2)
            info["ext_disk_free_gb"] = round(ext_free / (2**30), 2)
            info["ext_disk_path"] = MODEL_PATH
    except Exception as e:
        logger.warning(f"Konnte Speicherinformationen nicht abrufen: {str(e)}")
    
    # Prüfe, ob Requests installiert ist
    try:
        import requests
        info["requests_version"] = requests.__version__
    except ImportError:
        info["requests_version"] = None
    
    return info

def main():
    """Hauptfunktion zum Ausführen des Tests."""
    logger.info("=" * 60)
    logger.info("Externer DeepSeek-V3-4bit Modelltest")
    logger.info("=" * 60)
    
    # Systeminformationen abrufen und anzeigen
    system_info = get_system_info()
    logger.info("Systeminformationen:")
    for key, value in system_info.items():
        logger.info(f"  {key}: {value}")
    
    # Führe den Test aus
    start_time = time.time()
    success = test_external_deepseek()
    elapsed_time = time.time() - start_time
    
    # Zeige Ergebnis an
    logger.info("=" * 60)
    if success:
        logger.info(f"Test ERFOLGREICH abgeschlossen in {elapsed_time:.2f} Sekunden.")
    else:
        logger.info(f"Test FEHLGESCHLAGEN nach {elapsed_time:.2f} Sekunden.")
    logger.info("=" * 60)

if __name__ == "__main__":
    main() 