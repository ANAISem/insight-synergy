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
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Divider,
  Container,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  MoreVert as MoreVertIcon,
  Folder as FolderIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { View, Project } from '../../types';

// Beispiel-Projektdaten
interface ProjectOverviewProps {
  onNavigate: (view: View) => void;
  onSelectProject?: (projectId: string) => void;
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ onNavigate, onSelectProject }) => {
  // Status für Projekte
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Status für Filterung und Sortierung
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('lastModified');
  
  // Status für Projekt-Aktionen
  const [actionAnchorEl, setActionAnchorEl] = useState<{[key: string]: HTMLElement | null}>({});
  
  // Lade Projekte beim ersten Rendern
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        // Hier würde die API-Anfrage erfolgen
        // const response = await api.getProjects();
        // setProjects(response.data);
        
        // Simuliere API-Anfrage mit Beispieldaten
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockProjects: Project[] = [
          {
            id: '1',
            title: 'Marktanalyse Elektromobilität',
            description: 'Umfassende Analyse des Marktes für Elektrofahrzeuge in Deutschland und Europa.',
            type: 'analysis',
            createdAt: '2023-11-15T10:30:00Z',
            lastModified: '2023-11-20T14:45:00Z',
            documentsCount: 5,
            status: 'active'
          },
          {
            id: '2',
            title: 'Forschungsprojekt Quantencomputing',
            description: 'Untersuchung aktueller Entwicklungen im Bereich Quantencomputing und deren Anwendungsmöglichkeiten.',
            type: 'research',
            createdAt: '2023-10-05T09:15:00Z',
            lastModified: '2023-11-18T11:20:00Z',
            documentsCount: 8,
            status: 'active'
          },
          {
            id: '3',
            title: 'Dokumentation KI-Ethik',
            description: 'Dokumentation ethischer Richtlinien und Best Practices für den Einsatz von KI in Unternehmen.',
            type: 'documentation',
            createdAt: '2023-09-20T13:45:00Z',
            lastModified: '2023-10-30T16:10:00Z',
            documentsCount: 3,
            status: 'completed'
          },
          {
            id: '4',
            title: 'Nachhaltigkeitsstudie Lieferketten',
            description: 'Analyse der Nachhaltigkeit in globalen Lieferketten und Entwicklung von Optimierungsstrategien.',
            type: 'analysis',
            createdAt: '2023-08-12T11:00:00Z',
            lastModified: '2023-09-25T09:30:00Z',
            documentsCount: 6,
            status: 'archived'
          }
        ];
        
        setProjects(mockProjects);
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der Projekte:', err);
        setError('Die Projekte konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);
  
  // Filter-Menü öffnen/schließen
  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };
  
  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };
  
  // Sortier-Menü öffnen/schließen
  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };
  
  const handleSortClose = () => {
    setSortAnchorEl(null);
  };
  
  // Aktions-Menü für ein Projekt öffnen/schließen
  const handleActionClick = (event: React.MouseEvent<HTMLElement>, projectId: string) => {
    setActionAnchorEl({
      ...actionAnchorEl,
      [projectId]: event.currentTarget
    });
  };
  
  const handleActionClose = (projectId: string) => {
    setActionAnchorEl({
      ...actionAnchorEl,
      [projectId]: null
    });
  };
  
  // Filter anwenden
  const applyFilter = (filter: string | null) => {
    setActiveFilter(filter);
    handleFilterClose();
  };
  
  // Sortierung anwenden
  const applySort = (sort: string) => {
    setSortBy(sort);
    handleSortClose();
  };
  
  // Projekt auswählen
  const handleSelectProject = (projectId: string) => {
    if (onSelectProject) {
      onSelectProject(projectId);
    }
  };
  
  // Projekt löschen
  const handleDeleteProject = (projectId: string) => {
    // Hier würde die API-Anfrage erfolgen
    // await api.deleteProject(projectId);
    
    // Aktualisiere die Projektliste
    setProjects(projects.filter(project => project.id !== projectId));
    handleActionClose(projectId);
  };
  
  // Gefilterte und sortierte Projekte
  const filteredProjects = projects
    .filter(project => {
      // Textsuche
      const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           project.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Statusfilter
      const matchesFilter = activeFilter === null || project.status === activeFilter;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      // Sortierung
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'lastModified':
        default:
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });
  
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
  
  // Projekttyp-Label
  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'analysis':
        return 'Analyse-Projekt';
      case 'research':
        return 'Forschungs-Projekt';
      case 'documentation':
        return 'Dokumentations-Projekt';
      default:
        return 'Sonstiges';
    }
  };
  
  // Status-Chip-Farbe
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'primary';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };
  
  // Status-Label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'completed':
        return 'Abgeschlossen';
      case 'archived':
        return 'Archiviert';
      default:
        return status;
    }
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ color: '#283593' }}>
            Meine Projekte
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => onNavigate('projectCreation')}
          >
            Neues Projekt
          </Button>
        </Box>
        
        <Paper sx={{ p: 2, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              placeholder="Projekte durchsuchen..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={handleFilterClick}
              size="small"
              color={activeFilter ? "primary" : "inherit"}
            >
              Filter
            </Button>
            <Menu
              anchorEl={filterAnchorEl}
              open={Boolean(filterAnchorEl)}
              onClose={handleFilterClose}
            >
              <MenuItem onClick={() => applyFilter(null)} selected={activeFilter === null}>
                Alle Projekte
              </MenuItem>
              <MenuItem onClick={() => applyFilter('active')} selected={activeFilter === 'active'}>
                Aktive Projekte
              </MenuItem>
              <MenuItem onClick={() => applyFilter('completed')} selected={activeFilter === 'completed'}>
                Abgeschlossene Projekte
              </MenuItem>
              <MenuItem onClick={() => applyFilter('archived')} selected={activeFilter === 'archived'}>
                Archivierte Projekte
              </MenuItem>
            </Menu>
            
            <Button
              variant="outlined"
              startIcon={<SortIcon />}
              onClick={handleSortClick}
              size="small"
            >
              Sortieren
            </Button>
            <Menu
              anchorEl={sortAnchorEl}
              open={Boolean(sortAnchorEl)}
              onClose={handleSortClose}
            >
              <MenuItem onClick={() => applySort('lastModified')} selected={sortBy === 'lastModified'}>
                Zuletzt bearbeitet
              </MenuItem>
              <MenuItem onClick={() => applySort('createdAt')} selected={sortBy === 'createdAt'}>
                Erstellungsdatum
              </MenuItem>
              <MenuItem onClick={() => applySort('title')} selected={sortBy === 'title'}>
                Alphabetisch
              </MenuItem>
            </Menu>
          </Box>
        </Paper>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : filteredProjects.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            {searchTerm || activeFilter ? (
              <>
                <Typography variant="h6" gutterBottom>
                  Keine Projekte gefunden
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Keine Projekte entsprechen den aktuellen Filterkriterien.
                </Typography>
                <Button 
                  sx={{ mt: 2 }} 
                  onClick={() => {
                    setSearchTerm('');
                    setActiveFilter(null);
                  }}
                >
                  Filter zurücksetzen
                </Button>
              </>
            ) : (
              <>
                <FolderIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Keine Projekte vorhanden
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Sie haben noch keine Projekte erstellt.
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={() => onNavigate('projectCreation')}
                >
                  Erstes Projekt erstellen
                </Button>
              </>
            )}
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredProjects.map((project) => (
              <Grid item xs={12} md={6} lg={4} key={project.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { 
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="h6" component="h2" gutterBottom noWrap sx={{ maxWidth: '80%' }}>
                        {project.title}
                      </Typography>
                      
                      <IconButton 
                        size="small"
                        onClick={(e) => handleActionClick(e, project.id)}
                        aria-label="Projektaktionen"
                      >
                        <MoreVertIcon />
                      </IconButton>
                      <Menu
                        anchorEl={actionAnchorEl[project.id]}
                        open={Boolean(actionAnchorEl[project.id])}
                        onClose={() => handleActionClose(project.id)}
                      >
                        <MenuItem onClick={() => handleSelectProject(project.id)}>
                          <EditIcon fontSize="small" sx={{ mr: 1 }} />
                          Bearbeiten
                        </MenuItem>
                        <MenuItem onClick={() => handleDeleteProject(project.id)}>
                          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                          Löschen
                        </MenuItem>
                      </Menu>
                    </Box>
                    
                    <Box sx={{ display: 'flex', mb: 1, gap: 1 }}>
                      <Chip 
                        label={getProjectTypeLabel(project.type)} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                      <Chip 
                        label={getStatusLabel(project.status)} 
                        size="small" 
                        color={getStatusColor(project.status) as any}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      mb: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {project.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <DescriptionIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {project.documentsCount} Dokument{project.documentsCount !== 1 ? 'e' : ''}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Typography variant="caption" color="text.secondary" display="block">
                      Erstellt am: {formatDate(project.createdAt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Zuletzt bearbeitet: {formatDate(project.lastModified)}
                    </Typography>
                  </CardContent>
                  
                  <CardActions>
                    <Button 
                      size="small" 
                      onClick={() => handleSelectProject(project.id)}
                      sx={{ ml: 'auto' }}
                    >
                      Öffnen
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default ProjectOverview; 