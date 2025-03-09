import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  Text,
  Input,
  Button,
  VStack,
  HStack,
  Avatar,
  Badge,
  Divider,
  useColorModeValue,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { ArrowUpIcon, SettingsIcon } from '@chakra-ui/icons';
import { useNexus } from './NexusMultiExpertProvider';

const NexusChatInterface = () => {
  const [inputValue, setInputValue] = useState('');
  const [selectedExperts, setSelectedExperts] = useState([]);
  const messagesEndRef = useRef(null);
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBgColor = useColorModeValue('gray.100', 'gray.700');
  
  // Zugriff auf den Nexus-Kontext
  const { 
    experts, 
    activeSession, 
    messages, 
    sendMessage, 
    createSession, 
    isProcessing 
  } = useNexus();

  // Scrollen Sie zum Ende der Nachrichtenliste
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Session initialisieren, wenn noch keine existiert
  useEffect(() => {
    if (!activeSession) {
      // Standardmäßig alle Experten auswählen
      setSelectedExperts(experts.map(expert => expert.id));
      createSession(experts.map(expert => expert.id));
    }
  }, [activeSession, experts, createSession]);

  // Nachricht senden
  const handleSendMessage = () => {
    if (inputValue.trim() && activeSession) {
      sendMessage({
        role: 'user',
        content: inputValue,
        timestamp: new Date().toISOString()
      });
      setInputValue('');
    }
  };

  // Bei Enter-Taste Nachricht senden
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Experten-Auswahl umschalten
  const toggleExpertSelection = (expertId) => {
    setSelectedExperts(prev => {
      if (prev.includes(expertId)) {
        return prev.filter(id => id !== expertId);
      } else {
        return [...prev, expertId];
      }
    });
  };

  // Eine neue Session mit ausgewählten Experten erstellen
  const startNewSession = () => {
    if (selectedExperts.length > 0) {
      createSession(selectedExperts);
    }
  };

  // Expertenlist-Komponente
  const ExpertsList = () => (
    <VStack 
      align="stretch" 
      spacing={2} 
      p={3} 
      borderRight="1px" 
      borderColor={borderColor} 
      w="250px"
      h="full"
      overflowY="auto"
    >
      <Text fontWeight="bold" mb={2}>Verfügbare Experten</Text>
      <Divider />
      
      {experts.map(expert => (
        <HStack 
          key={expert.id}
          p={2}
          borderRadius="md"
          bg={selectedExperts.includes(expert.id) ? hoverBgColor : 'transparent'}
          cursor="pointer"
          onClick={() => toggleExpertSelection(expert.id)}
        >
          <Avatar 
            size="sm" 
            name={expert.name} 
            src={expert.avatar} 
          />
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" fontWeight="medium">{expert.name}</Text>
            <Text fontSize="xs" color="gray.500">{expert.expertise}</Text>
          </VStack>
          <Badge 
            ml="auto" 
            colorScheme={selectedExperts.includes(expert.id) ? "green" : "gray"}
          >
            {selectedExperts.includes(expert.id) ? "Aktiv" : "Inaktiv"}
          </Badge>
        </HStack>
      ))}
      
      <Button 
        mt={4} 
        size="sm" 
        colorScheme="blue"
        onClick={startNewSession}
        isDisabled={selectedExperts.length === 0}
      >
        Neue Session starten
      </Button>
    </VStack>
  );

  // Nachrichtenliste-Komponente
  const MessagesList = () => (
    <VStack 
      flex={1} 
      align="stretch" 
      spacing={4} 
      p={4}
      overflowY="auto"
      h="calc(100vh - 200px)"
    >
      {messages.map((message, index) => {
        const isUser = message.role === 'user';
        const expert = isUser ? null : experts.find(e => e.id === message.expertId);
        
        return (
          <Box 
            key={index} 
            alignSelf={isUser ? "flex-end" : "flex-start"}
            maxW="70%"
            bg={isUser ? "blue.100" : bgColor}
            color={isUser ? "gray.800" : "inherit"}
            p={3}
            borderRadius="lg"
            borderWidth={isUser ? 0 : 1}
            borderColor={borderColor}
            shadow="sm"
          >
            {!isUser && (
              <HStack mb={1}>
                <Avatar size="xs" name={expert?.name} src={expert?.avatar} />
                <Text fontSize="xs" fontWeight="bold">{expert?.name}</Text>
              </HStack>
            )}
            <Text>{message.content}</Text>
            <Text fontSize="xs" color="gray.500" textAlign="right" mt={1}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Box>
        );
      })}
      <div ref={messagesEndRef} />
    </VStack>
  );

  // Eingabe-Komponente
  const InputArea = () => (
    <HStack 
      p={4} 
      borderTop="1px" 
      borderColor={borderColor}
      spacing={2}
    >
      <Input
        flex={1}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Geben Sie Ihre Anfrage ein..."
        variant="filled"
        size="md"
        isDisabled={isProcessing}
      />
      <Tooltip label="Einstellungen">
        <IconButton
          icon={<SettingsIcon />}
          aria-label="Einstellungen"
          variant="ghost"
        />
      </Tooltip>
      <Button
        colorScheme="blue"
        onClick={handleSendMessage}
        isDisabled={!inputValue.trim() || isProcessing}
        rightIcon={<ArrowUpIcon />}
      >
        Senden
      </Button>
    </HStack>
  );

  return (
    <Box h="calc(100vh - 180px)" borderWidth="1px" borderRadius="lg" overflow="hidden">
      <Flex h="full">
        <ExpertsList />
        <Flex direction="column" flex={1}>
          <MessagesList />
          <InputArea />
        </Flex>
      </Flex>
    </Box>
  );
};

export default NexusChatInterface; 