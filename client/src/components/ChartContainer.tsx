import React, { useCallback, useRef } from 'react';
import CandlestickChart from './CandlestickChart';
import { OHLCData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { 
  BarChart2, 
  TrendingUp, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw 
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ChartContainerProps {
  data: OHLCData[];
  isLoading: boolean;
  chartType: 'candles' | 'line';
  onChartTypeChange: (type: 'candles' | 'line') => void;
  onRefresh: () => void;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  data,
  isLoading,
  chartType,
  onChartTypeChange,
  onRefresh
}) => {
  const chartRef = useRef<any>(null);

  const handleZoomIn = useCallback(() => {
    if (chartRef.current && chartRef.current.zoomIn) {
      chartRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (chartRef.current && chartRef.current.zoomOut) {
      chartRef.current.zoomOut();
    }
  }, []);

  const handleReset = useCallback(() => {
    if (chartRef.current && chartRef.current.resetView) {
      chartRef.current.resetView();
    }
  }, []);

  return (
    <div className="bg-surface rounded-lg shadow-lg mb-4">
      <div className="p-4 border-b border-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <h2 className="text-lg font-medium mb-2 sm:mb-0">Price Chart</h2>
          <div className="flex gap-2 items-center">
            <Button
              variant={chartType === 'candles' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => onChartTypeChange('candles')}
              className={chartType === 'candles' ? 'bg-gray-800' : 'bg-white'}
            >
              <BarChart2 className="h-4 w-4 mr-1" />
              Candles
            </Button>
            <Button
              variant={chartType === 'line' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => onChartTypeChange('line')}
              className={chartType === 'line' ? 'bg-gray-800' : 'bg-white'}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Line
            </Button>
            
            <Separator orientation="vertical" className="h-4 mx-1" />
            
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white hover:bg-gray-700"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white hover:bg-gray-700"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white hover:bg-gray-700"
              onClick={handleReset}
              title="Reset View"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="relative p-4">
        <div className="chart-container h-[440px] w-full">
          <CandlestickChart
            data={data}
            isLoading={isLoading}
            chartType={chartType}
            ref={chartRef}
            width={800} // These will be overridden by HOCs
            height={440}
            ratio={1}
          />
          
          {isLoading && (
            <div className="absolute inset-0 bg-surface bg-opacity-80 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="mt-3 text-sm text-textSecondary">Loading market data...</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartContainer;
