import { useState, useEffect, useCallback, useRef } from 'react';

interface WebSocketMessage {
  data: string;
  type: string;
  timestamp: number;
}

interface UseWebSocketReturn {
  connected: boolean;
  connecting: boolean;
  lastMessage: WebSocketMessage | null;
  error: Error | null;
  connect: (url: string) => void;
  disconnect: () => void;
  send: (data: string) => void;
  clearLastMessage: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // 2 seconds
  
  const connect = useCallback((url: string) => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    try {
      setConnecting(true);
      setError(null);
      
      const socket = new WebSocket(url);
      
      socket.onopen = () => {
        setConnected(true);
        setConnecting(false);
        reconnectAttemptsRef.current = 0;
        console.log('WebSocket connection established');
      };
      
      socket.onmessage = (event) => {
        const message: WebSocketMessage = {
          data: event.data,
          type: typeof event.data === 'string' ? 'text' : 'binary',
          timestamp: Date.now()
        };
        setLastMessage(message);
      };
      
      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        const wsError = new Error('WebSocket connection error');
        setError(wsError);
      };
      
      socket.onclose = (event) => {
        setConnected(false);
        setConnecting(false);
        
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          // Attempt to reconnect
          reconnectAttemptsRef.current += 1;
          console.log(`WebSocket connection closed. Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect(url);
          }, reconnectDelay);
        } else if (!event.wasClean) {
          setError(new Error(`WebSocket connection closed unexpectedly. Code: ${event.code}, Reason: ${event.reason}`));
        } else {
          console.log('WebSocket connection closed cleanly');
        }
      };
      
      socketRef.current = socket;
    } catch (err) {
      setConnecting(false);
      setError(err instanceof Error ? err : new Error('Failed to connect to WebSocket'));
      console.error('Error connecting to WebSocket:', err);
    }
  }, []);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setConnected(false);
    setConnecting(false);
  }, []);
  
  const send = useCallback((data: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(data);
    } else {
      console.error('Cannot send message: WebSocket is not connected');
      setError(new Error('Cannot send message: WebSocket is not connected'));
    }
  }, []);
  
  const clearLastMessage = useCallback(() => {
    setLastMessage(null);
  }, []);
  
  // Clean up the WebSocket connection when the component unmounts
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  return {
    connected,
    connecting,
    lastMessage,
    error,
    connect,
    disconnect,
    send,
    clearLastMessage
  };
} 