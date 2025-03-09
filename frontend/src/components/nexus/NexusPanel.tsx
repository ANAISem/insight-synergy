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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  Link as LinkIcon
} from '@mui/icons-material';

interface NexusPanelProps {
  apiUrl: string;
  isConnected: boolean;
}

const NexusPanel: React.FC<NexusPanelProps> = ({ apiUrl, isConnected }) => {
  const [query, setQuery] = useState('');
  const [context, setContext] = useState('');
  const [goals, setGoals] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const handleSubmit = async () => {
    if (query.trim().length < 5) {
      setError('Die Anfrage muss mindestens 5 Zeichen enthalten.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${apiUrl}/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          context: context || undefined,
          goals: goals || undefined,
          max_tokens: 2000
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP-Fehler: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Nexus-Antwort:', data);
      setResult(data);
    } catch (err: any) {
      console.error('Fehler bei der Nexus-Anfrage:', err);
      setError(`Fehler bei der Anfrage: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSolution = () => {
    if (!result) return null;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>Lösung</Typography>
        
        {result.steps && result.steps.length > 0 && (
          <Accordion defaultExpanded sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Lösungsschritte</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {result.steps.map((step: string, index: number) => (
                  <ListItem key={index} divider={index < result.steps.length - 1}>
                    <ListItemText primary={`${index + 1}. ${step}`} />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}
        
        <Paper elevation={1} sx={{ p: 2, mb: 3, whiteSpace: 'pre-wrap' }}>
          {result.solution}
        </Paper>
        
        {result.references && result.references.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <LinkIcon sx={{ mr: 1 }} fontSize="small" />
              Referenzen & Quellen
            </Typography>
            <List dense>
              {result.references.map((ref: string, index: number) => (
                <ListItem key={index}>
                  <ListItemText primary={ref} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        
        {result.model && (
          <Chip 
            size="small" 
            label={`Modell: ${result.model}`} 
            variant="outlined" 
            sx={{ mt: 2 }} 
          />
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>The Nexus - Problemlösung</Typography>
      <Typography variant="body1" paragraph>
        Geben Sie Ihre Anfrage ein und erhalten Sie eine strukturierte Lösung vom Nexus-System.
      </Typography>
      
      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Sie sind offline. Die Nexus-Funktionalität ist nur online verfügbar.
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3}>
          <TextField
            label="Problem oder Anfrage"
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Beschreiben Sie Ihr Problem oder Ihre Anfrage..."
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
          
          <TextField
            label="Ziele & Anforderungen (optional)"
            multiline
            rows={2}
            fullWidth
            variant="outlined"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="Beschreiben Sie Ihre Ziele oder spezifischen Anforderungen..."
            disabled={isLoading || !isConnected}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={isLoading || !isConnected || query.trim().length < 5}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            >
              {isLoading ? 'Verarbeite...' : 'Lösung generieren'}
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
      
      {renderSolution()}
    </Box>
  );
};

export default NexusPanel; 