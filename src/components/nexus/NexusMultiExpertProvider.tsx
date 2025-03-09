'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NexusSession, ChatMessage, Expert } from './NexusChatInterface';
import { useToast } from '@/components/ui/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';
import { useCognitiveLoop } from '@/hooks/use-cognitive-loop';

// Beispiel-Experten für schnelles Testing
const DEFAULT_EXPERTS: Expert[] = [
  {
    id: 'tech-expert',
    name: 'Tech Expert',
    avatar: '/avatars/tech-expert.png',
    expertise: ['Technical Implementation', 'Code Architecture', 'Performance'],
    bio: 'Specializes in technical implementation details and system architecture optimization.',
    characteristics: ['Precise', 'Detail-oriented', 'Systematic']
  },
  {
    id: 'ux-expert',
    name: 'UX Specialist',
    avatar: '/avatars/ux-expert.png',
    expertise: ['User Experience', 'Interface Design', 'Usability'],
    bio: 'Focuses on creating seamless user experiences and intuitive interface designs.',
    characteristics: ['Creative', 'User-focused', 'Empathetic']
  },
  {
    id: 'system-architect',
    name: 'System Architect',
    avatar: '/avatars/system-architect.png',
    expertise: ['System Design', 'Integration', 'Scalability'],
    bio: 'Expert in designing scalable system architectures and complex integrations.',
    characteristics: ['Strategic', 'Visionary', 'Analytical']
  },
  {
    id: 'ai-specialist',
    name: 'AI Specialist',
    avatar: '/avatars/ai-specialist.png',
    expertise: ['Machine Learning', 'Neural Networks', 'Data Science'],
    bio: 'Specializes in advanced AI algorithms and cognitive system implementation.',
    characteristics: ['Innovative', 'Research-oriented', 'Technical']
  }
];

// Eine leere Session für schnelles Testing
const EMPTY_SESSION: NexusSession = {
  id: 'new-session',
  title: 'New Multi-Expert Session',
  created: new Date(),
  lastUpdated: new Date(),
  participants: DEFAULT_EXPERTS,
  messages: [],
  status: 'active',
  tags: ['insight-synergy', 'multi-expert'],
  settings: {
    debateMode: true,
    cognitiveAnalysis: true,
    realTimeProcessing: true,
    autoSummarize: false
  }
};

interface NexusContextType {
  session: NexusSession | null;
  loading: boolean;
  error: string | null;
  typingExperts: string[];
  wsConnected: boolean;
  createSession: (title?: string, experts?: Expert[]) => Promise<string>;
  loadSession: (sessionId: string) => Promise<boolean>;
  sendMessage: (content: string) => Promise<boolean>;
  rateMessage: (messageId: string, rating: 'helpful' | 'neutral' | 'unhelpful') => Promise<boolean>;
  toggleSessionStatus: () => Promise<boolean>;
  exportSession: (format: 'markdown' | 'pdf' | 'json') => Promise<void>;
  addExpertToSession: (expert: Expert) => Promise<boolean>;
  removeExpertFromSession: (expertId: string) => Promise<boolean>;
  updateSessionSettings: (settings: Partial<NexusSession['settings']>) => Promise<boolean>;
}

const NexusContext = createContext<NexusContextType | null>(null);

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error('useNexus must be used within a NexusMultiExpertProvider');
  }
  return context;
};

interface NexusMultiExpertProviderProps {
  children: ReactNode;
  initialSessionId?: string;
  devMode?: boolean;
}

export function NexusMultiExpertProvider({ 
  children, 
  initialSessionId,
  devMode = false
}: NexusMultiExpertProviderProps) {
  const { toast } = useToast();
  const [session, setSession] = useState<NexusSession | null>(null);
  const [loading, setLoading] = useState<boolean>(!!initialSessionId);
  const [error, setError] = useState<string | null>(null);
  const [typingExperts, setTypingExperts] = useState<string[]>([]);
  
  // Integration mit der Kognitiven Loop
  const { 
    analyzePatterns, 
    optimizeResponse, 
    getInsights,
    recordUserFeedback
  } = useCognitiveLoop();
  
  // WebSocket-Verbindung für Echtzeit-Updates
  const { 
    connected: wsConnected,
    send,
    lastMessage,
    connect,
    disconnect
  } = useWebSocket();

  // Laden einer Session beim Start, falls eine initialSessionId angegeben wurde
  useEffect(() => {
    if (initialSessionId) {
      loadSession(initialSessionId).catch(err => {
        console.error('Failed to load initial session:', err);
        setError('Failed to load session');
        setLoading(false);
      });
    } else if (devMode) {
      // Im Entwicklungsmodus eine leere Session erstellen
      setSession(EMPTY_SESSION);
    }
  }, [initialSessionId, devMode]);

  // WebSocket-Nachrichten verarbeiten
  useEffect(() => {
    if (!lastMessage) return;
    
    try {
      const data = JSON.parse(lastMessage.data);
      
      switch (data.type) {
        case 'expert_response':
          handleExpertResponse(data.expertId, data.message);
          break;
        case 'typing_indicator':
          handleTypingIndicator(data.expertId, data.isTyping);
          break;
        case 'session_update':
          handleSessionUpdate(data.session);
          break;
        case 'error':
          setError(data.message);
          toast({
            title: "Error",
            description: data.message,
            variant: "destructive",
          });
          break;
        default:
          console.log('Unhandled message type:', data.type);
      }
    } catch (err) {
      console.error('Error processing WebSocket message:', err);
    }
  }, [lastMessage, toast]);

  // Verbindung zur WebSocket herstellen, wenn eine Session geladen ist
  useEffect(() => {
    if (session && !wsConnected && !devMode) {
      connect(`ws://localhost:3000/api/nexus/session/${session.id}`);
      
      return () => {
        disconnect();
      };
    }
  }, [session, wsConnected, connect, disconnect, devMode]);

  // Session laden
  const loadSession = async (sessionId: string): Promise<boolean> => {
    if (devMode) {
      // Im Entwicklungsmodus: Demo-Session zurückgeben
      setSession({
        ...EMPTY_SESSION,
        id: sessionId,
        title: `Session ${sessionId}`,
      });
      setLoading(false);
      return true;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/nexus/session/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSession(data);
      return true;
    } catch (err) {
      console.error('Error loading session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Neue Session erstellen
  const createSession = async (title?: string, experts?: Expert[]): Promise<string> => {
    if (devMode) {
      // Im Entwicklungsmodus: Demo-Session erstellen
      const newSessionId = `session-${Date.now()}`;
      const newSession = {
        ...EMPTY_SESSION,
        id: newSessionId,
        title: title || 'New Session',
        participants: experts || DEFAULT_EXPERTS,
        created: new Date(),
        lastUpdated: new Date(),
      };
      
      setSession(newSession);
      return newSessionId;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/nexus/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || 'New Multi-Expert Session',
          experts: experts || DEFAULT_EXPERTS
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }
      
      const { sessionId } = await response.json();
      await loadSession(sessionId);
      return sessionId;
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Nachricht senden
  const sendMessage = async (content: string): Promise<boolean> => {
    if (!session) return false;
    
    try {
      // Nachricht lokal hinzufügen
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        content,
        timestamp: new Date(),
        sender: {
          id: 'user',
          name: 'You',
          isUser: true
        }
      };
      
      const updatedSession = {
        ...session,
        messages: [...session.messages, userMessage],
        lastUpdated: new Date()
      };
      
      setSession(updatedSession);
      
      if (devMode) {
        // Im Entwicklungsmodus: Simuliere Experten-Antworten
        simulateExpertResponses(content);
        return true;
      }
      
      // An WebSocket senden
      send(JSON.stringify({
        type: 'user_message',
        sessionId: session.id,
        content,
        timestamp: new Date().toISOString()
      }));
      
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      return false;
    }
  };

  // Nachrichtenbewertung
  const rateMessage = async (messageId: string, rating: 'helpful' | 'neutral' | 'unhelpful'): Promise<boolean> => {
    if (!session) return false;
    
    try {
      // Lokal aktualisieren
      const updatedMessages = session.messages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            userReaction: rating
          };
        }
        return msg;
      });
      
      const updatedSession = {
        ...session,
        messages: updatedMessages,
        lastUpdated: new Date()
      };
      
      setSession(updatedSession);
      
      // Feedback an die kognitive Loop senden
      const message = session.messages.find(msg => msg.id === messageId);
      if (message && !message.sender.isUser) {
        recordUserFeedback(message.content, rating, message.sender.id);
      }
      
      if (!devMode) {
        // An API senden
        await fetch(`/api/nexus/message/${messageId}/rate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session.id,
            rating
          }),
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error rating message:', err);
      setError(err instanceof Error ? err.message : 'Failed to rate message');
      return false;
    }
  };

  // Session-Status umschalten
  const toggleSessionStatus = async (): Promise<boolean> => {
    if (!session) return false;
    
    try {
      const newStatus = session.status === 'active' ? 'paused' : 'active';
      
      const updatedSession = {
        ...session,
        status: newStatus,
        lastUpdated: new Date()
      };
      
      setSession(updatedSession);
      
      if (!devMode) {
        // Status an API senden
        await fetch(`/api/nexus/session/${session.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus
          }),
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error toggling session status:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle session status');
      return false;
    }
  };

  // Session exportieren
  const exportSession = async (format: 'markdown' | 'pdf' | 'json'): Promise<void> => {
    if (!session) return;
    
    try {
      if (format === 'json') {
        // JSON direkt im Browser herunterladen
        const dataStr = JSON.stringify(session, null, 2);
        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
        
        const exportFileDefaultName = `${session.title.replace(/\s+/g, '-').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      } else if (!devMode) {
        // Andere Formate vom Server anfordern
        const response = await fetch(`/api/nexus/session/${session.id}/export?format=${format}`, {
          method: 'GET',
        });
        
        if (!response.ok) {
          throw new Error(`Export failed: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${session.title.replace(/\s+/g, '-').toLowerCase()}_${new Date().toISOString().split('T')[0]}.${format === 'markdown' ? 'md' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Im Entwicklungsmodus: Nur Toast anzeigen
        toast({
          title: "Export Simulated",
          description: `The session would be exported as ${format.toUpperCase()} in production mode.`,
        });
      }
    } catch (err) {
      console.error(`Error exporting session as ${format}:`, err);
      setError(err instanceof Error ? err.message : `Failed to export session as ${format}`);
      throw err;
    }
  };

  // Experte zur Session hinzufügen
  const addExpertToSession = async (expert: Expert): Promise<boolean> => {
    if (!session) return false;
    
    try {
      // Prüfen, ob der Experte bereits existiert
      if (session.participants.some(p => p.id === expert.id)) {
        toast({
          title: "Expert already exists",
          description: `${expert.name} is already part of this session.`,
          variant: "destructive",
        });
        return false;
      }
      
      const updatedSession = {
        ...session,
        participants: [...session.participants, expert],
        lastUpdated: new Date()
      };
      
      setSession(updatedSession);
      
      if (!devMode) {
        // An API senden
        await fetch(`/api/nexus/session/${session.id}/expert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            expert
          }),
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error adding expert to session:', err);
      setError(err instanceof Error ? err.message : 'Failed to add expert to session');
      return false;
    }
  };

  // Experte aus Session entfernen
  const removeExpertFromSession = async (expertId: string): Promise<boolean> => {
    if (!session) return false;
    
    try {
      const updatedSession = {
        ...session,
        participants: session.participants.filter(p => p.id !== expertId),
        lastUpdated: new Date()
      };
      
      setSession(updatedSession);
      
      if (!devMode) {
        // An API senden
        await fetch(`/api/nexus/session/${session.id}/expert/${expertId}`, {
          method: 'DELETE',
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error removing expert from session:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove expert from session');
      return false;
    }
  };

  // Session-Einstellungen aktualisieren
  const updateSessionSettings = async (settings: Partial<NexusSession['settings']>): Promise<boolean> => {
    if (!session) return false;
    
    try {
      const updatedSession = {
        ...session,
        settings: {
          ...session.settings,
          ...settings
        },
        lastUpdated: new Date()
      };
      
      setSession(updatedSession);
      
      if (!devMode) {
        // An API senden
        await fetch(`/api/nexus/session/${session.id}/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            settings: updatedSession.settings
          }),
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error updating session settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update session settings');
      return false;
    }
  };

  // WebSocket-Callback-Handler
  const handleExpertResponse = (expertId: string, content: string) => {
    if (!session) return;
    
    const expert = session.participants.find(p => p.id === expertId);
    if (!expert) return;
    
    const newMessage: ChatMessage = {
      id: `${expertId}-${Date.now()}`,
      content,
      timestamp: new Date(),
      sender: {
        id: expertId,
        name: expert.name,
        isUser: false,
        avatar: expert.avatar
      }
    };
    
    // Kognitive Analyse durchführen
    if (session.settings.cognitiveAnalysis) {
      const latestUserMessage = [...session.messages].reverse().find(m => m.sender.isUser);
      if (latestUserMessage) {
        const insights = getInsights(latestUserMessage.content, content);
        newMessage.cognitiveInsights = {
          patterns: insights.patterns,
          confidence: insights.confidence,
          adaptationLevel: insights.adaptationLevel
        };
      }
    }
    
    // Nachricht optimieren, wenn realTimeProcessing aktiviert ist
    let optimizedContent = content;
    if (session.settings.realTimeProcessing) {
      optimizedContent = optimizeResponse(content, expertId);
    }
    
    // Message aktualisieren, wenn sie optimiert wurde
    if (optimizedContent !== content) {
      newMessage.content = optimizedContent;
      newMessage.metadata = {
        ...newMessage.metadata,
        optimized: true,
        originalContent: content
      };
    }
    
    setSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, newMessage],
        lastUpdated: new Date()
      };
    });
    
    // Typing-Indikator entfernen
    setTypingExperts(prev => prev.filter(id => id !== expertId));
  };

  const handleTypingIndicator = (expertId: string, isTyping: boolean) => {
    if (isTyping) {
      setTypingExperts(prev => {
        if (prev.includes(expertId)) return prev;
        return [...prev, expertId];
      });
    } else {
      setTypingExperts(prev => prev.filter(id => id !== expertId));
    }
  };

  const handleSessionUpdate = (updatedSession: NexusSession) => {
    setSession(updatedSession);
  };

  // DEV MODE: Experten-Antworten simulieren
  const simulateExpertResponses = (userMessage: string) => {
    if (!session) return;
    
    // Cognitive Pattern Analysis
    const patterns = analyzePatterns(userMessage);
    
    // Für jeden Experten eine verzögerte Antwort simulieren
    session.participants.forEach((expert, index) => {
      // Typing-Indikator anzeigen
      setTimeout(() => {
        setTypingExperts(prev => [...prev, expert.id]);
      }, 500 + (index * 300));
      
      // Experten-spezifische Antwort generieren
      setTimeout(async () => {
        let response = '';
        
        // Simulierte Antworten basierend auf Experten-Expertise
        switch (expert.id) {
          case 'tech-expert':
            response = `From a technical perspective, I'd recommend focusing on the implementation details of ${userMessage.includes('implementation') ? userMessage : 'your request'}. The architecture should be optimized for performance and scalability.`;
            break;
          case 'ux-expert':
            response = `Considering the user experience, it's important to ensure that ${userMessage.includes('user') ? userMessage : 'the interface'} is intuitive and accessible. I suggest focusing on usability testing early in the development process.`;
            break;
          case 'system-architect':
            response = `Looking at the system design, ${userMessage.includes('system') ? userMessage : 'your question'} requires a scalable approach. I recommend a modular architecture that can be easily extended as requirements evolve.`;
            break;
          case 'ai-specialist':
            response = `From an AI perspective, ${userMessage.includes('AI') || userMessage.includes('machine learning') ? userMessage : 'this problem'} could benefit from advanced pattern recognition. Our cognitive system can be trained to optimize outcomes based on historical data.`;
            break;
          default:
            response = `I've analyzed ${userMessage} and believe a collaborative approach would be best. Let's integrate insights from multiple domains.`;
        }
        
        // Response basierend auf erkannten Patterns optimieren
        if (patterns.length > 0) {
          response += ` Based on our conversation history, I notice you're interested in ${patterns[0]}. This is an important consideration for this topic.`;
        }
        
        // Antwort hinzufügen
        handleExpertResponse(expert.id, response);
      }, 2000 + (index * 1500)); // Verschiedene Verzögerungen für natürlichere Interaktion
    });
  };

  const value: NexusContextType = {
    session,
    loading,
    error,
    typingExperts,
    wsConnected,
    createSession,
    loadSession,
    sendMessage,
    rateMessage,
    toggleSessionStatus,
    exportSession,
    addExpertToSession,
    removeExpertFromSession,
    updateSessionSettings
  };

  return (
    <NexusContext.Provider value={value}>
      {children}
    </NexusContext.Provider>
  );
} 