import React from 'react';
import { Ticker } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

interface PriceTickerProps {
  ticker: Ticker | null;
  pairName: string;
  isLoading: boolean;
}

const PriceTicker: React.FC<PriceTickerProps> = ({ ticker, pairName, isLoading }) => {
  if (isLoading || !ticker) {
    return (
      <Card className="bg-surface rounded-lg shadow-lg mb-4">
        <CardContent className="p-4 py-3">
          <div className="flex animate-pulse flex-col sm:flex-row items-start sm:items-center justify-between">
            <div>
              <div className="h-4 w-20 bg-gray-800 rounded mb-2"></div>
              <div className="h-8 w-32 bg-gray-800 rounded"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 sm:mt-0">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="price-stat">
                  <div className="h-3 w-16 bg-gray-800 rounded mb-2"></div>
                  <div className="h-4 w-24 bg-gray-800 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPriceUp = ticker.change.startsWith('+');

  return (
    <Card className="bg-surface rounded-lg shadow-lg mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div>
            <div className="text-textSecondary text-sm">{pairName}</div>
            <div className="flex items-baseline">
              <span className="text-2xl font-mono font-medium">{ticker.last}</span>
              <span className={`ml-2 font-mono text-sm ${isPriceUp ? 'text-secondary' : 'text-accent'}`}>
                {ticker.change} ({ticker.changePercent})
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 sm:mt-0">
            <div className="price-stat">
              <div className="text-textSecondary text-xs">24h High</div>
              <div className="font-mono text-sm">{ticker.high}</div>
            </div>
            <div className="price-stat">
              <div className="text-textSecondary text-xs">24h Low</div>
              <div className="font-mono text-sm">{ticker.low}</div>
            </div>
            <div className="price-stat">
              <div className="text-textSecondary text-xs">24h Volume</div>
              <div className="font-mono text-sm">{ticker.volume} BTC</div>
            </div>
            <div className="price-stat">
              <div className="text-textSecondary text-xs">Updated</div>
              <div className="font-mono text-sm">{ticker.updated}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceTicker;
