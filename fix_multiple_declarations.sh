#!/bin/bash

# Farben für Ausgaben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}   Insight Synergy - Behebung doppelter Deklarationen${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "${YELLOW}Behebung der doppelten Deklarationen und Syntaxfehler...${NC}\n"

# Pfad zur Zieldatei
TARGET_FILE="frontend/src/components/insight-core/LiveExpertDebatePanel.tsx"

# Überprüfen, ob die Datei existiert
if [ ! -f "$TARGET_FILE" ]; then
    echo -e "${RED}FEHLER: Die Datei $TARGET_FILE wurde nicht gefunden.${NC}"
    exit 1
fi

# Backup erstellen
BACKUP_FILE="${TARGET_FILE}.multiple.backup.$(date +%Y%m%d%H%M%S)"
cp "$TARGET_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup erstellt: $BACKUP_FILE${NC}"

# 1. Korrektur: Mehrfache Deklarationen entfernen (Behalte nur eine Deklaration von jeder Variable)
echo -e "${YELLOW}1. Entferne mehrfache Deklarationen der State-Variablen...${NC}"

# Erstelle eine temporäre Datei
TMP_FILE=$(mktemp)

# Zeile für Zeile die Datei durchgehen und nur die erste Deklaration von isPaused und discussionTimer behalten
awk '
BEGIN {
  isPausedDeclared = 0;
  discussionTimerDeclared = 0;
}
/const \[isPaused, setIsPaused\] = useState\(false\);/ {
  if (isPausedDeclared == 0) {
    print "  // Neue Zustandsvariable für Pause-Funktion";
    print "  const [isPaused, setIsPaused] = useState(false);";
    isPausedDeclared = 1;
  }
  next;
}
/const \[discussionTimer, setDiscussionTimer\] = useState<NodeJS\.Timeout \| null>\(null\);/ {
  if (discussionTimerDeclared == 0) {
    print "  // Timer für automatische Diskussionen";
    print "  const [discussionTimer, setDiscussionTimer] = useState<NodeJS.Timeout | null>(null);";
    discussionTimerDeclared = 1;
  }
  next;
}
/\/\/ Neue Zustandsvariablen für Pause-Funktion/ {
  if (isPausedDeclared == 0) {
    print $0;
  }
  next;
}
/\/\/ Neue Zustandsvariable für Pause-Funktion/ {
  # Überspringe diese Kommentarzeile, wenn wir bereits die Variablen deklariert haben
  next;
}
/\/\/ Timer für automatische Diskussionen/ {
  # Überspringe diese Kommentarzeile, wenn wir bereits die Variablen deklariert haben
  next;
}
{ print $0 }
' "$TARGET_FILE" > "$TMP_FILE"

# Ergebnis zurückschreiben
mv "$TMP_FILE" "$TARGET_FILE"
echo -e "${GREEN}✓ Mehrfache Deklarationen entfernt${NC}"

# 2. Korrektur: Fehlende Klammer in sendUserMessage
echo -e "${YELLOW}2. Behebe fehlende Klammer in sendUserMessage...${NC}"
sed -i '' -e 's/generateExpertMessage(randomExpert, false);$/generateExpertMessage(randomExpert, false);\n    }, 1500);/' "$TARGET_FILE"
echo -e "${GREEN}✓ Fehlende Klammer in sendUserMessage korrigiert${NC}"

# 3. Korrektur: Fehlerhafte try-catch Struktur
echo -e "${YELLOW}3. Korrigiere fehlerhafte try-catch Struktur...${NC}"
# Fixiere fehlendes "try" in generateExpertMessage
awk '
/const generateExpertMessage = async/ {
  inFunction = 1;
  print $0;
  next;
}
inFunction == 1 && /console\.log/ && !/try {/ {
  print "    try {";
  print $0;
  next;
}
{ print $0 }
' "$TARGET_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$TARGET_FILE"

# Fixiere doppelte Klammer am Ende des try-catch Blocks
sed -i '' -e 's/}    }/}/' "$TARGET_FILE"
echo -e "${GREEN}✓ Try-catch Strukturen korrigiert${NC}"

# 4. Korrektur: Entferne fehlerhaften JSX-Code innerhalb der Objektdefinition
echo -e "${YELLOW}4. Entferne fehlerhaften JSX-Code...${NC}"
# Suchen und entfernen Sie den fehlerhaften Code (von Zeile 1088 bis ...})
awk '
BEGIN { inBadCode = 0; }
/context: context \|\| undefined,/ {
  print $0;
  print "          messageHistory: messages.map(m => ({";
  print "            id: m.id,";
  print "            expertId: m.expertId,";
  print "            expertName: m.expertName,";
  print "            content: m.content";
  print "          }))";
  inBadCode = 1;
  next;
}
/messageHistory: messages\.map/ && inBadCode == 1 {
  inBadCode = 0;
  next;
}
inBadCode == 1 && /\}\)\)/ {
  inBadCode = 0;
  next;
}
inBadCode == 1 {
  # Überspringe alle Zeilen innerhalb des fehlerhaften Codes
  next;
}
{ print $0 }
' "$TARGET_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$TARGET_FILE"
echo -e "${GREEN}✓ Fehlerhafter JSX-Code entfernt${NC}"

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}✓ Fehlerbehebung abgeschlossen!${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "${YELLOW}Hinweis: Bitte überprüfen Sie, ob die Anwendung nun fehlerfrei kompiliert.${NC}"
echo -e "${YELLOW}Falls weitere Probleme auftreten, wurde ein Backup unter $BACKUP_FILE erstellt.${NC}" 