import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { NotificationHistoryItem } from './types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NotificationHistoryItem[];
  onLoad: (item: NotificationHistoryItem) => void;
};

export function NotificationHistoryDrawer({ open, onOpenChange, items, onLoad }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed right-0 top-0 z-[110] h-full w-[420px] max-w-[92vw] border-l border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[-10px_0_30px_rgba(0,0,0,0.45)]">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-['Syne'] text-xl text-[var(--text-primary)]">
              Notification History
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close history drawer"
                className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-2 overflow-y-auto pr-1">
            {items.slice(0, 20).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onLoad(item)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-left hover:border-[var(--border-active)]"
              >
                <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.sentAt}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[var(--text-secondary)]">
                    {item.channel}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 ${
                      item.status === 'sent'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : item.status === 'queued'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
