import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface DataPoint {
  date: string;
  value: number;
  isForecast?: boolean;
  annotation?: string;
}

interface TooltipData {
  x: number;
  y: number;
  value: number;
  date: string;
  label?: string;
  type: 'historical' | 'forecast' | 'annotation';
}

interface TrendLineChartProps {
  data: DataPoint[];
  forecastData?: DataPoint[];
  title?: string;
  height?: number;
  color?: string;
  yAxisLabel?: string;
  annotations?: Array<{ date: string; label: string; value: number }>;
}

export function TrendLineChart({
  data,
  forecastData = [],
  title,
  height = 300,
  color = 'from-red-500 to-orange-500',
  yAxisLabel = 'Value',
  annotations = [],
}: TrendLineChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const allData = [...data, ...forecastData];
  const maxValue = Math.max(...allData.map(d => d.value));
  const minValue = Math.min(...allData.map(d => d.value));
  const range = maxValue - minValue || 1;
  const chartHeight = height - 60;
  const chartWidth = 100;

  const getYPosition = (value: number) => {
    return chartHeight - ((value - minValue) / range) * chartHeight;
  };

  const getXPosition = (index: number, total: number) => {
    return (index / (total - 1)) * chartWidth;
  };

  // Create path for the line
  const createPath = (dataPoints: DataPoint[]) => {
    return dataPoints.map((point, index) => {
      const x = getXPosition(index, dataPoints.length);
      const y = getYPosition(point.value);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  };

  const historicalPath = createPath(data);

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      )}
      <div ref={containerRef} className="relative" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - (ratio * chartHeight);
            const value = minValue + (range * ratio);
            return (
              <g key={ratio}>
                <line
                  x1="0"
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-gray-200 dark:text-gray-700"
                  strokeDasharray="2,2"
                />
                <text
                  x="-2"
                  y={y + 3}
                  textAnchor="end"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                  fontSize="8"
                >
                  ${(value / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}

          {/* Historical line */}
          <motion.path
            d={historicalPath}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5 }}
          />

          {/* Data points */}
          {data.map((point, index) => {
            const x = getXPosition(index, data.length);
            const y = getYPosition(point.value);
            return (
              <motion.circle
                key={`historical-${index}`}
                cx={x}
                cy={y}
                r="1.2"
                fill="url(#gradient)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="cursor-pointer"
                style={{ pointerEvents: 'all' }}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    const svgX = (x / chartWidth) * rect.width;
                    const svgY = (y / (chartHeight + 40)) * rect.height;
                    setTooltip({ x: svgX, y: svgY, value: point.value, date: point.date, type: 'historical' });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}

          {/* Forecast points */}
          {forecastData.map((point, index) => {
            const x = getXPosition(data.length + index, allData.length);
            const y = getYPosition(point.value);
            return (
              <motion.circle
                key={`forecast-${index}`}
                cx={x}
                cy={y}
                r="1.2"
                fill="url(#gradientForecast)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.5 + index * 0.1 }}
                className="cursor-pointer"
                style={{ pointerEvents: 'all' }}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    const svgX = (x / chartWidth) * rect.width;
                    const svgY = (y / (chartHeight + 40)) * rect.height;
                    setTooltip({ x: svgX, y: svgY, value: point.value, date: point.date, type: 'forecast' });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}

          {/* Annotation markers (no labels) */}
          {annotations.map((annotation, index) => {
            const pointIndex = allData.findIndex(d => d.date === annotation.date);
            if (pointIndex === -1) return null;
            const x = getXPosition(pointIndex, allData.length);
            const y = getYPosition(annotation.value);
            return (
              <g key={`annotation-${index}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="1.5"
                  fill="currentColor"
                  className="text-blue-500 cursor-pointer"
                  style={{ pointerEvents: 'all' }}
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      const svgX = (x / chartWidth) * rect.width;
                      const svgY = (y / (chartHeight + 40)) * rect.height;
                      setTooltip({ x: svgX, y: svgY, value: annotation.value, date: annotation.date, label: annotation.label, type: 'annotation' });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              </g>
            );
          })}

          {/* Gradients */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <linearGradient id="gradientForecast" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
            </linearGradient>
          </defs>

        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 transform -translate-x-1/2 -translate-y-full"
            style={{ left: tooltip.x, top: tooltip.y - 10 }}
          >
            <div className="bg-gray-900 dark:bg-gray-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
              {tooltip.label && (
                <div className="font-semibold text-blue-400 mb-1">{tooltip.label}</div>
              )}
              <div className="font-medium">${tooltip.value.toLocaleString()}</div>
              <div className="text-gray-400 text-xs">
                {new Date(tooltip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              {tooltip.type === 'forecast' && (
                <div className="text-purple-400 text-xs mt-1">Forecast</div>
              )}
            </div>
            <div className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-0 right-0 flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-gradient-to-r from-red-500 to-orange-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Historical</span>
          </div>
          {forecastData.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Forecast</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

