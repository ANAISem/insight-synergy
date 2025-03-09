import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Rating,
  Tooltip,
  Stack
} from '@mui/material';
import {
  Person as PersonIcon,
  Psychology as BrainIcon,
  FactCheck as FactCheckIcon,
  School as SchoolIcon,
  Timeline as TimelineIcon,
  Star as StarIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface Expert {
  id: string;
  name: string;
  field: string;
  background: string;
  perspective: string;
  avatar?: string;
  color?: string;
  expertise: number;
  reliability: number;
  publications?: string[];
  citations?: number;
  validatedCredentials: boolean;
}

interface ExpertValidationPanelProps {
  onExpertsValidated: (experts: Expert[]) => void;
  initialExperts?: Expert[];
  topic?: string;
}

export function ExpertValidationPanel({
  onExpertsValidated,
  initialExperts = [],
  topic = ''
}: ExpertValidationPanelProps) {
  const [experts, setExperts] = useState<Expert[]>(initialExperts);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedExperts, setSelectedExperts] = useState<Expert[]>([]);
  const [showAddExpertDialog, setShowAddExpertDialog] = useState(false);
  const [newExpert, setNewExpert] = useState<Partial<Expert>>({});
  
  // Validiere Experten beim ersten Laden
  useEffect(() => {
    if (initialExperts.length > 0) {
      validateExperts(initialExperts);
    }
  }, []);
  
  const validateExperts = async (expertsToValidate: Expert[]) => {
    setIsValidating(true);
    setValidationProgress(0);
    setError(null);
    
    try {
      const validatedExperts: Expert[] = [];
      
      for (let i = 0; i < expertsToValidate.length; i++) {
        const expert = expertsToValidate[i];
        
        // Simuliere API-Aufrufe für die Validierung
        // In der echten Implementierung würden hier die tatsächlichen API-Calls stehen
        const validationResult = await validateExpertCredentials(expert);
        
        validatedExperts.push({
          ...expert,
          ...validationResult
        });
        
        setValidationProgress(((i + 1) / expertsToValidate.length) * 100);
      }
      
      setExperts(validatedExperts);
      
    } catch (err) {
      console.error('Fehler bei der Expertenvalidierung:', err);
      setError('Die Expertenvalidierung konnte nicht abgeschlossen werden.');
    } finally {
      setIsValidating(false);
    }
  };
  
  const validateExpertCredentials = async (expert: Expert) => {
    // Simulierte Validierung - würde durch echte API-Calls ersetzt
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      expertise: Math.random() * 2 + 3, // 3-5
      reliability: Math.random() * 0.4 + 0.6, // 0.6-1.0
      validatedCredentials: true,
      publications: [
        'Beispielpublikation 1',
        'Beispielpublikation 2'
      ],
      citations: Math.floor(Math.random() * 1000)
    };
  };
  
  const handleExpertSelection = (expert: Expert) => {
    setSelectedExperts(prev => {
      const isSelected = prev.some(e => e.id === expert.id);
      if (isSelected) {
        return prev.filter(e => e.id !== expert.id);
      } else {
        return [...prev, expert];
      }
    });
  };
  
  const handleAddExpert = () => {
    if (!newExpert.name || !newExpert.field) return;
    
    const expert: Expert = {
      id: `expert-${Date.now()}`,
      name: newExpert.name,
      field: newExpert.field,
      background: newExpert.background || '',
      perspective: newExpert.perspective || '',
      expertise: 0,
      reliability: 0,
      validatedCredentials: false
    };
    
    setExperts(prev => [...prev, expert]);
    validateExperts([expert]);
    setShowAddExpertDialog(false);
    setNewExpert({});
  };
  
  const handleConfirmSelection = () => {
    if (selectedExperts.length === 0) {
      setError('Bitte wählen Sie mindestens einen Experten aus.');
      return;
    }
    
    onExpertsValidated(selectedExperts);
  };
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Expertenvalidierung
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {isValidating && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Validiere Expertenqualifikationen...
          </Typography>
          <LinearProgress variant="determinate" value={validationProgress} />
        </Box>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Verfügbare Experten
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={() => setShowAddExpertDialog(true)}
              >
                Experte hinzufügen
              </Button>
            </Box>
            
            <List>
              {experts.map((expert) => (
                <React.Fragment key={expert.id}>
                  <ListItem
                    secondaryAction={
                      <Button
                        variant={selectedExperts.some(e => e.id === expert.id) ? "contained" : "outlined"}
                        onClick={() => handleExpertSelection(expert)}
                      >
                        {selectedExperts.some(e => e.id === expert.id) ? 'Ausgewählt' : 'Auswählen'}
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={expert.avatar}
                        sx={{ bgcolor: expert.color || 'primary.main' }}
                      >
                        {expert.name.substring(0, 2).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {expert.name}
                          {expert.validatedCredentials && (
                            <Tooltip title="Verifizierte Qualifikationen">
                              <FactCheckIcon color="success" fontSize="small" />
                            </Tooltip>
                          )}
                        </Box>
                      }
                      secondary={
                        <Stack spacing={1}>
                          <Typography variant="body2" color="text.secondary">
                            {expert.field}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Tooltip title="Expertise">
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <SchoolIcon fontSize="small" sx={{ mr: 0.5 }} />
                                <Rating 
                                  value={expert.expertise} 
                                  readOnly 
                                  precision={0.5}
                                  size="small"
                                />
                              </Box>
                            </Tooltip>
                            <Tooltip title="Zuverlässigkeit">
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <TimelineIcon fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="body2">
                                  {Math.round(expert.reliability * 100)}%
                                </Typography>
                              </Box>
                            </Tooltip>
                            {expert.citations && (
                              <Tooltip title="Zitierungen">
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <StarIcon fontSize="small" sx={{ mr: 0.5 }} />
                                  <Typography variant="body2">
                                    {expert.citations}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            )}
                          </Box>
                        </Stack>
                      }
                    />
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Ausgewählte Experten
            </Typography>
            
            {selectedExperts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Noch keine Experten ausgewählt
              </Typography>
            ) : (
              <>
                <List dense>
                  {selectedExperts.map((expert) => (
                    <ListItem
                      key={expert.id}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleExpertSelection(expert)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={expert.avatar}
                          sx={{ bgcolor: expert.color || 'primary.main' }}
                        >
                          {expert.name.substring(0, 2).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={expert.name}
                        secondary={expert.field}
                      />
                    </ListItem>
                  ))}
                </List>
                
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleConfirmSelection}
                    startIcon={<BrainIcon />}
                  >
                    Diskussion starten
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Dialog zum Hinzufügen eines neuen Experten */}
      <Dialog 
        open={showAddExpertDialog} 
        onClose={() => setShowAddExpertDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Neuen Experten hinzufügen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              value={newExpert.name || ''}
              onChange={(e) => setNewExpert(prev => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              label="Fachgebiet"
              fullWidth
              value={newExpert.field || ''}
              onChange={(e) => setNewExpert(prev => ({ ...prev, field: e.target.value }))}
            />
            <TextField
              label="Hintergrund"
              fullWidth
              multiline
              rows={2}
              value={newExpert.background || ''}
              onChange={(e) => setNewExpert(prev => ({ ...prev, background: e.target.value }))}
            />
            <TextField
              label="Perspektive"
              fullWidth
              multiline
              rows={2}
              value={newExpert.perspective || ''}
              onChange={(e) => setNewExpert(prev => ({ ...prev, perspective: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddExpertDialog(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleAddExpert}
            variant="contained"
            disabled={!newExpert.name || !newExpert.field}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 