#!/bin/bash

# Farben für Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Anzeigen einer Willkommensnachricht
echo "======================================================"
echo "     INSIGHT SYNERGY - PYTHON + REACT STARTUP         "
echo "======================================================"
echo "Dieses Skript startet sowohl das Python-Backend als auch das React-Frontend."
echo

# Ports für den Server und das Frontend
BACKEND_PORT=8000
FRONTEND_PORT=3000

# Wechsle ins Verzeichnis des Skripts
cd "$(dirname "$0")"
echo -e "${BLUE}Arbeitsverzeichnis:${NC} $(pwd)"

# Beende alle möglicherweise laufenden Prozesse auf den spezifischen Ports
echo -e "${YELLOW}Beende möglicherweise laufende Prozesse auf Port $BACKEND_PORT und $FRONTEND_PORT...${NC}"
lsof -i :$BACKEND_PORT -t | xargs kill -9 2>/dev/null || true
lsof -i :$FRONTEND_PORT -t | xargs kill -9 2>/dev/null || true

# Backend-Server starten
echo -e "${YELLOW}Starte das Python-Backend auf Port $BACKEND_PORT...${NC}"
PYTHONPATH="$(pwd)" LOG_LEVEL=DEBUG python3 start_api.py > backend.log 2>&1 &
BACKEND_PID=$!

# Warte einen Moment, damit der Server starten kann
echo -e "${YELLOW}Warte 5 Sekunden, damit der Backend-Server starten kann...${NC}"
sleep 5

# Prüfe, ob der Server läuft
if ! curl -s http://localhost:$BACKEND_PORT/health > /dev/null; then
    echo -e "${RED}Backend-Server konnte nicht gestartet werden. Bitte überprüfen Sie die Logs (backend.log).${NC}"
    exit 1
fi

echo -e "${GREEN}Backend-Server erfolgreich gestartet mit PID $BACKEND_PID auf Port $BACKEND_PORT${NC}"

# Frontend .env.development aktualisieren
echo -e "${YELLOW}Aktualisiere die API-URL für das Frontend...${NC}"
echo "REACT_APP_API_URL=http://localhost:$BACKEND_PORT/api" > frontend/.env.development
echo -e "${GREEN}.env.development wurde aktualisiert.${NC}"

# Frontend starten
echo -e "${YELLOW}Starte das React-Frontend auf Port $FRONTEND_PORT...${NC}"
cd frontend && npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!

# Warte einen Moment, damit das Frontend starten kann
echo -e "${YELLOW}Warte 10 Sekunden, damit das Frontend starten kann...${NC}"
sleep 10

# Prüfe, ob das Frontend läuft
if ! curl -s http://localhost:$FRONTEND_PORT > /dev/null; then
    echo -e "${RED}Frontend konnte nicht gestartet werden. Bitte überprüfen Sie die Logs (frontend.log).${NC}"
    echo -e "${YELLOW}Das Backend läuft aber weiter auf Port $BACKEND_PORT.${NC}"
else
    echo -e "${GREEN}Frontend erfolgreich gestartet mit PID $FRONTEND_PID auf Port $FRONTEND_PORT${NC}"
fi

echo
echo -e "${GREEN}Insight Synergy wurde gestartet:${NC}"
echo -e "${BLUE}Backend:${NC} http://localhost:$BACKEND_PORT"
echo -e "${BLUE}Backend API Docs:${NC} http://localhost:$BACKEND_PORT/api/docs"
echo -e "${BLUE}Frontend:${NC} http://localhost:$FRONTEND_PORT"
echo
echo -e "${YELLOW}Die Anwendung läuft im Hintergrund. Um sie zu beenden, führen Sie folgende Befehle aus:${NC}"
echo -e "kill $BACKEND_PID $FRONTEND_PID"
echo -e "oder:"
echo -e "lsof -i :$BACKEND_PORT -t | xargs kill -9"
echo -e "lsof -i :$FRONTEND_PORT -t | xargs kill -9"
echo
echo -e "${YELLOW}Die Logs finden Sie in den Dateien backend.log und frontend.log${NC}" 