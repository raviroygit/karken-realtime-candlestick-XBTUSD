import { useState, useEffect, useCallback } from 'react';
import { 
  fetchHistoricalOHLC, 
  fetchTickerInfo, 
  fetchTradingPairs, 
  parseOHLCUpdate 
} from '@/lib/krakenApi';
import { useWebSocket } from './useWebSocket';
import { 
  OHLCData, 
  TradingPair, 
  Ticker, 
  defaultTradingPairs 
} from '@/lib/types';

export function useKrakenData() {
  const [ohlcData, setOhlcData] = useState<OHLCData[]>([]);
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [selectedPair, setSelectedPair] = useState<TradingPair>(defaultTradingPairs[0]);
  const [interval, setInterval] = useState<number>(5); // 5 minutes default
  const [availablePairs, setAvailablePairs] = useState<TradingPair[]>(defaultTradingPairs);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isChartType, setChartType] = useState<'candles' | 'line'>('candles');

  // Process WebSocket messages
  const handleWsMessage = useCallback((message: any) => {
    try {
      // Skip status messages that are handled by the WebSocket hook
      if (typeof message === 'object' && message?.type === 'status') {
        return;
      }
      
      // Handle message as string (from binary data)
      if (typeof message === 'string') {
        try {
          message = JSON.parse(message);
        } catch (e) {
          console.warn('Unable to parse WebSocket message as JSON:', e);
          return;
        }
      }

      // Handle subscription confirmation messages
      if (Array.isArray(message) && message[1]?.channelName === 'ohlc') {
        console.log('Successfully subscribed to OHLC channel:', message);
        return;
      }

      // Handle subscription status messages
      if (message && typeof message === 'object' && message.status === 'subscribed') {
        console.log('Subscription confirmed:', message);
        return;
      }
      
      // Handle OHLC update messages (format depends on exact response type from Kraken)
      if (Array.isArray(message) && 
         (message[2] === 'ohlc' || // Handle standard format
          (message[0] && typeof message[0] === 'number'))) { // Handle channel ID format
        
        const update = parseOHLCUpdate(message);
        
        if (update) {
          setOhlcData(prevData => {
            // Handle both updates to existing candles and new candles
            const lastIndex = prevData.length - 1;
            
            // If the last candle has the same timestamp, update it
            if (lastIndex >= 0 && prevData[lastIndex].time.getTime() === update.time.getTime()) {
              const updatedData = [...prevData];
              updatedData[lastIndex] = update;
              return updatedData;
            } 
            // Otherwise add the new candle and maintain a reasonable length
            else {
              // Keep up to 500 candles to avoid excessive memory usage
              const newData = [...prevData, update]; 
              return newData.slice(-500);
            }
          });
          
          // Update ticker data with the latest price
          setTicker(prev => {
            if (prev) {
              return {
                ...prev,
                last: update.close.toString(),
                updated: new Date().toLocaleTimeString()
              };
            }
            return prev;
          });
        }
      }
      
      // Handle heartbeat and system messages
      if (Array.isArray(message)) {
        if (message[1] === 'heartbeat') {
          console.log('Received heartbeat from Kraken');
        } else if (message[1] === 'systemStatus') {
          console.log('Kraken system status:', message[2]);
        } else if (message[1] === 'error') {
          console.error('Kraken WebSocket error:', message[2]);
          // You might want to handle specific errors here
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }, []);

  const { isConnected, subscribe, unsubscribe } = useWebSocket(
    handleWsMessage,
    () => {
      console.log('WebSocket connected - subscribing to OHLC updates');
      if (selectedPair) {
        subscribe({
          name: 'ohlc',
          interval,
          token: selectedPair.wsname || selectedPair.id
        });
      }
    }
  );

  // Fetch historical data
  const fetchHistoricalData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!selectedPair) return;
      
      // Fetch historical OHLC data
      const { ohlc, last } = await fetchHistoricalOHLC(selectedPair.id, interval);
      setOhlcData(ohlc);
      setLastTimestamp(last);
      
      // Fetch current ticker info
      const tickerInfo = await fetchTickerInfo(selectedPair.id);
      setTicker(tickerInfo);
      
      // Save user's preferences to localStorage
      localStorage.setItem('krakenChartPair', selectedPair.id);
      localStorage.setItem('krakenChartInterval', interval.toString());
      
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPair, interval]);

  // Load trading pairs
  useEffect(() => {
    const loadPairs = async () => {
      try {
        const pairs = await fetchTradingPairs();
        if (pairs.length > 0) {
          setAvailablePairs(pairs);
          
          // Check if we have a stored preference
          const storedPairId = localStorage.getItem('krakenChartPair');
          if (storedPairId) {
            const storedPair = pairs.find(p => p.id === storedPairId);
            if (storedPair) {
              setSelectedPair(storedPair);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching trading pairs:', err);
        // Fall back to default pairs
      }
    };
    
    loadPairs();
  }, []);

  // Initialize chart data from localStorage if available
  useEffect(() => {
    const storedInterval = localStorage.getItem('krakenChartInterval');
    if (storedInterval) {
      const parsedInterval = parseInt(storedInterval, 10);
      if (!isNaN(parsedInterval) && [5, 15, 30, 60, 240, 1440].includes(parsedInterval)) {
        setInterval(parsedInterval);
      }
    }
  }, []);

  // Load data when pair or interval changes
  useEffect(() => {
    if (selectedPair) {
      console.log(`Fetching data for ${selectedPair.name} with interval ${interval}m`);
      fetchHistoricalData();
      
      // Update WebSocket subscription - only when connected
      if (isConnected) {
        // Use a small delay to ensure any previous unsubscriptions complete
        const timer = setTimeout(() => {
          // Unsubscribe from previous pair/interval
          unsubscribe({ 
            name: 'ohlc',
            // Include all subscription details to ensure proper unsubscribe
            interval,
            token: selectedPair.wsname || selectedPair.id
          });
          
          // Subscribe to the new pair/interval after a small delay
          setTimeout(() => {
            console.log(`Subscribing to ${selectedPair.name} OHLC with interval ${interval}m`);
            subscribe({
              name: 'ohlc',
              interval,
              token: selectedPair.wsname || selectedPair.id
            });
          }, 300);
        }, 100);
        
        return () => {
          clearTimeout(timer);
        };
      }
    }
  }, [selectedPair, interval, isConnected, fetchHistoricalData, subscribe, unsubscribe]);

  // Define the ticker update function outside useEffect to avoid any issues
  const updateTicker = useCallback(() => {
    if (selectedPair) {
      // Use a non-async wrapper function to avoid Promise return
      const fetchData = async () => {
        try {
          const tickerInfo = await fetchTickerInfo(selectedPair.id);
          setTicker(tickerInfo);
        } catch (err) {
          console.error('Error updating ticker:', err);
        }
      };
      
      fetchData();
    }
  }, [selectedPair]);
  
  // Set up periodic ticker updates
  useEffect(() => {
    // Initial update
    updateTicker();
    
    // Set up interval - using a more conservative update frequency
    // to avoid overwhelming the API and causing rate limit issues
    const tickerId = window.setInterval(updateTicker, 15000); // Update every 15 seconds
    
    // Clean up interval on unmount
    return () => {
      window.clearInterval(tickerId);
    };
  }, [updateTicker]);

  // Monitor connection state and re-subscribe if needed
  useEffect(() => {
    // Only subscribe when connected and we have a selected pair
    if (isConnected && selectedPair) {
      console.log('WebSocket connection status changed, re-subscribing to OHLC updates');
      
      // Short delay to make sure connection is fully established
      const timer = setTimeout(() => {
        subscribe({
          name: 'ohlc',
          interval,
          token: selectedPair.wsname || selectedPair.id
        });
      }, 500);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isConnected, selectedPair, interval, subscribe]);

  return {
    ohlcData,
    ticker,
    selectedPair,
    interval,
    availablePairs,
    isLoading,
    error,
    isChartType,
    isConnected,
    setSelectedPair,
    setInterval,
    setChartType,
    refreshData: fetchHistoricalData
  };
}
