import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Container,
  Divider
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Psychology as PsychologyIcon,
  Lightbulb as LightbulbIcon,
  Forum as ForumIcon
} from '@mui/icons-material';
import { View } from '../../types';

interface WelcomePageProps {
  onNavigate: (view: View) => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onNavigate }) => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            borderRadius: 2,
            background: 'linear-gradient(145deg, #f0f4ff 0%, #e6f0ff 100%)',
            mb: 4
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>
            Willkommen bei Insight Synergy
          </Typography>
          <Typography variant="h5" sx={{ mb: 2, color: '#3949ab' }}>
            Ihre Plattform für intelligente Projektanalyse und Wissensmanagement
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Insight Synergy hilft Ihnen, Projekte zu analysieren, Wissen zu extrahieren und 
            Erkenntnisse zu gewinnen. Nutzen Sie unsere KI-gestützten Tools, um Ihre Projekte 
            effizienter zu gestalten und bessere Entscheidungen zu treffen.
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Button 
              variant="contained" 
              size="large" 
              color="primary"
              onClick={() => onNavigate('projectCreation')}
              sx={{ mr: 2 }}
            >
              Neues Projekt erstellen
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              onClick={() => onNavigate('projectOverview')}
            >
              Projekte anzeigen
            </Button>
          </Box>
        </Paper>

        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3, color: '#283593' }}>
          Hauptfunktionen
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DashboardIcon sx={{ fontSize: 40, color: '#3f51b5', mr: 2 }} />
                  <Typography variant="h5" component="h3">
                    Projektmanagement
                  </Typography>
                </Box>
                <Typography variant="body1">
                  Erstellen und verwalten Sie Ihre Projekte. Laden Sie Dokumente hoch, 
                  definieren Sie Projektziele und verfolgen Sie den Fortschritt.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => onNavigate('projectOverview')}>
                  Zu meinen Projekten
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AssessmentIcon sx={{ fontSize: 40, color: '#3f51b5', mr: 2 }} />
                  <Typography variant="h5" component="h3">
                    Analyse & Auswertung
                  </Typography>
                </Box>
                <Typography variant="body1">
                  Nutzen Sie KI-gestützte Analysetools, um Ihre Projektdaten auszuwerten 
                  und wertvolle Erkenntnisse zu gewinnen.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => onNavigate('analysis')}>
                  Zur Textanalyse
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PsychologyIcon sx={{ fontSize: 40, color: '#3f51b5', mr: 2 }} />
                  <Typography variant="h5" component="h3">
                    KI-Assistenz
                  </Typography>
                </Box>
                <Typography variant="body1">
                  Lassen Sie sich von unserer KI bei der Analyse und Interpretation 
                  Ihrer Daten unterstützen. Stellen Sie Fragen und erhalten Sie intelligente Antworten.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" disabled>
                  Demnächst verfügbar
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ForumIcon sx={{ fontSize: 40, color: '#3f51b5', mr: 2 }} />
                  <Typography variant="h5" component="h3">
                    Live-Experten-Debatte
                  </Typography>
                </Box>
                <Typography variant="body1">
                  Erleben Sie dynamische Diskussionen zwischen KI-Experten in Echtzeit. 
                  Stellen Sie Fragen, erhalten Sie verschiedene Perspektiven und gewinnen Sie tiefere Einsichten.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => onNavigate('live-expert-debate')}>
                  Zur Live-Debatte
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LightbulbIcon sx={{ fontSize: 40, color: '#3f51b5', mr: 2 }} />
                  <Typography variant="h5" component="h3">
                    Wissensextraktion
                  </Typography>
                </Box>
                <Typography variant="body1">
                  Extrahieren Sie automatisch Wissen aus Ihren Dokumenten und 
                  bauen Sie eine strukturierte Wissensbasis auf.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => onNavigate('knowledge-extraction')}>
                  Zur Wissensextraktion
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 6, mb: 2 }}>
          <Divider />
          <Typography variant="body2" color="text.secondary" align="center" sx={{ pt: 2 }}>
            © {new Date().getFullYear()} Insight Synergy - Alle Rechte vorbehalten
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default WelcomePage; 