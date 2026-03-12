import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Search,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { adminSupportAPI } from '@/lib/api';
import { pageTransition, staggerContainer, staggerItem } from './supportAnimations';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'online' | 'offline' | 'away';
  ticketsSolved: number;
  avgResponseTime: string;
  satisfactionScore: number;
  activeTickets: number;
  permissions: string[];
}

export default function SupportStaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminSupportAPI.getStaff().then((res) => setStaff(res.staff || [])).catch(() => setStaff([])).finally(() => setLoading(false));
  }, []);

  const filteredStaff = staff.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: StaffMember['status']) => {
    const styles = {
      online: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      offline: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      away: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <motion.div
      className="space-y-6"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Support Staff</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage support agents and their permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <UserPlus className="mr-2 inline h-4 w-4" />
          Add Staff Member
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search staff by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Staff Grid */}
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading staff...</p>
      ) : (
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {filteredStaff.map((member) => (
          <motion.div
            key={member.id}
            variants={staggerItem}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {member.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{member.role}</p>
              </div>
              {getStatusBadge(member.status)}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tickets Solved</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {member.ticketsSolved}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Avg Response Time</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {member.avgResponseTime}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Satisfaction Score</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {member.satisfactionScore}/5.0
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Active Tickets</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {member.activeTickets}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Eye className="mr-1 inline h-4 w-4" />
                View
              </button>
              <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Edit className="mr-1 inline h-4 w-4" />
                Edit
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
      )}
    </motion.div>
  );
}

