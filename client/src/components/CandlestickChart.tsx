import React, { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ChartCanvas,
  Chart,
  CrossHairCursor,
  MouseCoordinateX,
  MouseCoordinateY,
  XAxis,
  YAxis,
  OHLCTooltip,
  lastVisibleItemBasedZoomAnchor,
  EdgeIndicator,
  withDeviceRatio,
  withSize,
} from 'react-financial-charts';
import {
  discontinuousTimeScaleProviderBuilder,
  CandlestickSeries,
  LineSeries,
  VolumeProfileSeries,
  BarSeries,
  bollingerBand,
  BollingerSeries,
  MovingAverageTooltip,
  MovingAverageTooltipOptions,
  RSISeries
} from 'react-financial-charts';
import { OHLCData } from '@/lib/types';

interface CandlestickChartProps {
  data: OHLCData[];
  width: number;
  height: number;
  ratio: number;
  isLoading: boolean;
  chartType: 'candles' | 'line';
}

// Helper to convert dates for discontinuous scale
function getDateAccessor(d: OHLCData): Date {
  return d.time;
}

// Create a time scale provider
const timeScaleProvider = discontinuousTimeScaleProviderBuilder()
  .inputDateAccessor(getDateAccessor);

const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  width,
  height,
  ratio,
  isLoading,
  chartType
}) => {
  const [xScaleProvider, setXScaleProvider] = useState<any>(null);
  const chartRef = useRef<ChartCanvas>(null);

  // Reset or zoom chart
  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetYDomain();
      chartRef.current.resetXDomain();
    }
  };

  // Update xScaleProvider when data changes
  useEffect(() => {
    if (data.length > 0) {
      const { data: timeScaleData, xScale, xAccessor, displayXAccessor } = 
        timeScaleProvider(data);
      
      setXScaleProvider({
        data: timeScaleData,
        xScale,
        xAccessor,
        displayXAccessor
      });
    }
  }, [data]);

  // Early return if no data or scale provider
  if (!xScaleProvider || data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-surface h-full w-full">
        <div className="text-textSecondary">
          {isLoading ? 'Loading market data...' : 'No data available'}
        </div>
      </div>
    );
  }

  // Get the visible data for the chart
  const { data: timeScaleData, xScale, xAccessor, displayXAccessor } = xScaleProvider;

  // Calculate margins
  const margin = { left: 70, right: 70, top: 30, bottom: 30 };
  
  // Calculate the visible data points based on the xScale
  const xExtents = [
    xAccessor(timeScaleData[Math.max(0, timeScaleData.length - 100)]),
    xAccessor(timeScaleData[timeScaleData.length - 1])
  ];

  // Format helpers for tooltips and axes
  const timeDisplayFormat = (time: Date) => format(time, 'HH:mm MMM dd');
  const priceDisplayFormat = (price: number) => price.toFixed(2);
  
  // Calculate chart grid height, leaving space for volume
  const gridHeight = height - margin.top - margin.bottom;
  const volumeHeight = gridHeight * 0.2; // 20% of the available height
  const candleHeight = gridHeight - volumeHeight;
  
  // Generate accessors
  const candleChartExtents = (d: OHLCData) => [d.high, d.low];
  const yExtents = candleChartExtents;
  const volumeAccessor = (d: OHLCData) => d.volume;
  const volumeExtents = (d: OHLCData) => volumeAccessor(d);

  // Generate color functions
  const candleFill = (d: OHLCData) => d.close > d.open ? 'hsl(var(--secondary))' : 'hsl(var(--accent))';
  const candleStroke = (d: OHLCData) => d.close > d.open ? 'hsl(var(--secondary))' : 'hsl(var(--accent))';
  const volumeColor = (d: OHLCData) => d.close > d.open ? 'hsla(var(--secondary), 0.3)' : 'hsla(var(--accent), 0.3)';

  return (
    <ChartCanvas
      ref={chartRef}
      height={height}
      width={width}
      ratio={ratio}
      margin={margin}
      data={timeScaleData}
      displayXAccessor={displayXAccessor}
      xAccessor={xAccessor}
      xScale={xScale}
      xExtents={xExtents}
      zoomAnchor={lastVisibleItemBasedZoomAnchor}
    >
      <Chart id={1} yExtents={yExtents} height={candleHeight}>
        <XAxis 
          showGridLines 
          gridLinesStrokeStyle="hsl(var(--chart-grid))" 
          tickStroke="hsl(var(--chart-axis))"
          tickLabelFill="hsl(var(--textSecondary))"
        />
        <YAxis 
          showGridLines 
          gridLinesStrokeStyle="hsl(var(--chart-grid))" 
          tickStroke="hsl(var(--chart-axis))"
          tickFormat={priceDisplayFormat} 
          tickLabelFill="hsl(var(--textSecondary))"
        />
        
        {chartType === 'candles' ? (
          <CandlestickSeries
            fill={candleFill}
            stroke={candleStroke}
            wickStroke={candleStroke}
          />
        ) : (
          <LineSeries
            yAccessor={(d: OHLCData) => d.close}
            strokeStyle="hsl(var(--primary))"
            strokeWidth={2}
          />
        )}
        
        <MouseCoordinateX
          at="bottom"
          orient="bottom"
          displayFormat={timeDisplayFormat}
        />
        <MouseCoordinateY
          at="right"
          orient="right"
          displayFormat={priceDisplayFormat}
        />
        
        <EdgeIndicator
          itemType="last"
          orient="right"
          edgeAt="right"
          yAccessor={(d: OHLCData) => d.close}
          fill={(d: OHLCData) => d.close > d.open ? 'hsl(var(--secondary))' : 'hsl(var(--accent))'}
        />
        
        <OHLCTooltip
          origin={[8, 16]}
          textFill="hsl(var(--textPrimary))"
          labelFill="hsl(var(--textSecondary))"
        />
      </Chart>
      
      <Chart 
        id={2} 
        height={volumeHeight} 
        origin={(w, h) => [0, h - volumeHeight]} 
        yExtents={volumeExtents}
      >
        <BarSeries
          yAccessor={volumeAccessor}
          fill={volumeColor}
        />
      </Chart>
      
      <CrossHairCursor
        strokeStyle="hsla(var(--chart-axis), 0.7)"
        strokeDasharray="4,3"
      />
    </ChartCanvas>
  );
};

// Use HOCs to make the chart responsive
const ResponsiveChart = withSize({ style: { width: '100%', height: '100%' } })(
  withDeviceRatio()(CandlestickChart)
);

export default ResponsiveChart;
