import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  CheckCircle,
  Download,
  BarChart3,
  FileText,
  Settings,
  RefreshCw,
  AlertTriangle,
  X,
  Eye,
  Shield,
} from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import SellerPayouts from './finance/SellerPayouts';
import TransactionLogs from './finance/TransactionLogs';
import PaymentGateways from './finance/PaymentGateways';
import RefundsManagement from './finance/RefundsManagement';
import Chargebacks from './finance/Chargebacks';
import TaxManagement from './finance/TaxManagement';
import FinancialReports from './finance/FinancialReports';
import FinanceSettings from './finance/FinanceSettings';

type TabId =
  | 'dashboard'
  | 'payouts'
  | 'transactions'
  | 'gateways'
  | 'refunds'
  | 'chargebacks'
  | 'tax'
  | 'reports'
  | 'settings';

const tabs: { id: TabId; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'payouts', label: 'Seller Payouts', icon: Wallet },
  { id: 'transactions', label: 'Transactions', icon: CreditCard },
  { id: 'gateways', label: 'Payment Gateways', icon: Settings },
  { id: 'refunds', label: 'Refunds', icon: RefreshCw },
  { id: 'chargebacks', label: 'Chargebacks', icon: AlertTriangle },
  { id: 'tax', label: 'Tax Management', icon: FileText },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function PaymentsFinancial() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [showGenerateReportModal, setShowGenerateReportModal] = useState(false);
  const [showPendingPayoutsModal, setShowPendingPayoutsModal] = useState(false);
  const [showExportLogsModal, setShowExportLogsModal] = useState(false);
  const [showConfigureGatewaysModal, setShowConfigureGatewaysModal] = useState(false);

  // Mock data for dashboard
  const revenueData = [
    { date: '2024-01-01', value: 12000 },
    { date: '2024-01-08', value: 15000 },
    { date: '2024-01-15', value: 18000 },
    { date: '2024-01-22', value: 22000 },
    { date: '2024-01-29', value: 25000 },
    { date: '2024-02-05', value: 28000 },
    { date: '2024-02-12', value: 32000 },
    { date: '2024-02-19', value: 35000 },
    { date: '2024-02-26', value: 38000 },
    { date: '2024-03-05', value: 42000 },
    { date: '2024-03-12', value: 45000 },
  ];

  const metrics = {
    totalPlatformRevenue: 1250000,
    totalSales: 12500,
    totalCommissionEarned: 125000,
    totalPayoutsToSellers: 1000000,
    pendingPayouts: 50000,
    availableBalance: 200000,
    refundAmount: 15000,
    totalTransactions: 12500,
    failedTransactions: 45,
    chargebacksCount: 12,
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab
            metrics={metrics}
            revenueData={revenueData}
            onGenerateReport={() => setShowGenerateReportModal(true)}
            onPendingPayouts={() => setShowPendingPayoutsModal(true)}
            onExportLogs={() => setShowExportLogsModal(true)}
            onConfigureGateways={() => setShowConfigureGatewaysModal(true)}
          />
        );
      case 'payouts':
        return <SellerPayouts />;
      case 'transactions':
        return <TransactionLogs />;
      case 'gateways':
        return <PaymentGateways />;
      case 'refunds':
        return <RefundsManagement />;
      case 'chargebacks':
        return <Chargebacks />;
      case 'tax':
        return <TaxManagement />;
      case 'reports':
        return <FinancialReports />;
      case 'settings':
        return <FinanceSettings />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-6 pb-10 overflow-x-hidden w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Finance • Management</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Finance Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage payments, payouts, and financial operations</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap gap-2 overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>
      </div>

      {/* Modals */}
      {showGenerateReportModal && (
        <GenerateReportModal onClose={() => setShowGenerateReportModal(false)} />
      )}
      {showPendingPayoutsModal && (
        <PendingPayoutsModal onClose={() => setShowPendingPayoutsModal(false)} />
      )}
      {showExportLogsModal && (
        <ExportLogsModal onClose={() => setShowExportLogsModal(false)} />
      )}
      {showConfigureGatewaysModal && (
        <ConfigureGatewaysModal onClose={() => setShowConfigureGatewaysModal(false)} />
      )}
    </>
  );
}

// Dashboard Tab Component
function DashboardTab({
  metrics,
  revenueData,
  onGenerateReport,
  onPendingPayouts,
  onExportLogs,
  onConfigureGateways,
}: {
  metrics: any;
  revenueData: any[];
  onGenerateReport: () => void;
  onPendingPayouts: () => void;
  onExportLogs: () => void;
  onConfigureGateways: () => void;
}) {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Platform Revenue</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${(metrics.totalPlatformRevenue / 1000).toFixed(0)}k
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Sales</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalSales.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Commission Earned</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${(metrics.totalCommissionEarned / 1000).toFixed(0)}k
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <CreditCard className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Pending Payouts</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${(metrics.pendingPayouts / 1000).toFixed(0)}k
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CheckCircle className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Available Balance</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${(metrics.availableBalance / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Refund Amount</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ${(metrics.refundAmount / 1000).toFixed(0)}k
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Transactions</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.totalTransactions.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Failed Transactions</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{metrics.failedTransactions}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Chargebacks</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{metrics.chargebacksCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Payouts</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ${(metrics.totalPayoutsToSellers / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* Revenue Graph */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Revenue Over Time</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Platform revenue trends</p>
          </div>
          <div className="flex gap-2">
            {['daily', 'weekly', 'monthly'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  timeRange === range
                    ? 'bg-emerald-500 text-white'
                    : 'border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <BarChart
            data={revenueData}
            height={300}
            color="from-emerald-500 via-teal-500 to-cyan-500"
            yAxisLabel="Revenue ($)"
          />
        </div>
      </div>

      {/* Revenue Streams Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Revenue Streams</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Commission Earnings</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ${(metrics.totalCommissionEarned / 1000).toFixed(0)}k
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Transaction Fees</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">$37.5k</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Advertisement Payments</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">$15k</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Subscription Fees</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">$8k</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Penalties/Fines</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">$2.5k</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
          <div className="space-y-2">
            <button 
              onClick={onGenerateReport}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
            >
              Generate Monthly Report
            </button>
            <button 
              onClick={onPendingPayouts}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
            >
              View Pending Payouts
            </button>
            <button 
              onClick={onExportLogs}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
            >
              Export Transaction Logs
            </button>
            <button 
              onClick={onConfigureGateways}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
            >
              Configure Payment Gateways
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate Monthly Report Modal
function GenerateReportModal({ onClose }: { onClose: () => void }) {
  const [reportType, setReportType] = useState('revenue');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSeller, setSelectedSeller] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [emailReport, setEmailReport] = useState(false);

  const reportTypes = [
    { id: 'revenue', label: 'Revenue Report' },
    { id: 'transactions', label: 'Transactions Summary' },
    { id: 'seller_earnings', label: 'Seller Earnings Summary' },
    { id: 'refunds', label: 'Refund Report' },
    { id: 'chargebacks', label: 'Chargebacks Report' },
    { id: 'profit', label: 'Platform Profit Report' },
    { id: 'payouts', label: 'Payouts Summary' },
  ];

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const handleGenerate = () => {
    // Generate report logic here
    console.log('Generating report:', { reportType, selectedMonth, selectedYear, selectedSeller, paymentMethod, exportFormat, emailReport });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Generate Monthly Report</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700">
          {/* Report Type Selection */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Select Report Type</label>
            <div className="grid grid-cols-2 gap-2">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    reportType === type.id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Seller (Optional)</label>
              <select
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">All Sellers</option>
                <option value="seller1">Seller 1</option>
                <option value="seller2">Seller 2</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Methods</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>

          {/* Export Options */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Export Format</label>
            <div className="flex gap-2">
              {['pdf', 'csv', 'excel'].map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                    exportFormat === format
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="emailReport"
              checked={emailReport}
              onChange={(e) => setEmailReport(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="emailReport" className="text-sm text-gray-700 dark:text-gray-300">
              Send report via email
            </label>
          </div>

          {/* Auto-Generated Summary Preview */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Report Summary Preview</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total Revenue:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">$125,000</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total Commission:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">$12,500</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total Payouts:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">$100,000</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total Refunds:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">$1,500</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total Net Profit:</span>
                <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">$11,000</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
            >
              <Download className="mr-2 inline h-4 w-4" />
              Generate & Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pending Payouts Modal
function PendingPayoutsModal({ onClose }: { onClose: () => void }) {
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(new Set());
  const [sellerFilter, setSellerFilter] = useState('all');
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [dateFilter, setDateFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

  const mockPayouts = [
    { id: '1', seller: 'Tech Store', amount: 5000, balance: 15000, date: '2024-03-10', method: 'Mobile Money', reference: 'REF-001' },
    { id: '2', seller: 'Fashion Hub', amount: 3200, balance: 8500, date: '2024-03-09', method: 'Bank Transfer', reference: 'REF-002' },
    { id: '3', seller: 'Electronics Plus', amount: 7800, balance: 22000, date: '2024-03-08', method: 'PayPal', reference: 'REF-003' },
  ];

  const toggleSelectPayout = (id: string) => {
    setSelectedPayouts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pending Payouts</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Seller</label>
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Sellers</option>
                <option value="tech">Tech Store</option>
                <option value="fashion">Fashion Hub</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Amount Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={amountRange.min}
                  onChange={(e) => setAmountRange({ ...amountRange, min: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={amountRange.max}
                  onChange={(e) => setAmountRange({ ...amountRange, max: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Date</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Payment Method</label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Methods</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank">Bank Transfer</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedPayouts.size > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-900/20">
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {selectedPayouts.size} payout(s) selected
              </span>
              <div className="flex gap-2">
                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  Approve All
                </button>
                <button className="rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:bg-gray-800 dark:text-emerald-400">
                  Mark All as Paid
                </button>
                <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  Export Selected
                </button>
              </div>
            </div>
          )}

          {/* Payouts Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPayouts.size === mockPayouts.length}
                      onChange={() => {
                        if (selectedPayouts.size === mockPayouts.length) {
                          setSelectedPayouts(new Set());
                        } else {
                          setSelectedPayouts(new Set(mockPayouts.map((p) => p.id)));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Seller</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Balance</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Method</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Reference</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {mockPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPayouts.has(payout.id)}
                        onChange={() => toggleSelectPayout(payout.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{payout.seller}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">${payout.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">${payout.balance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{payout.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{payout.method}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{payout.reference}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700"
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-700"
                          title="Reject"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700"
                          title="Mark as Paid"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                          title="View History"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export Transaction Logs Modal
function ExportLogsModal({ onClose }: { onClose: () => void }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [orderId, setOrderId] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [emailExport, setEmailExport] = useState(false);

  const handleExport = () => {
    console.log('Exporting logs:', { startDate, endDate, paymentStatus, paymentMethod, selectedSeller, orderId, exportFormat, emailExport });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Export Transaction Logs</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Methods</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Seller (Optional)</label>
              <select
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">All Sellers</option>
                <option value="seller1">Seller 1</option>
                <option value="seller2">Seller 2</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Order ID (Optional)</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter Order ID"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Export Format */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Export Format</label>
            <div className="flex gap-2">
              {['csv', 'excel', 'pdf'].map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                    exportFormat === format
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Included Info */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Logs Will Include:</h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• Transaction ID, Order ID, Customer, Seller</li>
              <li>• Payment Method, Amount, Commission, Platform Earnings</li>
              <li>• Status, Timestamp</li>
            </ul>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="emailExport"
              checked={emailExport}
              onChange={(e) => setEmailExport(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="emailExport" className="text-sm text-gray-700 dark:text-gray-300">
              Email export to admin email
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
            >
              <Download className="mr-2 inline h-4 w-4" />
              Export Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Configure Payment Gateways Modal
function ConfigureGatewaysModal({ onClose }: { onClose: () => void }) {
  const [gateways, setGateways] = useState([
    { id: 'mobile_money', name: 'Mobile Money (MTN / Airtel)', enabled: true, apiKey: '', secretKey: '', webhookUrl: '', testMode: false },
    { id: 'stripe', name: 'Stripe', enabled: true, apiKey: '', secretKey: '', webhookUrl: '', testMode: false },
    { id: 'paypal', name: 'PayPal', enabled: false, apiKey: '', secretKey: '', webhookUrl: '', testMode: false },
    { id: 'card', name: 'Visa/Mastercard', enabled: true, apiKey: '', secretKey: '', webhookUrl: '', testMode: false },
  ]);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const confirmSave = () => {
    console.log('Saving gateway configurations:', gateways);
    setShowConfirm(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configure Payment Gateways</h2>
            <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Gateway List */}
            <div className="space-y-3">
              {gateways.map((gateway) => (
                <div
                  key={gateway.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    selectedGateway === gateway.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={gateway.enabled}
                        onChange={(e) => {
                          setGateways((prev) =>
                            prev.map((g) => (g.id === gateway.id ? { ...g, enabled: e.target.checked } : g))
                          );
                        }}
                        className="h-5 w-5 rounded border-gray-300 text-emerald-600"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{gateway.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`h-2 w-2 rounded-full ${gateway.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {gateway.enabled ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedGateway(selectedGateway === gateway.id ? null : gateway.id)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                    >
                      {selectedGateway === gateway.id ? 'Hide Settings' : 'Configure'}
                    </button>
                  </div>

                  {selectedGateway === gateway.id && (
                    <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">API Key</label>
                        <input
                          type="password"
                          value={gateway.apiKey}
                          onChange={(e) => {
                            setGateways((prev) =>
                              prev.map((g) => (g.id === gateway.id ? { ...g, apiKey: e.target.value } : g))
                            );
                          }}
                          placeholder="Enter API Key"
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Secret Key</label>
                        <input
                          type="password"
                          value={gateway.secretKey}
                          onChange={(e) => {
                            setGateways((prev) =>
                              prev.map((g) => (g.id === gateway.id ? { ...g, secretKey: e.target.value } : g))
                            );
                          }}
                          placeholder="Enter Secret Key"
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">Webhook URL</label>
                        <input
                          type="text"
                          value={gateway.webhookUrl}
                          onChange={(e) => {
                            setGateways((prev) =>
                              prev.map((g) => (g.id === gateway.id ? { ...g, webhookUrl: e.target.value } : g))
                            );
                          }}
                          placeholder="https://your-domain.com/webhook"
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`testMode-${gateway.id}`}
                          checked={gateway.testMode}
                          onChange={(e) => {
                            setGateways((prev) =>
                              prev.map((g) => (g.id === gateway.id ? { ...g, testMode: e.target.checked } : g))
                            );
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                        />
                        <label htmlFor={`testMode-${gateway.id}`} className="text-sm text-gray-700 dark:text-gray-300">
                          Test Mode
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                          Test Connection
                        </button>
                        <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                          View Health Logs
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Security Notice */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Security Notice</h3>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    Two-factor confirmation will be required before saving changes. Only senior admins can modify gateway settings.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
              <button
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
              >
                <Shield className="mr-2 inline h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Factor Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Shield className="h-6 w-6 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Changes</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                You are about to save payment gateway configurations. Please confirm to proceed.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSave}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
