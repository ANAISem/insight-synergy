import React from 'react';
import { createTheme, ThemeProvider, StyledEngineProvider, CssBaseline } from '@mui/material';
import MainView from './components/MainView';
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
  return (
    // StyledEngineProvider sorgt für korrekte CSS-Injektion
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        {/* CssBaseline normalisiert Browser-Styles */}
        <CssBaseline />
        <MainView />
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
