export interface OHLCData {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Ticker {
  last: string;
  change: string;
  changePercent: string;
  high: string;
  low: string;
  volume: string;
  updated: string;
}

export interface Trade {
  time: string;
  price: string;
  amount: string;
  direction: 'buy' | 'sell';
}

export interface OrderBookEntry {
  price: string;
  amount: string;
  total: string;
  percentage: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface MarketSummary {
  open24h: string;
  high24h: string;
  low24h: string;
  volumeBtc: string;
  volumeUsd: string;
  change30d: string;
  marketCap: string;
}

export interface TradingPair {
  id: string;
  name: string;
  wsname: string;
}

export interface TimeInterval {
  value: number;
  label: string;
}

export const timeIntervals: TimeInterval[] = [
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 240, label: '4 hours' },
  { value: 1440, label: '1 day' },
];

export const defaultTradingPairs: TradingPair[] = [
  { id: 'XXBTZUSD', name: 'BTC/USD', wsname: 'XBT/USD' },
  { id: 'XETHZUSD', name: 'ETH/USD', wsname: 'ETH/USD' },
  { id: 'XXRPZUSD', name: 'XRP/USD', wsname: 'XRP/USD' },
  { id: 'SOLZUSD', name: 'SOL/USD', wsname: 'SOL/USD' },
  { id: 'ADAZUSD', name: 'ADA/USD', wsname: 'ADA/USD' },
];

export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface KrakenOHLCUpdate {
  channelID: number;
  data: Array<string | number>;
  channelName: string;
  pair: string;
}

export interface KrakenWebSocketSubscribeMessage {
  name: string;
  token?: string;
}

export interface KrakenWebSocketSubscription {
  name: string;
  interval?: number;
  token: string;  // Changed from optional to required
}
