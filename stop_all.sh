#!/bin/bash

# Farben für die Ausgabe
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner ausgeben
echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}                    INSIGHT SYNERGY STOPPER                         ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "${YELLOW}Aktuelle Zeit: $(date)${NC}"
echo -e "${BLUE}----------------------------------------------------------------------${NC}"

# Funktion zum Prüfen, ob ein Port verwendet wird
check_port() {
  local port=$1
  if lsof -i :$port | grep LISTEN >/dev/null; then
    return 0 # Port ist in Nutzung
  else
    return 1 # Port ist frei
  fi
}

# Versuche gespeicherte PIDs zu lesen
if [ -f ./.process_ids ]; then
  echo -e "${YELLOW}Lese gespeicherte Prozess-IDs...${NC}"
  source ./.process_ids
fi

# Beende Backend-Server
echo -e "${YELLOW}Beende Backend-Server...${NC}"
# Versuche es zuerst mit der gespeicherten PID
if [ ! -z "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null; then
  echo -e "${YELLOW}Beende Backend-Prozess mit PID $BACKEND_PID...${NC}"
  kill -9 $BACKEND_PID
  sleep 2
else
  # Falls keine PID gespeichert oder Prozess bereits beendet wurde, versuche es mit pkill
  echo -e "${YELLOW}Versuche, laufende Backend-Prozesse zu finden...${NC}"
  pkill -f "python.*start_api.py"
  sleep 2
fi

# Überprüfe, ob der Backend-Port noch belegt ist
if check_port 8000; then
  echo -e "${YELLOW}Port 8000 ist immer noch belegt. Versuche, den blockierenden Prozess zu beenden...${NC}"
  pid=$(lsof -ti:8000)
  if [ ! -z "$pid" ]; then
    echo -e "${YELLOW}Beende Prozess $pid, der Port 8000 blockiert...${NC}"
    kill -9 $pid
    sleep 2
  fi
fi

# Prüfe, ob der Backend-Server tatsächlich beendet wurde
if check_port 8000; then
  echo -e "${RED}Konnte Backend-Server nicht vollständig beenden. Port 8000 ist immer noch belegt.${NC}"
else
  echo -e "${GREEN}Backend-Server erfolgreich beendet!${NC}"
fi

# Beende Frontend-Server
echo -e "${YELLOW}Beende Frontend-Server...${NC}"
# Versuche es zuerst mit der gespeicherten PID
if [ ! -z "$FRONTEND_PID" ] && ps -p $FRONTEND_PID > /dev/null; then
  echo -e "${YELLOW}Beende Frontend-Prozess mit PID $FRONTEND_PID...${NC}"
  kill -9 $FRONTEND_PID
  sleep 2
fi

# Suche nach React-Servern, die Port 3000 nutzen
if check_port 3000; then
  echo -e "${YELLOW}Port 3000 ist immer noch belegt. Versuche, Frontend-Prozesse zu beenden...${NC}"
  # Beende alle Prozesse, die Port 3000 verwenden
  pids=$(lsof -ti:3000)
  if [ ! -z "$pids" ]; then
    echo -e "${YELLOW}Beende Prozesse $pids, die Port 3000 blockieren...${NC}"
    kill -9 $pids
    sleep 2
  fi
  
  # Beende zusätzlich alle Node-Prozesse, die mit dem Frontend zu tun haben könnten
  echo -e "${YELLOW}Versuche, weitere Node-Prozesse zu beenden...${NC}"
  pkill -f "node.*react-scripts" || true
  sleep 1
fi

# Prüfe, ob der Frontend-Server tatsächlich beendet wurde
if check_port 3000; then
  echo -e "${RED}Konnte Frontend-Server nicht vollständig beenden. Port 3000 ist immer noch belegt.${NC}"
else
  echo -e "${GREEN}Frontend-Server erfolgreich beendet!${NC}"
fi

# Lösche die gespeicherten PIDs
if [ -f ./.process_ids ]; then
  rm ./.process_ids
fi

# Erfolgreiche Nachricht anzeigen
echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}Insight Synergy wurde erfolgreich gestoppt!${NC}"
echo -e "${BLUE}======================================================================${NC}" 