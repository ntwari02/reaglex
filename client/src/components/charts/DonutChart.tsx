import React from 'react';
import { motion } from 'framer-motion';

interface DonutChartProps {
  value: number;
  maxValue?: number;
  title?: string;
  label?: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
}

export function DonutChart({
  value,
  maxValue = 100,
  title,
  label,
  color = 'from-orange-500 to-orange-600',
  size = 120,
  strokeWidth = 12,
}: DonutChartProps) {
  const percentage = (value / maxValue) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="w-full flex flex-col items-center">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      )}
      <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200 dark:text-gray-700"
          />
          
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#donutGradient)`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="text-center"
          >
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {percentage.toFixed(1)}%
            </div>
            {label && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {label}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

