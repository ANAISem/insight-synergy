#!/bin/bash

# Farben für Ausgaben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}   Insight Synergy - Funktions-Test-Tool${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "${YELLOW}Überprüfung der implementierten Pause- und Scroll-Funktionen...${NC}\n"

# Pfad zur Zieldatei
TARGET_FILE="frontend/src/components/insight-core/LiveExpertDebatePanel.tsx"

# Überprüfen, ob die Datei existiert
if [ ! -f "$TARGET_FILE" ]; then
    echo -e "${RED}FEHLER: Die Datei $TARGET_FILE wurde nicht gefunden.${NC}"
    exit 1
fi

# Test 1: Vorhandensein der Icons überprüfen
echo -e "${YELLOW}1. Überprüfe Import der Icons...${NC}"
if grep -q "PlayArrow as PlayArrowIcon" "$TARGET_FILE" && grep -q "Pause as PauseIcon" "$TARGET_FILE"; then
    echo -e "${GREEN}✓ Icons wurden korrekt importiert${NC}"
else
    echo -e "${RED}✗ Icons wurden nicht korrekt importiert${NC}"
fi

# Test 2: Vorhandensein der State-Variablen überprüfen
echo -e "${YELLOW}2. Überprüfe State-Variablen...${NC}"
if grep -q "const \[isPaused, setIsPaused\] = useState(false)" "$TARGET_FILE" && grep -q "const \[discussionTimer, setDiscussionTimer\] = useState<NodeJS.Timeout | null>(null)" "$TARGET_FILE"; then
    echo -e "${GREEN}✓ State-Variablen wurden korrekt hinzugefügt${NC}"
else
    echo -e "${RED}✗ State-Variablen wurden nicht korrekt hinzugefügt${NC}"
fi

# Test 3: Vorhandensein der handleAutomatedDiscussion-Funktion überprüfen
echo -e "${YELLOW}3. Überprüfe handleAutomatedDiscussion-Funktion...${NC}"
if grep -q "const handleAutomatedDiscussion = (nextExpert: Expert, isFirstMessage: boolean, delay: number = 3000) =>" "$TARGET_FILE"; then
    echo -e "${GREEN}✓ handleAutomatedDiscussion-Funktion wurde korrekt hinzugefügt${NC}"
else
    echo -e "${RED}✗ handleAutomatedDiscussion-Funktion wurde nicht korrekt hinzugefügt${NC}"
fi

# Test 4: Reset in startDebate überprüfen
echo -e "${YELLOW}4. Überprüfe Reset in startDebate...${NC}"
if grep -q "setIsPaused(false); // Reset der Pause-Funktion beim Start einer neuen Debatte" "$TARGET_FILE"; then
    echo -e "${GREEN}✓ Reset wurde korrekt in startDebate hinzugefügt${NC}"
else
    echo -e "${RED}✗ Reset wurde nicht korrekt in startDebate hinzugefügt${NC}"
fi

# Test 5: Vorhandensein von handleAutomatedDiscussion-Aufrufen überprüfen
echo -e "${YELLOW}5. Überprüfe Verwendung von handleAutomatedDiscussion...${NC}"
if grep -q "handleAutomatedDiscussion(nextExpert, false," "$TARGET_FILE"; then
    echo -e "${GREEN}✓ handleAutomatedDiscussion wird korrekt verwendet${NC}"
else
    echo -e "${RED}✗ handleAutomatedDiscussion wird nicht korrekt verwendet${NC}"
fi

# Test 6: Vorhandensein der UI-Komponenten überprüfen
echo -e "${YELLOW}6. Überprüfe UI-Komponenten...${NC}"
if grep -q "{/\\* Pause/Fortsetzen-Button \\*/}" "$TARGET_FILE" && grep -q "onClick={() => setIsPaused(!isPaused)}" "$TARGET_FILE"; then
    echo -e "${GREEN}✓ UI-Komponenten wurden korrekt hinzugefügt${NC}"
else
    echo -e "${RED}✗ UI-Komponenten wurden nicht korrekt hinzugefügt${NC}"
fi

# Fazit
echo -e "\n${BLUE}==================================================${NC}"
echo -e "${YELLOW}Zusammenfassung der Implementierungsprüfung:${NC}"

TESTS_PASSED=0
TESTS_TOTAL=6

# Zähle die bestandenen Tests
if grep -q "PlayArrow as PlayArrowIcon" "$TARGET_FILE" && grep -q "Pause as PauseIcon" "$TARGET_FILE"; then
    ((TESTS_PASSED++))
fi

if grep -q "const \[isPaused, setIsPaused\] = useState(false)" "$TARGET_FILE" && grep -q "const \[discussionTimer, setDiscussionTimer\] = useState<NodeJS.Timeout | null>(null)" "$TARGET_FILE"; then
    ((TESTS_PASSED++))
fi

if grep -q "const handleAutomatedDiscussion = (nextExpert: Expert, isFirstMessage: boolean, delay: number = 3000) =>" "$TARGET_FILE"; then
    ((TESTS_PASSED++))
fi

if grep -q "setIsPaused(false); // Reset der Pause-Funktion beim Start einer neuen Debatte" "$TARGET_FILE"; then
    ((TESTS_PASSED++))
fi

if grep -q "handleAutomatedDiscussion(nextExpert, false," "$TARGET_FILE"; then
    ((TESTS_PASSED++))
fi

if grep -q "{/\\* Pause/Fortsetzen-Button \\*/}" "$TARGET_FILE" && grep -q "onClick={() => setIsPaused(!isPaused)}" "$TARGET_FILE"; then
    ((TESTS_PASSED++))
fi

# Zeige Ergebnis
if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo -e "${GREEN}✓ Alle Tests wurden bestanden! Die Implementierung war erfolgreich.${NC}"
else
    echo -e "${RED}✗ $TESTS_PASSED von $TESTS_TOTAL Tests wurden bestanden.${NC}"
    if [ $TESTS_PASSED -gt $(($TESTS_TOTAL / 2)) ]; then
        echo -e "${YELLOW}Die Implementierung war teilweise erfolgreich, könnte aber Probleme aufweisen.${NC}"
    else
        echo -e "${RED}Die Implementierung war nicht erfolgreich. Bitte überprüfe die Logs.${NC}"
    fi
fi

echo -e "${BLUE}==================================================${NC}" 