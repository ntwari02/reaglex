import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComboChartData {
  label: string;
  barValue: number;
  lineValue: number;
}

interface ComboChartProps {
  data: ComboChartData[];
  title?: string;
  barLabel?: string;
  lineLabel?: string;
  barColor?: string;
  lineColor?: string;
  height?: number;
}

export function ComboChart({
  data,
  title,
  barLabel = 'Bar Data',
  lineLabel = 'Line Data',
  barColor = 'from-orange-500 to-orange-600',
  lineColor = '#22c55e',
  height = 300,
}: ComboChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxBarValue = Math.max(...data.map(d => d.barValue));
  const maxLineValue = Math.max(...data.map(d => d.lineValue));
  const maxValue = Math.max(maxBarValue, maxLineValue);
  const chartHeight = height - 90;
  const chartWidth = Math.max(data.length * 80, 600);
  const barSpacing = chartWidth / data.length;
  const barWidth = barSpacing * 0.45;
  const axisY = chartHeight;

  const getBarHeight = (value: number) => (value / maxValue) * chartHeight;
  const getLineY = (value: number) => chartHeight - (value / maxValue) * chartHeight;
  const getXPosition = (index: number) => (index * barSpacing) + (barSpacing / 2) - (barWidth / 2);

  const linePoints = data.map((point, index) => {
    const x = getXPosition(index) + barWidth / 2;
    const y = getLineY(point.lineValue);
    return { x, y, point, index };
  });

  const linePath = linePoints
    .map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  const areaPath = linePoints.length
    ? `${linePath} L ${linePoints[linePoints.length - 1].x} ${chartHeight} L ${linePoints[0].x} ${chartHeight} Z`
    : '';

  const averageLineValue = data.reduce((sum, point) => sum + point.lineValue, 0) / data.length;
  const averageLineY = getLineY(averageLineValue);
  const tooltipPoint = hoveredIndex !== null ? data[hoveredIndex] : null;
  const tooltipXPercent =
    hoveredIndex !== null ? ((hoveredIndex + 0.5) * barSpacing / chartWidth) * 100 : 0;

  return (
    <div className="w-full relative">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      )}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 80}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - (ratio * chartHeight);
            const value = maxValue * ratio;
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
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {/* Average reference line */}
          <line
            x1="0"
            y1={averageLineY}
            x2={chartWidth}
            y2={averageLineY}
            stroke="currentColor"
            strokeDasharray="4,4"
            strokeWidth="0.8"
            className="text-green-300 dark:text-green-700"
          />
          <text
            x={chartWidth}
            y={averageLineY - 2}
            textAnchor="end"
            className="text-[7px] fill-green-600 dark:fill-green-400"
          >
            Avg {Math.round(averageLineValue)}
          </text>

          {/* Area under line for context */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#areaGradient)"
              opacity="0.15"
            />
          )}

          {/* Line path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Bars */}
          {data.map((point, index) => {
            const x = getXPosition(index);
            const barHeight = getBarHeight(point.barValue);
            const y = axisY - barHeight;
            
            return (
              <g key={`bar-${index}`}>
                <motion.rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGradient)"
                  rx="2"
                  initial={{ height: 0, y: axisY }}
                  animate={{ height: barHeight, y: y }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}

          {/* Line data points */}
          {linePoints.map(({ x, y, index }) => (
            <circle
              key={`line-point-${index}`}
              cx={x}
              cy={y}
              r={hoveredIndex === index ? 1.8 : 1.3}
              fill={lineColor}
              stroke="#fff"
              strokeWidth="0.4"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}

          {/* X-axis line */}
          <line
            x1="0"
            y1={axisY}
            x2={chartWidth}
            y2={axisY}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-300 dark:text-gray-600"
          />

          {/* X-axis labels */}
          {data.map((point, index) => (
            <text
              key={`label-${index}`}
              x={getXPosition(index) + barWidth / 2}
              y={chartHeight + 12}
              textAnchor="middle"
              className="text-[8px] fill-gray-500 dark:fill-gray-400"
            >
              {point.label}
            </text>
          ))}

          {/* Y-axis label */}
          <text
            x="-25"
            y={chartHeight / 2}
            textAnchor="middle"
            className="text-[9px] fill-gray-700 dark:fill-gray-300"
            transform={`rotate(-90 -25 ${chartHeight / 2})`}
          >
            Performance Index
          </text>

          {/* Gradients */}
          <defs>
            <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.5" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Legend */}
        <div className="absolute top-0 right-0 flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">{barLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lineColor }}></div>
            <span className="text-gray-600 dark:text-gray-400">{lineLabel}</span>
          </div>
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {tooltipPoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute z-50 bg-gray-900 dark:bg-gray-800 text-white px-3 py-2 rounded-lg shadow-xl border border-gray-700 pointer-events-none text-xs"
              style={{
                left: `${tooltipXPercent}%`,
                top: '8px',
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-semibold mb-1">{tooltipPoint.label}</div>
              <div className="flex items-center gap-4">
                <div className="text-gray-300">
                  {barLabel}: <span className="text-white font-semibold">{tooltipPoint.barValue.toLocaleString()}</span>
                </div>
                <div className="text-gray-300">
                  {lineLabel}: <span className="text-white font-semibold">{tooltipPoint.lineValue.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

