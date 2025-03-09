import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, Button, Grid, Stack } from '@mui/material';
import { useCognitiveState, PatternResult } from '../hooks/useCognitiveState';

type Pattern = {
  id: string;
  type: string;
  description: string;
  confidence: number;
};

const MainView: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [patternText, setPatternText] = useState('');
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [queryText, setQueryText] = useState('');
  const [contextText, setContextText] = useState('');
  const [solution, setSolution] = useState('');

  const { 
    performanceMetrics,
    analyzePatterns,
    optimizeResponse
  } = useCognitiveState();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handlePatternAnalysis = () => {
    if (patternText.length >= 10) {
      const detectedPatterns: PatternResult[] = analyzePatterns(patternText);
      setPatterns(detectedPatterns.map((p) => ({
        id: p.id,
        type: p.name,
        description: p.description,
        confidence: p.confidence * 100
      })));
    }
  };

  const handleSolutionGeneration = () => {
    if (queryText.length >= 5) {
      const generatedSolution = optimizeResponse(queryText, contextText);
      setSolution(generatedSolution);
    }
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Insight Synergy</Typography>
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tab label="Dashboard" />
        <Tab label="Experten-Kollaboration" />
        <Tab label="Kognitive Analyse" />
        <Tab label="Muster-Erkennung" />
        <Tab label="Lösungsgenerator" />
        <Tab label="System-Status" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={2}>
          <Box p={2}>
            <Typography variant="h6">Kognitive Leistung</Typography>
            <Text>Adaptionsrate: {(performanceMetrics.adaptationRate * 100).toFixed(1)}%</Text>
            <Text>Mustererkennung: {(performanceMetrics.patternRecognitionAccuracy * 100).toFixed(1)}%</Text>
            <Text>Optimierungseffizienz: {(performanceMetrics.optimizationEfficiency * 100).toFixed(1)}%</Text>
            <Button variant="contained" onClick={() => setActiveTab(2)}>Details anzeigen</Button>
          </Box>
        </Grid>
      )}

      {/* Weitere Tabs entsprechend anpassen */}

    </Box>
  );
};

export default MainView; 