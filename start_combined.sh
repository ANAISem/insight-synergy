#!/bin/bash

# Ports für den Server und das Frontend
SERVER_PORT=8080
FRONTEND_PORT=3000

# Farben für Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Anzeigen einer Willkommensnachricht
echo "======================================================"
echo "      INSIGHT SYNERGY - COMBINED STARTUP SCRIPT       "
echo "======================================================"
echo "Dieses Skript startet sowohl das Backend als auch das Frontend."
echo

# Prüfe, ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js ist nicht installiert. Bitte installieren Sie Node.js und versuchen Sie es erneut.${NC}"
    exit 1
fi

# Zeige Node- und NPM-Version an
echo -e "${BLUE}Node.js Version:${NC} $(node -v)"
echo -e "${BLUE}NPM Version:${NC} $(npm -v)"
echo

# Wechsle ins Hauptverzeichnis
cd "$(dirname "$0")"
echo -e "${BLUE}Hauptverzeichnis:${NC} $(pwd)"

# Beende alle möglicherweise laufenden Node-Prozesse auf den spezifischen Ports
echo -e "${YELLOW}Beende möglicherweise laufende Prozesse auf Port $SERVER_PORT und $FRONTEND_PORT...${NC}"
lsof -i :$SERVER_PORT -t | xargs kill -9 2>/dev/null || true
lsof -i :$FRONTEND_PORT -t | xargs kill -9 2>/dev/null || true

# Starte den Backend-Server
echo -e "${YELLOW}Starte den Insight Synergy Backend-Server auf Port $SERVER_PORT...${NC}"
node fixed-server.js &
SERVER_PID=$!

# Warte einen Moment, damit der Server starten kann
sleep 2

# Prüfe, ob der Server läuft
if ! lsof -i :$SERVER_PORT -t &> /dev/null; then
    echo -e "${RED}Server konnte nicht gestartet werden. Bitte überprüfen Sie die Konfiguration.${NC}"
    echo -e "${YELLOW}Prüfe, ob fixed-server.js existiert...${NC}"
    
    if [ ! -f "fixed-server.js" ]; then
        echo -e "${RED}fixed-server.js wurde nicht gefunden. Stellen Sie sicher, dass diese Datei existiert.${NC}"
    else
        echo -e "${GREEN}fixed-server.js gefunden.${NC}"
    fi
    
    exit 1
fi

echo -e "${GREEN}Backend-Server erfolgreich gestartet mit PID $SERVER_PID auf Port $SERVER_PORT${NC}"

# Starte das Frontend
echo -e "${YELLOW}Starte das Insight Synergy Frontend auf Port $FRONTEND_PORT...${NC}"

# Wechsle ins Frontend-Verzeichnis
cd frontend

# Starte das Frontend
echo -e "${YELLOW}Starte das Frontend im Entwicklungsmodus...${NC}"
npm start &
FRONTEND_PID=$!

# Warte auf die Beendigung der Prozesse
echo -e "${GREEN}Insight Synergy wurde gestartet:${NC}"
echo -e "${BLUE}Backend:${NC} http://localhost:$SERVER_PORT"
echo -e "${BLUE}Frontend:${NC} http://localhost:$FRONTEND_PORT (wird automatisch im Browser geöffnet)"
echo
echo -e "${YELLOW}Drücken Sie Ctrl+C, um beide Prozesse zu beenden.${NC}"

# Warte auf das Beenden der Prozesse
wait $FRONTEND_PID

# Beende alle Prozesse, wenn Ctrl+C gedrückt wurde
echo -e "${YELLOW}Beende alle laufenden Prozesse...${NC}"
kill $SERVER_PID 2>/dev/null || true
lsof -i :$SERVER_PORT -t | xargs kill -9 2>/dev/null || true
lsof -i :$FRONTEND_PORT -t | xargs kill -9 2>/dev/null || true

echo -e "${GREEN}Alle Prozesse wurden beendet.${NC}" 