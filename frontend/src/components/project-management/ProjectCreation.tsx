import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Alert,
  Container,
  SelectChangeEvent
} from '@mui/material';
import { 
  Create as CreateIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { View, ProjectData } from '../../types';

interface ProjectCreationProps {
  onNavigate: (view: View) => void;
  onProjectCreated?: (projectId: string) => void;
}

// Projekttypen
const PROJECT_TYPES = [
  { value: 'analysis', label: 'Analyse-Projekt' },
  { value: 'research', label: 'Forschungs-Projekt' },
  { value: 'documentation', label: 'Dokumentations-Projekt' },
  { value: 'other', label: 'Sonstiges' }
];

const ProjectCreation: React.FC<ProjectCreationProps> = ({ onNavigate, onProjectCreated }) => {
  // Aktiver Schritt im Stepper
  const [activeStep, setActiveStep] = useState(0);
  
  // Formularfelder
  const [projectData, setProjectData] = useState<ProjectData>({
    title: '',
    description: '',
    type: '',
    goals: '',
    team: '',
    deadline: ''
  });
  
  // Validierungsstatus
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Datei-Upload
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  
  // Formularfeld-Änderungen verarbeiten
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent) => {
    const { name, value } = e.target;
    setProjectData({
      ...projectData,
      [name as string]: value
    });
    
    // Fehler zurücksetzen, wenn Feld bearbeitet wird
    if (errors[name as string]) {
      setErrors({
        ...errors,
        [name as string]: ''
      });
    }
  };
  
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
  
  // Formular validieren
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!projectData.title.trim()) {
      newErrors.title = 'Projekttitel ist erforderlich';
    }
    
    if (!projectData.type) {
      newErrors.type = 'Projekttyp ist erforderlich';
    }
    
    if (!projectData.description.trim()) {
      newErrors.description = 'Projektbeschreibung ist erforderlich';
    } else if (projectData.description.length < 10) {
      newErrors.description = 'Beschreibung muss mindestens 10 Zeichen lang sein';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Zum nächsten Schritt gehen
  const handleNext = () => {
    if (activeStep === 0) {
      const isValid = validateForm();
      if (!isValid) return;
    }
    
    setActiveStep(prevStep => prevStep + 1);
  };
  
  // Zum vorherigen Schritt zurückkehren
  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };
  
  // Projekt erstellen
  const handleCreateProject = async () => {
    setUploadStatus('uploading');
    
    try {
      // Hier würde die API-Anfrage zum Erstellen des Projekts erfolgen
      // Beispiel:
      // const response = await api.createProject(projectData, files);
      
      // Simuliere API-Anfrage
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setUploadStatus('success');
      
      // Wenn ein Callback für die Projekterstellung vorhanden ist, rufe ihn auf
      if (onProjectCreated) {
        onProjectCreated('new-project-id');
      }
      
      // Nach kurzer Verzögerung zur Projektübersicht navigieren
      setTimeout(() => {
        onNavigate('projectOverview');
      }, 2000);
      
    } catch (error) {
      console.error('Fehler beim Erstellen des Projekts:', error);
      setUploadStatus('error');
    }
  };
  
  // Schritte für den Stepper
  const steps = ['Projektinformationen', 'Dokumente hochladen', 'Überprüfen & Erstellen'];
  
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#283593', mb: 3 }}>
          Neues Projekt erstellen
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {activeStep === 0 && (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  name="title"
                  label="Projekttitel"
                  fullWidth
                  variant="outlined"
                  value={projectData.title}
                  onChange={handleChange}
                  error={!!errors.title}
                  helperText={errors.title}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!errors.type} required>
                  <InputLabel id="project-type-label">Projekttyp</InputLabel>
                  <Select
                    labelId="project-type-label"
                    name="type"
                    value={projectData.type}
                    label="Projekttyp"
                    onChange={handleChange}
                  >
                    {PROJECT_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="deadline"
                  label="Deadline (optional)"
                  type="date"
                  fullWidth
                  variant="outlined"
                  value={projectData.deadline}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Projektbeschreibung"
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  value={projectData.description}
                  onChange={handleChange}
                  error={!!errors.description}
                  helperText={errors.description}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="goals"
                  label="Projektziele (optional)"
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  value={projectData.goals}
                  onChange={handleChange}
                  placeholder="Beschreiben Sie die Hauptziele des Projekts"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="team"
                  label="Teammitglieder (optional)"
                  fullWidth
                  variant="outlined"
                  value={projectData.team}
                  onChange={handleChange}
                  placeholder="Namen der Teammitglieder, durch Kommas getrennt"
                />
              </Grid>
            </Grid>
          </Box>
        )}
        
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Dokumente hochladen
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Laden Sie relevante Dokumente für Ihr Projekt hoch. Unterstützte Formate: PDF, DOCX, TXT, CSV, XLSX.
            </Typography>
            
            <Box sx={{ mb: 3, mt: 2 }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                sx={{ mb: 2 }}
              >
                Dateien auswählen
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={handleFileChange}
                />
              </Button>
              
              {files.length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Ausgewählte Dateien ({files.length}):
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    {files.map((file, index) => (
                      <Box key={index} sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mb: 1,
                        pb: 1,
                        borderBottom: index < files.length - 1 ? '1px solid #eee' : 'none'
                      }}>
                        <Typography variant="body2">
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </Typography>
                        <Button 
                          size="small" 
                          color="error" 
                          onClick={() => handleRemoveFile(index)}
                        >
                          Entfernen
                        </Button>
                      </Box>
                    ))}
                  </Paper>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Keine Dateien ausgewählt. Sie können auch später Dokumente hochladen.
                </Typography>
              )}
            </Box>
          </Box>
        )}
        
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Projektübersicht
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Überprüfen Sie die Projektinformationen, bevor Sie das Projekt erstellen.
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Projekttitel:
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {projectData.title}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Projekttyp:
                    </Typography>
                    <Typography variant="body1">
                      {PROJECT_TYPES.find(t => t.value === projectData.type)?.label || '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Deadline:
                    </Typography>
                    <Typography variant="body1">
                      {projectData.deadline || 'Keine Deadline festgelegt'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Beschreibung:
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {projectData.description}
                    </Typography>
                  </Grid>
                  
                  {projectData.goals && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle1" fontWeight="bold">
                        Projektziele:
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {projectData.goals}
                      </Typography>
                    </Grid>
                  )}
                  
                  {projectData.team && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle1" fontWeight="bold">
                        Teammitglieder:
                      </Typography>
                      <Typography variant="body1">
                        {projectData.team}
                      </Typography>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Dokumente:
                    </Typography>
                    {files.length > 0 ? (
                      <Typography variant="body1">
                        {files.length} Datei(en) ausgewählt
                      </Typography>
                    ) : (
                      <Typography variant="body1">
                        Keine Dokumente ausgewählt
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            {uploadStatus === 'uploading' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Projekt wird erstellt...
              </Alert>
            )}
            
            {uploadStatus === 'success' && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Projekt erfolgreich erstellt! Sie werden zur Projektübersicht weitergeleitet.
              </Alert>
            )}
            
            {uploadStatus === 'error' && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Fehler beim Erstellen des Projekts. Bitte versuchen Sie es erneut.
              </Alert>
            )}
          </Box>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={activeStep === 0 ? () => onNavigate('welcome') : handleBack}
            startIcon={<CancelIcon />}
            disabled={uploadStatus === 'uploading'}
          >
            {activeStep === 0 ? 'Abbrechen' : 'Zurück'}
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            onClick={activeStep === steps.length - 1 ? handleCreateProject : handleNext}
            endIcon={activeStep === steps.length - 1 ? <SaveIcon /> : <CreateIcon />}
            disabled={uploadStatus === 'uploading' || uploadStatus === 'success'}
          >
            {activeStep === steps.length - 1 ? 'Projekt erstellen' : 'Weiter'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProjectCreation; 