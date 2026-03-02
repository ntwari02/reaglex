import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Eye, Upload, DollarSign } from 'lucide-react';

type ChargebackStatus = 'open' | 'under_review' | 'resolved_refund' | 'resolved_won';

interface Chargeback {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  status: ChargebackStatus;
  provider: string;
  claimReason: string;
  date: string;
  evidenceCount: number;
}

const mockChargebacks: Chargeback[] = [
  {
    id: 'CB-001',
    orderId: 'ORD-001',
    customerName: 'John Doe',
    amount: 299.99,
    status: 'open',
    provider: 'Stripe',
    claimReason: 'Unauthorized transaction',
    date: '2024-03-15',
    evidenceCount: 2,
  },
  {
    id: 'CB-002',
    orderId: 'ORD-002',
    customerName: 'Jane Smith',
    amount: 149.99,
    status: 'under_review',
    provider: 'PayPal',
    claimReason: 'Product not received',
    date: '2024-03-12',
    evidenceCount: 5,
  },
];

export default function Chargebacks() {
  const [selectedChargeback, setSelectedChargeback] = useState<Chargeback | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const getStatusBadge = (status: ChargebackStatus) => {
    const styles = {
      open: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      resolved_refund: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      resolved_won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {mockChargebacks.map((chargeback) => (
          <div
            key={chargeback.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Chargeback {chargeback.id}</h3>
                  {getStatusBadge(chargeback.status)}
                </div>
                <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                  Order: {chargeback.orderId} • Customer: {chargeback.customerName} • Provider: {chargeback.provider}
                </div>
                <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                  Amount: ${chargeback.amount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <p className="font-semibold">Claim Reason:</p>
                  <p>{chargeback.claimReason}</p>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Upload className="h-3 w-3" /> {chargeback.evidenceCount} evidence files
                </div>
              </div>
              <div className="ml-4 flex gap-2">
                {chargeback.status === 'open' && (
                  <>
                    <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                      Fight Chargeback
                    </button>
                    <button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                      Refund
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setSelectedChargeback(chargeback);
                    setShowDetailsModal(true);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

