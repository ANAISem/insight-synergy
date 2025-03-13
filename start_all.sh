#!/bin/bash

# Farben für die Ausgabe
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner ausgeben
echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}                     INSIGHT SYNERGY STARTER                         ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "${YELLOW}Aktuelle Zeit: $(date)${NC}"
echo -e "${YELLOW}Arbeitsverzeichnis: $(pwd)${NC}"
echo -e "${BLUE}----------------------------------------------------------------------${NC}"

# Funktion zum Prüfen, ob ein Port bereits verwendet wird
check_port() {
  local port=$1
  if lsof -i :$port | grep LISTEN >/dev/null; then
    return 0 # Port ist in Nutzung
  else
    return 1 # Port ist frei
  fi
}

# Bestehende Prozesse beenden
echo -e "${YELLOW}Überprüfe, ob bestehende Prozesse beendet werden müssen...${NC}"

# Beende Python-Backend, falls es läuft
if pgrep -f "python.*start_api.py" > /dev/null; then
  echo -e "${YELLOW}Beende laufenden Backend-Server...${NC}"
  pkill -f "python.*start_api.py"
  sleep 2
fi

# Prüfe, ob Port 8000 belegt ist (von einem anderen Prozess)
if check_port 8000; then
  echo -e "${RED}Port 8000 wird bereits verwendet! Versuche, den Prozess zu beenden...${NC}"
  pid=$(lsof -ti:8000)
  if [ ! -z "$pid" ]; then
    echo -e "${YELLOW}Beende Prozess $pid, der Port 8000 blockiert...${NC}"
    kill -9 $pid
    sleep 2
  fi
fi

# Starte Backend-Server
echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}Starte Backend-Server...${NC}"
./start_api.py > ./backend_log.txt 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}Backend-Server gestartet mit PID $BACKEND_PID${NC}"
echo -e "${GREEN}Logs werden in backend_log.txt gespeichert${NC}"

# Warte, bis der Server bereit ist
echo -e "${YELLOW}Warte, bis der Backend-Server bereit ist...${NC}"
for i in {1..10}; do
  if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}Backend-Server läuft und ist bereit!${NC}"
    break
  fi
  if [ $i -eq 10 ]; then
    echo -e "${RED}Zeitüberschreitung beim Warten auf den Backend-Server. Bitte prüfen Sie backend_log.txt für Fehler!${NC}"
    exit 1
  fi
  echo -n "."
  sleep 2
done

# Starte Frontend, falls es nicht bereits läuft
echo -e "${BLUE}======================================================================${NC}"
if check_port 3000; then
  echo -e "${YELLOW}Frontend-Server läuft bereits auf Port 3000.${NC}"
else
  echo -e "${GREEN}Starte Frontend-Server...${NC}"
  cd frontend && npm start > ../frontend_log.txt 2>&1 &
  FRONTEND_PID=$!
  echo -e "${GREEN}Frontend-Server gestartet mit PID $FRONTEND_PID${NC}"
  echo -e "${GREEN}Logs werden in frontend_log.txt gespeichert${NC}"
  
  # Warte, bis der Frontend-Server bereit ist
  echo -e "${YELLOW}Warte, bis der Frontend-Server bereit ist...${NC}"
  for i in {1..15}; do
    if curl -s http://localhost:3000 > /dev/null; then
      echo -e "${GREEN}Frontend-Server läuft und ist bereit!${NC}"
      break
    fi
    if [ $i -eq 15 ]; then
      echo -e "${YELLOW}Zeitüberschreitung beim Warten auf den Frontend-Server, aber das ist möglicherweise normal.${NC}"
    fi
    echo -n "."
    sleep 2
  done
fi

# Erfolgreiche Nachricht anzeigen
echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}Insight Synergy wurde erfolgreich gestartet!${NC}"
echo -e "${GREEN}Backend-URL: http://localhost:8000${NC}"
echo -e "${GREEN}Frontend-URL: http://localhost:3000${NC}"
echo -e ""
echo -e "${YELLOW}Verwenden Sie './stop_all.sh', um alle Server zu beenden.${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Speichere PIDs für den Stop-Befehl
echo "BACKEND_PID=$BACKEND_PID" > ./.process_ids
if [ ! -z "$FRONTEND_PID" ]; then
  echo "FRONTEND_PID=$FRONTEND_PID" >> ./.process_ids
fi 