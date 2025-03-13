import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  Divider, 
  CircularProgress, 
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Container,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Search as SearchIcon,
  Insights as InsightsIcon,
  Psychology as PsychologyIcon,
  Lightbulb as LightbulbIcon,
  Help as HelpIcon,
  ContentCopy as CopyIcon,
  Save as SaveIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

// Typen für die Analyse-Ergebnisse
interface AnalysisPattern {
  id: string;
  name: string;
  description: string;
  confidence: number;
  category: string;
}

interface AnalysisInsight {
  id: string;
  text: string;
  relevance: number;
  source: string;
}

interface AnalysisPanelProps {
  projectId?: string;
  apiUrl: string;
  isConnected: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ projectId, apiUrl, isConnected }) => {
  // Zustand für die Tabs
  const [activeTab, setActiveTab] = useState(0);
  
  // Zustand für die Textanalyse
  const [analysisText, setAnalysisText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Zustand für die Analyse-Ergebnisse
  const [patterns, setPatterns] = useState<AnalysisPattern[]>([]);
  const [insights, setInsights] = useState<AnalysisInsight[]>([]);
  const [summary, setSummary] = useState<string>('');
  
  // Zustand für die Analyse-Historie
  const [analysisHistory, setAnalysisHistory] = useState<{
    id: string;
    text: string;
    timestamp: string;
    patternCount: number;
  }[]>([]);
  
  // Lade die Analyse-Historie beim ersten Rendern
  useEffect(() => {
    if (projectId) {
      // Hier würde die API-Anfrage erfolgen
      // Beispiel: const response = await api.getAnalysisHistory(projectId);
      
      // Simuliere API-Anfrage mit Beispieldaten
      const mockHistory = [
        {
          id: '1',
          text: 'Die Implementierung von erneuerbaren Energien in urbanen Räumen...',
          timestamp: '2023-11-20T14:30:00Z',
          patternCount: 5
        },
        {
          id: '2',
          text: 'Künstliche Intelligenz im Gesundheitswesen bietet zahlreiche Chancen...',
          timestamp: '2023-11-18T09:45:00Z',
          patternCount: 8
        }
      ];
      
      setAnalysisHistory(mockHistory);
    }
  }, [projectId]);
  
  // Tab-Wechsel
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Text-Änderung
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnalysisText(e.target.value);
  };
  
  // Analyse starten
  const handleStartAnalysis = async () => {
    if (analysisText.trim().length < 10) {
      setError('Bitte geben Sie mindestens 10 Zeichen ein.');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Hier würde die API-Anfrage erfolgen
      // Beispiel: const response = await api.analyzeText(analysisText);
      
      // Simuliere API-Anfrage mit Timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simuliere Analyse-Ergebnisse
      const mockPatterns: AnalysisPattern[] = [
        {
          id: '1',
          name: 'Kausale Beziehung',
          description: 'Beschreibt eine Ursache-Wirkungs-Beziehung zwischen zwei Ereignissen oder Konzepten.',
          confidence: 0.89,
          category: 'Logik'
        },
        {
          id: '2',
          name: 'Vergleich',
          description: 'Stellt Ähnlichkeiten oder Unterschiede zwischen zwei oder mehr Elementen dar.',
          confidence: 0.76,
          category: 'Struktur'
        },
        {
          id: '3',
          name: 'Hypothese',
          description: 'Eine vorläufige Annahme oder Vermutung, die noch überprüft werden muss.',
          confidence: 0.82,
          category: 'Wissenschaft'
        },
        {
          id: '4',
          name: 'Analogie',
          description: 'Vergleicht unbekannte Konzepte mit bekannten, um Verständnis zu fördern.',
          confidence: 0.68,
          category: 'Rhetorik'
        }
      ];
      
      const mockInsights: AnalysisInsight[] = [
        {
          id: '1',
          text: 'Der Text weist auf eine starke Korrelation zwischen den diskutierten Faktoren hin, ohne jedoch eine kausale Beziehung nachzuweisen.',
          relevance: 0.92,
          source: 'Musteranalyse'
        },
        {
          id: '2',
          text: 'Die präsentierten Argumente könnten durch empirische Daten gestärkt werden, um die Schlussfolgerungen zu untermauern.',
          relevance: 0.85,
          source: 'Argumentationsanalyse'
        },
        {
          id: '3',
          text: 'Die verwendeten Analogien sind hilfreich, könnten jedoch in einigen Fällen zu Vereinfachungen führen, die die Komplexität des Themas nicht vollständig erfassen.',
          relevance: 0.78,
          source: 'Rhetorikanalyse'
        }
      ];
      
      const mockSummary = 'Der Text untersucht die Beziehung zwischen technologischem Fortschritt und gesellschaftlichem Wandel, wobei verschiedene Perspektiven und historische Beispiele herangezogen werden. Die Argumentation ist strukturiert und logisch aufgebaut, könnte jedoch von zusätzlichen empirischen Belegen profitieren. Besonders hervorzuheben ist die Verwendung von Analogien, die komplexe Zusammenhänge verständlich machen.';
      
      setPatterns(mockPatterns);
      setInsights(mockInsights);
      setSummary(mockSummary);
      
      // Füge die aktuelle Analyse zur Historie hinzu
      const newHistoryEntry = {
        id: Date.now().toString(),
        text: analysisText.substring(0, 100) + (analysisText.length > 100 ? '...' : ''),
        timestamp: new Date().toISOString(),
        patternCount: mockPatterns.length
      };
      
      setAnalysisHistory([newHistoryEntry, ...analysisHistory]);
      
    } catch (err) {
      console.error('Fehler bei der Analyse:', err);
      setError('Bei der Analyse ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Analyse aus der Historie laden
  const handleLoadAnalysis = (historyId: string) => {
    // Hier würde die API-Anfrage erfolgen
    // Beispiel: const response = await api.getAnalysisDetails(historyId);
    
    // Simuliere das Laden einer Analyse aus der Historie
    const historyItem = analysisHistory.find(item => item.id === historyId);
    if (historyItem) {
      setAnalysisText(historyItem.text);
      // Hier würden die entsprechenden Analyse-Ergebnisse geladen werden
    }
  };
  
  // Analyse löschen
  const handleDeleteAnalysis = (historyId: string) => {
    // Hier würde die API-Anfrage erfolgen
    // Beispiel: await api.deleteAnalysis(historyId);
    
    // Entferne die Analyse aus der Historie
    setAnalysisHistory(analysisHistory.filter(item => item.id !== historyId));
  };
  
  // Formatiere Datum
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Kopiere Text in die Zwischenablage
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Hier könnte eine Benachrichtigung angezeigt werden
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#283593', mb: 3 }}>
        Textanalyse & Mustererkennung
      </Typography>
      
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Neue Analyse" icon={<InsightsIcon />} iconPosition="start" />
        <Tab label="Analyse-Ergebnisse" icon={<LightbulbIcon />} iconPosition="start" disabled={patterns.length === 0} />
        <Tab label="Analyse-Historie" icon={<PsychologyIcon />} iconPosition="start" />
      </Tabs>
      
      {/* Tab 1: Neue Analyse */}
      {activeTab === 0 && (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Text zur Analyse eingeben
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Geben Sie einen Text ein, um Muster, Argumentationsstrukturen und Erkenntnisse zu identifizieren.
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={10}
              variant="outlined"
              placeholder="Fügen Sie hier Ihren Text ein (mindestens 10 Zeichen)..."
              value={analysisText}
              onChange={handleTextChange}
              sx={{ mb: 2 }}
            />
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {analysisText.length} Zeichen
              </Typography>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                onClick={handleStartAnalysis}
                disabled={isAnalyzing || analysisText.trim().length < 10 || !isConnected}
              >
                {isAnalyzing ? 'Analysiere...' : 'Analyse starten'}
              </Button>
            </Box>
          </Box>
          
          {isAnalyzing && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                Analysiere Text... Dies kann einige Sekunden dauern.
              </Typography>
            </Box>
          )}
        </Paper>
      )}
      
      {/* Tab 2: Analyse-Ergebnisse */}
      {activeTab === 1 && (
        <Box>
          {/* Zusammenfassung */}
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Zusammenfassung
              </Typography>
              <Tooltip title="In Zwischenablage kopieren">
                <IconButton size="small" onClick={() => copyToClipboard(summary)}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body1" paragraph>
              {summary}
            </Typography>
          </Paper>
          
          {/* Erkannte Muster */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
            Erkannte Muster
          </Typography>
          
          <Grid container spacing={2}>
            {patterns.map((pattern) => (
              <Grid item xs={12} md={6} key={pattern.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {pattern.name}
                      </Typography>
                      <Chip 
                        label={`${Math.round(pattern.confidence * 100)}%`} 
                        color={pattern.confidence > 0.8 ? 'success' : pattern.confidence > 0.6 ? 'primary' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {pattern.description}
                    </Typography>
                    <Chip 
                      label={pattern.category} 
                      variant="outlined" 
                      size="small" 
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {/* Erkenntnisse */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
            Erkenntnisse & Empfehlungen
          </Typography>
          
          {insights.map((insight) => (
            <Paper key={insight.id} sx={{ p: 2, mb: 2, borderLeft: 4, borderColor: 'primary.main' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="body1">
                  {insight.text}
                </Typography>
                <Tooltip title="In Zwischenablage kopieren">
                  <IconButton size="small" onClick={() => copyToClipboard(insight.text)}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Quelle: {insight.source}
                </Typography>
                <Chip 
                  label={`Relevanz: ${Math.round(insight.relevance * 100)}%`} 
                  size="small" 
                  variant="outlined"
                />
              </Box>
            </Paper>
          ))}
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              sx={{ mr: 2 }}
            >
              Ergebnisse speichern
            </Button>
            <Button
              variant="contained"
              onClick={() => setActiveTab(0)}
            >
              Neue Analyse
            </Button>
          </Box>
        </Box>
      )}
      
      {/* Tab 3: Analyse-Historie */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Frühere Analysen
          </Typography>
          
          {analysisHistory.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Keine früheren Analysen vorhanden.
              </Typography>
            </Paper>
          ) : (
            analysisHistory.map((item) => (
              <Paper key={item.id} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                    {item.text}
                  </Typography>
                  <Box>
                    <Tooltip title="Analyse laden">
                      <IconButton size="small" onClick={() => handleLoadAnalysis(item.id)}>
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Analyse löschen">
                      <IconButton size="small" color="error" onClick={() => handleDeleteAnalysis(item.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Analysiert am: {formatDate(item.timestamp)}
                  </Typography>
                  <Chip 
                    label={`${item.patternCount} Muster erkannt`} 
                    size="small" 
                    variant="outlined"
                  />
                </Box>
              </Paper>
            ))
          )}
        </Box>
      )}
      
      {/* Hilfe-Button */}
      <Tooltip title="Hilfe zur Textanalyse">
        <IconButton 
          sx={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20,
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            }
          }}
        >
          <HelpIcon />
        </IconButton>
      </Tooltip>
    </Container>
  );
};

export default AnalysisPanel; 