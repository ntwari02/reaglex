import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DataPoint {
  date: string;
  value: number;
  isForecast?: boolean;
}

interface BarChartProps {
  data: DataPoint[];
  forecastData?: DataPoint[];
  title?: string;
  height?: number;
  color?: string;
  forecastColor?: string;
  yAxisLabel?: string;
  annotations?: Array<{ date: string; label: string; value: number }>;
}

export function BarChart({
  data,
  forecastData = [],
  title,
  height = 300,
  color = 'from-red-500 to-orange-500',
  forecastColor = 'from-blue-500 to-purple-500',
  yAxisLabel = 'Value',
  annotations = [],
}: BarChartProps) {
  const [hoveredBar, setHoveredBar] = useState<{ index: number; type: 'historical' | 'forecast'; point: DataPoint } | null>(null);
  const allData = [...data, ...forecastData];
  const maxValue = Math.max(...allData.map(d => d.value));
  const minValue = Math.min(...allData.map(d => d.value));
  const range = maxValue - minValue || 1;
  const chartHeight = height - 90;
  const chartWidth = Math.max(allData.length * 80, 600);
  const barSpacing = chartWidth / allData.length;
  const barWidth = barSpacing * 0.7;

  const getYPosition = (value: number) => {
    return chartHeight - ((value - minValue) / range) * chartHeight;
  };

  const getBarHeight = (value: number) => {
    return ((value - minValue) / range) * chartHeight;
  };

  const getXPosition = (index: number) => {
    return (index * barSpacing) + (barSpacing / 2) - (barWidth / 2);
  };


  const averageValue = allData.reduce((sum, point) => sum + point.value, 0) / allData.length;
  const averageLineY = getYPosition(averageValue);
  const latestValue = allData[allData.length - 1]?.value ?? 0;
  const firstValue = allData[0]?.value ?? 0;
  const growthPercent = firstValue ? ((latestValue - firstValue) / firstValue) * 100 : 0;
  const peakPoint = allData.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), allData[0]);
  const lowPoint = allData.reduce((prev, curr) => (curr.value < prev.value ? curr : prev), allData[0]);

  return (
    <div className="w-full relative">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      )}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 90}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Historical bars */}
          {data.map((point, index) => {
            const x = getXPosition(index);
            const barHeight = getBarHeight(point.value);
            const y = chartHeight - barHeight;
            
            return (
              <g key={`historical-${index}`}>
                <motion.rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGradient)"
                  rx="2"
                  initial={{ height: 0, y: chartHeight }}
                  animate={{ height: barHeight, y: y }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  onMouseEnter={() => setHoveredBar({ index, type: 'historical', point })}
                  onMouseLeave={() => setHoveredBar(null)}
                />
              </g>
            );
          })}

          {/* Forecast bars */}
          {forecastData.map((point, index) => {
            const dataIndex = data.length + index;
            const x = getXPosition(dataIndex);
            const barHeight = getBarHeight(point.value);
            const y = chartHeight - barHeight;
            
            return (
              <g key={`forecast-${index}`}>
                <motion.rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#forecastBarGradient)"
                  rx="2"
                  strokeDasharray="4,2"
                  stroke="url(#forecastBarGradient)"
                  strokeWidth="1"
                  initial={{ height: 0, y: chartHeight }}
                  animate={{ height: barHeight, y: y }}
                  transition={{ duration: 0.5, delay: (data.length + index) * 0.05 }}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  onMouseEnter={() => setHoveredBar({ index: dataIndex, type: 'forecast', point })}
                  onMouseLeave={() => setHoveredBar(null)}
                />
              </g>
            );
          })}


          {/* Divider line between historical and forecast */}
          {forecastData.length > 0 && (
            <line
              x1={getXPosition(data.length) + barWidth / 2}
              y1="0"
              x2={getXPosition(data.length) + barWidth / 2}
              y2={chartHeight}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4,4"
              className="text-gray-400 dark:text-gray-600"
            />
          )}


          {/* Gradients */}
          <defs>
            <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="forecastBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* Annotation markers */}
          {annotations.map((annotation, idx) => {
            const dataIndex = allData.findIndex(point => point.date === annotation.date);
            if (dataIndex === -1) return null;
            const x = getXPosition(dataIndex) + barWidth / 2;
            const y = getYPosition(annotation.value);
            return (
              <g key={`annotation-${idx}`}>
                <line
                  x1={x}
                  y1={chartHeight}
                  x2={x}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="2,2"
                  className="text-yellow-500 dark:text-yellow-400"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="1.6"
                  fill="#fbbf24"
                  stroke="#fff"
                  strokeWidth="0.4"
                />
                <text
                  x={x}
                  y={Math.max(y - 4, 8)}
                  textAnchor="middle"
                  className="text-[7px] fill-yellow-600 dark:fill-yellow-300 font-semibold"
                >
                  {annotation.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute top-0 right-0 flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Historical</span>
          </div>
          {forecastData.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded border-2 border-dashed border-blue-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Forecast</span>
            </div>
          )}
        </div>

        {/* Hover Tooltip */}
        <AnimatePresence>
          {hoveredBar && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute z-50 bg-gray-900 dark:bg-gray-800 text-white px-3 py-2 rounded-lg shadow-xl border border-gray-700 pointer-events-none"
              style={{
                left: `${((hoveredBar.index + 0.5) * barSpacing / chartWidth) * 100}%`,
                top: '10px',
                transform: 'translateX(-50%)',
              }}
            >
              <div className="text-xs space-y-1">
                <div className="font-semibold">
                  {new Date(hoveredBar.point.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </div>
                <div className="text-gray-300">
                  Revenue: <span className="font-semibold text-white">${hoveredBar.point.value.toLocaleString()}</span>
                </div>
                <div className="text-gray-400 text-[10px]">
                  Type: {hoveredBar.type === 'historical' ? 'Historical' : 'Forecast'}
                </div>
              </div>
              {/* Arrow */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Insight summary */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50">
          <p className="text-gray-500 dark:text-gray-400">Avg Revenue</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">${Math.round(averageValue).toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40">
          <p className="text-gray-600 dark:text-gray-300">Growth</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            {growthPercent >= 0 ? '+' : ''}
            {growthPercent.toFixed(1)}%
          </p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
          <p className="text-gray-600 dark:text-gray-300">Range</p>
          <p className="text-sm text-gray-900 dark:text-white">
            Peak {peakPoint?.value.toLocaleString()} • Low {lowPoint?.value.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
