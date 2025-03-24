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
    // Handle OHLC update messages
    if (Array.isArray(message) && message[2] === 'ohlc') {
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
          // Otherwise add the new candle
          else {
            return [...prevData, update];
          }
        });
      }
    }
    
    // Handle other message types if needed (trades, ticker, etc.)
  }, []);

  const { isConnected, subscribe, unsubscribe } = useWebSocket(
    handleWsMessage,
    () => {
      console.log('WebSocket connected - subscribing to OHLC updates');
      if (selectedPair) {
        subscribe({
          name: 'ohlc',
          interval,
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
      fetchHistoricalData();
      
      // Update WebSocket subscription
      if (isConnected) {
        // Unsubscribe from previous pair/interval if needed
        unsubscribe({ name: 'ohlc' });
        
        // Subscribe to the new pair/interval
        subscribe({
          name: 'ohlc',
          interval,
        });
      }
    }
  }, [selectedPair, interval, isConnected, fetchHistoricalData, subscribe, unsubscribe]);

  // Set up periodic ticker updates
  useEffect(() => {
    const updateTicker = async () => {
      if (selectedPair) {
        try {
          const tickerInfo = await fetchTickerInfo(selectedPair.id);
          setTicker(tickerInfo);
        } catch (err) {
          console.error('Error updating ticker:', err);
        }
      }
    };
    
    const tickerId = setInterval(updateTicker, 10000); // Update every 10 seconds
    
    return () => clearInterval(tickerId);
  }, [selectedPair]);

  // Refresh data when connection state changes
  useEffect(() => {
    if (isConnected && selectedPair) {
      subscribe({
        name: 'ohlc',
        interval,
      });
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
