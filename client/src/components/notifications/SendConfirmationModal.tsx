import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { NotificationChannel } from './types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: NotificationChannel;
  recipientCount: number;
  subject: string;
  estimatedDelivery: string;
  sentSuccess: boolean;
  onConfirm: () => void;
};

export function SendConfirmationModal({
  open,
  onOpenChange,
  channel,
  recipientCount,
  subject,
  estimatedDelivery,
  sentSuccess,
  onConfirm,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[110] w-[500px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-['Syne'] text-xl text-[var(--text-primary)]">
              Confirm Send
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-sm">
            <p className="text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">Channel:</span> {channel}
            </p>
            <p className="text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">Recipients:</span> {recipientCount.toLocaleString()}
            </p>
            <p className="text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">Subject:</span> {subject || 'Untitled'}
            </p>
            <p className="text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">Estimated delivery:</span> {estimatedDelivery}
            </p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Confirm & Send
            </button>
          </div>
          {sentSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-500/15 py-2 text-sm text-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4" />
              Sent successfully
            </motion.div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
