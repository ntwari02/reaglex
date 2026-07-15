import { useRef, useState } from 'react';
import { Loader2, Paperclip, X } from 'lucide-react';
import { useToastStore } from '@/stores/toastStore';
import {
  submitViolationAppeal,
  uploadAppealEvidence,
} from '@/services/sellerViolationsApi';

export default function ViolationAppealForm() {
  const showToast = useToastStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ticketNumber, setTicketNumber] = useState('');
  const [explanation, setExplanation] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onFilesSelected = (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...pendingFiles, ...Array.from(files)].slice(0, 5);
    setPendingFiles(next);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!ticketNumber.trim()) {
      showToast('Enter your violation ticket number.', 'error');
      return;
    }
    if (explanation.trim().length < 20) {
      showToast('Please write a detailed explanation (at least 20 characters).', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let urls = [...evidenceUrls];
      if (pendingFiles.length > 0) {
        const uploaded = await uploadAppealEvidence(pendingFiles);
        urls = [...urls, ...(uploaded.urls || [])];
        setEvidenceUrls(urls);
        setPendingFiles([]);
      }

      await submitViolationAppeal({
        ticketNumber: ticketNumber.trim(),
        explanation: explanation.trim(),
        evidenceUrls: urls.length ? urls : undefined,
      });

      setSubmitted(true);
      showToast('Appeal submitted. We will respond within 3–5 business days.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit appeal';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="rounded-2xl px-4 py-4 sm:px-5 sm:py-5"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Appeal received
        </p>
        <p className="mt-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          Ticket <strong>{ticketNumber.trim().toUpperCase()}</strong> is under review. You will receive an email
          when Trust &amp; Safety has an update.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl px-4 py-4 sm:px-5 sm:py-5 space-y-3"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Submit an Appeal
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Violation ticket number
          </label>
          <input
            type="text"
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value)}
            placeholder="e.g. VIOL-2026-000123"
            className="w-full rounded-lg bg-[#0e1118] px-3 py-2 text-[11px] outline-none premium-input"
            style={{ color: 'var(--text-primary)', border: 'none' }}
          />
          <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
            Use the ticket ID from your violation email.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Evidence (screenshots, receipts, etc.)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={(e) => onFilesSelected(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-[96px] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-[11px]"
            style={{
              borderColor: 'rgba(148,163,184,0.6)',
              background: '#0e1118',
              color: 'var(--text-muted)',
            }}
          >
            <Paperclip className="h-4 w-4" />
            {pendingFiles.length ? `${pendingFiles.length} file(s) selected` : 'Click to attach up to 5 files'}
          </button>
          {pendingFiles.length > 0 && (
            <ul className="space-y-1">
              {pendingFiles.map((file, i) => (
                <li
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between gap-2 text-[10px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="truncate">{file.name}</span>
                  <button type="button" onClick={() => removePendingFile(i)} aria-label="Remove file">
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          Explanation
        </label>
        <textarea
          rows={3}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Explain clearly why you believe this violation is incorrect..."
          className="w-full resize-none rounded-lg bg-[#0e1118] px-3 py-2 text-[11px] outline-none premium-input"
          style={{ color: 'var(--text-primary)', border: 'none' }}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold disabled:opacity-60"
          style={{
            background: 'var(--gradient-brand-cta)',
            color: '#ffffff',
            border: 'none',
          }}
        >
          {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
          Submit Appeal
        </button>
        <p className="text-[11px]" style={{ color: 'var(--brand-orange-text)' }}>
          Or email{' '}
          <a href="mailto:seller-appeals@spacilly.com" style={{ color: 'var(--brand-orange-text)' }}>
            seller-appeals@spacilly.com
          </a>
        </p>
      </div>
    </div>
  );
}
