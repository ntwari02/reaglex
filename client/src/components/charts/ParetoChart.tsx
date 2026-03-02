import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface ParetoData {
  label: string;
  value: number;
  cumulative?: number;
}

interface ParetoChartProps {
  data: ParetoData[];
  title?: string;
  height?: number;
  valueLabel?: string;
  cumulativeLabel?: string;
}

export function ParetoChart({
  data,
  title,
  height = 400,
  valueLabel = 'Value',
  cumulativeLabel = 'Cumulative %',
}: ParetoChartProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.value - a.value);
  }, [data]);

  const total = useMemo(() => {
    return sortedData.reduce((sum, item) => sum + item.value, 0);
  }, [sortedData]);

  const dataWithCumulative = useMemo(() => {
    let cumulative = 0;
    return sortedData.map((item) => {
      cumulative += item.value;
      return {
        ...item,
        cumulative: (cumulative / total) * 100,
      };
    });
  }, [sortedData, total]);

  const maxValue = Math.max(...sortedData.map(d => d.value));
  const chartHeight = height - 80;
  const barWidth = Math.max(20, (100 / sortedData.length) - 2);

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      )}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 100 ${chartHeight + 60}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Bars */}
          {dataWithCumulative.map((item, index) => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = (index * (100 / sortedData.length)) + 1;
            const y = chartHeight - barHeight;
            
            return (
              <g key={index}>
                <motion.rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGradient)"
                  initial={{ height: 0, y: chartHeight }}
                  animate={{ height: barHeight, y: y }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="hover:opacity-80 transition-opacity"
                />
                {/* Value label on bar */}
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className="text-xs fill-gray-700 dark:fill-gray-300 font-medium"
                  fontSize="7"
                >
                  {item.value.toLocaleString()}
                </text>
                {/* Category label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 15}
                  textAnchor="middle"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                  fontSize="6"
                  transform={`rotate(-45 ${x + barWidth / 2} ${chartHeight + 15})`}
                >
                  {item.label.length > 10 ? item.label.substring(0, 10) + '...' : item.label}
                </text>
              </g>
            );
          })}

          {/* Cumulative line */}
          {dataWithCumulative.map((item, index) => {
            const x = (index * (100 / sortedData.length)) + 1 + barWidth / 2;
            const y = chartHeight - (item.cumulative! / 100) * chartHeight;
            const nextX = index < dataWithCumulative.length - 1
              ? ((index + 1) * (100 / sortedData.length)) + 1 + barWidth / 2
              : x;
            const nextY = index < dataWithCumulative.length - 1
              ? chartHeight - (dataWithCumulative[index + 1].cumulative! / 100) * chartHeight
              : y;

            return (
              <g key={`line-${index}`}>
                {index === 0 ? (
                  <motion.circle
                    cx={x}
                    cy={y}
                    r="2"
                    fill="url(#lineGradient)"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: sortedData.length * 0.05 + index * 0.1 }}
                  />
                ) : null}
                <motion.line
                  x1={x}
                  y1={y}
                  x2={nextX}
                  y2={nextY}
                  stroke="url(#lineGradient)"
                  strokeWidth="1.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: sortedData.length * 0.05 + index * 0.1 }}
                />
                {index < dataWithCumulative.length - 1 && (
                  <motion.circle
                    cx={nextX}
                    cy={nextY}
                    r="2"
                    fill="url(#lineGradient)"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: sortedData.length * 0.05 + (index + 1) * 0.1 }}
                  />
                )}
                {/* Cumulative percentage label */}
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  className="text-xs fill-blue-600 dark:fill-blue-400 font-medium"
                  fontSize="7"
                >
                  {item.cumulative!.toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Y-axis for bars */}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={chartHeight}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-300 dark:text-gray-700"
          />
          <line
            x1="0"
            y1={chartHeight}
            x2="100"
            y2={chartHeight}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-300 dark:text-gray-700"
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-6 text-xs pt-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-700 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">{valueLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-gradient-to-r from-red-500 to-orange-500"></div>
            <span className="text-gray-600 dark:text-gray-400">{cumulativeLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

