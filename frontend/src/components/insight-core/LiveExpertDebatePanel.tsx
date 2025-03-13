import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Stack, 
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch
} from '@mui/material';
import { 
  Person as PersonIcon,
  Science as ScienceIcon,
  Send as SendIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Forum as ForumIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Lightbulb as LightbulbIcon,
  Psychology as PsychologyIcon,
  VerifiedUser as VerifiedUserIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowForwardIcon,
  FactCheck as FactCheckIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  ArrowDownward as ArrowDownwardIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Check as CheckIcon
} from '@mui/icons-material';

interface LiveExpertDebatePanelProps {
  apiUrl: string;
  isConnected: boolean;
  projectId?: string;
}

interface Expert {
  id: string;
  name: string;
  domain: string;
  specialty: string;
  background: string;
  perspective: string;
  avatar: string;
  color?: string;
  expertise?: number;
  validatedCredentials?: boolean;
}

interface Message {
  id: string;
  expertId: string;
  expertName: string;
  avatar: string;
  content: string;
  timestamp: string;
  references?: string[];
  factChecked?: boolean;
  factCheckResult?: FactCheckResult;
  isLoading?: boolean;
  expertAvatar?: string;
  expertColor?: string;
}

interface FactCheckResult {
  isFactual: boolean;
  confidence: number;
  sources?: {
    title: string;
    url: string;
    reliability?: number;
  }[];
  corrections?: string[];
}

interface Insight {
  id: string;
  title: string;
  description: string;
  expert: string;
  confidence: number;
  tags?: string[];
}

interface DebateTarget {
  topic: string;
  goals: string[];
  completedGoals: string[];
  context?: string;
}

interface CognitiveAnalysis {
  patternDetected?: string;
  biasDetected?: string;
  suggestionForImprovement?: string;
  adaptedResponseStyle?: string;
}

// Neue Komponente, die das bestehende ExpertDebatePanel erweitert
const LiveExpertDebatePanel: React.FC<LiveExpertDebatePanelProps> = ({ apiUrl, isConnected, projectId }) => {
  // Zustandsverwaltung für Experten
  const [experts, setExperts] = useState<Expert[]>([]);
  const [selectedExperts, setSelectedExperts] = useState<Expert[]>([]);
  const [isLoadingExperts, setIsLoadingExperts] = useState(false);
  
  // Zustandsverwaltung für die Debatte
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isGeneratingDebate, setIsGeneratingDebate] = useState(false);
  
  // Zielmanagement und Fortschritt
  const [debateTargets, setDebateTargets] = useState<DebateTarget | null>(null);
  const [showTargets, setShowTargets] = useState(true);
  
  // Cognitive Loop Integration
  const [cognitiveAnalysis, setCognitiveAnalysis] = useState<CognitiveAnalysis | null>(null);
  const [factCheckingEnabled, setFactCheckingEnabled] = useState(true);
  
  // Fehlerbehandlung
  const [error, setError] = useState<string | null>(null);
  
  // UI-Steuerung
  const [activeTab, setActiveTab] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  // Neue Zustandsvariablen für Pause-Funktion
  // Neue Zustandsvariable für Pause-Funktion
  const [isPaused, setIsPaused] = useState(false);
  // Timer für automatische Diskussionen
  const [discussionTimer, setDiscussionTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Lade Experten beim ersten Laden der Komponente
  useEffect(() => {
    if (isConnected) {
      loadExperts();
    }
  }, [isConnected]);
  
  // Scroll zum Ende der Nachrichten, wenn neue hinzukommen
  useEffect(() => {
    if (messagesEndRef.current && autoScroll) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setNewMessageCount(0);
    } else if (!autoScroll && messages.length > 0) {
      // Wenn automatisches Scrollen deaktiviert ist, erhöhe den Zähler für neue Nachrichten
      // Aber nur wenn wirklich eine neue Nachricht hinzugekommen ist (nicht bei jedem Rendering)
      const chatContainer = chatContainerRef.current;
      if (chatContainer) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainer;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        
        if (!isAtBottom) {
          setNewMessageCount(prev => prev + 1);
        }
      }
    }
  }, [messages.length]);

  // Überwache Scroll-Position, um den Scroll-Button anzuzeigen
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      // Zeige den Button, wenn nicht am Ende des Chats
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShowScrollButton(!isAtBottom);
      
      // Wenn der Benutzer manuell zum Ende scrollt, setze den Zähler zurück
      if (isAtBottom) {
        setNewMessageCount(0);
      }
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => {
      chatContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Funktion zum Scrollen zum Ende
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setNewMessageCount(0);
    }
  };
  
  // Hauptfunktionen werden hier implementiert...
  
  // Experten laden
  const loadExperts = async (domain?: string) => {
    setIsLoadingExperts(true);
    setError(null);

    try {
      // Versuche, die Experten über die API zu laden
      console.log(`Versuche, Experten über API zu laden: ${apiUrl}/cognitive/profiles`);
      const response = await fetch(`${apiUrl}/cognitive/profiles`);
      
      if (!response.ok) {
        throw new Error(`HTTP-Fehler: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.experts) {
        setExperts(data.experts);
        console.log("Experten über API geladen:", data.experts.length);
      } else {
        throw new Error('Unerwartetes Format der API-Antwort');
      }
    } catch (err: any) {
      console.error('Fehler beim Laden der Experten über API:', err);
      console.log('Verwende lokale Beispiel-Experten als Fallback');
      
      // Beispiel-Experten generieren
        const sampleExperts: Expert[] = [
          {
            id: 'exp-001',
            name: 'Dr. Tech Visionary',
            domain: 'Technologie',
            specialty: 'KI-Entwicklung & Zukunftstechnologien',
            background: 'Führender Forscher im Bereich künstliche Intelligenz mit Schwerpunkt auf ethischen Implikationen.',
            perspective: 'Techno-optimistisch, aber mit kritischem Blick auf gesellschaftliche Auswirkungen',
          avatar: '🧠',
          color: '#6366f1',
          expertise: 95,
          validatedCredentials: true
          },
          {
            id: 'exp-002',
            name: 'Prof. EcoThinker',
            domain: 'Umweltwissenschaften',
            specialty: 'Klimawandel & Nachhaltige Entwicklung',
            background: 'Langjährige Forschung zu Umweltauswirkungen verschiedener Technologien und Wirtschaftsmodelle.',
            perspective: 'Fokus auf langfristige ökologische Nachhaltigkeit und Systemwandel',
          avatar: '🌍',
          color: '#22c55e',
          expertise: 92,
          validatedCredentials: true
          },
          {
            id: 'exp-003',
            name: 'FinExpert',
            domain: 'Wirtschaft',
            specialty: 'Finanzmarkt & Investitionsanalyse',
            background: 'Jahrzehnte an Erfahrung in der Analyse globaler Märkte und wirtschaftlicher Trends.',
            perspective: 'Pragmatisch, datengetrieben mit Fokus auf wirtschaftlichen Mehrwert',
          avatar: '📊',
          color: '#eab308',
          expertise: 88,
          validatedCredentials: true
          },
          {
            id: 'exp-004',
            name: 'Ethics Specialist',
            domain: 'Philosophie & Ethik',
            specialty: 'Angewandte Ethik & soziale Gerechtigkeit',
            background: 'Forschung zu ethischen Fragen neuer Technologien und deren gesellschaftlichen Implikationen.',
            perspective: 'Stellt kritische Fragen zu Fairness, Zugänglichkeit und langfristigen Konsequenzen',
          avatar: '⚖️',
          color: '#8b5cf6',
          expertise: 90,
          validatedCredentials: true
          },
          {
            id: 'exp-005',
            name: 'Policy Advisor',
            domain: 'Politik & Regulierung',
            specialty: 'Internationale Richtlinien & Gesetzgebung',
            background: 'Beratung für Regierungen und internationale Organisationen zu Regulierungsfragen.',
            perspective: 'Fokus auf praktische Umsetzbarkeit und regulatorische Herausforderungen',
          avatar: '📝',
          color: '#0ea5e9',
          expertise: 87,
          validatedCredentials: true
        },
        {
          id: 'exp-006',
          name: 'Dr. Medicine Insights',
          domain: 'Medizin',
          specialty: 'Medizinische Ethik & Gesundheitssystemforschung',
          background: 'Forschung und Praxis an der Schnittstelle zwischen medizinischer Innovation und ethischen Fragen.',
          perspective: 'Patientenzentrierter Ansatz mit Fokus auf gerechten Zugang zu Gesundheitsversorgung',
          avatar: '🏥',
          color: '#ec4899',
          expertise: 93,
          validatedCredentials: true
        },
        {
          id: 'exp-007',
          name: 'Tech Ethicist',
          domain: 'Technologieethik',
          specialty: 'KI-Ethik & Verantwortungsvolle Innovation',
          background: 'Forschung zur ethischen Entwicklung und Anwendung von KI in verschiedenen Bereichen.',
          perspective: 'Fokus auf menschenzentrierte Technologieentwicklung und ethische Leitplanken',
          avatar: '🤖',
          color: '#3b82f6',
          expertise: 96,
          validatedCredentials: true
        }
      ];
      
        setExperts(sampleExperts);
      console.log("Lokale Beispiel-Experten geladen:", sampleExperts.length);
    } finally {
      setIsLoadingExperts(false);
    }
  };

  // Expertenauswahl
  const toggleExpertSelection = (expert: Expert) => {
    setSelectedExperts(prevSelected => {
      const isSelected = prevSelected.some(e => e.id === expert.id);
      
      if (isSelected) {
        return prevSelected.filter(e => e.id !== expert.id);
      } else {
        // Maximum 5 Experten auswählen
        if (prevSelected.length >= 5) {
          setError('Sie können maximal 5 Experten für eine Debatte auswählen.');
          return prevSelected;
        }
        return [...prevSelected, expert];
      }
    });
  };

  // Prüfen ob ein Experte ausgewählt ist
  const isExpertSelected = (expertId: string): boolean => {
    return selectedExperts.some(expert => expert.id === expertId);
  };

  // Automatische Expertenauswahl basierend auf dem Thema
  const suggestExperts = async () => {
    if (!topic || topic.trim().length < 5) {
      setError('Bitte geben Sie zuerst ein Thema ein, um passende Experten vorzuschlagen.');
      return;
    }

    setIsLoadingExperts(true);
    setError(null);

    try {
      // In einer echten Implementierung würde hier ein API-Aufruf erfolgen
      // Für diese Demo wählen wir zufällig 3 Experten aus
      const shuffled = [...experts].sort(() => 0.5 - Math.random());
      const suggested = shuffled.slice(0, 3);
      
      setSelectedExperts(suggested);
      
    } catch (err: any) {
      console.error('Fehler bei der Expertenvorschlägen:', err);
      setError('Die Experten konnten nicht automatisch ausgewählt werden.');
    } finally {
      setIsLoadingExperts(false);
    }
  };

  // Generiere neue Experten basierend auf dem Thema
  const generateNewExpert = async () => {
    if (!topic || topic.trim().length < 5) {
      setError('Bitte geben Sie zuerst ein Thema ein, um einen relevanten Experten zu generieren.');
      return;
    }

    setIsLoadingExperts(true);
    setError(null);

    try {
      // In einer echten Implementierung würde hier ein API-Aufruf erfolgen
      // Für diese Demo erstellen wir einen neuen Experten mit Dummy-Daten
      const newExpert: Expert = {
        id: `exp-${Date.now()}`,
        name: `Spezialist für ${topic}`,
        domain: 'Themenspezifisches Fachgebiet',
        specialty: `${topic} (automatisch generiert)`,
        background: `Ein speziell für das Thema "${topic}" generierter Experte mit umfassendem Fachwissen.`,
        perspective: 'Bietet eine ausgewogene, themenspezifische Perspektive mit tiefem Sachverständnis.',
        avatar: '🔍'
      };
      
      setExperts(prev => [...prev, newExpert]);
      setSelectedExperts(prev => [...prev, newExpert]);
      
    } catch (err: any) {
      console.error('Fehler bei der Expertengenerierung:', err);
      setError('Es konnte kein neuer Experte generiert werden.');
    } finally {
      setIsLoadingExperts(false);
    }
  };

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
  
  // Funktion zum Pausieren/Fortsetzen der Diskussion
  const togglePauseDiscussion = () => {
    setIsPaused(prev => !prev);
    
    // Wenn fortgesetzt wird und genügend Experten vorhanden sind, starte die Diskussion wieder
    if (isPaused && selectedExperts.length > 1) {
      const randomExpert = selectedExperts[Math.floor(Math.random() * selectedExperts.length)];
      handleAutomatedDiscussion(randomExpert, false, 1500);
    }
  };

  // Generiere neue Debatte
  const startDebate = async () => {
    if (topic.trim().length < 5) {
      setError('Das Thema muss mindestens 5 Zeichen enthalten.');
      return;
    }

    if (selectedExperts.length < 2) {
      setError('Bitte wählen Sie mindestens zwei Experten für die Debatte aus.');
      return;
    }

    setIsGeneratingDebate(true);
    setError(null);
    setMessages([]);
    setInsights([]);
    setIsPaused(false); // Reset der Pause-Funktion beim Start einer neuen Debatte    setIsPaused(false); // Reset der Pause-Funktion beim Start einer neuen Debatte
    setIsPaused(false); // Reset pause state when starting a new debate

    try {
      // Automatische Zielsetzung erstellen
      const goals = await generateDebateGoals(topic, context);
      
      setDebateTargets({
        topic,
        goals,
        completedGoals: [],
        context: context || undefined
      });

      // Begrüßungsnachricht für den Nutzer
      setMessages([
        {
          id: `msg-welcome-${Date.now()}`,
          expertId: 'system',
          expertName: 'Insight Synergy',
          avatar: '🔍',
          content: `Willkommen zur Expertendebatte zum Thema "${topic}". Die ausgewählten Experten werden nun verschiedene Perspektiven zu diesem Thema diskutieren. Sie können jederzeit Fragen stellen oder die Debatte in bestimmte Richtungen lenken.`,
          timestamp: new Date().toISOString()
        }
      ]);

      // Experten-Debatte starten
      setTimeout(() => {
        generateExpertMessage(selectedExperts[0], true);
      }, 1000);

    } catch (err: any) {
      console.error('Fehler bei der Generierung der Debatte:', err);
      setError(`Fehler bei der Debatte: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsGeneratingDebate(false);
    }
  };

  // Automatisch Ziele für die Debatte generieren
  const generateDebateGoals = async (topic: string, context?: string): Promise<string[]> => {
    // Lokale Implementierung ohne API-Aufruf
    console.log(`Generiere Debattenziele für Thema: ${topic}`);
    
    // Grundlegende Ziele, die für die meisten Debatten relevant sind
    const commonGoals = [
      'Unterschiedliche Perspektiven zum Thema identifizieren',
      'Vor- und Nachteile der wichtigsten Ansätze diskutieren',
      'Gesellschaftliche Auswirkungen analysieren'
    ];
    
    // Themenspezifische Ziele basierend auf Schlüsselwörtern im Thema
    const specificGoals: string[] = [];
    
    // Technologie-bezogene Ziele
    if (topic.toLowerCase().includes('ki') || 
        topic.toLowerCase().includes('technologie') || 
        topic.toLowerCase().includes('digital') ||
        topic.toLowerCase().includes('tech') ||
        topic.toLowerCase().includes('ai') ||
        topic.toLowerCase().includes('intelligence')) {
      specificGoals.push('Technologische Machbarkeit und Grenzen diskutieren');
      specificGoals.push('Datenschutz- und Sicherheitsaspekte betrachten');
      specificGoals.push('Zukunftsperspektiven und Entwicklungspotenziale aufzeigen');
    }
    
    // Ethik-bezogene Ziele
    if (topic.toLowerCase().includes('ethik') || 
        topic.toLowerCase().includes('moral') || 
        topic.toLowerCase().includes('recht') ||
        topic.toLowerCase().includes('verantwortung')) {
      specificGoals.push('Ethische Grundprinzipien und deren Anwendung diskutieren');
      specificGoals.push('Unterschiedliche moralische Perspektiven gegenüberstellen');
      specificGoals.push('Rechtliche und regulatorische Implikationen betrachten');
    }
    
    // Umwelt- und Nachhaltigkeitsziele
    if (topic.toLowerCase().includes('umwelt') || 
        topic.toLowerCase().includes('klima') || 
        topic.toLowerCase().includes('nachhaltig') ||
        topic.toLowerCase().includes('ökolog')) {
      specificGoals.push('Ökologische Auswirkungen und Nachhaltigkeit diskutieren');
      specificGoals.push('Kurzfristige versus langfristige Umwelteffekte abwägen');
      specificGoals.push('Konkrete Handlungsempfehlungen für Umweltschutz erarbeiten');
    }
    
    // Wirtschaftliche Ziele
    if (topic.toLowerCase().includes('wirtschaft') || 
        topic.toLowerCase().includes('ökonom') || 
        topic.toLowerCase().includes('finan') ||
        topic.toLowerCase().includes('markt')) {
      specificGoals.push('Wirtschaftliche Machbarkeit und Kosteneffizienz analysieren');
      specificGoals.push('Marktpotenziale und Geschäftsmodelle diskutieren');
      specificGoals.push('Verteilungseffekte und wirtschaftliche Gerechtigkeit betrachten');
    }
    
    // Gesundheitsziele
    if (topic.toLowerCase().includes('gesundheit') || 
        topic.toLowerCase().includes('medizin') || 
        topic.toLowerCase().includes('patient') ||
        topic.toLowerCase().includes('therapie')) {
      specificGoals.push('Medizinische Vor- und Nachteile abwägen');
      specificGoals.push('Patientensicherheit und -rechte diskutieren');
      specificGoals.push('Zugang zu Gesundheitsleistungen und Gerechtigkeit analysieren');
    }
    
    // Allgemeine wichtige Ziele, die immer hinzugefügt werden sollten
    specificGoals.push('Praktische Implementierungsstrategien betrachten');
    specificGoals.push('Ethische Implikationen berücksichtigen');
    
    // Kombiniere allgemeine und spezifische Ziele und wähle maximal 5 aus
    const allGoals = [...commonGoals, ...specificGoals];
    const shuffledGoals = allGoals.sort(() => Math.random() - 0.5);
    
    // Maximale Anzahl von 5 Zielen zurückgeben
    return shuffledGoals.slice(0, 5);
  };

  // Debatte stoppen
  const stopDebate = () => {
    // Füge Systemnachricht hinzu, dass die Debatte gestoppt wurde
    const stopMessage: Message = {
      id: `msg-stop-${Date.now()}`,
      expertId: 'system',
      expertName: 'Insight Synergy',
      avatar: '⏹️',
      content: 'Die Debatte wurde auf Ihre Anfrage hin beendet. Sie können die gesammelten Erkenntnisse im Tab "Einsichten & Ergebnisse" einsehen oder eine neue Debatte starten.',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, stopMessage]);
    
    // Hier würden in einer realen Implementierung alle laufenden API-Calls abgebrochen
    // und Timer gestoppt werden
    
    // Tab zu den Einsichten wechseln
    setTimeout(() => {
      setActiveTab(2);
    }, 2000);
  };

  // Debatte zurücksetzen
  const resetDebate = () => {
    // Zurück zur Debattenvorbereitung
    setMessages([]);
    setInsights([]);
    setIsPaused(false); // Reset der Pause-Funktion beim Start einer neuen Debatte    setIsPaused(false); // Reset der Pause-Funktion beim Start einer neuen Debatte
    setDebateTargets(null);
    setCognitiveAnalysis(null);
    setActiveTab(0);
  };

  // Nutzer-Nachricht senden
  const sendUserMessage = () => {
    if (!userMessage.trim()) return;
    
    const newMessage: Message = {
      id: `msg-user-${Date.now()}`,
      expertId: 'user',
      expertName: 'Sie',
      avatar: '👤',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setUserMessage('');
    
    // Cognitive Loop für die Nutzerinteraktion aktivieren
    processCognitiveLoop(userMessage);
    
    // Antwort von einem zufälligen Experten generieren
    setTimeout(() => {
      const randomExpert = selectedExperts[Math.floor(Math.random() * selectedExperts.length)];
      generateExpertMessage(randomExpert, false);
    }, 1500);
  };

  // Experten-Nachricht generieren
  // Startet die automatisierte Diskussion mit Berücksichtigung der Pause-Funktion

  // Startet die automatisierte Diskussion mit Berücksichtigung der Pause-Funktion
  const generateExpertMessage = async (expert: Expert, isFirstMessage: boolean) => {
    setError(null);
    
    try {
    try {      console.log(`Versuche, Expertenantwort über API zu generieren: ${apiUrl}/live-expert-debate/message`);
      
      // Vorbereiten der vorherigen Nachrichten für den API-Aufruf
      const previousMessages = messages
        .filter(m => m.expertId !== 'system' && m.expertId !== expert.id)
          .map(m => ({
            expertId: m.expertId,
            expertName: m.expertName,
            content: m.content
        }));
      
      // API-Aufruf, um eine Expertenantwort zu generieren
      const response = await fetch(`${apiUrl}/live-expert-debate/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          context: context || undefined,
          messageHistory: messages.map(m => ({
            id: m.id,
            expertId: m.expertId,
            expertName: m.expertName,
            content: m.content
          }))
          context: context || undefined,
          messageHistory: messages.map(m => ({
            id: m.id,
            expertId: m.expertId,
            expertName: m.expertName,
            content: m.content
          }))
            id: m.id,
            expertId: m.expertId,
            expertName: m.expertName,
            content: m.content
          }))
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP-Fehler: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.analysis) {
        setCognitiveAnalysis(data.analysis);
        
        // Bei erkanntem Bias eine entsprechende Modifikation der Debatte durchführen
        if (data.analysis.biasDetected) {
          // Wähle einen Experten mit gegensätzlicher Perspektive basierend auf der API-Empfehlung
          const suggestedExpertId = data.analysis.suggestedExpertId;
          const counterPerspectiveExpert = selectedExperts.find(expert => expert.id === suggestedExpertId) || 
                                         selectedExperts[Math.floor(Math.random() * selectedExperts.length)];
          
          setTimeout(() => {
            generateExpertMessage(counterPerspectiveExpert, false);
          }, 1000);
        }
        
        // Antwort von einem Experten generieren, der am besten auf den Benutzerkontext eingehen kann
        let randomExpert = selectedExperts[Math.floor(Math.random() * selectedExperts.length)];
        if (data.analysis.recommendedExpertId) {
          const recommendedExpert = selectedExperts.find(e => e.id === data.analysis.recommendedExpertId);
          if (recommendedExpert) {
            randomExpert = recommendedExpert;
          }
        }
        
        setTimeout(() => {
          generateExpertMessage(randomExpert, false);
    }, 1500);
      } else {
        throw new Error('Unerwartetes Format der API-Antwort');
      }
    } catch (err: any) {
      console.error('Fehler bei der Cognitive Loop-Analyse:', err);
      // Fallback: Statische Cognitive Loop-Simulation
      fallbackCognitiveLoop(userInput);
    }
  };
  
  // Fallback für Cognitive Loop wenn API nicht verfügbar
  const fallbackCognitiveLoop = (userInput: string) => {
    setTimeout(() => {
      // Analyse des Nutzerinputs und Reaktion des Systems
      const analysis: CognitiveAnalysis = {
        patternDetected: Math.random() > 0.5 ? 'Analytisches Denken' : 'Kreatives Denkmuster',
        biasDetected: Math.random() > 0.7 ? 'Bestätigungstendenz erkannt' : undefined,
        suggestionForImprovement: 'Experten mit gegensätzlichen Perspektiven einbeziehen',
        adaptedResponseStyle: Math.random() > 0.5 ? 'Detaillierter, sachlicher Stil' : 'Explorativer, fragender Stil'
      };
      
      setCognitiveAnalysis(analysis);
      
      // Bei erkanntem Bias eine entsprechende Modifikation der Debatte durchführen
      if (analysis.biasDetected) {
        // Wähle einen Experten mit gegensätzlicher Perspektive für die nächste Antwort
        const counterPerspectiveExpert = selectedExperts[Math.floor(Math.random() * selectedExperts.length)];
        
        setTimeout(() => {
          generateExpertMessage(counterPerspectiveExpert, false);
        }, 1000);
      } else {
        // Antwort von einem zufälligen Experten generieren
        setTimeout(() => {
          const randomExpert = selectedExperts[Math.floor(Math.random() * selectedExperts.length)];
          generateExpertMessage(randomExpert, false);
    }, 1500);
      }
    }, 1000);
  };

  // Einsicht generieren
  const generateInsight = async () => {
    try {
      // Einsicht über API generieren
      const response = await fetch(`${apiUrl}/live-expert-debate/insight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          context: context || undefined,
          messageHistory: messages.map(m => ({
            id: m.id,
            expertId: m.expertId,
            expertName: m.expertName,
            content: m.content
          }))
            expertId: m.expertId,
            expertName: m.expertName,
            content: m.content
          }))
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(`HTTP-Fehler: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.insight) {
        setInsights(prev => [...prev, data.insight]);
      } else {
        throw new Error('Unerwartetes Format der API-Antwort');
      }
    } catch (err: any) {
      console.error('Fehler bei der Einsichtsgenerierung:', err);
      // Fallback: Statische Einsicht generieren
      fallbackInsightGeneration();
    }
  };
  
  // Fallback für die Einsichtsgenerierung
  const fallbackInsightGeneration = () => {
    const insightTitles = [
      'Interessenkonflikte identifiziert',
      'Interdisziplinäre Lösung möglich',
      'Unerwartete Korrelation gefunden',
      'Ethische Herausforderungen erkannt',
      'Zukünftige Forschungsfragen'
    ];
    
    const newInsight: Insight = {
      id: `insight-${Date.now()}`,
      title: insightTitles[Math.floor(Math.random() * insightTitles.length)],
      description: `In der Debatte wurde ein wichtiger Zusammenhang zwischen verschiedenen Aspekten des Themas "${topic}" herausgearbeitet. Diese Erkenntnis könnte zu neuen Lösungsansätzen führen.`,
      expert: selectedExperts[Math.floor(Math.random() * selectedExperts.length)].name,
      confidence: Math.random() * 0.3 + 0.7, // Confidence zwischen 0.7 und 1.0
      tags: ['Haupterkenntnis', 'Vertiefungswürdig', topic]
    };
    
    setInsights(prev => [...prev, newInsight]);
  };

  // Debattenfortschritt aktualisieren
  const updateDebateProgress = () => {
    if (!debateTargets) return;
    
    // In einer echten Implementierung würde hier die KI den Fortschritt analysieren
    // Für die Demo markieren wir zufällig Ziele als erledigt
    
    const completedGoalIndex = debateTargets.goals.findIndex(
      goal => !debateTargets.completedGoals.includes(goal) && Math.random() > 0.7
    );
    
    if (completedGoalIndex >= 0) {
      const completedGoal = debateTargets.goals[completedGoalIndex];
      
      setDebateTargets(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          completedGoals: [...prev.completedGoals, completedGoal]
        };
      });
    }
  };

  // Zufällige Referenzen generieren
  const generateRandomReferences = (): string[] => {
    if (Math.random() > 0.7) return []; // 30% Chance, keine Referenzen zu haben
    
    const possibleReferences = [
      'Smith et al., 2022: "Advances in the Field"',
      'Journal of Modern Research, Vol. 12',
      'International Policy Framework, 2023',
      'Global Economic Review, Q2 2023',
      'Technical Analysis Report, Tech Institute'
    ];
    
    const numberOfReferences = Math.floor(Math.random() * 3) + 1; // 1-3 Referenzen
    const shuffled = [...possibleReferences].sort(() => 0.5 - Math.random());
    
    return shuffled.slice(0, numberOfReferences);
  };

  // Experten-Antwort-Templates nach Themengebieten
  const getThemeSpecificResponse = (expert: Expert, topic: string): string => {
    // KI und Technologie
    if (topic.toLowerCase().includes('ki') || 
        topic.toLowerCase().includes('ai') || 
        topic.toLowerCase().includes('tech') ||
        topic.toLowerCase().includes('intelligence') ||
        topic.toLowerCase().includes('open ai')) {
      
      if (expert.domain === 'Technologie') {
        return `Die KI-Landschaft entwickelt sich rasant. Als nächstes erwarte ich eine stärkere Fokussierung auf multimodale Modelle, die Text, Bild, Audio und Video nahtlos integrieren können. OpenAI und andere Marktführer investieren stark in diese Richtung. 

Für Insight Synergy sehe ich die Chance in der Spezialisierung und Nischenexzellenz. Statt direkt mit OpenAI zu konkurrieren, sollte sich Insight Synergy auf hochspezialisierte Anwendungen konzentrieren, wo Fachwissen und maßgeschneiderte Lösungen wichtiger sind als pure Modellgröße.`;
      }
      
      if (expert.domain === 'Wirtschaft') {
        return `Aus wirtschaftlicher Sicht sehen wir einen Markt, der sich konsolidiert. OpenAI, Anthropic und andere große Player haben Milliarden an Investitionen erhalten. Der Wettbewerb wird sich auf spezifische Branchen und Anwendungsfälle verlagern.

Insight Synergy kann in diesem Umfeld durch strategische Partnerschaften und fokussierte Marktsegmentierung überleben und wachsen. Die wirtschaftlichen Vorteile liegen in der Spezialisierung und in der Integration bestehender KI-Modelle, statt sie vollständig neu zu entwickeln.`;
      }
      
      if (expert.domain === 'Philosophie & Ethik' || expert.domain.includes('Ethik')) {
        return `Die ethischen Herausforderungen werden mit fortschreitender KI-Entwicklung zunehmen. Fragen der Transparenz, Verantwortlichkeit und des verantwortungsvollen Einsatzes werden wichtiger denn je.

Insight Synergy hat hier die Chance, ethische Überlegungen von Anfang an in seine Produkte zu integrieren. Ein transparenter, ethischer Ansatz kann ein entscheidender Wettbewerbsvorteil sein, besonders wenn größere Unternehmen in diesem Bereich Defizite aufweisen.`;
      }
      
      if (expert.domain.includes('Umwelt')) {
        return `Die Umweltauswirkungen großer KI-Modelle sind erheblich - von Energieverbrauch bis zur Ressourcennutzung. Die nächste Generation der KI-Entwicklung muss ökologisch nachhaltiger werden.

Insight Synergy könnte sich als umweltbewusste Alternative positionieren, mit energieeffizienteren Modellen und klimaneutralen Rechenzentren. Nachhaltigkeit ist nicht nur ethisch richtig, sondern wird zunehmend auch ein wirtschaftlicher Faktor.`;
      }
      
      if (expert.domain.includes('Medizin') || expert.domain.includes('Gesundheit')) {
        return `Im Gesundheitsbereich sehen wir enormes Potenzial für KI-Anwendungen, aber auch komplexe Anforderungen an Datenschutz, Genauigkeit und ethische Standards. 

Insight Synergy könnte sich auf medizinische KI-Anwendungen spezialisieren, wo präzise, zuverlässige und ethisch vertretbare Lösungen gefragt sind. Hier ist nicht die Größe des Modells entscheidend, sondern die Qualität der Daten und das Verständnis medizinischer Kontexte.`;
      }
      
      // Default für andere Domänen
      return `In Bezug auf KI-Entwicklungen sehe ich eine Zukunft, in der spezialisierte, fokussierte Lösungen neben den großen generalistischen Modellen bestehen können. 

Insight Synergy kann sich durch Fokussierung auf spezifische Anwendungsgebiete und durch die Integration von Fachwissen differenzieren, anstatt direkt mit den großen Tech-Unternehmen zu konkurrieren.`;
    }
    
    // Wirtschaft und Markt
    if (topic.toLowerCase().includes('wirtschaft') || 
        topic.toLowerCase().includes('markt') || 
        topic.toLowerCase().includes('finan') ||
        topic.toLowerCase().includes('gewinnen') ||
        topic.toLowerCase().includes('wettbewerb') ||
        topic.toLowerCase().includes('konkurrenz')) {
      
      if (expert.domain === 'Wirtschaft') {
        return `Der KI-Markt entwickelt sich zu einem Oligopol, wo einige wenige große Akteure dominieren. Dennoch gibt es profitable Nischen für spezialisierte Anbieter.

Insight Synergy sollte eine klar definierte Marktposition entwickeln, basierend auf einzigartigen Stärken. Eine Differenzierungsstrategie ist essenziell - sei es durch Branchenspezialisierung, überlegene Nutzerfreundlichkeit oder innovative Geschäftsmodelle wie KI-as-a-Service.`;
      }
      
      if (expert.domain.includes('Tech')) {
        return `Technologisch betrachtet liegt die Zukunft in spezialisierter KI, die für bestimmte Aufgaben optimiert ist. Die großen generalistischen Modelle werden weiterhin von Tech-Giganten dominiert werden.

Insight Synergy sollte auf technologische Differenzierung setzen - etwa durch effizientere Algorithmen, innovative Architekturansätze oder verbesserte Datennutzung. Die Kombination von Open-Source-Grundlagen mit proprietären Verbesserungen könnte ein vielversprechender Ansatz sein.`;
      }
      
      if (expert.domain.includes('Ethik')) {
        return `In einer zunehmend werteorientierten Wirtschaft wird ethisches Handeln zum Wettbewerbsvorteil. Viele Nutzer und Unternehmen suchen nach vertrauenswürdigen KI-Lösungen.

Insight Synergy könnte eine Vorreiterrolle bei ethischer KI einnehmen, mit transparenten Prozessen, fairem Datenumgang und verantwortungsvoller Anwendungsentwicklung. Dies könnte besonders in regulierten Märkten wie Gesundheitswesen oder Finanzen ein entscheidender Vorteil sein.`;
      }
      
      // Default für andere Domänen
      return `Aus wirtschaftlicher Perspektive sehe ich Chancen für Insight Synergy in der gezielten Marktpositionierung und Differenzierung. 

Während die großen Tech-Unternehmen um Marktanteile im Massenmarkt kämpfen, kann sich Insight Synergy durch Spezialisierung, überlegenes Branchen-Know-how und maßgeschneiderte Lösungen absetzen.`;
    }
    
    // Default-Antwort, wenn kein spezifisches Thema erkannt wurde
    return `In Bezug auf die aktuelle und zukünftige Entwicklung im KI-Bereich sehe ich sowohl Herausforderungen als auch Chancen für Unternehmen wie Insight Synergy.

Die großen Technologieunternehmen werden weiterhin dominieren, aber es entstehen zunehmend Nischen und Spezialmärkte, in denen kleinere, agile Unternehmen erfolgreich sein können. Durch Fokussierung auf spezifische Anwendungsbereiche, überlegene Benutzerfreundlichkeit oder ethische Aspekte kann Insight Synergy einen eigenen Weg finden.`;
  };

  // UI-Rendering
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Erweiterte Experten-Debatte
      </Typography>
      <Typography variant="body1" paragraph>
        Erleben Sie eine dynamische Diskussion zwischen verschiedenen KI-Experten mit Echtzeit-Faktenprüfung und adaptiver Gesprächsführung.
      </Typography>
      
      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Sie sind offline. Die Experten-Debatte ist nur online verfügbar.
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Tabs für verschiedene Ansichten */}
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Debatte vorbereiten" disabled={messages.length > 0} />
        <Tab label="Experten-Diskussion" disabled={selectedExperts.length < 2 && messages.length === 0} />
        <Tab label="Einsichten & Ergebnisse" disabled={insights.length === 0} />
      </Tabs>
      
      {/* Tab 1: Debatte vorbereiten */}
      {activeTab === 0 && (
        <>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>Thema definieren</Typography>
            <TextField
              fullWidth
              label="Debattenthema"
              variant="outlined"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="z.B. Ethische Implikationen von KI in der Medizin"
              disabled={isGeneratingDebate || !isConnected}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Kontext (optional)"
              variant="outlined"
              multiline
              rows={2}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Zusätzlicher Kontext oder spezifische Aspekte, die berücksichtigt werden sollen"
              disabled={isGeneratingDebate || !isConnected}
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                onClick={suggestExperts}
                disabled={!topic || topic.length < 5 || !isConnected}
                startIcon={<ScienceIcon />}
              >
                Passende Experten vorschlagen
              </Button>
              
              <Button
                variant="outlined"
                onClick={generateNewExpert}
                disabled={!topic || topic.length < 5 || !isConnected}
                startIcon={<PersonIcon />}
              >
                Neuen Experten generieren
              </Button>
            </Box>
            
            {selectedExperts.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Ausgewählte Experten:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedExperts.map(expert => (
                    <Chip
                      key={expert.id}
                      label={expert.name}
                      variant="outlined"
                      avatar={<Avatar>{expert.avatar || expert.name.charAt(0)}</Avatar>}
                      onDelete={() => toggleExpertSelection(expert)}
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Button
                variant="contained"
                disabled={isGeneratingDebate || !isConnected || topic.length < 5 || selectedExperts.length < 2}
                onClick={startDebate}
                startIcon={isGeneratingDebate ? <CircularProgress size={20} color="inherit" /> : <ForumIcon />}
              >
                {isGeneratingDebate ? 'Generiere Debatte...' : 'Debatte starten'}
              </Button>
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={factCheckingEnabled}
                    onChange={(e) => setFactCheckingEnabled(e.target.checked)}
                  />
                }
                label="Automatischer Faktencheck"
              />
            </Box>
          </Paper>
          
          <Typography variant="h6" gutterBottom>Verfügbare Experten</Typography>
          
          {isLoadingExperts ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {experts.length > 0 ? (
                experts.map(expert => (
                  <Grid item xs={12} sm={6} key={expert.id}>
                    <Card 
                      sx={{ 
                        mb: 2, 
                        border: isExpertSelected(expert.id) ? 2 : 0, 
                        borderColor: 'primary.main',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: 3
                        }
                      }}
                    >
                      <CardHeader
                        avatar={
                          <Avatar sx={{ bgcolor: isExpertSelected(expert.id) ? 'primary.main' : 'grey.400' }}>
                            {expert.avatar || expert.name.charAt(0)}
                          </Avatar>
                        }
                        action={
                          <Tooltip title={isExpertSelected(expert.id) ? 'Experte entfernen' : 'Experte hinzufügen'}>
                            <IconButton 
                              onClick={() => toggleExpertSelection(expert)}
                              color={isExpertSelected(expert.id) ? 'primary' : 'default'}
                            >
                              {isExpertSelected(expert.id) ? <RemoveIcon /> : <AddIcon />}
                            </IconButton>
                          </Tooltip>
                        }
                        title={
                          <Box display="flex" alignItems="center">
                            {expert.name}
                            {expert.validatedCredentials && (
                              <VerifiedUserIcon 
                                fontSize="small" 
                                color="primary" 
                                sx={{ ml: 1 }} 
                              />
                            )}
                          </Box>
                        }
                        subheader={`${expert.domain} | ${expert.specialty}`}
                      />
                      <CardContent>
                        <Typography variant="body2" paragraph>
                          {expert.background}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Perspektive:</strong> {expert.perspective}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Keine Experten gefunden. Bitte versuchen Sie es mit einem anderen Thema oder generieren Sie einen neuen Experten.
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </>
      )}
      
      {/* Tab 2: Experten-Diskussion */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Linke Seite: Debatte */}
          <Grid item xs={12} md={8}>
            <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Debatte: {debateTargets?.topic || topic}
              </Typography>
              
              {/* Chat-Bereich */}
              <Box 
                ref={chatContainerRef}
                sx={{ 
                  height: '500px', 
                  overflowY: 'auto', 
                  border: '1px solid #eee', 
                  borderRadius: 1,
                  p: 2,
                  mb: 2,
                  position: 'relative'
                }}
              >
                {messages.length === 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    height: '100%' 
                  }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      Die Debatte wurde noch nicht gestartet.
                    </Typography>
                    <Button 
                      variant="contained" 
                      onClick={() => setActiveTab(0)}
                      startIcon={<ArrowForwardIcon />}
                    >
                      Debatte vorbereiten
                    </Button>
                  </Box>
                ) : (
                  <>
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
                            {autoScroll && <CheckIcon fontSize="small" color="success" sx={{ ml: 0.5 }} />}
                          </Box>
                        }
                      />
                    </Box>
                    
                    {messages.map((message, index) => (
                      <Box key={message.id} sx={{ mb: 3 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'flex-start',
                          backgroundColor: 
                            message.expertId === 'user' ? 'rgba(0, 0, 0, 0.04)' : 
                            message.expertId === 'system' ? 'rgba(25, 118, 210, 0.08)' : 
                            'transparent',
                          p: 1.5,
                          borderRadius: 2
                        }}>
                          <Avatar sx={{ mr: 2 }}>
                            {message.avatar}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle2">
                                {message.expertName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </Typography>
                            </Box>
                            <Typography variant="body1" sx={{ my: 1 }}>
                              {message.content}
                            </Typography>
                            
                            {/* Referenzen anzeigen */}
                            {message.references && message.references.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Referenzen:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                  {message.references.map((ref, idx) => (
                                    <Chip 
                                      key={idx} 
                                      label={ref} 
                                      size="small" 
                                      variant="outlined" 
                                      color="info" 
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}
                            
                            {/* Faktencheck-Ergebnisse */}
                            {message.factChecked && message.factCheckResult && (
                              <Accordion 
                                sx={{ mt: 1, '&:before': { display: 'none' } }} 
                                disableGutters
                              >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <FactCheckIcon 
                                      fontSize="small" 
                                      color={message.factCheckResult.isFactual ? "success" : "error"} 
                                      sx={{ mr: 1 }} 
                                    />
                                    <Typography variant="caption">
                                      {message.factCheckResult.isFactual 
                                        ? `Faktengeprüft (${(message.factCheckResult.confidence * 100).toFixed(0)}% Konfidenz)` 
                                        : "Faktenprobleme gefunden"}
                                    </Typography>
                                  </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                  {message.factCheckResult.isFactual ? (
                                    <Typography variant="body2" color="success.main">
                                      Die Aussagen wurden als faktisch korrekt bewertet.
                                    </Typography>
                                  ) : (
                                    <>
                                      <Typography variant="body2" color="error.main" gutterBottom>
                                        Es wurden mögliche faktische Ungenauigkeiten identifiziert:
                                      </Typography>
                                      <List dense disablePadding>
                                        {message.factCheckResult.corrections?.map((correction, idx) => (
                                          <ListItem key={idx} sx={{ pl: 0 }}>
                                            <ListItemText primary={correction} />
                                          </ListItem>
                                        ))}
                                      </List>
                                    </>
                                  )}
                                  
                                  {message.factCheckResult.sources && (
                                    <Box sx={{ mt: 1 }}>
                                      <Typography variant="caption" display="block">
                                        Quellen:
                                      </Typography>
                                      <List dense disablePadding>
                                        {message.factCheckResult.sources.map((source, idx) => (
                                          <ListItem key={idx} sx={{ pl: 0 }}>
                                            <ListItemText 
                                              primary={source.title} 
                                              secondary={`Zuverlässigkeit: ${(source.reliability || 0.5) * 100}%`} 
                                            />
                                          </ListItem>
                                        ))}
                                      </List>
                                    </Box>
                                  )}
                                </AccordionDetails>
                              </Accordion>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                    <div ref={messagesEndRef} />
                    
                    {/* Scroll-Button, wenn nicht am Ende */}
                    {showScrollButton && (
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          bottom: 20, 
                          right: 20, 
                          zIndex: 10 
                        }}
                      >
                        <Tooltip title="Zum Ende scrollen">
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={scrollToBottom}
                            startIcon={<ArrowDownwardIcon />}
                            sx={{ borderRadius: '50%', minWidth: 'auto', p: 1 }}
                          >
                            {newMessageCount > 0 ? newMessageCount : ''}
                          </Button>
                        </Tooltip>
                      </Box>
                    )}
                  </>
                )}
              </Box>
              
              {/* Nachrichteneingabe */}
              {messages.length > 0 && (
                <>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      placeholder="Stellen Sie eine Frage oder lenken Sie die Diskussion..."
                      value={userMessage}
                      onChange={(e) => setUserMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendUserMessage();
                        }
                      }}
                      multiline
                      maxRows={3}
                      variant="outlined"
                      size="small"
                    />
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={sendUserMessage}
                      disabled={!userMessage.trim()}
                    >
                      <SendIcon />
                    </Button>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Button 
                      variant="outlined" 
                      color="error"
                      onClick={stopDebate}
                    >
                      Debatte beenden
                    </Button>
                    
                    <Button 
                      variant="outlined"
                      onClick={resetDebate}
                      startIcon={<RefreshIcon />}
                    >
                      Neue Debatte starten
                    </Button>
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
          
          {/* Rechte Seite: Zielsetzung und Einsichten */}
          <Grid item xs={12} md={4}>
            {/* Debattenziele */}
            {debateTargets && showTargets && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">Debattenziele</Typography>
                  <IconButton size="small" onClick={() => setShowTargets(false)}>
                    <RemoveIcon />
                  </IconButton>
                </Box>
                <List dense>
                  {debateTargets.goals.map((goal, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        {debateTargets.completedGoals.includes(goal) ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <CircularProgress size={16} variant="determinate" value={30} />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={goal} 
                        sx={{ 
                          textDecoration: debateTargets.completedGoals.includes(goal) ? 'line-through' : 'none',
                          color: debateTargets.completedGoals.includes(goal) ? 'text.secondary' : 'text.primary' 
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
                {debateTargets.completedGoals.length > 0 && (
                  <LinearProgress 
                    variant="determinate" 
                    value={(debateTargets.completedGoals.length / debateTargets.goals.length) * 100} 
                    sx={{ mt: 2 }}
                  />
                )}
              </Paper>
            )}
            
            {/* Cognitive Loop Analyse */}
            {cognitiveAnalysis && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PsychologyIcon sx={{ mr: 1 }} />
                    Cognitive Loop Analyse
                  </Box>
                </Typography>
                <List dense>
                  {cognitiveAnalysis.patternDetected && (
                    <ListItem>
                      <ListItemText 
                        primary="Erkanntes Denkmuster" 
                        secondary={cognitiveAnalysis.patternDetected} 
                      />
                    </ListItem>
                  )}
                  {cognitiveAnalysis.biasDetected && (
                    <ListItem>
                      <ListItemText 
                        primary="Mögliche Denkverzerrung" 
                        secondary={cognitiveAnalysis.biasDetected}
                        secondaryTypographyProps={{ color: 'warning.main' }}
                      />
                    </ListItem>
                  )}
                  {cognitiveAnalysis.adaptedResponseStyle && (
                    <ListItem>
                      <ListItemText 
                        primary="Angepasster Antwortstil" 
                        secondary={cognitiveAnalysis.adaptedResponseStyle} 
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            )}
            
            {/* Einsichten */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LightbulbIcon sx={{ mr: 1 }} />
                  Einsichten
                </Box>
              </Typography>
              
              {insights.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Im Laufe der Debatte werden hier wichtige Erkenntnisse erscheinen.
                </Typography>
              ) : (
                <List>
                  {insights.map((insight) => (
                    <ListItem key={insight.id} sx={{ display: 'block', py: 1 }}>
                      <Typography variant="subtitle2">{insight.title}</Typography>
                      <Typography variant="body2" paragraph>
                        {insight.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {insight.tags?.slice(0, 2).map((tag, idx) => (
                            <Chip 
                              key={idx} 
                              label={tag} 
                              size="small" 
                              variant="outlined" 
                            />
                          ))}
                        </Box>
                        <Typography variant="caption">
                          {`${(insight.confidence * 100).toFixed(0)}% Konfidenz`}
                        </Typography>
                      </Box>
                      <Divider sx={{ mt: 1 }} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Tab 3: Einsichten & Ergebnisse */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Zusammenfassung der Debatte: {debateTargets?.topic || topic}
          </Typography>
          
          {insights.length === 0 ? (
            <Alert severity="info">
              Es wurden noch keine ausreichenden Erkenntnisse aus der Debatte gesammelt.
            </Alert>
          ) : (
            <>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                Haupterkenntnisse
              </Typography>
              
              <Grid container spacing={2}>
                {insights.map((insight) => (
                  <Grid item xs={12} md={4} key={insight.id}>
                    <Card elevation={1}>
                      <CardHeader
                        title={insight.title}
                        subheader={`Vorgeschlagen von ${insight.expert}`}
                      />
                      <CardContent>
                        <Typography variant="body2" paragraph>
                          {insight.description}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {insight.tags?.map((tag, idx) => (
                            <Chip 
                              key={idx} 
                              label={tag} 
                              size="small" 
                              variant="outlined" 
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button variant="contained" startIcon={<SettingsIcon />}>
                  Exportieren
                </Button>
                <Button variant="outlined" onClick={() => setActiveTab(1)}>
                  Zurück zur Debatte
                </Button>
              </Box>
            </>
          )}
        </Paper>
      )}
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        Powered by Cognitive Loop AI
      </Typography>
    </Box>
  );
};

export default LiveExpertDebatePanel; 
