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
  IconButton,
  Breadcrumbs,
  Link
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  SignalWifiOff as OfflineIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Forum as ForumIcon
} from '@mui/icons-material';
import { useCognitiveState } from '../hooks/useCognitiveState';
import SystemDashboard from './system-dashboard/SystemDashboard';
import NexusPanel from './nexus/NexusPanel';
import CognitiveLoopPanel from './cognitive-loop/CognitiveLoopPanel';
import ExpertDebatePanel from './insight-core/ExpertDebatePanel';
import LiveExpertDebatePanel from './insight-core/LiveExpertDebatePanel';
import { WelcomePage } from './welcome';
import { ProjectCreation, ProjectOverview } from './project-management';
import { AnalysisPanel, KnowledgeExtraction } from './analysis';
import { View } from '../types';

// Definiere die möglichen Ansichten
type Pattern = {
  id: string;
  type: string;
  description: string;
  confidence: number;
};

const MainView: React.FC = () => {
  // Zustandsverwaltung für die Navigation
  const [currentView, setCurrentView] = useState<View>('welcome');
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{label: string, view: View}[]>([
    { label: 'Startseite', view: 'welcome' }
  ]);
  
  // Zustandsverwaltung für die Musteranalyse
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
    if (connectionStatus === 'online') {
      setApiStatus('online');
    } else if (connectionStatus === 'offline') {
      setApiStatus('offline');
    } else {
      setApiStatus('checking');
    }
    
    if (connectionStatus === 'offline' && !lastError) {
      setShowNetworkStatus(true);
    }
  }, [connectionStatus, lastError]);

  useEffect(() => {
    console.log('MainView initialisiert, Backend-Verbindung:', connectionStatus);
  }, [connectionStatus]);

  // Navigation zu einer bestimmten Ansicht
  const navigateTo = (view: View, addToHistory = true) => {
    setCurrentView(view);
    
    if (addToHistory) {
      // Aktualisiere die Breadcrumbs
      const viewLabels: Record<View, string> = {
        'welcome': 'Startseite',
        'projectOverview': 'Projekte',
        'projectCreation': 'Neues Projekt',
        'cognitive-loop': 'Cognitive Loop',
        'nexus': 'The Nexus',
        'expert-debate': 'Experten-Debatte',
        'system-dashboard': 'System-Status',
        'analysis': 'Textanalyse',
        'knowledge-extraction': 'Wissensextraktion',
        'live-expert-debate': 'Live Experten-Debatte'
      };
      
      // Finde den Index der aktuellen Ansicht in den Breadcrumbs
      const currentIndex = breadcrumbs.findIndex(crumb => crumb.view === currentView);
      
      if (currentIndex >= 0) {
        // Wenn die aktuelle Ansicht bereits in den Breadcrumbs ist, entferne alle nachfolgenden
        setBreadcrumbs([...breadcrumbs.slice(0, currentIndex + 1), { label: viewLabels[view], view }]);
      } else {
        // Sonst füge die neue Ansicht hinzu
        setBreadcrumbs([...breadcrumbs, { label: viewLabels[view], view }]);
      }
    }
  };

  // Zurück-Navigation
  const navigateBack = () => {
    if (breadcrumbs.length > 1) {
      const newBreadcrumbs = [...breadcrumbs];
      newBreadcrumbs.pop();
      setBreadcrumbs(newBreadcrumbs);
      setCurrentView(newBreadcrumbs[newBreadcrumbs.length - 1].view);
    }
  };

  // Breadcrumb-Navigation
  const navigateToBreadcrumb = (index: number) => {
    if (index < breadcrumbs.length) {
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      setCurrentView(breadcrumbs[index].view);
    }
  };

  // Handler für die Projekterstellung
  const handleProjectCreated = (projectId: string) => {
    console.log('Neues Projekt erstellt:', projectId);
    setActiveProject(projectId);
  };

  // Handler für das Öffnen eines Projekts
  const handleSelectProject = (projectId: string) => {
    console.log('Projekt ausgewählt:', projectId);
    setActiveProject(projectId);
    // Hier könnte später zur Projektdetailansicht navigiert werden
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header mit Verbindungsstatus */}
      <Box 
        sx={{ 
          p: 1, 
          bgcolor: apiStatus === 'online' ? 'success.main' : apiStatus === 'offline' ? 'error.main' : 'warning.main',
          color: 'white',
          display: showNetworkStatus ? 'flex' : 'none',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography variant="body2">
          {apiStatus === 'online' 
            ? 'Verbunden mit dem Backend-Server' 
            : apiStatus === 'offline' 
              ? 'Keine Verbindung zum Backend-Server' 
              : 'Überprüfe Verbindung...'}
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

      {/* Breadcrumb-Navigation */}
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Breadcrumbs aria-label="breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <Link
              key={index}
              color="inherit"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigateToBreadcrumb(index);
              }}
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                fontWeight: index === breadcrumbs.length - 1 ? 'bold' : 'normal'
              }}
            >
              {index === 0 && <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />}
              {crumb.label}
            </Link>
          ))}
        </Breadcrumbs>
      </Box>
      
      {/* Hauptinhalt basierend auf der aktuellen Ansicht */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
        {/* Startseite */}
        {currentView === 'welcome' && (
          <WelcomePage onNavigate={navigateTo} />
        )}
        
        {/* Projektübersicht */}
        {currentView === 'projectOverview' && (
          <ProjectOverview 
            onNavigate={navigateTo}
            onSelectProject={handleSelectProject}
          />
        )}
        
        {/* Projekterstellung */}
        {currentView === 'projectCreation' && (
          <ProjectCreation 
            onNavigate={navigateTo}
            onProjectCreated={handleProjectCreated}
          />
        )}
        
        {/* Textanalyse */}
        {currentView === 'analysis' && (
          <AnalysisPanel 
            projectId={activeProject || undefined}
            apiUrl={process.env.REACT_APP_API_URL || 'http://localhost:8000/api'} 
            isConnected={apiStatus === 'online'} 
          />
        )}
        
        {/* Wissensextraktion */}
        {currentView === 'knowledge-extraction' && (
          <KnowledgeExtraction 
            projectId={activeProject || undefined}
            apiUrl={process.env.REACT_APP_API_URL || 'http://localhost:8000/api'} 
            isConnected={apiStatus === 'online'} 
          />
        )}
        
        {/* Cognitive Loop */}
        {currentView === 'cognitive-loop' && (
          <CognitiveLoopPanel 
            apiUrl={process.env.REACT_APP_API_URL || 'http://localhost:8000/api'} 
            isConnected={apiStatus === 'online'} 
          />
        )}
        
        {/* The Nexus */}
        {currentView === 'nexus' && (
          <NexusPanel 
            apiUrl={process.env.REACT_APP_API_URL || 'http://localhost:8000/api'} 
            isConnected={apiStatus === 'online'} 
          />
        )}
        
        {/* Experten-Debatte */}
        {currentView === 'expert-debate' && (
          <ExpertDebatePanel 
            apiUrl={process.env.REACT_APP_API_URL || 'http://localhost:8000/api'} 
            isConnected={apiStatus === 'online'} 
          />
        )}
        
        {/* Erweiterte Experten-Debatte */}
        {currentView === 'live-expert-debate' && (
          <LiveExpertDebatePanel 
            apiUrl={process.env.REACT_APP_API_URL || 'http://localhost:8000/api'} 
            isConnected={apiStatus === 'online'} 
            projectId={activeProject || undefined}
          />
        )}
        
        {/* System-Status */}
        {currentView === 'system-dashboard' && (
          <SystemDashboard />
        )}
      </Box>
      
      {/* Footer-Navigation für die Hauptfunktionen */}
      {(currentView === 'cognitive-loop' || currentView === 'nexus' || currentView === 'expert-debate' || currentView === 'live-expert-debate') && (
        <Box sx={{ borderTop: 1, borderColor: 'divider', p: 1, bgcolor: 'background.paper' }}>
          <Tabs 
            value={
              currentView === 'cognitive-loop' ? 0 : 
              currentView === 'nexus' ? 1 : 
              currentView === 'expert-debate' ? 2 :
              currentView === 'live-expert-debate' ? 3 : 4
            } 
            onChange={(_, newValue) => {
              const views: View[] = ['cognitive-loop', 'nexus', 'expert-debate', 'live-expert-debate', 'system-dashboard'];
              navigateTo(views[newValue]);
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Cognitive Loop" icon={<AnalyticsIcon />} iconPosition="start" />
            <Tab label="The Nexus" icon={<BuildIcon />} iconPosition="start" />
            <Tab label="Experten Debatte" icon={<BugReportIcon />} iconPosition="start" />
            <Tab label="Live Debatte" icon={<ForumIcon />} iconPosition="start" />
            <Tab label="System Status" icon={<DashboardIcon />} iconPosition="start" />
          </Tabs>
        </Box>
      )}
    </Box>
  );
};

export default MainView; 