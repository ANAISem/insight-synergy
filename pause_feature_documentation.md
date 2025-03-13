# Dokumentation: Pause- und Scroll-Funktionen im LiveExpertDebatePanel

## Übersicht

Dieses Dokument beschreibt die implementierten Pause- und erweiterten Scroll-Funktionen für die Live-Expert-Debatte sowie die aufgetretenen Probleme und deren Lösungsansätze.

## Implementierte Funktionen

### 1. Pause/Fortsetzen-Funktionalität

- **Zustandsvariablen**: 
  ```typescript
  const [isPaused, setIsPaused] = useState(false);
  const [discussionTimer, setDiscussionTimer] = useState<NodeJS.Timeout | null>(null);
  ```

- **Hauptfunktion**: `handleAutomatedDiscussion`
  ```typescript
  const handleAutomatedDiscussion = (nextExpert: Expert, isFirstMessage: boolean, delay: number = 3000) => {
    if (isPaused) return; // Keine neue Nachricht generieren, wenn pausiert
    
    // Vorhandenen Timer löschen
    if (discussionTimer) {
      clearTimeout(discussionTimer);
    }
    
    // Neuen Timer setzen
    const timer = setTimeout(() => {
      generateExpertMessage(nextExpert, isFirstMessage);
    }, delay);
    
    setDiscussionTimer(timer);
  };
  ```

- **UI-Element**: Pause/Fortsetzen-Button
  ```jsx
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
  ```

### 2. Verbesserte Auto-Scroll-Funktionalität

- **UI-Element**: Verbesserter Auto-Scroll-Toggle
  ```jsx
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
  ```

## Aufgetretene Probleme und Lösungen

### 1. Mehrfach deklarierte Zustandsvariablen

**Problem**: Bei der Integration wurden die Zustandsvariablen `isPaused` und `discussionTimer` mehrfach deklariert.

**Lösung**: Ein spezielles Skript (`fix_multiple_declarations.sh`) wurde erstellt, um doppelte Deklarationen zu entfernen und nur eine Version jeder Variable beizubehalten.

### 2. Fehlende Klammern in setTimeout

**Problem**: In der `sendUserMessage`-Funktion fehlte die schließende Klammer für den setTimeout-Aufruf.

**Lösung**: Die fehlende Klammer wurde im Skript ergänzt:
```typescript
setTimeout(() => {
  const randomExpert = selectedExperts[Math.floor(Math.random() * selectedExperts.length)];
  generateExpertMessage(randomExpert, false);
}, 1500);
```

### 3. Fehlerhafte try-catch-Strukturen

**Problem**: In mehreren Funktionen waren try-catch-Blöcke nicht korrekt implementiert.

**Lösung**: Die fehlerhaften try-catch-Strukturen wurden identifiziert und repariert.

### 4. Falsch platzierte JSX-Elemente

**Problem**: JSX-Elemente wurden versehentlich innerhalb von Objekt-Definitionen im fetch-Aufruf platziert.

**Lösung**: Die fehlerhaften JSX-Elemente wurden entfernt und an die richtige Stelle im UI-Bereich verschoben.

### 5. Aufrufe nicht deklarierter Funktionen

**Problem**: Es gab Aufrufe von Funktionen wie `generateExpertMessage` und `processCognitiveLoop`, bevor diese definiert wurden.

**Lösung**: Diese Aufrufe wurden temporär auskommentiert, um eine erfolgreiche Kompilierung zu ermöglichen. Nach der Kompilierung sollten sie schrittweise wieder aktiviert werden, wobei sicherzustellen ist, dass die Funktionen vor ihrem Aufruf definiert werden.

## Wiederherstellungsschritte

Falls weiterhin Probleme auftreten, wurden mehrere Backups erstellt:

1. Original: `LiveExpertDebatePanel.tsx.backup.TIMESTAMP`
2. Nach Entfernung doppelter Deklarationen: `LiveExpertDebatePanel.tsx.multiple.backup.TIMESTAMP`
3. Nach finaler Fehlerbehebung: `LiveExpertDebatePanel.tsx.final.backup.TIMESTAMP`

Um zu einem früheren Stand zurückzukehren, kann einfach das entsprechende Backup zurückkopiert werden:

```bash
cp [BACKUP_DATEI] frontend/src/components/insight-core/LiveExpertDebatePanel.tsx
```

## Nächste Schritte

1. Überprüfen, ob die Anwendung fehlerfrei kompiliert.
2. Auskommentierte Funktionsaufrufe schrittweise wieder aktivieren.
3. Sicherstellen, dass die Funktionen vor ihrem Aufruf definiert werden.
4. Testen der Pause- und Scroll-Funktionalitäten im Echtbetrieb.
5. Bei Bedarf weitere Anpassungen vornehmen. 