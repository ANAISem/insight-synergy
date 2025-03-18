import React, { useState } from 'react';
import { createTheme, ThemeProvider, StyledEngineProvider, CssBaseline, Tabs, Tab, Box } from '@mui/material';
import MainView from './components/MainView';
import ChatInterface from './components/ChatInterface';
import './App.css';

// Erstelle ein Standard-Theme mit verbesserter Konfiguration
const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    // StyledEngineProvider sorgt für korrekte CSS-Injektion
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        {/* CssBaseline normalisiert Browser-Styles */}
        <CssBaseline />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Hauptansicht" />
            <Tab label="Chat Interface" />
          </Tabs>
        </Box>

        {activeTab === 0 ? (
          <MainView />
        ) : (
          <Box sx={{ p: 3 }}>
            <ChatInterface />
          </Box>
        )}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
