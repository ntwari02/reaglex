import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SellerKycStatus } from '@/hooks/useSellerKycStatus';

interface Props {
  status: SellerKycStatus | null;
}

function bannerCopy(status: SellerKycStatus) {
  const pending = status.productsPendingPublication;
  const pendingLine =
    pending > 0
      ? ` ${pending} listing${pending === 1 ? '' : 's'} waiting to go live.`
      : '';

  switch (status.verificationStatus) {
    case 'UNDER_REVIEW':
      return {
        title: 'Verification under admin review',
        body: `Your identity checks are complete. An admin will finalize your seller account soon.${pendingLine}`,
      };
    case 'REJECTED':
      return {
        title: 'Verification rejected',
        body: `Your seller verification was rejected. Update your documents in Settings or contact support.${pendingLine}`,
      };
    default:
      return {
        title: 'Identity verification incomplete',
        body: `Products are saved but hidden from buyers (PENDING VERIFICATION). Complete KYC to publish on Spacilly.${pendingLine}`,
      };
  }
}

export default function SellerKycBanner({ status }: Props) {
  if (!status || status.kycVerified) return null;

  const { title, body } = bannerCopy(status);
  const isReview = status.verificationStatus === 'UNDER_REVIEW';
  const isRejected = status.verificationStatus === 'REJECTED';

  return (
    <div
      role="alert"
      className={`mb-4 flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
        isRejected
          ? 'border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-100'
          : isReview
            ? 'border-blue-500/40 bg-blue-500/10 text-blue-950 dark:text-blue-100'
            : 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100'
      }`}
    >
      <div className="flex items-start gap-3">
        {isReview ? (
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        ) : (
          <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${isRejected ? 'text-red-600' : 'text-amber-600'}`} />
        )}
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 opacity-90">{body}</p>
          {!isReview && (
            <p className="mt-1 text-xs opacity-80">
              Progress: {status.completedRequired}/{status.totalRequired} required steps ({status.progressPercent}%)
            </p>
          )}
        </div>
      </div>
      {!isReview && (
        <Button
          asChild
          size="sm"
          variant="default"
          className={`shrink-0 gap-2 ${isRejected ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
        >
          <Link to="/seller/settings">
            <Shield className="h-4 w-4" />
            Complete KYC
          </Link>
        </Button>
      )}
    </div>
  );
}
