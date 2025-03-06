#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import time
import requests
import subprocess
import signal
import threading
from pathlib import Path

# Farben für Terminal-Output
class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

# Konfiguration
WORKSPACE_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = WORKSPACE_DIR / "nexus_backend"
LOG_DIR = WORKSPACE_DIR / "logs"
BACKEND_LOG = LOG_DIR / "backend.log"
OLLAMA_LOG = LOG_DIR / "ollama.log"
MISTRAL_MODEL = "mistral"
CONFIG_PATH = WORKSPACE_DIR / "shared_config.json"
BACKEND_PORT = 8001
BACKEND_URL = f"http://localhost:{BACKEND_PORT}"
OLLAMA_API_URL = "http://localhost:11434/api"

# Backend-Prozess und Ollama-Prozess
backend_process = None
backend_thread = None
ollama_process = None

def print_colored(message, color=Colors.BLUE):
    """Gibt farbigen Text aus"""
    print(f"{color}{message}{Colors.END}")

def create_log_dir():
    """Erstellt das Log-Verzeichnis, falls es nicht existiert"""
    if not LOG_DIR.exists():
        print_colored("Erstelle Log-Verzeichnis...", Colors.BLUE)
        LOG_DIR.mkdir(parents=True, exist_ok=True)

def check_ollama_installed():
    """Prüft, ob Ollama installiert ist"""
    print_colored("Prüfe, ob Ollama installiert ist...", Colors.BLUE)
    try:
        result = subprocess.run(['which', 'ollama'], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            print_colored("Ollama ist nicht installiert. Bitte installiere Ollama von https://ollama.com", Colors.RED)
            print_colored("Anleitung: curl -fsSL https://ollama.com/install.sh | sh", Colors.YELLOW)
            return False
        print_colored("Ollama ist installiert.", Colors.GREEN)
        return True
    except Exception as e:
        print_colored(f"Fehler beim Prüfen der Ollama-Installation: {e}", Colors.RED)
        return False

def start_ollama():
    """Startet Ollama im Hintergrund"""
    global ollama_process
    
    print_colored("Starte Ollama im Hintergrund...", Colors.BLUE)
    
    # Prüfe, ob Ollama bereits läuft
    try:
        response = requests.get(f"{OLLAMA_API_URL}/tags", timeout=2)
        if response.status_code == 200:
            print_colored("Ollama läuft bereits.", Colors.GREEN)
            return True
    except:
        # Ollama läuft nicht, starte es
        pass
    
    try:
        ollama_process = subprocess.Popen(
            ['ollama', 'serve'],
            stdout=open(OLLAMA_LOG, 'w'),
            stderr=subprocess.STDOUT
        )
        
        # Warte, bis Ollama bereit ist
        print_colored("Warte, bis Ollama bereit ist...", Colors.BLUE)
        for _ in range(10):  # Timeout nach 10 Sekunden
            try:
                response = requests.get(f"{OLLAMA_API_URL}/tags", timeout=1)
                if response.status_code == 200:
                    print_colored("Ollama erfolgreich gestartet.", Colors.GREEN)
                    return True
            except:
                pass
            time.sleep(1)
        
        print_colored("Ollama konnte nicht gestartet werden.", Colors.RED)
        return False
    except Exception as e:
        print_colored(f"Fehler beim Starten von Ollama: {e}", Colors.RED)
        return False

def check_mistral_model():
    """Prüft, ob das Mistral-Modell verfügbar ist"""
    print_colored("Prüfe, ob das Mistral-Modell verfügbar ist...", Colors.BLUE)
    try:
        response = requests.get(f"{OLLAMA_API_URL}/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            for model in models:
                if model.get("name") == MISTRAL_MODEL:
                    print_colored("Mistral-Modell ist verfügbar.", Colors.GREEN)
                    return True
            
            print_colored("Mistral-Modell nicht gefunden. Lade das Modell herunter...", Colors.YELLOW)
            print_colored("Dieser Vorgang kann einige Minuten dauern...", Colors.YELLOW)
            
            result = subprocess.run(['ollama', 'pull', MISTRAL_MODEL], 
                                  capture_output=True, text=True)
            if result.returncode != 0:
                print_colored(f"Fehler beim Herunterladen des Mistral-Modells: {result.stderr}", Colors.RED)
                return False
            
            print_colored("Mistral-Modell erfolgreich heruntergeladen.", Colors.GREEN)
            return True
        else:
            print_colored(f"Fehler beim Abrufen der Modelle: {response.text}", Colors.RED)
            return False
    except Exception as e:
        print_colored(f"Fehler beim Prüfen des Mistral-Modells: {e}", Colors.RED)
        return False

def save_config():
    """Speichert die Konfiguration"""
    config = {
        'backend_port': BACKEND_PORT,
        'backend_url': BACKEND_URL,
        'ws_url': f"ws://localhost:{BACKEND_PORT}/ws",
        'timestamp': time.time(),
        'offline_mode': True,
        'use_local_model': True
    }
    
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config, f, indent=2)

def run_backend_worker():
    """Startet das Backend in einem separaten Thread"""
    global backend_process
    
    os.chdir(BACKEND_DIR)
    
    # Setze Umgebungsvariablen für den Offline-Modus
    env = os.environ.copy()
    env['OFFLINE_MODE'] = "true"
    env['USE_LOCAL_MODEL'] = "true"
    env['PORT'] = str(BACKEND_PORT)
    env['OLLAMA_API_URL'] = OLLAMA_API_URL
    env['MISTRAL_MODEL_NAME'] = MISTRAL_MODEL
    
    # Starte das Backend
    backend_script = BACKEND_DIR / "offline_model_service.py"
    
    # Setze Ausführungsrechte
    os.chmod(backend_script, 0o755)
    
    backend_process = subprocess.Popen(
        [sys.executable, str(backend_script)],
        env=env,
        stdout=open(BACKEND_LOG, 'w'),
        stderr=subprocess.STDOUT
    )
    
    # Folge dem Log im Hintergrund
    while backend_process.poll() is None:
        time.sleep(1)  # Einfaches Polling, um zu prüfen, ob der Prozess noch läuft

def start_backend():
    """Startet das Backend als eigenen Thread"""
    global backend_thread
    
    print_colored("Starte Backend im Offline-Modus...", Colors.BLUE)
    
    # Speichere die Konfiguration
    save_config()
    
    # Starte den Backend-Thread
    backend_thread = threading.Thread(target=run_backend_worker)
    backend_thread.daemon = True
    backend_thread.start()
    
    # Warte, bis das Backend bereit ist
    print_colored("Warte, bis das Backend bereit ist...", Colors.BLUE)
    for _ in range(10):  # Timeout nach 10 Sekunden
        try:
            response = requests.get(f"{BACKEND_URL}/health", timeout=1)
            if response.status_code == 200:
                print_colored("Backend erfolgreich gestartet.", Colors.GREEN)
                print_colored(f"Backend läuft auf {BACKEND_URL}", Colors.GREEN)
                return True
        except:
            pass
        time.sleep(1)
    
    print_colored("Backend konnte nicht gestartet werden.", Colors.RED)
    return False

def send_chat_message(message):
    """Sendet eine Chat-Nachricht an das Backend"""
    try:
        data = {
            "messages": [{"role": "user", "content": message}],
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        response = requests.post(
            f"{BACKEND_URL}/chat",
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            return response.json().get("response", "Keine Antwort erhalten.")
        else:
            return f"Fehler bei der Anfrage: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Fehler beim Senden der Nachricht: {e}"

def chat_loop():
    """Hauptschleife für die Chat-Interaktion"""
    print_colored("\n=== Insight Synergy Chat (Offline-Modus) ===", Colors.BOLD + Colors.GREEN)
    print_colored("Du chattest jetzt mit dem lokalen Mistral-Modell.", Colors.BLUE)
    print_colored("Gib 'exit' oder 'quit' ein, um zu beenden.\n", Colors.YELLOW)
    
    history = []
    
    while True:
        try:
            # Benutzer-Eingabe
            user_input = input(Colors.BOLD + Colors.GREEN + "Du: " + Colors.END)
            
            # Beenden bei 'exit' oder 'quit'
            if user_input.lower() in ['exit', 'quit']:
                break
            
            print("Denke...")  # Zeige an, dass das Modell arbeitet
            
            # Sende Nachricht und hole Antwort
            response = send_chat_message(user_input)
            
            # Füge zur Historie hinzu
            history.append({"role": "user", "content": user_input})
            history.append({"role": "assistant", "content": response})
            
            # Zeige Antwort
            print(Colors.BOLD + Colors.BLUE + "Mistral: " + Colors.END + response + "\n")
            
        except KeyboardInterrupt:
            print("\nBeende Programm...")
            break
        except Exception as e:
            print_colored(f"Fehler: {e}", Colors.RED)

def cleanup():
    """Bereinigt alle Prozesse"""
    if backend_process and backend_process.poll() is None:
        print_colored("Beende Backend...", Colors.BLUE)
        backend_process.terminate()
        backend_process.wait(timeout=5)
    
    if ollama_process and ollama_process.poll() is None:
        print_colored("Beende Ollama...", Colors.BLUE)
        ollama_process.terminate()
        ollama_process.wait(timeout=5)

def main():
    """Hauptfunktion"""
    try:
        # Setup
        create_log_dir()
        
        # Prüfe und starte Ollama
        if not check_ollama_installed():
            print_colored("Ohne Ollama kann die App nicht im Offline-Modus gestartet werden.", Colors.RED)
            return
        
        if not start_ollama():
            print_colored("Ollama konnte nicht gestartet werden. Die App wird beendet.", Colors.RED)
            return
        
        if not check_mistral_model():
            print_colored("Das Mistral-Modell konnte nicht bereitgestellt werden. Die App wird beendet.", Colors.RED)
            return
        
        # Starte Backend
        if not start_backend():
            print_colored("Das Backend konnte nicht gestartet werden. Die App wird beendet.", Colors.RED)
            return
        
        # Starte Chat-Loop
        chat_loop()
        
    except KeyboardInterrupt:
        print("\nProgramm wird beendet...")
    finally:
        cleanup()

if __name__ == "__main__":
    main() 