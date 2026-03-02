import React from 'react';
import { motion } from 'framer-motion';

interface CohortData {
  cohort: string; // e.g., "Jan 2024"
  periods: { [period: string]: number }; // e.g., { "Month 1": 100, "Month 2": 85, ... }
}

interface CohortChartProps {
  data: CohortData[];
  title?: string;
}

export function CohortChart({ data, title }: CohortChartProps) {
  // Get all unique periods
  const allPeriods = React.useMemo(() => {
    const periods = new Set<string>();
    data.forEach(cohort => {
      Object.keys(cohort.periods).forEach(period => periods.add(period));
    });
    return Array.from(periods).sort();
  }, [data]);

  // Find max value for color scaling
  const maxValue = React.useMemo(() => {
    return Math.max(...data.flatMap(c => Object.values(c.periods)));
  }, [data]);

  const getColorIntensity = (value: number) => {
    const ratio = value / maxValue;
    if (ratio >= 0.8) return 'bg-green-600';
    if (ratio >= 0.6) return 'bg-green-500';
    if (ratio >= 0.4) return 'bg-yellow-500';
    if (ratio >= 0.2) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full overflow-x-auto">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      )}
      <div className="inline-block min-w-full">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                Cohort
              </th>
              {allPeriods.map((period) => (
                <th
                  key={period}
                  className="text-center p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 min-w-[80px]"
                >
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((cohort, rowIndex) => (
              <motion.tr
                key={cohort.cohort}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rowIndex * 0.05 }}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="p-3 text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                  {cohort.cohort}
                </td>
                {allPeriods.map((period, colIndex) => {
                  const value = cohort.periods[period] || 0;
                  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  
                  return (
                    <td
                      key={period}
                      className="p-3 text-center border-b border-gray-200 dark:border-gray-700"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: rowIndex * 0.05 + colIndex * 0.02 }}
                        className={`inline-block px-3 py-2 rounded ${getColorIntensity(value)} text-white text-xs font-semibold min-w-[60px]`}
                      >
                        {value > 0 ? `${value}%` : '-'}
                      </motion.div>
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs">
        <span className="text-gray-600 dark:text-gray-400">Retention Rate:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">80-100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">60-79%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">40-59%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">20-39%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">0-19%</span>
        </div>
      </div>
    </div>
  );
}

