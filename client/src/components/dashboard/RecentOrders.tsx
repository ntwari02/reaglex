import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Package } from 'lucide-react';

interface Order {
  id: string;
  customer: string;
  amount: string;
  status: 'processing' | 'shipped' | 'delivered';
  time: string;
}

interface RecentOrdersProps {
  orders?: Order[];
}

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders: ordersProp = [] }) => {
  const navigate = useNavigate();
  
  const orders: Order[] = ordersProp;

  const statusColors: Record<string, string> = {
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    shipped: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  return (
    <div className="dashboard-surface rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 shadow-xl h-[364px] flex flex-col transition-colors duration-300">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
          <Package className="w-6 h-6 text-red-400" />
          Recent Orders
        </h2>
        <button 
          onClick={() => navigate('/seller/orders')}
          className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
        >
          View All
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto overflow-x-hidden scroll-smooth flex-1 pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-4">
            <Package className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No orders yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              New orders will appear here as customers purchase from your store.
            </p>
          </div>
        ) : orders.map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, x: 5 }}
            className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700/50 hover:border-red-500/50 transition-all cursor-pointer flex-shrink-0"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white transition-colors duration-300">{order.id}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">{order.customer}</p>
              </div>
              <span className="font-bold text-gray-900 dark:text-white transition-colors duration-300">{order.amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[order.status]} font-medium`}>
                {order.status}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 transition-colors duration-300">
                <Clock className="w-3 h-3" />
                {order.time}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecentOrders;

