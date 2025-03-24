import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, BookOpen, BarChart2 } from 'lucide-react';

// Mock data structure that would normally come from API
interface RecentTrade {
  time: string;
  price: string;
  amount: string;
  direction: 'buy' | 'sell';
}

interface OrderBookEntry {
  price: string;
  amount: string;
  total: string;
  percentage: number;
}

interface MarketSummary {
  open24h: string;
  high24h: string;
  low24h: string;
  volumeBtc: string;
  volumeUsd: string;
  change30d: string;
  marketCap: string;
}

// This is just sample data - in a real implementation this would be fetched from the API
const sampleTrades: RecentTrade[] = [
  { time: '12:45:32', price: '36,742.50', amount: '0.1254', direction: 'buy' },
  { time: '12:44:18', price: '36,738.25', amount: '0.0832', direction: 'sell' },
  { time: '12:42:57', price: '36,735.10', amount: '0.2100', direction: 'sell' },
  { time: '12:41:42', price: '36,741.50', amount: '0.1520', direction: 'buy' },
  { time: '12:40:15', price: '36,743.80', amount: '0.0654', direction: 'buy' },
];

const sampleBids: OrderBookEntry[] = [
  { price: '36,741.20', amount: '0.2548', total: '9,361.85', percentage: 40 },
  { price: '36,740.50', amount: '0.1652', total: '6,069.53', percentage: 25 },
  { price: '36,738.75', amount: '0.3215', total: '11,811.51', percentage: 60 },
  { price: '36,737.40', amount: '0.1875', total: '6,888.26', percentage: 30 },
  { price: '36,736.20', amount: '0.5124', total: '18,823.42', percentage: 80 },
];

const sampleAsks: OrderBookEntry[] = [
  { price: '36,743.80', amount: '0.1958', total: '7,194.44', percentage: 30 },
  { price: '36,744.25', amount: '0.2154', total: '7,914.71', percentage: 35 },
  { price: '36,745.50', amount: '0.4258', total: '15,646.22', percentage: 70 },
  { price: '36,746.75', amount: '0.1875', total: '6,890.02', percentage: 30 },
  { price: '36,747.90', amount: '0.2645', total: '9,719.82', percentage: 40 },
];

const sampleMarketSummary: MarketSummary = {
  open24h: '36,482.75',
  high24h: '37,120.80',
  low24h: '36,005.25',
  volumeBtc: '1,284.52',
  volumeUsd: '47,195,832',
  change30d: '+12.48%',
  marketCap: '715.2B',
};

const MarketInsights: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Recent Trades Panel */}
      <Card className="bg-surface shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center">
            <SwapHorizontal className="h-4 w-4 mr-2 text-primary" />
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs text-textSecondary pb-2">Time</th>
                  <th className="text-right text-xs text-textSecondary pb-2">Price</th>
                  <th className="text-right text-xs text-textSecondary pb-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sampleTrades.map((trade, index) => (
                  <tr key={index} className="border-t border-gray-800">
                    <td className="py-2 text-xs">{trade.time}</td>
                    <td className={`py-2 text-xs text-${trade.direction === 'buy' ? 'secondary' : 'accent'} text-right`}>
                      {trade.price}
                    </td>
                    <td className="py-2 text-xs text-textSecondary text-right">{trade.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Order Book Panel */}
      <Card className="bg-surface shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center">
            <BookOpen className="h-4 w-4 mr-2 text-primary" />
            Order Book
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex">
            <div className="w-1/2 pr-1">
              <div className="flex justify-between text-xs text-textSecondary pb-2">
                <span>Price</span>
                <span>Amount</span>
              </div>
              {/* Bids */}
              <div className="space-y-1">
                {sampleBids.map((bid, index) => (
                  <div key={index} className="flex justify-between text-xs relative">
                    <span className="text-secondary z-10">{bid.price}</span>
                    <span className="z-10">{bid.amount}</span>
                    <div 
                      className="absolute right-0 h-full bg-secondary bg-opacity-10" 
                      style={{ width: `${bid.percentage}%` }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-1/2 pl-1">
              <div className="flex justify-between text-xs text-textSecondary pb-2">
                <span>Price</span>
                <span>Amount</span>
              </div>
              {/* Asks */}
              <div className="space-y-1">
                {sampleAsks.map((ask, index) => (
                  <div key={index} className="flex justify-between text-xs relative">
                    <span className="text-accent z-10">{ask.price}</span>
                    <span className="z-10">{ask.amount}</span>
                    <div 
                      className="absolute left-0 h-full bg-accent bg-opacity-10" 
                      style={{ width: `${ask.percentage}%` }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Market Summary */}
      <Card className="bg-surface shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center">
            <BarChart2 className="h-4 w-4 mr-2 text-primary" />
            Market Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-textSecondary">Open 24h:</span>
              <span className="font-mono">{sampleMarketSummary.open24h}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-textSecondary">High 24h:</span>
              <span className="font-mono">{sampleMarketSummary.high24h}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-textSecondary">Low 24h:</span>
              <span className="font-mono">{sampleMarketSummary.low24h}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-textSecondary">Volume 24h (BTC):</span>
              <span className="font-mono">{sampleMarketSummary.volumeBtc}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-textSecondary">Volume 24h (USD):</span>
              <span className="font-mono">{sampleMarketSummary.volumeUsd}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-textSecondary">30d Change:</span>
              <span className="font-mono text-secondary">{sampleMarketSummary.change30d}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-textSecondary">Market Cap (USD):</span>
              <span className="font-mono">{sampleMarketSummary.marketCap}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketInsights;
