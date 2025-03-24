import React, { useState } from 'react';
import { useKrakenData } from '@/hooks/useKrakenData';
import { timeIntervals } from '@/lib/types';
import ChartContainer from '@/components/ChartContainer';
import PriceTicker from '@/components/PriceTicker';
import MarketInsights from '@/components/MarketInsights';
import PairSelector from '@/components/PairSelector';
import IntervalSelector from '@/components/IntervalSelector';
import { BarChart } from 'lucide-react';

const Dashboard: React.FC = () => {
  const {
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
    refreshData
  } = useKrakenData();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-surface px-4 py-3 shadow-md">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center mb-3 sm:mb-0">
            <BarChart className="text-primary mr-2 h-5 w-5" />
            <h1 className="text-xl font-medium">Kraken Market Data</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <PairSelector 
              pairs={availablePairs}
              selectedPair={selectedPair}
              onSelect={setSelectedPair}
              className="flex-grow sm:flex-grow-0"
            />
            <IntervalSelector
              intervals={timeIntervals}
              selectedInterval={interval}
              onSelect={setInterval}
              className="flex-grow sm:flex-grow-0"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4">
        <div className="container mx-auto">
          {/* Price Ticker */}
          <PriceTicker 
            ticker={ticker} 
            pairName={selectedPair.name} 
            isLoading={isLoading} 
          />

          {/* Chart */}
          <ChartContainer
            data={ohlcData}
            isLoading={isLoading}
            chartType={isChartType}
            onChartTypeChange={setChartType}
            onRefresh={refreshData}
          />

          {/* Market Insights */}
          <MarketInsights />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface p-4 text-center text-textSecondary text-xs">
        <p>Data provided by Kraken API. This application is for demonstration purposes only.</p>
        <p className="mt-1">
          {isConnected 
            ? "✓ WebSocket connected - receiving real-time updates" 
            : "⚠ WebSocket disconnected - reconnecting..."}
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
