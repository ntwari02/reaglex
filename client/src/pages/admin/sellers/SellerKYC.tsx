import React, { useState } from 'react';
import {
  FileText,
  CheckCircle,
  X,
  Download,
  Upload,
  Clock,
  AlertTriangle,
  Shield,
  User,
  Building,
  MapPin,
  CreditCard,
} from 'lucide-react';

interface SellerKYCProps {
  sellerId: string;
}

type DocumentType = 'id' | 'business_license' | 'tin' | 'address_proof' | 'bank_statement' | 'other';
type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';

interface Document {
  id: string;
  type: DocumentType;
  name: string;
  status: DocumentStatus;
  uploadedDate: string;
  reviewedDate?: string;
  reviewedBy?: string;
  expiryDate?: string;
  fileUrl: string;
  notes?: string;
}

interface VerificationLog {
  id: string;
  action: string;
  performedBy: string;
  date: string;
  notes?: string;
}

const mockDocuments: Document[] = [
  {
    id: 'DOC-001',
    type: 'id',
    name: 'National ID Card',
    status: 'approved',
    uploadedDate: '2024-01-15',
    reviewedDate: '2024-01-16',
    reviewedBy: 'Admin User',
    fileUrl: 'id-card.pdf',
  },
  {
    id: 'DOC-002',
    type: 'business_license',
    name: 'Business License',
    status: 'approved',
    uploadedDate: '2024-01-15',
    reviewedDate: '2024-01-16',
    reviewedBy: 'Admin User',
    expiryDate: '2025-01-15',
    fileUrl: 'business-license.pdf',
  },
  {
    id: 'DOC-003',
    type: 'tin',
    name: 'Tax Identification Number',
    status: 'approved',
    uploadedDate: '2024-01-15',
    reviewedDate: '2024-01-16',
    reviewedBy: 'Admin User',
    fileUrl: 'tin-certificate.pdf',
  },
  {
    id: 'DOC-004',
    type: 'address_proof',
    name: 'Address Proof',
    status: 'pending',
    uploadedDate: '2024-03-10',
    fileUrl: 'address-proof.pdf',
  },
  {
    id: 'DOC-005',
    type: 'bank_statement',
    name: 'Bank Statement',
    status: 'rejected',
    uploadedDate: '2024-02-20',
    reviewedDate: '2024-02-21',
    reviewedBy: 'Admin User',
    fileUrl: 'bank-statement.pdf',
    notes: 'Document is unclear, please upload a clearer version',
  },
];

const mockLogs: VerificationLog[] = [
  {
    id: 'LOG-001',
    action: 'Document approved',
    performedBy: 'Admin User',
    date: '2024-01-16',
    notes: 'ID card verified',
  },
  {
    id: 'LOG-002',
    action: 'Document rejected',
    performedBy: 'Admin User',
    date: '2024-02-21',
    notes: 'Bank statement unclear',
  },
  {
    id: 'LOG-003',
    action: 'KYC verification completed',
    performedBy: 'Admin User',
    date: '2024-01-16',
  },
];

const checklistItems = [
  { id: 'id', label: 'ID Document', icon: User, required: true },
  { id: 'business_license', label: 'Business License', icon: Building, required: true },
  { id: 'tin', label: 'Tax ID (TIN)', icon: FileText, required: true },
  { id: 'address_proof', label: 'Address Proof', icon: MapPin, required: true },
  { id: 'bank_statement', label: 'Bank Statement', icon: CreditCard, required: false },
];

export default function SellerKYC({ sellerId }: SellerKYCProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const getDocumentTypeLabel = (type: DocumentType) => {
    const labels = {
      id: 'ID Document',
      business_license: 'Business License',
      tin: 'Tax ID (TIN)',
      address_proof: 'Address Proof',
      bank_statement: 'Bank Statement',
      other: 'Other',
    };
    return labels[type];
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      expired: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>{status}</span>
    );
  };

  const getChecklistStatus = (docType: DocumentType) => {
    const doc = mockDocuments.find((d) => d.type === docType);
    if (!doc) return 'missing';
    if (doc.status === 'approved') return 'approved';
    if (doc.status === 'pending') return 'pending';
    return 'rejected';
  };

  const handleApproveDocument = (docId: string) => {
    console.log('Approve document:', docId);
  };

  const handleRejectDocument = (docId: string) => {
    console.log('Reject document:', docId, rejectionReason);
    setRejectionReason('');
  };

  const handleRequestUpdatedDoc = (docId: string) => {
    console.log('Request updated document:', docId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">KYC / Verification</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Identity and document verification</p>
      </div>

      {/* Verification Status */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Verification Status</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Verified</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              KYC verification completed on {new Date('2024-01-16').toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Verification Checklist</h3>
        <div className="space-y-3">
          {checklistItems.map((item) => {
            const status = getChecklistStatus(item.id as DocumentType);
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                    {item.required && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Required</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {status === 'approved' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="h-4 w-4" /> Approved
                    </span>
                  )}
                  {status === 'pending' && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Clock className="h-4 w-4" /> Pending
                    </span>
                  )}
                  {status === 'rejected' && (
                    <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                      <X className="h-4 w-4" /> Rejected
                    </span>
                  )}
                  {status === 'missing' && (
                    <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <AlertTriangle className="h-4 w-4" /> Missing
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Documents List */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Submitted Documents</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {mockDocuments.map((document) => (
            <div key={document.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">{document.name}</h4>
                    {getStatusBadge(document.status)}
                  </div>
                  <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                    Type: {getDocumentTypeLabel(document.type)}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Uploaded: {new Date(document.uploadedDate).toLocaleDateString()}</span>
                    {document.reviewedDate && (
                      <span>Reviewed: {new Date(document.reviewedDate).toLocaleDateString()}</span>
                    )}
                    {document.reviewedBy && <span>By: {document.reviewedBy}</span>}
                    {document.expiryDate && (
                      <span>Expires: {new Date(document.expiryDate).toLocaleDateString()}</span>
                    )}
                  </div>
                  {document.notes && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                      {document.notes}
                    </div>
                  )}
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setSelectedDocument(document);
                      setShowDocumentModal(true);
                    }}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
                  >
                    View
                  </button>
                  <button className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                    <Download className="h-4 w-4" />
                  </button>
                  {document.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApproveDocument(document.id)}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDocument(document);
                          setRejectionReason('');
                        }}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {document.status === 'rejected' && (
                    <button
                      onClick={() => handleRequestUpdatedDoc(document.id)}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                    >
                      Request Update
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification Logs */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Verification Logs</h3>
        <div className="space-y-3">
          {mockLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{log.action}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>By: {log.performedBy}</span>
                  <span>•</span>
                  <span>{new Date(log.date).toLocaleString()}</span>
                </div>
                {log.notes && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{log.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document View Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="relative w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowDocumentModal(false);
                setSelectedDocument(null);
              }}
              className="absolute right-4 top-4 rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {selectedDocument.name}
            </h3>
            <div className="mb-4 flex items-center gap-2">
              {getStatusBadge(selectedDocument.status)}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {getDocumentTypeLabel(selectedDocument.type)}
              </span>
            </div>
            <div className="mb-6 flex h-96 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <div className="text-center">
                <FileText className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Document Preview</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedDocument.fileUrl}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
                <Download className="mr-2 inline h-4 w-4" /> Download
              </button>
              {selectedDocument.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleApproveDocument(selectedDocument.id)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setRejectionReason('');
                    }}
                    className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
