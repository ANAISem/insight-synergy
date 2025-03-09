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
echo "        INSIGHT SYNERGY - STARTUP SCRIPT              "
echo "======================================================"
echo "Dieses Skript startet Insight Synergy."
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

# Wechsle ins Verzeichnis des Skripts
cd "$(dirname "$0")"
echo -e "${BLUE}Arbeitsverzeichnis:${NC} $(pwd)"

# Prüfe, ob die package.json-Datei existiert
if [ ! -f "package.json" ]; then
    echo -e "${RED}package.json nicht gefunden. Bitte stellen Sie sicher, dass Sie im richtigen Verzeichnis sind.${NC}"
    exit 1
fi

# Installiere Abhängigkeiten, falls node_modules nicht existiert
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installiere Abhängigkeiten (dies kann einige Minuten dauern)...${NC}"
    npm install
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Fehler beim Installieren der Abhängigkeiten. Siehe oben für Details.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Abhängigkeiten erfolgreich installiert.${NC}"
fi

# Prüfe, ob erforderliche Verzeichnisse existieren
if [ ! -d "public" ]; then
    echo -e "${RED}Das 'public'-Verzeichnis wurde nicht gefunden. Dies ist für React-Apps erforderlich.${NC}"
    exit 1
fi

if [ ! -d "src" ]; then
    echo -e "${RED}Das 'src'-Verzeichnis wurde nicht gefunden. Dies ist für React-Apps erforderlich.${NC}"
    exit 1
fi

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

# Starte den Frontend-Server im Entwicklungsmodus
echo -e "${YELLOW}Starte den Insight Synergy Frontend-Server auf Port $FRONTEND_PORT...${NC}"
echo -e "${BLUE}Starte mit Befehl: PORT=$FRONTEND_PORT npx react-scripts start${NC}"

# Logging-Datei für den Frontend-Start
FRONTEND_LOG="frontend_start.log"
PORT=$FRONTEND_PORT npx react-scripts start > $FRONTEND_LOG 2>&1 &
FRONTEND_PID=$!

# Warte einen Moment, damit das Frontend starten kann
echo -e "${YELLOW}Warte bis zu 15 Sekunden auf den Start des Frontends...${NC}"

for i in {1..15}; do
    sleep 1
    if lsof -i :$FRONTEND_PORT -t &> /dev/null; then
        echo -e "${GREEN}Frontend erfolgreich gestartet (nach $i Sekunden)!${NC}"
        break
    fi
    
    echo -n "."
    
    # Nach 10 Sekunden Fehler im Log prüfen
    if [ $i -eq 10 ]; then
        if grep -i "error" $FRONTEND_LOG > /dev/null; then
            echo
            echo -e "${RED}Fehler im Frontend-Log gefunden:${NC}"
            grep -i "error" $FRONTEND_LOG | head -5
        fi
    fi
done

echo

# Prüfe, ob das Frontend läuft
if ! lsof -i :$FRONTEND_PORT -t &> /dev/null; then
    echo -e "${RED}Frontend konnte nicht gestartet werden. Der Backend-Server läuft aber weiter.${NC}"
    echo -e "${YELLOW}Backend-Server läuft mit PID $SERVER_PID auf Port $SERVER_PORT${NC}"
    echo -e "${YELLOW}Prüfe die letzten 10 Zeilen der Frontend-Logs:${NC}"
    tail -10 $FRONTEND_LOG
    
    # Anbieten, die kompletten Logs anzuzeigen
    echo
    echo -e "${YELLOW}Möchten Sie die vollständigen Frontend-Logs sehen? (j/n)${NC}"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Jj]$ ]]; then
        cat $FRONTEND_LOG
    fi
    
    echo -e "${BLUE}Versuchen Sie, das Frontend manuell zu starten mit: PORT=$FRONTEND_PORT npx react-scripts start${NC}"
else
    echo -e "${GREEN}Insight Synergy wurde erfolgreich gestartet!${NC}"
    echo -e "${GREEN}Backend-Server läuft mit PID $SERVER_PID auf Port $SERVER_PORT${NC}"
    echo -e "${GREEN}Frontend-Server läuft mit PID $FRONTEND_PID auf Port $FRONTEND_PORT${NC}"
fi

echo
echo -e "${BLUE}Öffnen Sie http://localhost:$FRONTEND_PORT in Ihrem Browser, um auf die Anwendung zuzugreifen.${NC}"
echo -e "${YELLOW}Um die Anwendung zu beenden, drücken Sie Ctrl+C und führen Sie 'lsof -i :$SERVER_PORT -t | xargs kill -9' aus.${NC}"
echo

# Warte, bis das Skript unterbrochen wird
wait $FRONTEND_PID
