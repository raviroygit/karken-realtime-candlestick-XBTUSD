import React, { useRef, useState, useEffect } from "react";
import { format } from "date-fns";
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
} from "react-financial-charts";
import {
  discontinuousTimeScaleProviderBuilder,
  CandlestickSeries,
  LineSeries,
  BarSeries,
} from "react-financial-charts";
import { OHLCData } from "@/lib/types";

interface CandlestickChartProps {
  data: OHLCData[];
  width: number;  // ✅ Ensure width is required
  height: number; // ✅ Ensure height is required
  ratio: number;  // ✅ Ensure ratio is required
  isLoading: boolean;
  chartType: "candles" | "line";
}


const getDateAccessor = (d: OHLCData): Date => d.time;

const timeScaleProvider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(getDateAccessor);

const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  width,
  height,
  ratio,
  isLoading,
  chartType,
}) => {
  const [xScaleProvider, setXScaleProvider] = useState<any>(null);
  const chartRef = useRef<ChartCanvas<number> | null>(null);

  useEffect(() => {
    if (data.length > 0) {
      const { data: timeScaleData, xScale, xAccessor, displayXAccessor } = timeScaleProvider(data);
      setXScaleProvider({ data: timeScaleData, xScale, xAccessor, displayXAccessor });
    }
  }, [data]);

  if (!xScaleProvider || data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-surface h-full w-full">
        <div className="text-textSecondary">{isLoading ? "Loading market data..." : "No data available"}</div>
      </div>
    );
  }

  const { data: timeScaleData, xScale, xAccessor, displayXAccessor } = xScaleProvider;

  const margin = { left: 70, right: 70, top: 30, bottom: 30 };
  const xExtents = [
    xAccessor(timeScaleData[Math.max(0, timeScaleData.length - 100)]),
    xAccessor(timeScaleData[timeScaleData.length - 1]),
  ];

  const timeDisplayFormat = (time: Date) => format(time, "HH:mm MMM dd");
  const priceDisplayFormat = (price: number) => price.toFixed(2);

  const gridHeight = height - margin.top - margin.bottom;
  const volumeHeight = gridHeight * 0.2;
  const candleHeight = gridHeight - volumeHeight;

  const candleChartExtents = (d: OHLCData) => [d.high, d.low];
  const yExtents = candleChartExtents;
  const volumeAccessor = (d: OHLCData) => d.volume;
  const volumeExtents = (d: OHLCData) => volumeAccessor(d);

  const candleFill = (d: OHLCData) => (d.close > d.open ? "#26a69a" : "#ef5350");
  const candleStroke = (d: OHLCData) => (d.close > d.open ? "#26a69a" : "#ef5350");
  const volumeColor = (d: OHLCData) => (d.close > d.open ? "rgba(38, 166, 154, 0.3)" : "rgba(239, 83, 80, 0.3)");

  return (
    <ChartCanvas<number>
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
      seriesName="CandlestickSeries"
    >
      <Chart id={1} yExtents={yExtents} height={candleHeight}>
        <XAxis
          showGridLines
          gridLinesStrokeStyle="hsl(var(--chart-grid))"
          tickStrokeStyle="hsl(var(--chart-axis))"
          tickLabelFill="hsl(var(--textSecondary))"
        />
        <YAxis
          showGridLines
          gridLinesStrokeStyle="hsl(var(--chart-grid))"
          tickStrokeStyle="hsl(var(--chart-axis))"
          tickFormat={priceDisplayFormat}
          tickLabelFill="hsl(var(--textSecondary))"
        />

        {chartType === "candles" ? (
          <CandlestickSeries fill={candleFill} stroke={candleStroke} wickStroke={candleStroke} />
        ) : (
          <LineSeries yAccessor={(d: OHLCData) => d.close} strokeStyle="hsl(var(--primary))" strokeWidth={2} />
        )}

        <MouseCoordinateX at="bottom" orient="bottom" displayFormat={timeDisplayFormat} />
        <MouseCoordinateY at="right" orient="right" displayFormat={priceDisplayFormat} />

        <EdgeIndicator
          itemType="last"
          orient="right"
          edgeAt="right"
          yAccessor={(d: OHLCData) => d.close}
          fill={(d: OHLCData) => (d.close > d.open ? "hsl(var(--secondary))" : "hsl(var(--accent))")}
        />

        <OHLCTooltip origin={[8, 16]} textFill="hsl(var(--textPrimary))" labelFill="hsl(var(--textSecondary))" />
      </Chart>

      <Chart id={2} height={volumeHeight} origin={(w, h) => [0, h - volumeHeight]} yExtents={volumeExtents}>
      <BarSeries yAccessor={volumeAccessor} fillStyle={(d: OHLCData) => (d.close > d.open ? "rgba(38, 166, 154, 0.3)" : "rgba(239, 83, 80, 0.3)")} />
      </Chart>

      <CrossHairCursor strokeDasharray="ShortDash" />
      </ChartCanvas>
  );
};

const ResponsiveChart = withSize()(
  withDeviceRatio()(React.memo(CandlestickChart))
);

export default ResponsiveChart;
