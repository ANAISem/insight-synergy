#!/bin/bash

# Insight Synergy App - Automatisches Startup-Script
# Dieses Script startet Ollama mit dem Mistral-Modell und die App im Offline-Modus

# Konfiguration
WORKSPACE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$WORKSPACE_DIR/nexus_backend"
FRONTEND_DIR="$WORKSPACE_DIR/insight_synergy_app"
LOG_DIR="$WORKSPACE_DIR/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
OLLAMA_LOG="$LOG_DIR/ollama.log"
MISTRAL_MODEL="mistral"
OFFLINE_MODE="true"

# Farbcodes für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktionen
create_log_dir() {
    if [ ! -d "$LOG_DIR" ]; then
        echo -e "${BLUE}Erstelle Log-Verzeichnis...${NC}"
        mkdir -p "$LOG_DIR"
    fi
}

kill_existing_processes() {
    echo -e "${YELLOW}Beende möglicherweise laufende Prozesse...${NC}"
    pkill -f "python3.*run_app.py" 2>/dev/null || true
    pkill -f "flutter.*run" 2>/dev/null || true
    
    # Hinweis: Ollama wird nicht beendet, falls bereits laufend
    # um bestehende Modelle/Sessions nicht zu unterbrechen
    
    # Warte kurz, um sicherzustellen, dass alle Prozesse beendet wurden
    sleep 2
}

check_ollama_installed() {
    echo -e "${BLUE}Prüfe, ob Ollama installiert ist...${NC}"
    if ! command -v ollama &> /dev/null; then
        echo -e "${RED}Ollama ist nicht installiert. Bitte installiere Ollama von https://ollama.com${NC}"
        echo -e "${YELLOW}Anleitung: curl -fsSL https://ollama.com/install.sh | sh${NC}"
        exit 1
    fi
    echo -e "${GREEN}Ollama ist installiert.${NC}"
}

start_ollama() {
    echo -e "${BLUE}Starte Ollama im Hintergrund...${NC}"
    
    # Prüfe, ob Ollama bereits läuft
    if pgrep -x "ollama" > /dev/null; then
        echo -e "${GREEN}Ollama läuft bereits.${NC}"
    else
        nohup ollama serve > "$OLLAMA_LOG" 2>&1 &
        OLLAMA_PID=$!
        echo -e "${GREEN}Ollama gestartet mit PID $OLLAMA_PID${NC}"
        
        # Warte, bis Ollama vollständig gestartet ist
        echo -e "${BLUE}Warte, bis Ollama bereit ist...${NC}"
        sleep 5
    fi
    
    # Prüfe, ob das Mistral-Modell verfügbar ist
    echo -e "${BLUE}Prüfe, ob das Mistral-Modell verfügbar ist...${NC}"
    if ! ollama list | grep -q "$MISTRAL_MODEL"; then
        echo -e "${YELLOW}Mistral-Modell nicht gefunden. Lade das Modell herunter...${NC}"
        echo -e "${YELLOW}Dieser Vorgang kann einige Minuten dauern...${NC}"
        ollama pull "$MISTRAL_MODEL"
        if [ $? -ne 0 ]; then
            echo -e "${RED}Fehler beim Herunterladen des Mistral-Modells.${NC}"
            exit 1
        fi
    fi
    echo -e "${GREEN}Mistral-Modell ist verfügbar.${NC}"
}

start_backend() {
    echo -e "${BLUE}Starte Backend im Offline-Modus...${NC}"
    cd "$BACKEND_DIR"
    
    # Setze Ausführungsrechte für das dynamische Backend-Script
    chmod +x dynamic_run.py
    
    # Setze Umgebungsvariable für den Offline-Modus
    export OFFLINE_MODE="$OFFLINE_MODE"
    export USE_LOCAL_MODEL="true"
    export OLLAMA_API_URL="http://localhost:11434/api"
    export MISTRAL_MODEL_NAME="$MISTRAL_MODEL"
    
    # Starte das Backend als Hintergrundprozess und protokolliere die Ausgabe
    python3 dynamic_run.py > "$BACKEND_LOG" 2>&1 &
    
    # Speichere die PID des Backend-Prozesses
    BACKEND_PID=$!
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"
    
    echo -e "${GREEN}Backend gestartet mit PID $BACKEND_PID${NC}"
    echo -e "${BLUE}Warte 5 Sekunden, damit das Backend vollständig starten kann...${NC}"
    sleep 5
}

setup_macos_flutter() {
    echo -e "${BLUE}Richte Flutter für macOS ein...${NC}"
    cd "$FRONTEND_DIR"

    # Aktiviere macOS-Desktop-Unterstützung für das Projekt
    flutter config --enable-macos-desktop

    # Stelle sicher, dass wir alle Abhängigkeiten haben
    flutter pub get
    
    # Erstelle macOS-Verzeichnis, falls es nicht existiert
    if [ ! -d "macos" ]; then
        echo -e "${YELLOW}Erstelle macOS-Ordner für Flutter...${NC}"
        flutter create --platforms=macos .
    fi

    echo -e "${GREEN}Flutter für macOS eingerichtet.${NC}"
}

start_frontend() {
    echo -e "${BLUE}Starte Frontend im Offline-Modus...${NC}"
    cd "$FRONTEND_DIR"
    
    # Umgebungsvariablen für den Offline-Modus
    export OFFLINE_FIRST="true"
    
    # Richte Flutter für macOS ein
    setup_macos_flutter
    
    # Starte die Flutter-App im Debug-Modus (dies öffnet ein Fenster)
    echo -e "${YELLOW}Starte Flutter-App im Debug-Modus...${NC}"
    flutter run -d macos > "$FRONTEND_LOG" 2>&1 &
    FLUTTER_PID=$!
    echo $FLUTTER_PID > "$LOG_DIR/frontend.pid"
    
    echo -e "${GREEN}Frontend gestartet mit PID $FLUTTER_PID${NC}"
}

show_logs() {
    echo -e "${BLUE}Die Logs können mit folgenden Befehlen angezeigt werden:${NC}"
    echo -e "  tail -f $BACKEND_LOG     # Backend-Log"
    echo -e "  tail -f $FRONTEND_LOG    # Frontend-Log"
    echo -e "  tail -f $OLLAMA_LOG      # Ollama-Log"
}

# Hauptprogramm
echo -e "${GREEN}=== Insight Synergy App Starter (Offline-Modus) ===${NC}"

create_log_dir
kill_existing_processes
check_ollama_installed
start_ollama
start_backend
start_frontend
show_logs

echo -e "${GREEN}=== Anwendung erfolgreich gestartet im Offline-Modus! ===${NC}"
echo -e "${YELLOW}Die App kann jetzt vollständig offline genutzt werden.${NC}"
echo -e "${YELLOW}Um die Anwendung zu beenden, führe folgende Befehle aus:${NC}"
echo -e "${YELLOW}- pkill -f \"python3.*dynamic_run.py\"  # Beendet das Backend${NC}"
echo -e "${YELLOW}- pkill -f \"flutter.*run\"  # Beendet das Frontend${NC}"
