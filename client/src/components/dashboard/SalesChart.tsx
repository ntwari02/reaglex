import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

interface ChartData {
  date: string;
  revenue: number;
  orders: number;
}

interface SalesChartProps {
  data?: ChartData[];
  timeRange?: 'week' | 'month' | 'year';
}

const SalesChart: React.FC<SalesChartProps> = ({ data: propData, timeRange = 'week' }) => {
  // Transform API data to chart format based on time range
  const transformData = (apiData: ChartData[], range: 'week' | 'month' | 'year'): Array<{ label: string; sales: number; date: string }> => {
    // Sort by date
    const sortedData = apiData ? [...apiData].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }) : [];

    // Create a map of date to revenue for quick lookup
    const dataMap = new Map<string, number>();
    sortedData.forEach((item) => {
      dataMap.set(item.date, item.revenue);
    });

    const result: Array<{ label: string; sales: number; date: string }> = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (range === 'week') {
      // Show last 7 days
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        result.push({
          label: dayNames[date.getDay()],
          sales: dataMap.get(dateStr) || 0,
          date: dateStr,
        });
      }
    } else if (range === 'month') {
      // Show last 30 days, with labels showing dates
      // We'll show approximately 7-8 evenly spaced data points for better readability
      const daysToShow = 30;
      const numPoints = 7; // Show 7 points
      const interval = Math.floor(daysToShow / (numPoints - 1)); // Evenly space them
      
      for (let i = 0; i < numPoints; i++) {
        const daysAgo = daysToShow - 1 - (i * interval);
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        const dateStr = date.toISOString().split('T')[0];
        
        // Aggregate sales for a small window around this date (to smooth the data)
        let totalSales = 0;
        const windowSize = Math.max(1, Math.floor(interval / 2));
        for (let j = -windowSize; j <= windowSize; j++) {
          const checkDate = new Date(date);
          checkDate.setDate(checkDate.getDate() + j);
          const checkDateStr = checkDate.toISOString().split('T')[0];
          totalSales += dataMap.get(checkDateStr) || 0;
        }
        
        // Format label as "MMM DD" (e.g., "Jan 15")
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        result.push({
          label: `${monthNames[date.getMonth()]} ${date.getDate()}`,
          sales: totalSales,
          date: dateStr,
        });
      }
    } else if (range === 'year') {
      // Show last 12 months
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        date.setDate(1); // First day of month
        
        // Aggregate sales for the entire month
        let totalSales = 0;
        const year = date.getFullYear();
        const month = date.getMonth();
        
        // Sum all sales for this month
        dataMap.forEach((revenue, dateStr) => {
          const checkDate = new Date(dateStr);
          if (checkDate.getFullYear() === year && checkDate.getMonth() === month) {
            totalSales += revenue;
          }
        });
        
        result.push({
          label: monthNames[month],
          sales: totalSales,
          date: date.toISOString().split('T')[0],
        });
      }
    }

    return result;
  };

  const data = transformData(propData || [], timeRange);

  const maxSales = data.length > 0 ? Math.max(...data.map(d => d.sales), 1) : 1;

  return (
    <div className="w-full h-full flex flex-col transition-colors duration-300">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
            <BarChart3 className="w-6 h-6 text-red-400" />
            Sales Overview
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 transition-colors duration-300">
            {timeRange === 'week' ? 'Daily revenue overview' : timeRange === 'month' ? 'Monthly revenue overview' : 'Yearly revenue overview'}
          </p>
        </div>
        <select className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700/50 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-300">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </div>

      <div className="flex items-end justify-between gap-2 flex-1 min-h-0 pb-2">
        {data.length > 0 ? data.map((item, index) => {
          const heightPercentage = maxSales > 0 ? Math.max((item.sales / maxSales) * 100, 2) : 0;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPercentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="w-full bg-gradient-to-t from-red-600 to-orange-500 rounded-t-lg relative group cursor-pointer hover:from-red-500 hover:to-orange-400 transition-all min-h-[4px]"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  ${item.sales.toLocaleString()}
                </div>
              </motion.div>
              <span className="text-gray-600 dark:text-gray-400 text-xs font-medium transition-colors duration-300 whitespace-nowrap">{item.label}</span>
            </div>
          );
        }) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No sales data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesChart;

