import React from 'react';
import { motion } from 'framer-motion';

interface FunnelStage {
  label: string;
  value: number;
  percentage: number | string;
  dropOff?: string;
  color?: string;
}

interface FunnelChartProps {
  data: FunnelStage[];
  title?: string;
  height?: number;
}

export function FunnelChart({ data, title, height = 400 }: FunnelChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));

  // Treat stageHeight as the total allocation (bar + drop-off text) so the chart never overflows its container
  const stageHeight = Math.max(40, (height - (data.length - 1) * 30) / data.length);
  
  return (
    <div className="w-full overflow-hidden">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      )}
      <div className="space-y-3 overflow-hidden" style={{ height: `${height}px` }}>
        {data.map((stage, index) => {
          const widthPercentage = (stage.value / maxValue) * 100;
          const isLast = index === data.length - 1;
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
              style={{ height: `${stageHeight}px` }}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-3 flex-1 min-h-[32px]">
                  <div className="w-28 text-xs font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                    {stage.label}
                  </div>
                  <div className="flex-1 relative min-w-0 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPercentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className={`h-full rounded-lg ${
                        stage.color || 'bg-gradient-to-r from-red-500 to-orange-500'
                      } shadow-lg relative overflow-hidden max-w-full`}
                      style={{ maxWidth: '100%' }}
                    >
                      <div className="absolute inset-0 flex items-center justify-between px-3 min-w-0">
                        <span className="text-white font-semibold text-xs whitespace-nowrap truncate">
                          {stage.value.toLocaleString()}
                        </span>
                        <span className="text-white/90 text-xs font-medium whitespace-nowrap ml-2">
                          {typeof stage.percentage === 'string' ? stage.percentage : stage.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </motion.div>
                    {!isLast && (
                      <div className="absolute -bottom-1 left-0 right-0 flex justify-center pointer-events-none">
                        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[6px] border-t-gray-200 dark:border-t-gray-700"></div>
                      </div>
                    )}
                  </div>
                </div>
                {!isLast && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-32">
                    {stage.dropOff || ((stage.value - data[index + 1].value) / stage.value * 100).toFixed(1)}% drop-off
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

