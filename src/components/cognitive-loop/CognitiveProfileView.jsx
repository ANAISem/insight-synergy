import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  useColorModeValue
} from '@chakra-ui/react';
import { useCognitiveLoop } from '../../hooks/use-cognitive-loop';

// Mock-Daten für die Anzeige
const MOCK_ACTIVITY_HISTORY = [
  { date: '2023-06-01', interactions: 24, insights: 8 },
  { date: '2023-06-02', interactions: 31, insights: 12 },
  { date: '2023-06-03', interactions: 18, insights: 5 },
  { date: '2023-06-04', interactions: 42, insights: 17 },
  { date: '2023-06-05', interactions: 27, insights: 9 }
];

const MOCK_PATTERNS = [
  { id: 'p1', name: 'Prozessautomatisierung', strength: 0.82, frequency: 12 },
  { id: 'p2', name: 'Datenanalyse', strength: 0.76, frequency: 8 },
  { id: 'p3', name: 'Problemlösung', strength: 0.91, frequency: 15 },
  { id: 'p4', name: 'Ressourcenoptimierung', strength: 0.68, frequency: 6 },
  { id: 'p5', name: 'Systemdenken', strength: 0.88, frequency: 10 }
];

const CognitiveProfileView = ({ userId }) => {
  const [profile, setProfile] = useState({
    learningRate: 0.72,
    adaptability: 0.85,
    patternRecognition: 0.78,
    responseQuality: 0.81,
    activityHistory: MOCK_ACTIVITY_HISTORY,
    identifiedPatterns: MOCK_PATTERNS
  });
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Hole die kognitiven Loop-Funktionalitäten
  const { 
    performanceMetrics,
    getInsights
  } = useCognitiveLoop();

  useEffect(() => {
    // In einer echten Anwendung würden wir das Profil von der API abholen
    // basierend auf der userId, hier verwenden wir Mock-Daten
    if (userId) {
      // Simulierte API-Anfrage
      setTimeout(() => {
        // Nutzen der tatsächlichen Performance-Metriken aus dem kognitiven Loop
        setProfile(prev => ({
          ...prev,
          learningRate: performanceMetrics.learningProgress,
          adaptability: performanceMetrics.adaptationRate,
          patternRecognition: performanceMetrics.patternRecognitionAccuracy,
          responseQuality: performanceMetrics.optimizationEfficiency
        }));
      }, 500);
    }
  }, [userId, performanceMetrics]);

  const renderProgressStat = (label, value, helpText, change) => (
    <Stat p={4} borderWidth="1px" borderRadius="lg" borderColor={borderColor} bg={bgColor}>
      <StatLabel>{label}</StatLabel>
      <StatNumber>{(value * 100).toFixed(1)}%</StatNumber>
      <Progress value={value * 100} colorScheme="blue" size="sm" mt={2} mb={2} />
      <StatHelpText>
        <StatArrow type={change > 0 ? 'increase' : 'decrease'} />
        {Math.abs(change).toFixed(1)}% {helpText}
      </StatHelpText>
    </Stat>
  );

  const OverviewTab = () => (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
        {renderProgressStat('Lernrate', profile.learningRate, 'letzte Woche', 2.3)}
        {renderProgressStat('Anpassungsfähigkeit', profile.adaptability, 'letzte Woche', 1.5)}
        {renderProgressStat('Mustererkennung', profile.patternRecognition, 'letzte Woche', -0.8)}
        {renderProgressStat('Antwortqualität', profile.responseQuality, 'letzte Woche', 3.2)}
      </SimpleGrid>
      
      <Box p={4} borderWidth="1px" borderRadius="lg" borderColor={borderColor} bg={bgColor}>
        <Heading size="md" mb={4}>Entwicklung über Zeit</Heading>
        <Text mb={4}>Interaktionen und gewonnene Einsichten der letzten Tage</Text>
        
        <Flex direction="column" gap={2}>
          {profile.activityHistory.map((day, index) => (
            <Flex key={index} justify="space-between" align="center">
              <Text fontWeight="medium">{new Date(day.date).toLocaleDateString()}</Text>
              <Flex align="center" gap={4}>
                <Badge colorScheme="blue">{day.interactions} Interaktionen</Badge>
                <Badge colorScheme="green">{day.insights} Einsichten</Badge>
              </Flex>
            </Flex>
          ))}
        </Flex>
      </Box>
    </Box>
  );

  const PatternsTab = () => (
    <Box>
      <Box p={4} borderWidth="1px" borderRadius="lg" borderColor={borderColor} bg={bgColor} mb={6}>
        <Heading size="md" mb={4}>Erkannte Muster</Heading>
        <Text mb={4}>Die stärksten identifizierten kognitiven Muster</Text>
        
        <SimpleGrid columns={1} spacing={4}>
          {profile.identifiedPatterns.map(pattern => (
            <Box 
              key={pattern.id}
              p={4}
              borderWidth="1px"
              borderRadius="md"
              borderColor={borderColor}
            >
              <Flex justify="space-between" align="center" mb={2}>
                <Heading size="sm">{pattern.name}</Heading>
                <Badge colorScheme={pattern.strength > 0.8 ? "green" : "blue"}>
                  Stärke: {(pattern.strength * 100).toFixed(0)}%
                </Badge>
              </Flex>
              <Progress value={pattern.strength * 100} colorScheme="blue" size="sm" mb={2} />
              <Text fontSize="sm" color="gray.500">
                {pattern.frequency} Mal in Interaktionen erkannt
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
      
      <Box p={4} borderWidth="1px" borderRadius="lg" borderColor={borderColor} bg={bgColor}>
        <Heading size="md" mb={4}>Kognitive Einsichten</Heading>
        {/* In einer echten Anwendung würden wir hier die tatsächlichen Einsichten anzeigen */}
        <Text>Basierend auf Ihrem Interaktionsmuster empfehlen wir:</Text>
        <Text mt={4} fontStyle="italic">
          {getInsights('userId') || "Mehr Interaktionen erforderlich, um personalisierte Einsichten zu generieren."}
        </Text>
      </Box>
    </Box>
  );

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" bg={bgColor}>
      <Heading size="lg" mb={6}>Kognitives Profil</Heading>
      
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Übersicht</Tab>
          <Tab>Muster & Einsichten</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <OverviewTab />
          </TabPanel>
          <TabPanel>
            <PatternsTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default CognitiveProfileView; 