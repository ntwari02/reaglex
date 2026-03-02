import React from 'react';
import { motion } from 'framer-motion';

interface DataPoint {
  date: string;
  value: number;
  isForecast?: boolean;
}

interface AreaChartProps {
  data: DataPoint[];
  forecastData?: DataPoint[];
  title?: string;
  height?: number;
  color?: string;
  forecastColor?: string;
  yAxisLabel?: string;
  annotations?: Array<{ date: string; label: string; value: number }>;
}

export function AreaChart({
  data,
  forecastData = [],
  title,
  height = 300,
  color = 'from-red-500 to-orange-500',
  forecastColor = 'from-blue-500 to-purple-500',
  yAxisLabel = 'Value',
  annotations = [],
}: AreaChartProps) {
  const allData = [...data, ...forecastData];
  const maxValue = Math.max(...allData.map(d => d.value));
  const minValue = Math.min(...allData.map(d => d.value));
  const range = maxValue - minValue || 1;
  const chartHeight = height - 80;
  const chartWidth = 100;
  const barWidth = chartWidth / allData.length;

  const getYPosition = (value: number) => {
    return chartHeight - ((value - minValue) / range) * chartHeight;
  };

  const getXPosition = (index: number) => {
    return (index * barWidth) + (barWidth / 2);
  };

  // Create area path for historical data
  const createAreaPath = (dataPoints: DataPoint[]) => {
    if (dataPoints.length === 0) return '';
    
    const points = dataPoints.map((point, index) => {
      const x = getXPosition(index);
      const y = getYPosition(point.value);
      return `${x},${y}`;
    });

    const firstX = getXPosition(0);
    const lastX = getXPosition(dataPoints.length - 1);
    const bottomY = chartHeight;

    return `M ${firstX} ${bottomY} L ${points.join(' L ')} L ${lastX} ${bottomY} Z`;
  };

  const historicalPath = createAreaPath(data);
  const forecastPath = forecastData.length > 0 
    ? createAreaPath([data[data.length - 1], ...forecastData])
    : '';

  // Create line path
  const createLinePath = (dataPoints: DataPoint[]) => {
    if (dataPoints.length === 0) return '';
    
    return dataPoints.map((point, index) => {
      const x = getXPosition(index);
      const y = getYPosition(point.value);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  };

  const historicalLinePath = createLinePath(data);
  const forecastLinePath = forecastData.length > 0 
    ? createLinePath([data[data.length - 1], ...forecastData])
    : '';

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      )}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`}
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

          {/* Historical area */}
          <motion.path
            d={historicalPath}
            fill={`url(#areaGradient)`}
            fillOpacity="0.3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5 }}
          />

          {/* Forecast area */}
          {forecastPath && (
            <motion.path
              d={forecastPath}
              fill={`url(#forecastAreaGradient)`}
              fillOpacity="0.2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 1.5 }}
            />
          )}

          {/* Historical line */}
          <motion.path
            d={historicalLinePath}
            fill="none"
            stroke={`url(#lineGradient)`}
            strokeWidth="3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5 }}
          />

          {/* Forecast line (dashed) */}
          {forecastLinePath && (
            <motion.path
              d={forecastLinePath}
              fill="none"
              stroke={`url(#forecastLineGradient)`}
              strokeWidth="3"
              strokeDasharray="6,4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 1.5 }}
            />
          )}

          {/* Data points */}
          {data.map((point, index) => {
            const x = getXPosition(index);
            const y = getYPosition(point.value);
            return (
              <g key={`historical-${index}`}>
                <motion.circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={`url(#lineGradient)`}
                  stroke="white"
                  strokeWidth="2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                />
                {/* Value label on hover area */}
                <title>{`${new Date(point.date).toLocaleDateString()}: $${point.value.toLocaleString()}`}</title>
              </g>
            );
          })}

          {/* Forecast points */}
          {forecastData.map((point, index) => {
            const x = getXPosition(data.length + index);
            const y = getYPosition(point.value);
            return (
              <g key={`forecast-${index}`}>
                <motion.circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={`url(#forecastLineGradient)`}
                  stroke="white"
                  strokeWidth="2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.5 + index * 0.1 }}
                />
                <title>{`${new Date(point.date).toLocaleDateString()}: $${point.value.toLocaleString()} (Forecast)`}</title>
              </g>
            );
          })}

          {/* Annotations */}
          {annotations.map((annotation, index) => {
            const pointIndex = allData.findIndex(d => d.date === annotation.date);
            if (pointIndex === -1) return null;
            const x = getXPosition(pointIndex);
            const y = getYPosition(annotation.value);
            return (
              <g key={`annotation-${index}`}>
                <line
                  x1={x}
                  y1={y - 15}
                  x2={x}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-blue-500"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="currentColor"
                  className="text-blue-500"
                />
                <text
                  x={x}
                  y={y - 20}
                  textAnchor="middle"
                  className="text-xs fill-blue-600 dark:fill-blue-400 font-semibold"
                  fontSize="8"
                >
                  {annotation.label}
                </text>
              </g>
            );
          })}

          {/* Gradients */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <linearGradient id="forecastAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="forecastLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* X-axis labels */}
          {allData.map((point, index) => {
            if (index % Math.ceil(allData.length / 8) !== 0 && index !== allData.length - 1) return null;
            const x = getXPosition(index);
            return (
              <text
                key={`xlabel-${index}`}
                x={x}
                y={chartHeight + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600 dark:fill-gray-400"
                fontSize="7"
              >
                {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute top-0 right-0 flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Historical</span>
          </div>
          {forecastData.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-gradient-to-r from-blue-500 to-purple-500 border-dashed border-t-2"></div>
              <span className="text-gray-600 dark:text-gray-400">Forecast</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

