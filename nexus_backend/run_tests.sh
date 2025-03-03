#!/bin/bash

# Farbdefinitionen für bessere Lesbarkeit
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[INFO]${NC} Starte die Container mit Docker Compose..."
docker-compose up -d

# Warte, bis alle Services bereit sind
echo -e "${BLUE}[INFO]${NC} Warte, bis alle Services bereit sind..."
sleep 15

# Führe die Integrationstests durch
echo -e "${BLUE}[INFO]${NC} Führe Integrationstests durch..."
pytest tests/integration/ -v

# Überprüfe das Ergebnis der Tests
if [ $? -eq 0 ]
then
    echo -e "${GREEN}[SUCCESS]${NC} Alle Integrationstests erfolgreich durchgeführt!"
else
    echo -e "${RED}[ERROR]${NC} Integrationstests fehlgeschlagen!"
fi

# Optional: Stoppe die Container nach den Tests
read -p "Möchtest du die Container stoppen? (j/n) " answer
if [ "$answer" = "j" ]
then
    echo -e "${BLUE}[INFO]${NC} Stoppe die Container..."
    docker-compose down
fi 