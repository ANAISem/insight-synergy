import React, { useState, useEffect } from 'react';
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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Divider,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  IconButton
} from '@mui/material';
import { 
  Person as PersonIcon,
  Science as ScienceIcon,
  Send as SendIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Forum as ForumIcon,
  FilterList as FilterListIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface ExpertDebatePanelProps {
  apiUrl: string;
  isConnected: boolean;
}

interface Expert {
  id: string;
  name: string;
  domain: string;
  specialty: string;
  background: string;
  perspective: string;
  avatar: string;
}

interface DebateThread {
  id: string;
  expertId: string;
  expertName: string;
  avatar: string;
  message: string;
  timestamp: string;
  references: string[];
}

interface Insight {
  title: string;
  description: string;
  expert: string;
  confidence: number;
}

interface DebateResult {
  topic: string;
  debateThreads: DebateThread[];
  insights: Insight[];
  context: string;
  questions: string[];
}

const ExpertDebatePanel: React.FC<ExpertDebatePanelProps> = ({ apiUrl, isConnected }) => {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [selectedExperts, setSelectedExperts] = useState<Expert[]>([]);
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [isLoadingExperts, setIsLoadingExperts] = useState(false);
  const [isGeneratingDebate, setIsGeneratingDebate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);

  // Lade Experten beim ersten Laden der Komponente
  useEffect(() => {
    if (isConnected) {
      loadExperts();
    }
  }, [isConnected]);

  // Extrahiere verfügbare Domains aus den Experten
  useEffect(() => {
    if (experts.length > 0) {
      const domainSet = new Set<string>();
      experts.forEach(expert => domainSet.add(expert.domain));
      const domains = Array.from(domainSet);
      setAvailableDomains(domains);
    }
  }, [experts]);

  const loadExperts = async (domain?: string) => {
    setIsLoadingExperts(true);
    setError(null);

    try {
      const url = domain
        ? `${apiUrl}/experts?domain=${encodeURIComponent(domain)}`
        : `${apiUrl}/experts`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP-Fehler: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.experts) {
        setExperts(data.experts);
      } else {
        throw new Error('Unerwartetes Format der API-Antwort');
      }
    } catch (err: any) {
      console.error('Fehler beim Laden der Experten:', err);
      setError(`Fehler beim Laden der Experten: ${err.message || 'Unbekannter Fehler'}`);
      setExperts([]);
    } finally {
      setIsLoadingExperts(false);
    }
  };

  const handleDomainFilterChange = (event: SelectChangeEvent) => {
    const domain = event.target.value;
    setDomainFilter(domain);
    if (domain) {
      loadExperts(domain);
    } else {
      loadExperts();
    }
  };

  const toggleExpertSelection = (expert: Expert) => {
    setSelectedExperts(prevSelected => {
      const isSelected = prevSelected.some(e => e.id === expert.id);
      
      if (isSelected) {
        return prevSelected.filter(e => e.id !== expert.id);
      } else {
        return [...prevSelected, expert];
      }
    });
  };

  const isExpertSelected = (expertId: string): boolean => {
    return selectedExperts.some(expert => expert.id === expertId);
  };

  const handleGenerateDebate = async () => {
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
    setDebateResult(null);

    try {
      const response = await fetch(`${apiUrl}/expert-debate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          expertIds: selectedExperts.map(expert => expert.id),
          context: context || undefined,
          questions: []
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP-Fehler: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.result) {
        setDebateResult(data.result);
      } else {
        throw new Error('Unerwartetes Format der API-Antwort');
      }
    } catch (err: any) {
      console.error('Fehler bei der Generierung der Debatte:', err);
      setError(`Fehler bei der Debatte: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsGeneratingDebate(false);
    }
  };

  const renderExpertCard = (expert: Expert) => {
    const isSelected = isExpertSelected(expert.id);
    
    return (
      <Card 
        key={expert.id} 
        sx={{ 
          mb: 2, 
          border: isSelected ? 2 : 0, 
          borderColor: 'primary.main',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: 3
          }
        }}
      >
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: isSelected ? 'primary.main' : 'grey.400' }}>
              {expert.avatar || expert.name.charAt(0)}
            </Avatar>
          }
          action={
            <Tooltip title={isSelected ? 'Experte entfernen' : 'Experte hinzufügen'}>
              <IconButton 
                onClick={() => toggleExpertSelection(expert)}
                color={isSelected ? 'primary' : 'default'}
              >
                {isSelected ? <RemoveIcon /> : <AddIcon />}
              </IconButton>
            </Tooltip>
          }
          title={
            <Box display="flex" alignItems="center">
              {expert.name}
              {isSelected && (
                <CheckCircleIcon 
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
    );
  };

  const renderDebateResult = () => {
    if (!debateResult) return null;

    return (
      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          Debatte: {debateResult.topic}
        </Typography>
        
        <Paper elevation={1} sx={{ p: 3, mt: 2, mb: 4 }}>
          <List>
            {debateResult.debateThreads.map((thread) => (
              <React.Fragment key={thread.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    py: 2,
                    backgroundColor: 
                      thread.expertId === 'exp-001' ? 'rgba(76, 175, 80, 0.08)' : 
                      thread.expertId === 'exp-002' ? 'rgba(33, 150, 243, 0.08)' : 
                      thread.expertId === 'exp-003' ? 'rgba(156, 39, 176, 0.08)' : 
                      'transparent'
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ fontSize: '1.5rem' }}>
                      {thread.avatar}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1">
                        {thread.expertName}
                      </Typography>
                    }
                    secondary={
                      <React.Fragment>
                        <Typography
                          component="span"
                          variant="body1"
                          sx={{ display: 'block', mt: 1, mb: 1 }}
                        >
                          {thread.message}
                        </Typography>
                        
                        {thread.references && thread.references.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Referenzen:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              {thread.references.map((ref, idx) => (
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
                        
                        <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                          {new Date(thread.timestamp).toLocaleTimeString()}
                        </Typography>
                      </React.Fragment>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>
        
        {debateResult.insights && debateResult.insights.length > 0 && (
          <Box mt={4}>
            <Typography variant="h6" gutterBottom>
              Wichtigste Erkenntnisse
            </Typography>
            <Grid container spacing={2} mt={1}>
              {debateResult.insights.map((insight, idx) => (
                <Grid item xs={12} md={4} key={idx}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {insight.title}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {insight.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip 
                        label={insight.expert} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                      <Typography variant="caption">
                        Konfidenz: {(insight.confidence * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Experten-Debatte
      </Typography>
      <Typography variant="body1" paragraph>
        Wählen Sie Experten aus, die zu einem bestimmten Thema diskutieren sollen. Die verschiedenen Perspektiven helfen dabei, ein umfassendes Bild zu erhalten.
      </Typography>
      
      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Sie sind offline. Die Experten-Debatte ist nur online verfügbar.
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Thema definieren</Typography>
        <TextField
          fullWidth
          label="Debattenthema"
          variant="outlined"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="z.B. Nachhaltige Energiequellen der Zukunft"
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
            onClick={handleGenerateDebate}
            startIcon={isGeneratingDebate ? <CircularProgress size={20} color="inherit" /> : <ForumIcon />}
          >
            {isGeneratingDebate ? 'Generiere Debatte...' : 'Debatte starten'}
          </Button>
          
          <Typography variant="caption" color="text.secondary">
            {selectedExperts.length} von {experts.length} Experten ausgewählt
          </Typography>
        </Box>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {isGeneratingDebate ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Generiere Experten-Debatte...
          </Typography>
        </Box>
      ) : (
        debateResult ? (
          renderDebateResult()
        ) : (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Verfügbare Experten</Typography>
              
              <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="domain-filter-label">Fachgebiet filtern</InputLabel>
                <Select
                  labelId="domain-filter-label"
                  value={domainFilter}
                  onChange={handleDomainFilterChange}
                  label="Fachgebiet filtern"
                  startAdornment={<FilterListIcon sx={{ mr: 1 }} fontSize="small" />}
                >
                  <MenuItem value="">Alle Fachgebiete</MenuItem>
                  {availableDomains.map(domain => (
                    <MenuItem key={domain} value={domain}>{domain}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            {isLoadingExperts ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {experts.length > 0 ? (
                  experts.map(expert => (
                    <Grid item xs={12} sm={6} key={expert.id}>
                      {renderExpertCard(expert)}
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      Keine Experten gefunden. Bitte versuchen Sie es mit einem anderen Filter.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        )
      )}
    </Box>
  );
};

export default ExpertDebatePanel; 