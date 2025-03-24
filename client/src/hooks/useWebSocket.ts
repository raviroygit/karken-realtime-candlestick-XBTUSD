import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketMessage, KrakenWebSocketSubscription } from '@/lib/types';

export function useWebSocket(
  onMessage: (message: any) => void,
  onOpen?: () => void,
  onClose?: () => void
) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const subscriptionsRef = useRef<KrakenWebSocketSubscription[]>([]);

  const connectWebSocket = useCallback(() => {
    try {
      // Use secure WebSocket if the page is served over HTTPS
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = 'ws.kraken.com'; // Kraken's WebSocket server
      const wsUrl = `${protocol}//${host}`;
      
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket is already connected');
        return;
      }
      
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        setError(null);
        
        // Resubscribe to channels if there were any
        if (subscriptionsRef.current.length > 0) {
          subscriptionsRef.current.forEach(subscription => {
            subscribe(subscription);
          });
        }
        
        if (onOpen) onOpen();
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        
        if (onClose) onClose();
        
        // Try to reconnect after a delay if the connection was not closed intentionally
        if (event.code !== 1000) {
          setTimeout(() => {
            if (socketRef.current?.readyState !== WebSocket.OPEN) {
              connectWebSocket();
            }
          }, 3000);
        }
      };
      
      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
      };
      
      socketRef.current = socket;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown WebSocket error');
      setError(error);
      console.error('Error setting up WebSocket:', error);
    }
  }, [onMessage, onOpen, onClose]);

  const disconnect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close(1000, 'User initiated disconnect');
    }
    socketRef.current = null;
    setIsConnected(false);
  }, []);

  const subscribe = useCallback((subscription: KrakenWebSocketSubscription) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      // Save subscription to resubscribe when connection is established
      if (!subscriptionsRef.current.some(sub => sub.name === subscription.name)) {
        subscriptionsRef.current.push(subscription);
      }
      return;
    }

    const subscribeMessage = {
      name: "subscribe",
      reqid: Math.floor(Math.random() * 1000000),
      subscription: subscription
    };

    socketRef.current.send(JSON.stringify(subscribeMessage));
    
    // Add to subscriptions if not already there
    if (!subscriptionsRef.current.some(sub => sub.name === subscription.name)) {
      subscriptionsRef.current.push(subscription);
    }
  }, []);

  const unsubscribe = useCallback((subscription: KrakenWebSocketSubscription) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const unsubscribeMessage = {
      name: "unsubscribe",
      reqid: Math.floor(Math.random() * 1000000),
      subscription: subscription
    };

    socketRef.current.send(JSON.stringify(unsubscribeMessage));
    
    // Remove from stored subscriptions
    subscriptionsRef.current = subscriptionsRef.current.filter(
      sub => sub.name !== subscription.name
    );
  }, []);

  // Connect on component mount and disconnect on unmount
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      disconnect();
    };
  }, [connectWebSocket, disconnect]);

  return { 
    isConnected, 
    error, 
    subscribe, 
    unsubscribe,
    sendMessage: (message: any) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(message));
      }
    }
  };
}
