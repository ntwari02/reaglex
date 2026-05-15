import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Phone, Mail, FileCheck, Camera, Building2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { SellerKycStatus } from '@/hooks/useSellerKycStatus';

const STEP_ICONS: Record<string, React.ReactNode> = {
  phone: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  document: <FileCheck className="h-4 w-4" />,
  face: <Camera className="h-4 w-4" />,
  business: <Building2 className="h-4 w-4" />,
};

interface Props {
  open: boolean;
  status: SellerKycStatus | null;
  onStart: () => Promise<void>;
  onCompleteLater: () => Promise<void>;
}

export default function SellerKycOnboardingModal({ open, status, onStart, onCompleteLater }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<'start' | 'later' | null>(null);

  const handleStart = async () => {
    setBusy('start');
    try {
      await onStart();
      navigate('/seller/settings');
    } finally {
      setBusy(null);
    }
  };

  const handleLater = async () => {
    setBusy('later');
    try {
      await onCompleteLater();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">Complete Verification Required</DialogTitle>
              <DialogDescription className="mt-1">
                Verify your identity to publish products on the marketplace. Until then, listings stay hidden from buyers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              About {status?.estimatedMinutes ?? 8} minutes · {status?.progressPercent ?? 0}% complete
              {status?.verificationStatus ? ` · ${status.verificationStatus.replace(/_/g, ' ')}` : ''}
            </span>
          </div>

          <ul className="space-y-2">
            {(status?.steps || []).map((step) => (
              <li
                key={step.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                  step.completed
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-[var(--divider)] bg-[var(--bg-surface)]'
                }`}
              >
                <span className={step.completed ? 'text-emerald-600' : 'text-muted-foreground'}>
                  {STEP_ICONS[step.id]}
                </span>
                <span className="flex-1 font-medium">{step.label}</span>
                {!step.required && <span className="text-xs text-muted-foreground">Optional</span>}
                {step.completed && <span className="text-xs font-semibold text-emerald-600">Done</span>}
              </li>
            ))}
          </ul>

          {status && status.productsPendingPublication > 0 && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              {status.productsPendingPublication} product
              {status.productsPendingPublication === 1 ? '' : 's'} waiting to go live after verification.
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={busy !== null} onClick={() => void handleLater()}>
            {busy === 'later' ? 'Saving…' : 'Complete Later'}
          </Button>
          <Button disabled={busy !== null} onClick={() => void handleStart()}>
            {busy === 'start' ? 'Opening…' : 'Start Verification'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
