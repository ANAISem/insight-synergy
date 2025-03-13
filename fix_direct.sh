#!/bin/bash

# Farben für Ausgaben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}   Insight Synergy - Gezielte Fehler-Behebung${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "${YELLOW}Behebung der spezifischen Syntaxfehler...${NC}\n"

# Pfad zur Zieldatei
TARGET_FILE="frontend/src/components/insight-core/LiveExpertDebatePanel.tsx"

# Überprüfen, ob die Datei existiert
if [ ! -f "$TARGET_FILE" ]; then
    echo -e "${RED}FEHLER: Die Datei $TARGET_FILE wurde nicht gefunden.${NC}"
    exit 1
fi

# Backup erstellen
BACKUP_FILE="${TARGET_FILE}.direct.backup.$(date +%Y%m%d%H%M%S)"
cp "$TARGET_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup erstellt: $BACKUP_FILE${NC}"

# 1. Korrektur: Fehlende Klammer bei setTimeout (Zeile ~656)
echo -e "${YELLOW}1. Repariere setTimeout in sendUserMessage...${NC}"
cat "$TARGET_FILE" | awk '
/setTimeout\(\(\) => \{/ && /const randomExpert =/ {
  inTimeout = 1
}
inTimeout == 1 && /generateExpertMessage\(randomExpert, false\);/ {
  print $0 "}, 1500);"
  inTimeout = 0
  next
}
inTimeout == 1 && /\};/ {
  inTimeout = 0
}
{ print $0 }
' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ setTimeout repariert${NC}"

# 2. Korrektur: Entferne doppelte handleAutomatedDiscussion Funktion
echo -e "${YELLOW}2. Entferne doppelte handleAutomatedDiscussion Funktion...${NC}"
cat "$TARGET_FILE" | awk '
BEGIN { count = 0; skip = 0; }
/const handleAutomatedDiscussion = \(nextExpert: Expert, isFirstMessage: boolean, delay: number = 3000\) =>/ {
  count++;
  if (count > 1) {
    skip = 1;
  }
}
skip == 1 && /setDiscussionTimer\(timer\);/ {
  if (next_line_has_brace == 1) {
    skip = 0;
    next_line_has_brace = 0;
  }
}
skip == 1 && /\};/ {
  skip = 0;
  next;
}
skip == 0 { print $0 }
' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ Doppelte Funktion entfernt${NC}"

# 3. Korrektur: Fehlerhafte try-catch-Blöcke reparieren (Zeile ~740)
echo -e "${YELLOW}3. Repariere fehlerhafte try-catch-Blöcke...${NC}"
# Fixiere fehlendes "try"
cat "$TARGET_FILE" | sed '/console.log(`Versuche, Expertenantwort über API zu generieren/i\
    try {' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"

# Fixiere fehlendes "catch"/"finally"
cat "$TARGET_FILE" | sed '/fallbackExpertMessage(expert, isFirstMessage);/a\
    }' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ Try-catch-Blöcke repariert${NC}"

# 4. Korrektur: Behebe Kommaprobleme in Objekt-Definitionen
echo -e "${YELLOW}4. Repariere Kommaprobleme in Objekt-Definitionen...${NC}"
cat "$TARGET_FILE" | sed 's/references: data.message.references || \[\]/references: data.message.references || \[\],/g' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ Kommaprobleme repariert${NC}"

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}✓ Gezielte Fehlerbehebung abgeschlossen!${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "${YELLOW}Hinweis: Bitte überprüfen Sie, ob die Anwendung nun fehlerfrei kompiliert.${NC}"
echo -e "${YELLOW}Falls weitere Probleme auftreten, wurde ein Backup unter $BACKUP_FILE erstellt.${NC}" 