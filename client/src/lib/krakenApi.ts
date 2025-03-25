import { z } from 'zod';
import { 
  krakenOHLCResponseSchema, 
  krakenAssetPairsResponseSchema,
  krakenTickerResponseSchema,
} from '@shared/schema';
import { OHLCData, TradingPair, Ticker } from './types';

// Use our server-side proxy routes instead of direct Kraken API calls
const API_BASE = '/api/kraken';

export async function fetchHistoricalOHLC(
  pair: string, 
  interval: number = 5,
  since?: number
): Promise<{ ohlc: OHLCData[], last: number }> {
  const params = new URLSearchParams({
    pair,
    interval: interval.toString(),
  });

  if (since) {
    params.append('since', since.toString());
  }

  const response = await fetch(`${API_BASE}/ohlc?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch OHLC data: ${response.statusText}`);
  }

  const data = await response.json();
  const parsed = krakenOHLCResponseSchema.parse(data);

  if (parsed.error && parsed.error.length > 0) {
    throw new Error(`Kraken API error: ${parsed.error.join(', ')}`);
  }

  // Extract the result data for the specified pair
  const ohlcData = parsed.result[pair];
  if (!Array.isArray(ohlcData)) {
    throw new Error('Invalid OHLC data format received from Kraken');
  }

  // Get the 'last' timestamp
  const last = parsed.result.last as number;

  // Transform the data into our expected format
  const formattedData: OHLCData[] = ohlcData.map(
    ([time, open, high, low, close, _vwap, volume, _count]) => ({
      time: new Date(time * 1000), // Convert Unix timestamp to Date
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    })
  );

  return { ohlc: formattedData, last };
}

export async function fetchTradingPairs(): Promise<TradingPair[]> {
  const response = await fetch(`${API_BASE}/assetpairs`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch trading pairs: ${response.statusText}`);
  }

  const data = await response.json();
  const parsed = krakenAssetPairsResponseSchema.parse(data);

  if (parsed.error && parsed.error.length > 0) {
    throw new Error(`Kraken API error: ${parsed.error.join(', ')}`);
  }

  const pairs: TradingPair[] = Object.entries(parsed.result)
    .filter(([_id, info]) => info.quote === 'ZUSD' || info.quote === 'USD')
    .map(([id, info]) => ({
      id,
      name: info.altname,
      wsname: info.wsname || info.altname, // Some pairs may not have wsname
    }));

  return pairs;
}

export async function fetchTickerInfo(pair: string): Promise<Ticker> {
  const params = new URLSearchParams({ pair });
  
  const response = await fetch(`${API_BASE}/ticker?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ticker info: ${response.statusText}`);
  }

  const data = await response.json();
  const parsed = krakenTickerResponseSchema.parse(data);

  if (parsed.error && parsed.error.length > 0) {
    throw new Error(`Kraken API error: ${parsed.error.join(', ')}`);
  }

  const tickerInfo = parsed.result[pair];
  if (!tickerInfo) {
    throw new Error(`No ticker information found for pair: ${pair}`);
  }

  // Calculate price change
  const last = parseFloat(tickerInfo.c[0]);
  const open = parseFloat(tickerInfo.o);
  const change = last - open;
  const changePercent = (change / open) * 100;

  // Format with 2 decimal places for percentage, and appropriate for price
  const formattedChange = change.toFixed(2);
  const formattedChangePercent = changePercent.toFixed(2);

  const ticker: Ticker = {
    last: tickerInfo.c[0],
    change: `${change >= 0 ? '+' : ''}${formattedChange}`,
    changePercent: `${formattedChangePercent}%`,
    high: tickerInfo.h[1], // 24h high
    low: tickerInfo.l[1], // 24h low
    volume: tickerInfo.v[1], // 24h volume
    updated: new Date().toLocaleTimeString(),
  };

  return ticker;
}

// Create a WebSocket connection to our server-side proxy
export function createKrakenWebSocket(): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  return new WebSocket(wsUrl);
}

// Parse WebSocket OHLC data update
export function parseOHLCUpdate(message: any): OHLCData | null {
  try {
    let data: any[] | null = null;
    
    // Format 1: [channelID, data, channelName, pair]
    if (Array.isArray(message) && typeof message[0] === 'number' && message[2] === 'ohlc') {
      data = message[1];
    } 
    // Format 2: [data, channelName, pair]
    else if (Array.isArray(message) && Array.isArray(message[0]) && message[1] === 'ohlc') {
      data = message[0];
    }
    // Format 3: Custom structure from our server
    else if (Array.isArray(message) && message[2] === 'ohlc' && Array.isArray(message[1])) {
      data = message[1];
    }
    
    if (data && Array.isArray(data)) {
      // Make sure we have enough elements in the data array
      if (data.length >= 8) {
        return {
          time: new Date(parseInt(String(data[1])) * 1000),
          open: parseFloat(String(data[2])),
          high: parseFloat(String(data[3])),
          low: parseFloat(String(data[4])),
          close: parseFloat(String(data[5])),
          volume: parseFloat(String(data[7])),
        };
      }
    }
    
    return null;
  } catch (error) {
    // console.error('Error parsing OHLC update:', error, 'Message:', message);
    return null;
  }
}
