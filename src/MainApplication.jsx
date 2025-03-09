import React, { useState } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  TabList, 
  TabPanel, 
  TabPanels, 
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  useColorModeValue
} from '@chakra-ui/react';

// Importiere alle vorhandenen Komponenten
import { NexusMultiExpertProvider, useNexus } from './components/nexus/NexusMultiExpertProvider';
import NexusChatInterface from './components/nexus/NexusChatInterface';
import CognitiveAnalyticsDashboard from './components/cognitive-loop/CognitiveAnalyticsDashboard';
import CognitiveProfileView from './components/cognitive-loop/CognitiveProfileView';
import SolutionGenerator from './components/insight-core/SolutionGenerator';
import { SystemDashboard } from './components/system-dashboard/SystemDashboard';

// Importiere den kognitiven Loop-Hook
import { useCognitiveLoop } from './hooks/use-cognitive-loop';

const MainApplication = () => {
  const [userId] = useState('current-user'); // In einer echten App würde dies aus der Authentifizierung kommen
  const [activeTab, setActiveTab] = useState(0);
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Kognitive Loop-Funktionalitäten
  const {
    analyzePatterns,
    optimizeResponse,
    getInsights,
    recordUserFeedback,
    performanceMetrics
  } = useCognitiveLoop();

  // Handler für Tabs
  const handleTabChange = (index) => {
    setActiveTab(index);
  };

  return (
    <Box p={4}>
      <Heading mb={6}>Insight Synergy</Heading>
      
      <Tabs variant="enclosed" colorScheme="blue" onChange={handleTabChange} index={activeTab}>
        <TabList>
          <Tab>Dashboard</Tab>
          <Tab>Experten-Kollaboration</Tab>
          <Tab>Kognitive Analyse</Tab>
          <Tab>Muster-Erkennung</Tab>
          <Tab>Lösungsgenerator</Tab>
          <Tab>System-Status</Tab>
        </TabList>
        
        <TabPanels>
          {/* Dashboard Tab - Überblick über alle Funktionen */}
          <TabPanel>
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" bg={bgColor}>
                <Heading size="md" mb={4}>Kognitive Leistung</Heading>
                <Text mb={2}>Adaptionsrate: {(performanceMetrics.adaptationRate * 100).toFixed(1)}%</Text>
                <Text mb={2}>Mustererkennung: {(performanceMetrics.patternRecognitionAccuracy * 100).toFixed(1)}%</Text>
                <Text mb={2}>Optimierungseffizienz: {(performanceMetrics.optimizationEfficiency * 100).toFixed(1)}%</Text>
                <Button mt={4} colorScheme="blue" onClick={() => setActiveTab(2)}>Details anzeigen</Button>
              </Box>
              
              <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" bg={bgColor}>
                <Heading size="md" mb={4}>Experten-Team</Heading>
                <Text mb={4}>Kollaboriere mit verschiedenen Experten, um komplexe Probleme zu lösen.</Text>
                <Button colorScheme="blue" onClick={() => setActiveTab(1)}>Zum Chat</Button>
              </Box>
              
              <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" bg={bgColor}>
                <Heading size="md" mb={4}>Pattern Engine</Heading>
                <Text mb={4}>Identifiziere komplexe Muster und Beziehungen in deinen Daten.</Text>
                <Button colorScheme="blue" onClick={() => setActiveTab(3)}>Muster analysieren</Button>
              </Box>
              
              <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" bg={bgColor}>
                <Heading size="md" mb={4}>Lösungsgenerator</Heading>
                <Text mb={4}>Erzeuge optimierte Lösungen basierend auf kognitiven Analysen.</Text>
                <Button colorScheme="blue" onClick={() => setActiveTab(4)}>Lösungen generieren</Button>
              </Box>
            </Grid>
          </TabPanel>
          
          {/* Experten-Kollaboration Tab */}
          <TabPanel>
            <NexusMultiExpertProvider>
              <NexusChatInterface />
            </NexusMultiExpertProvider>
          </TabPanel>
          
          {/* Kognitive Analyse Tab */}
          <TabPanel>
            <Flex direction="column" gap={8}>
              <CognitiveAnalyticsDashboard userId={userId} />
              <CognitiveProfileView userId={userId} />
            </Flex>
          </TabPanel>
          
          {/* Muster-Erkennung Tab */}
          <TabPanel>
            <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" bg={bgColor}>
              <Heading size="md" mb={4}>Muster-Analyse</Heading>
              
              <textarea
                placeholder="Geben Sie Text zur Analyse ein..."
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid', 
                  borderColor: borderColor,
                  minHeight: '150px'
                }}
                onChange={(e) => {
                  if (e.target.value.length > 10) {
                    const patterns = analyzePatterns(e.target.value);
                    console.log('Gefundene Muster:', patterns);
                    // Hier könnten wir die Muster visualisieren
                  }
                }}
              />
              
              <Button mt={4} colorScheme="blue">Muster analysieren</Button>
              
              <Box mt={6}>
                <Heading size="sm" mb={2}>Vorhandene Muster</Heading>
                <Text color="gray.500">Geben Sie Text ein, um Muster zu erkennen.</Text>
              </Box>
            </Box>
          </TabPanel>
          
          {/* Lösungsgenerator Tab */}
          <TabPanel>
            <SolutionGenerator 
              onSolutionGenerated={(solution) => {
                // Hier könnte die Lösung mit dem kognitiven System optimiert werden
                const optimizedSolution = optimizeResponse(JSON.stringify(solution));
                console.log('Optimierte Lösung:', optimizedSolution);
              }} 
            />
          </TabPanel>
          
          {/* System-Status Tab */}
          <TabPanel>
            <SystemDashboard />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default MainApplication; 