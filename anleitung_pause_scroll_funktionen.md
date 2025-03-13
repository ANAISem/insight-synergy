# Anleitung zum Hinzufügen von Pause- und verbesserten Scroll-Funktionen

Diese Anleitung zeigt Ihnen, wie Sie die gewünschten Funktionen in der `LiveExpertDebatePanel.tsx` Datei implementieren können.

## Neue Funktionen

1. **Automatisches Scrollen Umschalter**
   - Ein prominenterer Toggle zum Ein- und Ausschalten des automatischen Scrollens
   - Bessere visuelle Anzeige des aktuellen Status

2. **Pause/Fortsetzen-Funktion für Experten-Diskussionen**
   - Ein Button, um lange automatische Diskussionen zwischen Experten zu pausieren
   - Möglichkeit, die Diskussion später fortzusetzen
   - Verhindert, dass neue Nachrichten generiert werden, wenn die Pause aktiviert ist

## Schritt-für-Schritt Anleitung

### 1. Import der zusätzlichen Icons

Fügen Sie diese Icons zu den bestehenden Icon-Imports hinzu:

```tsx
import {
  // Bestehende Imports beibehalten...
  ArrowDownward as ArrowDownwardIcon,
  // Neue Icons hinzufügen:
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon
} from '@mui/icons-material';
```

### 2. State-Variablen hinzufügen

Suchen Sie den UI-Steuerungs-Block und fügen Sie diese Variablen hinzu:

```tsx
// UI-Steuerung
const [activeTab, setActiveTab] = useState(0);
const messagesEndRef = useRef<HTMLDivElement>(null);
const chatContainerRef = useRef<HTMLDivElement>(null);
const [autoScroll, setAutoScroll] = useState(true);
const [showScrollButton, setShowScrollButton] = useState(false);
const [newMessageCount, setNewMessageCount] = useState(0);
// Neue Zustandsvariablen für Pause-Funktion
const [isPaused, setIsPaused] = useState(false);
const [discussionTimer, setDiscussionTimer] = useState<NodeJS.Timeout | null>(null);
```

### 3. Funktion zur Steuerung der automatisierten Diskussion

Fügen Sie diese Funktion vor der `generateExpertMessage`-Funktion ein:

```tsx
// Startet die automatisierte Diskussion mit Berücksichtigung der Pause-Funktion
const handleAutomatedDiscussion = (nextExpert: Expert, isFirstMessage: boolean, delay: number = 3000) => {
  // Wenn die Diskussion pausiert ist, wird keine neue Nachricht generiert
  if (isPaused) return;
  
  // Vorhandenen Timer löschen, um doppelte Timer zu vermeiden
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

### 4. Reset der Pause-Funktion beim Start einer neuen Debatte

In der `startDebate`-Funktion, fügen Sie den Reset der Pause-Funktion hinzu:

```tsx
setMessages([]);
setInsights([]);
setIsPaused(false); // Reset der Pause-Funktion beim Start einer neuen Debatte
```

### 5. Aktualisieren der Funktionsaufrufe

Suchen und ersetzen Sie alle verzögerten Aufrufe der `generateExpertMessage`-Funktion:

#### In `sendUserMessage`:
```tsx
// Alt:
setTimeout(() => {
  const randomExpert = selectedExperts[Math.floor(Math.random() * selectedExperts.length)];
  generateExpertMessage(randomExpert, false);
}, 1500);

// Neu:
const randomExpert = selectedExperts[Math.floor(Math.random() * selectedExperts.length)];
handleAutomatedDiscussion(randomExpert, false, 1500);
```

#### In `generateExpertMessage`:
```tsx
// Alt:
setTimeout(() => {
  generateExpertMessage(nextExpert, false);
}, 3000 + Math.random() * 2000);

// Neu:
handleAutomatedDiscussion(nextExpert, false, 3000 + Math.random() * 2000);
```

#### In `simulateAIExpertResponse`:
```tsx
// Alt:
setTimeout(() => {
  generateExpertMessage(nextExpert, false);
}, delay);

// Neu:
handleAutomatedDiscussion(nextExpert, false, delay);
```

### 6. UI-Komponenten für die Steuerelemente

Ersetzen Sie die bestehende Box mit dem Autoscroll-Toggle durch diese erweiterte Version:

```tsx
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
```

## Funktionsweise nach der Integration

- Der **Pause-Button** ist oben im Chat-Bereich prominent platziert
- Er wechselt automatisch zwischen "Pausieren" und "Fortsetzen" mit passendem Icon
- Wenn die Diskussion pausiert ist, werden keine neuen Nachrichten generiert
- Der **Auto-Scroll Toggle** ist jetzt prominenter und zeigt den Status deutlicher an
- Die Änderungen gelten sowohl für API-basierte als auch für lokale Fallback-Nachrichten 