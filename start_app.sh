#!/bin/bash

# Insight Synergy App - Automatisches Startup-Script
# Dieses Script startet sowohl das Backend als auch das Frontend

# Konfiguration
WORKSPACE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$WORKSPACE_DIR/nexus_backend"
FRONTEND_DIR="$WORKSPACE_DIR/insight_synergy_app"
LOG_DIR="$WORKSPACE_DIR/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

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
    
    # Warte kurz, um sicherzustellen, dass alle Prozesse beendet wurden
    sleep 2
}

start_backend() {
    echo -e "${BLUE}Starte Backend...${NC}"
    cd "$BACKEND_DIR"
    
    # Setze Ausführungsrechte für das dynamische Backend-Script
    chmod +x dynamic_run.py
    
    # Starte das Backend als Hintergrundprozess und protokolliere die Ausgabe
    python3 dynamic_run.py > "$BACKEND_LOG" 2>&1 &
    
    # Speichere die PID des Backend-Prozesses
    BACKEND_PID=$!
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"
    
    echo -e "${GREEN}Backend gestartet mit PID $BACKEND_PID${NC}"
    echo -e "${BLUE}Warte 5 Sekunden, damit das Backend vollständig starten kann...${NC}"
    sleep 5
}

start_frontend() {
    echo -e "${BLUE}Starte Frontend...${NC}"
    cd "$FRONTEND_DIR"
    
    # Führe Flutter build aus, falls noch nicht geschehen
    if [ ! -d "$FRONTEND_DIR/build/macos/Build/Products/Debug/insight_synergy_app.app" ]; then
        echo -e "${YELLOW}Keine kompilierte App gefunden. Erstelle Flutter-App...${NC}"
        flutter clean
        flutter pub get
        flutter build macos --debug
    fi
    
    # Öffne die kompilierte App
    open "$FRONTEND_DIR/build/macos/Build/Products/Debug/insight_synergy_app.app"
    
    echo -e "${GREEN}Frontend gestartet${NC}"
}

show_logs() {
    echo -e "${BLUE}Die Logs können mit folgenden Befehlen angezeigt werden:${NC}"
    echo -e "  tail -f $BACKEND_LOG"
    echo -e "  tail -f $FRONTEND_LOG"
}

# Hauptprogramm
echo -e "${GREEN}=== Insight Synergy App Starter ===${NC}"

create_log_dir
kill_existing_processes
start_backend
start_frontend
show_logs

echo -e "${GREEN}=== Anwendung erfolgreich gestartet! ===${NC}"
echo -e "${YELLOW}Um die Anwendung zu beenden, führe 'pkill -f \"python3.*run_app.py\"' aus.${NC}" 