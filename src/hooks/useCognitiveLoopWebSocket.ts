import { useEffect, useRef } from 'react';

const useCognitiveLoopWebSocket = (userId: string, onMessage: (data: any) => void) => {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const websocketUrl = `${process.env.NEXT_PUBLIC_INSIGHT_CORE_API_URL.replace(/^http/, 'ws')}/ws/cognitive-loop/${userId}`;
    ws.current = new WebSocket(websocketUrl);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      ws.current?.close();
    };
  }, [userId, onMessage]);
};

export default useCognitiveLoopWebSocket; 