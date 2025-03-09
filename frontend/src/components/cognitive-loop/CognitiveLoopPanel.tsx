import React, { useState } from 'react';
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
  LinearProgress,
  Divider
} from '@mui/material';
import { 
  Psychology as PsychologyIcon,
  Send as SendIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

interface CognitiveLoopPanelProps {
  apiUrl: string;
  isConnected: boolean;
}

interface Pattern {
  id: string;
  name: string;
  description: string;
  confidence: number;
  matches: string[];
}

interface AdaptiveMetrics {
  personalizedScore: number;
  contextRelevance: number;
  adaptationLevel: number;
}

interface CognitiveLoopResult {
  optimizedResponse: string;
  patterns: Pattern[];
  adaptiveMetrics: AdaptiveMetrics;
}

const CognitiveLoopPanel: React.FC<CognitiveLoopPanelProps> = ({ apiUrl, isConnected }) => {
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CognitiveLoopResult | null>(null);

  const handleSubmit = async () => {
    if (input.trim().length < 5) {
      setError('Die Eingabe muss mindestens 5 Zeichen enthalten.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${apiUrl}/cognitive-loop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          context: context || undefined,
          history: [] // Könnte in Zukunft den Verlauf der Konversation enthalten
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP-Fehler: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Cognitive Loop Antwort:', data);
      
      if (data.success && data.result) {
        setResult(data.result);
      } else {
        throw new Error('Unerwartetes Format der API-Antwort');
      }
    } catch (err: any) {
      console.error('Fehler bei der Cognitive Loop Anfrage:', err);
      setError(`Fehler bei der Anfrage: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPatterns = () => {
    if (!result || !result.patterns || result.patterns.length === 0) return null;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>Erkannte Muster</Typography>
        <Grid container spacing={2}>
          {result.patterns.map((pattern) => (
            <Grid item xs={12} md={6} key={pattern.id}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>{pattern.name}</Typography>
                <Typography variant="body2" paragraph>{pattern.description}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 80 }}>
                    Konfidenz:
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={pattern.confidence * 100} 
                    sx={{ flexGrow: 1, mr: 1 }} 
                  />
                  <Typography variant="caption">
                    {(pattern.confidence * 100).toFixed(0)}%
                  </Typography>
                </Box>
                {pattern.matches && pattern.matches.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" display="block" gutterBottom>
                      Zugehörige Begriffe:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {pattern.matches.map((match, idx) => (
                        <Chip 
                          key={idx} 
                          label={match} 
                          size="small" 
                          variant="outlined" 
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderMetrics = () => {
    if (!result || !result.adaptiveMetrics) return null;

    const { personalizedScore, contextRelevance, adaptationLevel } = result.adaptiveMetrics;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>Adaptive Metriken</Typography>
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" gutterBottom>Personalisierungsscore</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LinearProgress 
                  variant="determinate" 
                  value={personalizedScore * 100} 
                  sx={{ flexGrow: 1, mr: 1 }} 
                />
                <Typography variant="body2">
                  {(personalizedScore * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" gutterBottom>Kontextrelevanz</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LinearProgress 
                  variant="determinate" 
                  value={contextRelevance * 100} 
                  sx={{ flexGrow: 1, mr: 1 }} 
                  color="success"
                />
                <Typography variant="body2">
                  {(contextRelevance * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" gutterBottom>Adaptationslevel</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LinearProgress 
                  variant="determinate" 
                  value={adaptationLevel * 100} 
                  sx={{ flexGrow: 1, mr: 1 }} 
                  color="secondary"
                />
                <Typography variant="body2">
                  {(adaptationLevel * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Cognitive Loop - Adaptive Intelligenz</Typography>
      <Typography variant="body1" paragraph>
        Der Cognitive Loop analysiert Eingaben, erkennt Muster und generiert adaptive Antworten basierend auf Ihrem Kontext.
      </Typography>
      
      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Sie sind offline. Die Cognitive Loop Funktionalität ist nur online verfügbar.
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3}>
          <TextField
            label="Eingabe"
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Beschreiben Sie Ihr Problem oder geben Sie einen Text zur Analyse ein..."
            disabled={isLoading || !isConnected}
            required
          />
          
          <TextField
            label="Kontext (optional)"
            multiline
            rows={2}
            fullWidth
            variant="outlined"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Fügen Sie relevanten Kontext oder Hintergrundinformationen hinzu..."
            disabled={isLoading || !isConnected}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={isLoading || !isConnected || input.trim().length < 5}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <PsychologyIcon />}
            >
              {isLoading ? 'Verarbeite...' : 'Cognitive Loop starten'}
            </Button>
          </Box>
        </Stack>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {result && (
        <Box>
          <Typography variant="h6" gutterBottom>Optimierte Antwort</Typography>
          <Paper sx={{ p: 3, mb: 3, whiteSpace: 'pre-wrap' }}>
            {result.optimizedResponse}
          </Paper>
          
          <Divider sx={{ my: 4 }} />
          
          {renderPatterns()}
          
          <Divider sx={{ my: 4 }} />
          
          {renderMetrics()}
        </Box>
      )}
    </Box>
  );
};

export default CognitiveLoopPanel; 