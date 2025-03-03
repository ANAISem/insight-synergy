#!/bin/bash

# Farbdefinitionen für bessere Lesbarkeit
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Prüfen, ob docker-compose installiert ist
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} docker-compose ist nicht installiert. Bitte installiere es zuerst."
    exit 1
fi

# Prüfen, ob .env-Datei vorhanden ist
if [ ! -f .env ]; then
    echo -e "${RED}[ERROR]${NC} .env-Datei nicht gefunden. Bitte erstelle sie basierend auf .env.example."
    exit 1
fi

# Backup der aktuellen Anwendung erstellen
echo -e "${BLUE}[INFO]${NC} Erstelle Backup der aktuellen Anwendung..."
timestamp=$(date +"%Y%m%d_%H%M%S")
mkdir -p backups
tar -czf "backups/nexus_backup_${timestamp}.tar.gz" .env docker-compose.yml

# Anwendung aktualisieren
echo -e "${BLUE}[INFO]${NC} Aktualisiere die Anwendung..."
git pull origin main

# Docker-Images aktualisieren
echo -e "${BLUE}[INFO]${NC} Aktualisiere Docker-Images..."
docker-compose pull

# Anwendung neu starten
echo -e "${YELLOW}[WARNING]${NC} Die Anwendung wird jetzt neu gestartet. Dies kann zu einer kurzzeitigen Nichtverfügbarkeit führen."
read -p "Fortfahren? (j/n) " answer
if [ "$answer" = "j" ]; then
    echo -e "${BLUE}[INFO]${NC} Starte die Anwendung neu..."
    docker-compose down
    docker-compose up -d
    
    # Auf Bereitschaft prüfen
    echo -e "${BLUE}[INFO]${NC} Warte auf Bereitschaft der Anwendung..."
    sleep 10
    if curl -s http://localhost:80/health | grep -q "ok"; then
        echo -e "${GREEN}[SUCCESS]${NC} Deployment erfolgreich!"
    else
        echo -e "${RED}[ERROR]${NC} Deployment fehlgeschlagen. Anwendung ist nicht erreichbar."
        echo -e "${BLUE}[INFO]${NC} Logs anzeigen mit: docker-compose logs"
    fi
else
    echo -e "${BLUE}[INFO]${NC} Deployment abgebrochen."
fi 