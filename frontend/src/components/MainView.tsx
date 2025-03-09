import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Typography, 
  Button, 
  Grid, 
  TextField, 
  Alert, 
  CircularProgress, 
  Paper,
  LinearProgress,
  Chip,
  IconButton
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  SignalWifiOff as OfflineIcon
} from '@mui/icons-material';
import { useCognitiveState } from '../hooks/useCognitiveState';
import SystemDashboard from './system-dashboard/SystemDashboard';
import NexusPanel from './nexus/NexusPanel';
import CognitiveLoopPanel from './cognitive-loop/CognitiveLoopPanel';
import ExpertDebatePanel from './insight-core/ExpertDebatePanel';

type Pattern = {
  id: string;
  type: string;
  description: string;
  confidence: number;
};

const MainView: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [patternText, setPatternText] = useState('');
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [expertQuestion, setExpertQuestion] = useState('');
  const [expertResponse, setExpertResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [showNetworkStatus, setShowNetworkStatus] = useState(false);

  const { analyzePatterns, connectionStatus, lastError } = useCognitiveState();

  // Synchronisiere apiStatus mit connectionStatus aus dem Hook
  useEffect(() => {
    // Mapping zwischen den Status-Werten
    const statusMap: Record<string, 'online' | 'offline' | 'checking'> = {
      'online': 'online',
      'offline': 'offline',
      'connecting': 'checking'
    };
    
    setApiStatus(statusMap[connectionStatus]);
    
    // Zeige eine Benachrichtigung, wenn sich der Status ändert
    if (connectionStatus === 'online') {
      setShowNetworkStatus(true);
    } else if (connectionStatus === 'offline') {
      setShowNetworkStatus(true);
    }
    
    // Übernehme Fehler aus dem Hook
    if (lastError) {
      setError(lastError);
    }
  }, [connectionStatus, lastError]);

  // Zeige Status bei Komponenten-Initialisierung
  useEffect(() => {
    console.log('MainView initialisiert, Backend-Verbindung:', connectionStatus);
  }, [connectionStatus]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handlePatternAnalysis = async () => {
    if (patternText.length >= 10) {
      setIsLoading(true);
      setError(null);
      
      try {
        // Verwende die verbesserte asynchrone Funktion
        const detectedPatterns = await analyzePatterns(patternText);
        setPatterns(detectedPatterns.map((p) => ({
          id: p.id,
          type: p.name,
          description: p.description,
          confidence: p.confidence * 100
        })));
      } catch (err) {
        console.error('Fehler bei der Musteranalyse:', err);
        setError('Fehler bei der Musteranalyse: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Handler für Experten-Kollaboration
  const handleExpertQuestion = async () => {
    if (expertQuestion.length >= 5) {
      setIsLoading(true);
      setError(null);
      setExpertResponse('Verarbeitung der Anfrage...');
      
      try {
        // Simuliere API Aufruf mit Timeout
        setTimeout(() => {
          setExpertResponse(`Antwort auf "${expertQuestion}":\n\nBasierend auf den aktuellen Daten und Trends, empfehlen wir folgende Vorgehensweise: Eine detaillierte Analyse der Systemkomponenten zeigt, dass die Optimierung der Datenbankabfragen und asynchronen Operationen den größten Einfluss auf die Gesamtleistung haben würde. Implementieren Sie zunächst eine Caching-Strategie und überprüfen Sie dann die Indexstruktur der Datenbank.`);
          setIsLoading(false);
        }, 1500);
      } catch (err) {
        console.error('Fehler bei der Expertenanfrage:', err);
        setError('Fehler bei der Expertenanfrage: ' + (err instanceof Error ? err.message : String(err)));
        setExpertResponse('Fehler bei der Verarbeitung');
        setIsLoading(false);
      }
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Statusleiste für API-Verbindung */}
      <Box 
        sx={{ 
          width: '100%', 
          py: 0.5, 
          px: 2, 
          bgcolor: apiStatus === 'online' ? 'success.main' : apiStatus === 'offline' ? 'error.main' : 'warning.main',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'background-color 0.3s ease'
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          {apiStatus === 'online' 
            ? 'API-Verbindung: Aktiv' 
            : apiStatus === 'offline' 
              ? 'API-Verbindung: Nicht verfügbar' 
              : 'API-Verbindung: Wird überprüft...'}
        </Typography>
        <IconButton 
          size="small" 
          color="inherit" 
          onClick={() => {
            setApiStatus('checking');
            // Status erneut prüfen (Seite neu laden)
            window.location.reload();
          }}
          disabled={apiStatus === 'checking'}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="insight synergy tabs">
          <Tab label="Cognitive Loop" icon={<AnalyticsIcon />} iconPosition="start" />
          <Tab label="The Nexus" icon={<BuildIcon />} iconPosition="start" />
          <Tab label="Experten Debatte" icon={<BugReportIcon />} iconPosition="start" />
          <Tab label="System Status" icon={<RefreshIcon />} iconPosition="start" />
        </Tabs>
      </Box>
      
      {/* Hauptteil der Anwendung */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
        {/* Tab 1: Cognitive Loop */}
        <div role="tabpanel" hidden={activeTab !== 0}>
          {activeTab === 0 && (
            <CognitiveLoopPanel 
              apiUrl={process.env.REACT_APP_API_URL || 'http://localhost:8081/api'} 
              isConnected={apiStatus === 'online'} 
            />
          )}
        </div>

        {/* Tab 2: The Nexus */}
        <div role="tabpanel" hidden={activeTab !== 1}>
          {activeTab === 1 && (
            <NexusPanel 
              apiUrl={process.env.REACT_APP_API_URL || 'http://localhost:8081/api'} 
              isConnected={apiStatus === 'online'} 
            />
          )}
        </div>

        {/* Tab 3: Experten Debatte */}
        <div role="tabpanel" hidden={activeTab !== 2}>
          {activeTab === 2 && (
            <ExpertDebatePanel 
              apiUrl={process.env.REACT_APP_API_URL || 'http://localhost:8081/api'} 
              isConnected={apiStatus === 'online'} 
            />
          )}
        </div>

        {/* Tab 4: System Status */}
        <div role="tabpanel" hidden={activeTab !== 3}>
          {activeTab === 3 && <SystemDashboard />}
        </div>
      </Box>
    </Box>
  );
};

export default MainView; 