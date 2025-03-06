#!/bin/bash

# Insight Synergy App Starter
# Ein Skript zum Starten der Insight Synergy App

# Konfiguration
LOG_DIR="$PWD/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# Farben für Terminal-Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Erstelle Log-Verzeichnis, falls nicht vorhanden
create_logs() {
    mkdir -p "$LOG_DIR"
    touch "$BACKEND_LOG" "$FRONTEND_LOG"
}

# Beende möglicherweise laufende Prozesse
kill_processes() {
    echo "Beende möglicherweise laufende Prozesse..."
    pkill -f "python3.*simple_server.py" 2>/dev/null
    pkill -f "flutter run" 2>/dev/null
}

# Starte das Backend
start_backend() {
    echo "Starte Backend..."
    python3 nexus_backend/simple_server.py > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    echo "Backend gestartet mit PID $BACKEND_PID"
    
    # Warte kurz, damit das Backend starten kann
    echo "Warte 5 Sekunden, damit das Backend vollständig starten kann..."
    sleep 5
}

# Starte das Frontend
start_frontend() {
    echo "Starte Frontend..."
    cd insight_synergy_app && flutter run -d macos > "$FRONTEND_LOG" 2>&1 &
    echo "Frontend gestartet"
}

# Hauptfunktion
main() {
    echo "=== Insight Synergy App Starter ==="
    
    create_logs
    kill_processes
    start_backend
    start_frontend
    
    echo "Die Logs können mit folgenden Befehlen angezeigt werden:"
    echo "  tail -f $BACKEND_LOG"
    echo "  tail -f $FRONTEND_LOG"
    
    echo -e "${GREEN}=== Anwendung erfolgreich gestartet! ===${NC}"
    echo "Um die Anwendung zu beenden, führe 'pkill -f \"python3.*simple_server.py\"' aus."
}

# Starte die Anwendung
main 