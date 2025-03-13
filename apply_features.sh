#!/bin/bash

# Farben für Ausgaben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}   Insight Synergy - Funktionen-Update-Tool${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "${YELLOW}Implementierung der Pause- und verbesserten Scroll-Funktionen...${NC}\n"

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

# 1. Import der zusätzlichen Icons hinzufügen
echo -e "${YELLOW}1. Füge Icons hinzu...${NC}"
cat "$TARGET_FILE" | sed '/import {/,/} from '"'"'@mui\/icons-material'"'"'/ {
  s/} from '"'"'@mui\/icons-material'"'"'/  PlayArrow as PlayArrowIcon,\n  Pause as PauseIcon\n} from '"'"'@mui\/icons-material'"'"'/
}' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ Icons hinzugefügt${NC}"

# 2. State-Variablen für Pause-Funktion hinzufügen
echo -e "${YELLOW}2. Füge State-Variablen hinzu...${NC}"
cat "$TARGET_FILE" | sed '/const \[newMessageCount, setNewMessageCount\] = useState(0);/ a\
  // Neue Zustandsvariablen für Pause-Funktion\
  const [isPaused, setIsPaused] = useState(false);\
  const [discussionTimer, setDiscussionTimer] = useState<NodeJS.Timeout | null>(null);' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ State-Variablen hinzugefügt${NC}"

# 3. handleAutomatedDiscussion Funktion hinzufügen
echo -e "${YELLOW}3. Füge handleAutomatedDiscussion Funktion hinzu...${NC}"
cat "$TARGET_FILE" | sed '/const generateExpertMessage = async (expert: Expert, isFirstMessage: boolean) =>/ i\
  // Startet die automatisierte Diskussion mit Berücksichtigung der Pause-Funktion\
  const handleAutomatedDiscussion = (nextExpert: Expert, isFirstMessage: boolean, delay: number = 3000) => {\
    // Wenn die Diskussion pausiert ist, wird keine neue Nachricht generiert\
    if (isPaused) return;\
    \
    // Vorhandenen Timer löschen, um doppelte Timer zu vermeiden\
    if (discussionTimer) {\
      clearTimeout(discussionTimer);\
    }\
    \
    // Neuen Timer setzen\
    const timer = setTimeout(() => {\
      generateExpertMessage(nextExpert, isFirstMessage);\
    }, delay);\
    \
    setDiscussionTimer(timer);\
  };\
' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ handleAutomatedDiscussion Funktion hinzugefügt${NC}"

# 4. Reset in startDebate hinzufügen
echo -e "${YELLOW}4. Füge Reset für Pause in startDebate hinzu...${NC}"
cat "$TARGET_FILE" | sed '/setInsights(\[\]);/ a\
    setIsPaused(false); // Reset der Pause-Funktion beim Start einer neuen Debatte' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
echo -e "${GREEN}✓ Reset hinzugefügt${NC}"

# 5. Ändern der setTimeout-Aufrufe (Vereinfachte Methode mit sed)
echo -e "${YELLOW}5. Ändere setTimeout-Aufrufe zu handleAutomatedDiscussion...${NC}"

# Verschiedene setTimeout-Patterns ersetzen
cat "$TARGET_FILE" | sed 's/setTimeout(() => {.*generateExpertMessage(nextExpert, false);.*}, [0-9].*);/handleAutomatedDiscussion(nextExpert, false, 3000 + Math.random() * 2000);/g' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"

cat "$TARGET_FILE" | sed 's/setTimeout(() => {.*const randomExpert = selectedExperts\[Math.floor(Math.random() \* selectedExperts.length)\];.*generateExpertMessage(randomExpert, false);.*}, 1500);/const randomExpert = selectedExperts\[Math.floor(Math.random() \* selectedExperts.length)\];\n    handleAutomatedDiscussion(randomExpert, false, 1500);/g' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"

# Ersetzt spezifische Timeout-Aufrufe in simulateAIExpertResponse
cat "$TARGET_FILE" | sed '/nextExpert = otherExperts\[Math.floor(Math.random() \* otherExperts.length)\];/ {
  n
  s/.*setTimeout.*delay);/        handleAutomatedDiscussion(nextExpert, false, 2000 + Math.random() * 8000);/g
}' > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"

echo -e "${GREEN}✓ setTimeout-Aufrufe geändert${NC}"

# 6. UI-Komponenten für Pause und verbesserten Scroll hinzufügen
echo -e "${YELLOW}6. Füge UI-Komponenten für Steuerung in den Chat-Bereich ein...${NC}"

# Create a temporary file containing the box we want to add
cat > temp_ui_box.txt << 'EOF'
                    {/* Steuerelemente für Chat-Funktionen */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 2,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: 'rgba(0, 0, 0, 0.03)'
                    }}>
                      {/* Pause/Fortsetzen-Button */}
                      <Tooltip title={isPaused ? "Diskussion fortsetzen" : "Diskussion pausieren"}>
                        <Button
                          size="small"
                          variant="outlined"
                          color={isPaused ? "primary" : "secondary"}
                          onClick={() => setIsPaused(!isPaused)}
                          startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                        >
                          {isPaused ? "Fortsetzen" : "Pausieren"}
                        </Button>
                      </Tooltip>
                      
                      {/* Auto-Scroll-Toggle */}
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={autoScroll}
                            onChange={(e) => setAutoScroll(e.target.checked)}
                            size="small"
                            color="primary"
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2">Auto-Scroll</Typography>
                            {autoScroll && <CheckCircleIcon fontSize="small" color="success" sx={{ ml: 0.5 }} />}
                          </Box>
                        }
                      />
                    </Box>
EOF

# Find the line before messages.map and insert our UI box
LINE_NUM=$(grep -n "messages.map" "$TARGET_FILE" | head -1 | cut -d':' -f1)
if [ -n "$LINE_NUM" ]; then
  HEAD_LINES=$((LINE_NUM - 1))
  TAIL_LINES=$(($(wc -l < "$TARGET_FILE") - HEAD_LINES))
  
  head -n $HEAD_LINES "$TARGET_FILE" > "${TARGET_FILE}.head"
  tail -n $TAIL_LINES "$TARGET_FILE" > "${TARGET_FILE}.tail"
  
  cat "${TARGET_FILE}.head" temp_ui_box.txt "${TARGET_FILE}.tail" > "$TARGET_FILE"
  
  rm "${TARGET_FILE}.head" "${TARGET_FILE}.tail" temp_ui_box.txt
  
  echo -e "${GREEN}✓ UI-Komponenten hinzugefügt${NC}"
else
  echo -e "${RED}Konnte die Position für UI-Komponenten nicht finden${NC}"
fi

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}✓ Implementierung abgeschlossen!${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "${YELLOW}Hinweis: Bitte überprüfen Sie die Implementierung auf Fehler.${NC}"
echo -e "${YELLOW}Falls Probleme auftreten, wurde ein Backup unter $BACKUP_FILE erstellt.${NC}" 