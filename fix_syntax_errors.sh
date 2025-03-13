#!/bin/bash

# Farben für Ausgaben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}   Insight Synergy - Fix-Syntax-Errors-Tool${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "${YELLOW}Behebung von Syntax-Fehlern in LiveExpertDebatePanel.tsx...${NC}\n"

# Pfad zur Zieldatei
TARGET_FILE="frontend/src/components/insight-core/LiveExpertDebatePanel.tsx"

# Überprüfen, ob die Datei existiert
if [ ! -f "$TARGET_FILE" ]; then
    echo -e "${RED}FEHLER: Die Datei $TARGET_FILE wurde nicht gefunden.${NC}"
    exit 1
fi

# Backup erstellen
BACKUP_FILE="${TARGET_FILE}.backup.$(date +%Y%m%d%H%M%S)"
cp "$TARGET_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup erstellt: $BACKUP_FILE${NC}"

# Fehlerkorrekturen vornehmen

# 1. Korrektur: Repariere try-catch-Blöcke
echo -e "${YELLOW}1. Repariere try-catch-Blöcke...${NC}"
# Suche Zeilen mit "} catch (err: any) {" ohne vorheriges "try {"
cat "$TARGET_FILE" | sed '/} catch (err: any) {/ {
  x
  /try {/!{
    x
    s/}/try {\n    }/
  }
  x
}' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"

# Suche Zeilen mit "catch" ohne folgendes "}"
cat "$TARGET_FILE" | sed '/} catch (err: any) {/ {
  n
  /.*};/!{
    s/$/\n    };/
  }
}' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"

echo -e "${GREEN}✓ Try-catch-Blöcke repariert${NC}"

# 2. Korrektur: Fehlende Kommas in Objekt-Definitionen hinzufügen
echo -e "${YELLOW}2. Repariere Objekt-Definitionen...${NC}"
cat "$TARGET_FILE" | sed 's/\([a-zA-Z0-9"]\+\): \([a-zA-Z0-9"]\+\)/\1: \2,/g' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
cat "$TARGET_FILE" | sed 's/\([a-zA-Z0-9"]\+\): \([a-zA-Z0-9"]\+\)}/\1: \2}/g' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ Objekt-Definitionen repariert${NC}"

# 3. Final: Entferne doppelte Kommas
echo -e "${YELLOW}3. Entferne doppelte Kommas...${NC}"
cat "$TARGET_FILE" | sed 's/,,/,/g' | sed 's/,}/}/g' | sed 's/,\s*,/,/g' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ Doppelte Kommas entfernt${NC}"

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}✓ Syntax-Fehler-Korrekturen abgeschlossen!${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "${YELLOW}Hinweis: Bitte überprüfen Sie, ob die Anwendung nun fehlerfrei kompiliert.${NC}"
echo -e "${YELLOW}Falls weitere Probleme auftreten, wurde ein Backup unter $BACKUP_FILE erstellt.${NC}" 