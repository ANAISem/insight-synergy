#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import socket
import json
import subprocess
import signal
import time
from pathlib import Path

# Konfigurationsdatei im gemeinsamen Verzeichnis
CONFIG_PATH = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) / "shared_config.json"

# Offline-Modus prüfen
OFFLINE_MODE = os.environ.get("OFFLINE_MODE", "false").lower() == "true"
USE_LOCAL_MODEL = os.environ.get("USE_LOCAL_MODEL", "false").lower() == "true"

def find_free_port(start_port=8000, max_attempts=10):
    """Findet einen freien Port, beginnend bei start_port."""
    print(f"Suche freien Port, beginnend bei {start_port}...")
    
    for i in range(max_attempts):
        port = start_port + i
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(('localhost', port))
            sock.close()
            print(f"Freier Port gefunden: {port}")
            return port
        except OSError:
            print(f"Port {port} ist bereits belegt, versuche nächsten Port...")
    
    raise RuntimeError(f"Konnte keinen freien Port im Bereich {start_port}-{start_port+max_attempts-1} finden")

def save_config(port):
    """Speichert die Konfiguration in einer JSON-Datei."""
    config = {
        'backend_port': port,
        'backend_url': f'http://localhost:{port}',
        'ws_url': f'ws://localhost:{port}/ws',
        'timestamp': time.time(),
        'offline_mode': OFFLINE_MODE,
        'use_local_model': USE_LOCAL_MODEL
    }
    
    print(f"Speichere Konfiguration in {CONFIG_PATH}")
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config, f, indent=2)
    
    return config

def check_ollama_installation():
    """Prüft, ob Ollama installiert ist und das Mistral-Modell verfügbar ist."""
    if not USE_LOCAL_MODEL and not OFFLINE_MODE:
        print("Lokales Modell wird nicht verwendet, überspringe Ollama-Prüfung.")
        return True
    
    print("Prüfe Ollama-Installation...")
    
    # Prüfe, ob Ollama installiert ist
    try:
        result = subprocess.run(['which', 'ollama'], capture_output=True, text=True)
        if result.returncode != 0:
            print("WARNUNG: Ollama ist nicht installiert.")
            print("Die App benötigt Ollama für die volle Offline-Funktionalität.")
            print("Bitte installieren Sie Ollama von https://ollama.com")
            return False
        
        print("Ollama ist installiert.")
        
        # Prüfe, ob Ollama läuft
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        if 'ollama serve' not in result.stdout:
            print("Ollama läuft nicht. Versuche, Ollama zu starten...")
            subprocess.Popen(['ollama', 'serve'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            time.sleep(3)  # Warte kurz, bis Ollama gestartet ist
        
        # Prüfe, ob das Mistral-Modell verfügbar ist
        result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
        mistral_model = os.environ.get("MISTRAL_MODEL_NAME", "mistral")
        
        if mistral_model not in result.stdout:
            print(f"Mistral-Modell '{mistral_model}' nicht gefunden.")
            print(f"Möchten Sie das Modell jetzt herunterladen? (ja/nein)")
            answer = input().lower()
            
            if answer == 'ja' or answer == 'j':
                print(f"Lade Mistral-Modell '{mistral_model}' herunter...")
                subprocess.run(['ollama', 'pull', mistral_model], check=True)
                print("Mistral-Modell erfolgreich installiert.")
            else:
                print("Die App wird ohne vollständige Offline-Funktionalität gestartet.")
                return False
        else:
            print(f"Mistral-Modell '{mistral_model}' ist verfügbar.")
        
        return True
    
    except Exception as e:
        print(f"Fehler bei der Prüfung der Ollama-Installation: {e}")
        return False

def run_backend(port):
    """Startet das Backend mit dem angegebenen Port."""
    env = os.environ.copy()
    env['PORT'] = str(port)
    
    # Bestimme den Pfad zur richtigen Anwendungsdatei
    if OFFLINE_MODE or USE_LOCAL_MODEL:
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "offline_model_service.py")
        print(f"Starte Backend im Offline-Modus auf Port {port}...")
    else:
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "run_app.py")
        print(f"Starte Backend im Standard-Modus auf Port {port}...")
    
    # Prüfe, ob das Skript existiert
    if not os.path.exists(script_path):
        print(f"FEHLER: Das Skript {script_path} existiert nicht!")
        return None
    
    # Setze Ausführungsrechte für das Skript
    os.chmod(script_path, 0o755)
    
    # Starte das Backend als Subprocess
    backend_process = subprocess.Popen(
        [sys.executable, script_path],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Warte kurz, um zu sehen, ob der Prozess sofort beendet wird
    time.sleep(2)
    if backend_process.poll() is not None:
        stdout, stderr = backend_process.communicate()
        print(f"Backend konnte nicht gestartet werden:")
        print(f"STDOUT: {stdout}")
        print(f"STDERR: {stderr}")
        return None
    
    print(f"Backend erfolgreich gestartet (PID: {backend_process.pid})")
    return backend_process

def main():
    print("=== Dynamischer Backend-Starter ===")
    
    if OFFLINE_MODE:
        print("Offline-Modus ist aktiviert.")
    if USE_LOCAL_MODEL:
        print("Lokales Modell wird verwendet.")
    
    # Wenn lokales Modell verwendet wird, prüfe Ollama-Installation
    if OFFLINE_MODE or USE_LOCAL_MODEL:
        if not check_ollama_installation():
            print("WARNUNG: Offline-Funktionalität ist eingeschränkt.")
    
    # Finde einen freien Port
    port = find_free_port()
    
    # Speichere die Konfiguration
    config = save_config(port)
    
    # Starte das Backend
    backend_process = run_backend(port)
    
    if backend_process is None:
        print("Backend konnte nicht gestartet werden. Beende.")
        sys.exit(1)
    
    # Einfacher Signal-Handler zum sauberen Beenden
    def signal_handler(sig, frame):
        print("\nBeende Backend...")
        backend_process.terminate()
        sys.exit(0)
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print(f"Backend läuft auf Port {port}.")
    if OFFLINE_MODE:
        print("Die App kann jetzt vollständig offline genutzt werden.")
    print("Drücke Ctrl+C zum Beenden.")
    
    try:
        # Leite Backend-Output weiter
        for line in backend_process.stdout:
            print(f"BACKEND: {line.strip()}")
    except KeyboardInterrupt:
        print("\nBeende Backend...")
        backend_process.terminate()
    finally:
        # Warte auf Beendigung
        backend_process.wait()
        print("Backend beendet.")

if __name__ == "__main__":
    main() 