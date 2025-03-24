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

  // Track reconnect attempts for exponential backoff
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5; // Maximum number of reconnection attempts
  const maxReconnectDelay = 10000; // 10 seconds max
  const baseReconnectDelay = 1000; // Start with 1 second

  const resetReconnectAttempts = useCallback(() => {
    reconnectAttemptsRef.current = 0;
  }, []);

  const getReconnectDelay = useCallback(() => {
    // Exponential backoff with jitter and maximum limit
    const attempt = reconnectAttemptsRef.current;
    const exponentialDelay = Math.min(
      maxReconnectDelay,
      baseReconnectDelay * Math.pow(2, attempt)
    );
    // Add jitter (0-20% random variation)
    const jitter = Math.random() * 0.2 * exponentialDelay;
    return exponentialDelay + jitter;
  }, []);

  // Forward declaration of subscribe to break circular dependency
  const sendSubscription = useCallback((socket: WebSocket, subscription: KrakenWebSocketSubscription) => {
    // Format the subscription message according to Kraken API specs
    const subscribeMessage = {
      name: "subscribe",
      reqid: Math.floor(Math.random() * 1000000),
      subscription: {
        name: subscription.name,
        ...(subscription.interval ? { interval: subscription.interval } : {})
      },
      pair: subscription.token ? [subscription.token] : [], // Kraken expects pair as an array
    };

    console.log('Sending subscription:', JSON.stringify(subscribeMessage));
    socket.send(JSON.stringify(subscribeMessage));
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      // Connect to our server-side WebSocket proxy 
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket is already connected');
        return;
      }
      
      const socket = new WebSocket(wsUrl);
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          console.log('WebSocket connection timed out, closing and retrying');
          socket.close();
        }
      }, 10000); // 10 second connection timeout
      
      socket.onopen = () => {
        console.log('WebSocket connection established');
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        setError(null);
        resetReconnectAttempts(); // Reset on successful connection
        
        // Set a ping interval to keep the connection alive
        const pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000); // Send ping every 30 seconds
        
        // Store the interval for cleanup
        (socket as any).pingInterval = pingInterval;
        
        // Resubscribe to channels if there were any
        if (subscriptionsRef.current.length > 0) {
          subscriptionsRef.current.forEach(subscription => {
            sendSubscription(socket, subscription);
          });
        }
        
        if (onOpen) onOpen();
      };
      
      socket.onmessage = (event) => {
        try {
          // Try to parse as JSON first (our server status messages)
          try {
            const data = JSON.parse(event.data);
            
            // Handle server-status messages specially
            if (data.type === 'status') {
              console.log('WebSocket status update:', data);
              setIsConnected(data.connected);
              
              // If Kraken WebSocket connection status changed, resubscribe
              if (data.connected && subscriptionsRef.current.length > 0) {
                console.log('WebSocket connection status changed, re-subscribing to OHLC updates');
                subscriptionsRef.current.forEach(subscription => {
                  sendSubscription(socket, subscription);
                });
              }
              return;
            }
            
            // Ignore pong responses
            if (data.type === 'pong') {
              return;
            }
            
            // Forward other JSON messages to handler
            onMessage(data);
          } catch (parseError) {
            // If not JSON, it's probably a binary message from Kraken
            // Forward the raw data to the handler
            onMessage(event.data);
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };
      
      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        clearTimeout(connectionTimeout);
        
        // Clear ping interval if it exists
        if ((socket as any).pingInterval) {
          clearInterval((socket as any).pingInterval);
        }
        
        setIsConnected(false);
        
        if (onClose) onClose();
        
        // Try to reconnect after a delay if the connection was not closed intentionally
        // and we haven't exceeded the maximum number of reconnection attempts
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = getReconnectDelay();
          
          console.log(`Reconnecting in ${Math.round(delay/1000)}s (attempt ${reconnectAttemptsRef.current} of ${maxReconnectAttempts})`);
          
          setTimeout(() => {
            if (socketRef.current !== socket) {
              return; // A new socket was created in the meantime
            }
            
            if (socketRef.current?.readyState !== WebSocket.OPEN) {
              connectWebSocket();
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log(`Maximum reconnection attempts (${maxReconnectAttempts}) reached. Giving up.`);
          setError(new Error('Failed to connect after multiple attempts'));
        }
      };
      
      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
        
        // No need to reconnect here, the onclose handler will do it
      };
      
      socketRef.current = socket;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown WebSocket error');
      setError(error);
      console.error('Error setting up WebSocket:', error);
      
      // Try to reconnect after a delay if we haven't exceeded max attempts
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current += 1;
        const delay = getReconnectDelay();
        console.log(`Reconnecting in ${Math.round(delay/1000)}s (attempt ${reconnectAttemptsRef.current} of ${maxReconnectAttempts})`);
        setTimeout(connectWebSocket, delay);
      } else {
        console.log(`Maximum reconnection attempts (${maxReconnectAttempts}) reached. Giving up.`);
      }
    }
  }, [onMessage, onOpen, onClose, sendSubscription, getReconnectDelay, resetReconnectAttempts]);

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
      console.log('WebSocket not connected, saving subscription for later');
      return;
    }

    // Format the subscription message according to Kraken API specs
    // https://docs.kraken.com/websockets/#message-subscribe
    const subscribeMessage: {
      name: string;
      reqid: number;
      subscription: {
        name: string;
        interval?: number;
      };
      pair: string[];
    } = {
      name: "subscribe",
      reqid: Math.floor(Math.random() * 1000000),
      subscription: {
        name: subscription.name,
      },
      pair: subscription.token ? [subscription.token] : [], // Kraken expects pair as an array
    };

    // Add interval to subscription if provided
    if (subscription.interval) {
      subscribeMessage.subscription.interval = subscription.interval;
    }

    console.log('Sending subscription:', JSON.stringify(subscribeMessage));
    socketRef.current.send(JSON.stringify(subscribeMessage));
    
    // Add to subscriptions if not already there
    if (!subscriptionsRef.current.some(sub => sub.name === subscription.name)) {
      subscriptionsRef.current.push(subscription);
    }
  }, []);

  const unsubscribe = useCallback((subscription: KrakenWebSocketSubscription) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      // Update stored subscriptions even if not connected
      subscriptionsRef.current = subscriptionsRef.current.filter(
        sub => sub.name !== subscription.name
      );
      return;
    }

    // Format the unsubscribe message according to Kraken API specs
    const unsubscribeMessage: {
      name: string;
      reqid: number;
      subscription: {
        name: string;
        interval?: number;
      };
      pair: string[];
    } = {
      name: "unsubscribe",
      reqid: Math.floor(Math.random() * 1000000),
      subscription: {
        name: subscription.name,
      },
      pair: subscription.token ? [subscription.token] : [], // Kraken expects pair as an array
    };

    // Add interval to unsubscription if provided
    if (subscription.interval) {
      unsubscribeMessage.subscription.interval = subscription.interval;
    }

    console.log('Sending unsubscription:', JSON.stringify(unsubscribeMessage));
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
