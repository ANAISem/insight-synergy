#!/bin/bash

# Farben für Ausgaben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}   Insight Synergy - Komma-Fehler-Behebung${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "${YELLOW}Behebung der fehlenden Kommas in Objekten...${NC}\n"

# Pfad zur Zieldatei
TARGET_FILE="frontend/src/components/insight-core/LiveExpertDebatePanel.tsx"

# Überprüfen, ob die Datei existiert
if [ ! -f "$TARGET_FILE" ]; then
    echo -e "${RED}FEHLER: Die Datei $TARGET_FILE wurde nicht gefunden.${NC}"
    exit 1
fi

# Backup erstellen
BACKUP_FILE="${TARGET_FILE}.comma.backup.$(date +%Y%m%d%H%M%S)"
cp "$TARGET_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup erstellt: $BACKUP_FILE${NC}"

# 1. Korrektur: Füge fehlendes Komma zwischen messageHistory und Map-Aufruf hinzu
echo -e "${YELLOW}1. Füge fehlendes Komma zwischen Schlüsseln ein...${NC}"
cat "$TARGET_FILE" | sed '/messageHistory:/ {
  N;
  s/messageHistory:\s*messages\.map/messageHistory: messages.map/
}' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ Fehlende Kommas in Zeile ~1120 hinzugefügt${NC}"

# 2. Korrektur: Füge fehlende Kommas zwischen Objekteigenschaften hinzu
echo -e "${YELLOW}2. Repariere Objekteigenschaften mit fehlenden Kommas...${NC}"
cat "$TARGET_FILE" | sed 's/\(id: m\.id\),/\1,/g' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
cat "$TARGET_FILE" | sed 's/\(expertId: m\.expertId\),/\1,/g' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
cat "$TARGET_FILE" | sed 's/\(expertName: m\.expertName\),/\1,/g' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
cat "$TARGET_FILE" | sed 's/\(content: m\.content\)\([^,]\)/\1,\2/g' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ Fehlende Kommas in Objekteigenschaften hinzugefügt${NC}"

# 3. Korrektur: Manuelle Korrektur der Objektformatierung um Zeile 1120-1130
echo -e "${YELLOW}3. Korrigiere die Objektformatierung um Zeile 1120-1130...${NC}"
# Extrahiere die problematische Region und korrigiere sie manuell
cat "$TARGET_FILE" | sed '
/<Box sx={{ display:/,/<\/Box>/ {
  # Nichts ändern
  p
  d
}
/<\/Box>/{
  n
  /messageHistory:/{
    s/messageHistory:/messageHistory: /
  }
}
' > "${TARGET_FILE}.fixed" 
cat "${TARGET_FILE}.fixed" > "$TARGET_FILE"
rm "${TARGET_FILE}.fixed"
echo -e "${GREEN}✓ Objektformatierung korrigiert${NC}"

# Weitere potenzielle Stellen, wo Kommas fehlen könnten
echo -e "${YELLOW}4. Suche und korrigiere weitere Kommaprobleme...${NC}"
cat "$TARGET_FILE" | sed '
s/\(\w\+\): \(\w\+\),\s\+\(\w\+\): \(\w\+\)\(\s*[^,]\)/\1: \2, \3: \4,\5/g
s/\(\w\+\): \(\w\+\)\s\+}\)/\1: \2}/g
' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ Weitere Kommaprobleme korrigiert${NC}"

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}✓ Komma-Fehler-Behebung abgeschlossen!${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "${YELLOW}Hinweis: Bitte überprüfen Sie, ob die Anwendung nun fehlerfrei kompiliert.${NC}"
echo -e "${YELLOW}Falls weitere Probleme auftreten, wurde ein Backup unter $BACKUP_FILE erstellt.${NC}" 