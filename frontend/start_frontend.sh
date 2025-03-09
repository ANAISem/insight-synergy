#!/bin/bash

# Farben für Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Anzeigen einer Willkommensnachricht
echo "======================================================"
echo "        INSIGHT SYNERGY - FRONTEND STARTER            "
echo "======================================================"
echo

# Wechsle ins Verzeichnis des Skripts
cd "$(dirname "$0")"
echo -e "${BLUE}Arbeitsverzeichnis:${NC} $(pwd)"

# Starte das Frontend im Entwicklungsmodus
echo -e "${YELLOW}Starte den Insight Synergy Frontend...${NC}"
npm start 