import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import { 
  Upload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  Lightbulb as LightbulbIcon,
  School as SchoolIcon,
  Psychology as PsychologyIcon,
  Science as ScienceIcon,
  Biotech as BiotechIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Add as AddIcon
} from '@mui/icons-material';

// Typen für die Wissensextraktion
interface KnowledgeEntity {
  id: string;
  name: string;
  type: 'concept' | 'fact' | 'relation' | 'definition';
  description: string;
  confidence: number;
  source: string;
  tags: string[];
}

interface KnowledgeExtractionProps {
  projectId?: string;
  apiUrl: string;
  isConnected: boolean;
}

const KnowledgeExtraction: React.FC<KnowledgeExtractionProps> = ({ projectId, apiUrl, isConnected }) => {
  // Zustand für Datei-Upload
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Zustand für extrahiertes Wissen
  const [knowledgeEntities, setKnowledgeEntities] = useState<KnowledgeEntity[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  
  // Zustand für manuelle Wissenseingabe
  const [manualEntity, setManualEntity] = useState<{
    name: string;
    type: 'concept' | 'fact' | 'relation' | 'definition';
    description: string;
    tags: string;
  }>({
    name: '',
    type: 'concept',
    description: '',
    tags: ''
  });
  
  // Datei-Upload verarbeiten
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      setFiles(prev => [...prev, ...fileList]);
    }
  };
  
  // Datei entfernen
  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  // Wissensextraktion starten
  const handleStartExtraction = async () => {
    if (files.length === 0) {
      setError('Bitte wählen Sie mindestens eine Datei aus.');
      return;
    }
    
    setIsExtracting(true);
    setError(null);
    
    try {
      // Simuliere Datei-Upload mit Fortschrittsanzeige
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Simuliere API-Anfrage mit Timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simuliere extrahiertes Wissen
      const mockKnowledgeEntities: KnowledgeEntity[] = [
        {
          id: '1',
          name: 'Künstliche Intelligenz',
          type: 'concept',
          description: 'Ein Teilgebiet der Informatik, das sich mit der Automatisierung intelligenten Verhaltens befasst.',
          confidence: 0.95,
          source: 'Dokument: KI-Grundlagen.pdf, Seite 3',
          tags: ['Informatik', 'Technologie', 'Maschinelles Lernen']
        },
        {
          id: '2',
          name: 'Deep Learning basiert auf neuronalen Netzwerken',
          type: 'fact',
          description: 'Deep Learning ist ein Teilbereich des maschinellen Lernens, der auf künstlichen neuronalen Netzwerken mit mehreren Schichten basiert.',
          confidence: 0.89,
          source: 'Dokument: KI-Grundlagen.pdf, Seite 7',
          tags: ['Deep Learning', 'Neuronale Netze', 'Maschinelles Lernen']
        },
        {
          id: '3',
          name: 'Überwachtes Lernen vs. Unüberwachtes Lernen',
          type: 'relation',
          description: 'Beim überwachten Lernen werden Modelle mit gelabelten Daten trainiert, während beim unüberwachten Lernen keine Labels verwendet werden.',
          confidence: 0.82,
          source: 'Dokument: KI-Grundlagen.pdf, Seite 12',
          tags: ['Maschinelles Lernen', 'Algorithmen', 'Datenanalyse']
        },
        {
          id: '4',
          name: 'Turing-Test',
          type: 'definition',
          description: 'Ein Test, bei dem ein menschlicher Fragesteller mit zwei Parteien kommuniziert, ohne zu wissen, welche davon ein Computer und welche ein Mensch ist. Wenn der Fragesteller nicht zuverlässig unterscheiden kann, welche Partei der Computer ist, hat der Computer den Test bestanden.',
          confidence: 0.91,
          source: 'Dokument: KI-Geschichte.pdf, Seite 5',
          tags: ['KI-Geschichte', 'Alan Turing', 'Test']
        }
      ];
      
      setKnowledgeEntities(mockKnowledgeEntities);
      
    } catch (err) {
      console.error('Fehler bei der Wissensextraktion:', err);
      setError('Bei der Wissensextraktion ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsExtracting(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Wissen löschen
  const handleDeleteEntity = (entityId: string) => {
    setKnowledgeEntities(knowledgeEntities.filter(entity => entity.id !== entityId));
  };
  
  // Änderungen an manueller Wissenseingabe verarbeiten
  const handleManualEntityChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setManualEntity({
      ...manualEntity,
      [name as string]: value
    });
  };
  
  // Manuelles Wissen hinzufügen
  const handleAddManualEntity = () => {
    if (!manualEntity.name || !manualEntity.description) {
      setError('Bitte geben Sie einen Namen und eine Beschreibung ein.');
      return;
    }
    
    const newEntity: KnowledgeEntity = {
      id: Date.now().toString(),
      name: manualEntity.name,
      type: manualEntity.type,
      description: manualEntity.description,
      confidence: 1.0, // Manuell hinzugefügte Entitäten haben 100% Konfidenz
      source: 'Manuell hinzugefügt',
      tags: manualEntity.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
    };
    
    setKnowledgeEntities([...knowledgeEntities, newEntity]);
    
    // Formular zurücksetzen
    setManualEntity({
      name: '',
      type: 'concept',
      description: '',
      tags: ''
    });
  };
  
  // Text in die Zwischenablage kopieren
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Hier könnte eine Benachrichtigung angezeigt werden
  };
  
  // Icon basierend auf Entitätstyp
  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'concept':
        return <SchoolIcon />;
      case 'fact':
        return <ScienceIcon />;
      case 'relation':
        return <PsychologyIcon />;
      case 'definition':
        return <BiotechIcon />;
      default:
        return <LightbulbIcon />;
    }
  };
  
  // Label basierend auf Entitätstyp
  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'concept':
        return 'Konzept';
      case 'fact':
        return 'Fakt';
      case 'relation':
        return 'Beziehung';
      case 'definition':
        return 'Definition';
      default:
        return type;
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#283593', mb: 3 }}>
        Wissensextraktion
      </Typography>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={5}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Dokumente hochladen
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Laden Sie Dokumente hoch, um automatisch Wissen zu extrahieren. Unterstützte Formate: PDF, DOCX, TXT.
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadIcon />}
                sx={{ mb: 2 }}
                disabled={isExtracting}
              >
                Dateien auswählen
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt"
                />
              </Button>
              
              {files.length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Ausgewählte Dateien ({files.length}):
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                    {files.map((file, index) => (
                      <Box key={index} sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mb: 1,
                        pb: 1,
                        borderBottom: index < files.length - 1 ? '1px solid #eee' : 'none'
                      }}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: '80%' }}>
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </Typography>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleRemoveFile(index)}
                          disabled={isExtracting}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Paper>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Keine Dateien ausgewählt.
                </Typography>
              )}
            </Box>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleStartExtraction}
              disabled={files.length === 0 || isExtracting || !isConnected}
              fullWidth
              sx={{ mt: 2 }}
            >
              {isExtracting ? 'Extrahiere Wissen...' : 'Wissensextraktion starten'}
            </Button>
            
            {isExtracting && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  {isUploading ? 'Lade Dateien hoch...' : 'Extrahiere Wissen...'}
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ mb: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Dieser Vorgang kann einige Minuten dauern, abhängig von der Größe und Anzahl der Dokumente.
                </Typography>
              </Box>
            )}
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Wissen manuell hinzufügen
            </Typography>
            
            <TextField
              fullWidth
              label="Name/Titel"
              name="name"
              value={manualEntity.name}
              onChange={handleManualEntityChange}
              margin="normal"
              variant="outlined"
            />
            
            <TextField
              select
              fullWidth
              label="Typ"
              name="type"
              value={manualEntity.type}
              onChange={handleManualEntityChange}
              margin="normal"
              variant="outlined"
              SelectProps={{
                native: true
              }}
            >
              <option value="concept">Konzept</option>
              <option value="fact">Fakt</option>
              <option value="relation">Beziehung</option>
              <option value="definition">Definition</option>
            </TextField>
            
            <TextField
              fullWidth
              label="Beschreibung"
              name="description"
              value={manualEntity.description}
              onChange={handleManualEntityChange}
              margin="normal"
              variant="outlined"
              multiline
              rows={3}
            />
            
            <TextField
              fullWidth
              label="Tags (durch Kommas getrennt)"
              name="tags"
              value={manualEntity.tags}
              onChange={handleManualEntityChange}
              margin="normal"
              variant="outlined"
              placeholder="z.B. KI, Technologie, Forschung"
            />
            
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddManualEntity}
              sx={{ mt: 2 }}
              fullWidth
            >
              Wissen hinzufügen
            </Button>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={7}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Extrahiertes Wissen
              </Typography>
              
              {knowledgeEntities.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SaveIcon />}
                >
                  Speichern
                </Button>
              )}
            </Box>
            
            {knowledgeEntities.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <LightbulbIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Noch kein Wissen extrahiert. Laden Sie Dokumente hoch oder fügen Sie Wissen manuell hinzu.
                </Typography>
              </Box>
            ) : (
              <List sx={{ width: '100%' }}>
                {knowledgeEntities.map((entity) => (
                  <Accordion key={entity.id} sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <ListItemIcon>
                          {getEntityIcon(entity.type)}
                        </ListItemIcon>
                        <ListItemText 
                          primary={entity.name} 
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <Chip 
                                label={getEntityTypeLabel(entity.type)} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                                sx={{ mr: 1 }}
                              />
                              {entity.confidence < 1 && (
                                <Chip 
                                  label={`${Math.round(entity.confidence * 100)}% Konfidenz`} 
                                  size="small" 
                                  color={entity.confidence > 0.8 ? 'success' : 'default'}
                                />
                              )}
                            </Box>
                          }
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body1" paragraph>
                        {entity.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                        {entity.tags.map((tag, index) => (
                          <Chip key={index} label={tag} size="small" />
                        ))}
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Quelle: {entity.source}
                        </Typography>
                        
                        <Box>
                          <Tooltip title="In Zwischenablage kopieren">
                            <IconButton size="small" onClick={() => copyToClipboard(entity.description)}>
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Löschen">
                            <IconButton size="small" color="error" onClick={() => handleDeleteEntity(entity.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default KnowledgeExtraction; 