import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Search,
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  type: 'email' | 'sms' | 'push' | 'inapp';
  subject?: string;
  content: string;
  variables: string[];
  lastModified: string;
}

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Order Placed',
    category: 'Orders',
    type: 'email',
    subject: 'Order Confirmation - {{order_id}}',
    content: 'Hi {{username}}, your order {{order_id}} has been placed successfully.',
    variables: ['username', 'order_id'],
    lastModified: '2024-03-15',
  },
  {
    id: '2',
    name: 'Order Shipped',
    category: 'Orders',
    type: 'sms',
    content: 'Your order {{order_id}} has been shipped. Track: {{tracking_url}}',
    variables: ['order_id', 'tracking_url'],
    lastModified: '2024-03-14',
  },
  {
    id: '3',
    name: 'Payment Failure',
    category: 'Payments',
    type: 'push',
    content: 'Payment failed for order {{order_id}}. Please update payment method.',
    variables: ['order_id'],
    lastModified: '2024-03-13',
  },
];

export default function NotificationTemplates() {
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getTypeIcon = (type: Template['type']) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'push':
        return <Smartphone className="h-4 w-4" />;
      case 'inapp':
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Templates</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage reusable notification templates
          </p>
        </div>
        <button className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl">
          <Plus className="mr-2 inline h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Categories</option>
          <option value="Orders">Orders</option>
          <option value="Payments">Payments</option>
          <option value="Account">Account</option>
        </select>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getTypeIcon(template.type)}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{template.category}</p>
                </div>
              </div>
            </div>

            {template.subject && (
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {template.subject}
              </p>
            )}
            <p className="mb-4 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
              {template.content}
            </p>

            <div className="mb-4 flex flex-wrap gap-1">
              {template.variables.map((variable) => (
                <span
                  key={variable}
                  className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                >
                  {'{{' + variable + '}}'}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Edit className="mr-1 inline h-4 w-4" />
                Edit
              </button>
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

