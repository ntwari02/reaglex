import * as Tooltip from '@radix-ui/react-tooltip';
import {
  Bold,
  Italic,
  Underline,
  Link2,
  List,
  Quote,
  ImagePlus,
  Code2,
  Eye,
  FolderOpen,
  Bookmark,
  Sparkles,
  BarChart3,
  Braces,
  Lock,
  X,
  Paperclip,
  SmilePlus,
  CalendarDays,
  SendHorizontal,
} from 'lucide-react';
import { ReadabilityPanel } from './ReadabilityPanel';
import type { ReadabilityResult, Recipient } from './types';

type Props = {
  fromEmail: string;
  recipients: Recipient[];
  toQuery: string;
  onToQueryChange: (value: string) => void;
  onRemoveRecipient: (email: string) => void;
  userSuggestions: Recipient[];
  onAddRecipient: (recipient: Recipient) => void;
  onAddCcToggle: () => void;
  onAddBccToggle: () => void;
  showCc: boolean;
  showBcc: boolean;
  cc: string;
  bcc: string;
  onCcChange: (value: string) => void;
  onBccChange: (value: string) => void;
  targetGroup: string;
  onSelectTargetGroup: (group: string) => void;
  recipientCount: number;
  recipientPreview: string[];
  onRemoveGroup: () => void;
  onLoadTemplate: () => void;
  onSaveTemplate: () => void;
  onRephrase: () => void;
  onAnalyze: () => void;
  onInsertVariable: () => void;
  subject: string;
  onSubjectChange: (value: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
  markdownPreview: boolean;
  onTogglePreview: () => void;
  readabilityResult: ReadabilityResult | null;
  readabilityOpen: boolean;
  onSaveDraft: () => void;
  onSchedule: () => void;
  onSend: () => void;
};

const tools = [
  { key: 'bold', icon: Bold, label: 'Bold' },
  { key: 'italic', icon: Italic, label: 'Italic' },
  { key: 'underline', icon: Underline, label: 'Underline' },
  { key: 'link', icon: Link2, label: 'Insert link' },
  { key: 'list', icon: List, label: 'List' },
  { key: 'quote', icon: Quote, label: 'Quote' },
  { key: 'image', icon: ImagePlus, label: 'Image' },
  { key: 'code', icon: Code2, label: 'Code' },
];

export function ComposerCard(props: Props) {
  const {
    fromEmail,
    recipients,
    toQuery,
    onToQueryChange,
    onRemoveRecipient,
    userSuggestions,
    onAddRecipient,
    onAddCcToggle,
    onAddBccToggle,
    showCc,
    showBcc,
    cc,
    bcc,
    onCcChange,
    onBccChange,
    targetGroup,
    onSelectTargetGroup,
    recipientCount,
    recipientPreview,
    onRemoveGroup,
    onLoadTemplate,
    onSaveTemplate,
    onRephrase,
    onAnalyze,
    onInsertVariable,
    subject,
    onSubjectChange,
    body,
    onBodyChange,
    markdownPreview,
    onTogglePreview,
    readabilityResult,
    readabilityOpen,
    onSaveDraft,
    onSchedule,
    onSend,
  } = props;

  return (
    <Tooltip.Provider>
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-[68px,1fr,auto] md:items-center">
            <span className="text-sm text-[var(--text-secondary)]">From</span>
            <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2">
              <Lock className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="font-['JetBrains_Mono'] text-sm text-[var(--text-secondary)]">
                Admin &lt;{fromEmail}&gt;
              </span>
            </div>
            <button type="button" className="text-xs text-[var(--accent)] hover:underline">
              Change Sender
            </button>
          </div>

          <div className="grid gap-2 md:grid-cols-[68px,1fr,auto]">
            <span className="pt-2 text-sm text-[var(--text-secondary)]">To</span>
            <div className="relative flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2">
              {targetGroup ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-active)] bg-[var(--accent)]/10 px-2 py-1 text-xs text-[var(--accent)]">
                  {targetGroup} ({recipientCount.toLocaleString()})
                  <button type="button" onClick={onRemoveGroup} aria-label="Remove group">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : null}
              {recipients.map((r) => (
                <span
                  key={r.email}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/5 px-2 py-1 text-xs text-[var(--text-secondary)]"
                >
                  {r.fullName || r.email}
                  <button type="button" onClick={() => onRemoveRecipient(r.email)} aria-label={`Remove ${r.email}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              <input
                value={toQuery}
                onChange={(e) => onToQueryChange(e.target.value)}
                placeholder="Search users or target group"
                className="min-w-[180px] flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
              {userSuggestions.length ? (
                <div className="absolute left-0 top-full z-30 mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-1">
                  {userSuggestions.slice(0, 5).map((suggestion) => (
                    <button
                      key={suggestion.email}
                      type="button"
                      onClick={() => onAddRecipient(suggestion)}
                      className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-white/5"
                    >
                      <span className="text-[var(--text-primary)]">{suggestion.fullName || 'User'}</span>{' '}
                      <span className="text-[var(--text-muted)]">{suggestion.email}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <select
              value={targetGroup}
              onChange={(e) => onSelectTargetGroup(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-secondary)]"
            >
              <option value="">Target Group</option>
              <option value="All Customers">All Customers</option>
              <option value="All Sellers">All Sellers</option>
              <option value="Specific User">Specific User</option>
              <option value="Custom Segment">Custom Segment</option>
            </select>
          </div>

          {targetGroup ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <div className="flex -space-x-2">
                {recipientPreview.map((initial, index) => (
                  <span
                    key={`${initial}-${index}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--bg-elevated)] bg-[var(--accent-dim)] text-[10px] text-white"
                  >
                    {initial}
                  </span>
                ))}
              </div>
              <span>+{Math.max(0, recipientCount - recipientPreview.length).toLocaleString()} more</span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <button type="button" onClick={onAddCcToggle} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Cc
            </button>
            <button type="button" onClick={onAddBccToggle} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Bcc
            </button>
          </div>
          {showCc ? (
            <input
              value={cc}
              onChange={(e) => onCcChange(e.target.value)}
              placeholder="Add Cc recipients"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            />
          ) : null}
          {showBcc ? (
            <input
              value={bcc}
              onChange={(e) => onBccChange(e.target.value)}
              placeholder="Add Bcc recipients"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            />
          ) : null}

          <div className="h-px bg-[var(--border)]" />

          <div className="flex flex-wrap gap-2">
            {[
              { icon: FolderOpen, label: 'Load Template', onClick: onLoadTemplate },
              { icon: Bookmark, label: 'Save as Template', onClick: onSaveTemplate },
              { icon: Sparkles, label: 'Rephrase', onClick: onRephrase },
              { icon: BarChart3, label: 'Analyze', onClick: onAnalyze },
              { icon: Braces, label: 'Variables', onClick: onInsertVariable },
            ].map((item) => (
              <Tooltip.Root key={item.label}>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-transparent px-2.5 py-2 text-xs text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content sideOffset={6} className="rounded bg-black/90 px-2 py-1 text-xs text-white" role="tooltip">
                  {item.label}
                </Tooltip.Content>
              </Tooltip.Root>
            ))}
          </div>

          <div className="border-b border-[var(--border)] pb-2">
            <input
              value={subject}
              maxLength={80}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="Subject"
              className="w-full bg-transparent text-lg text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            <p className="mt-1 text-right text-xs text-[var(--text-muted)]">{subject.length} / 80</p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] p-2">
              <div className="flex flex-wrap items-center gap-1">
                {tools.map((tool) => (
                  <button
                    key={tool.key}
                    type="button"
                    className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]"
                    aria-label={tool.label}
                  >
                    <tool.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="Toggle markdown preview"
                onClick={onTogglePreview}
                className={`rounded-md p-2 ${markdownPreview ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-white/10'}`}
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
            {markdownPreview ? (
              <div className="min-h-[200px] whitespace-pre-wrap p-3 text-sm leading-6 text-[var(--text-secondary)]">
                {body || 'Preview your message here...'}
              </div>
            ) : (
              <textarea
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                placeholder="Write your notification message here, or generate with AI ->"
                className="min-h-[220px] w-full resize-y bg-transparent p-3 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            )}
          </div>

          <ReadabilityPanel open={readabilityOpen} result={readabilityResult} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-white/10">
                <Paperclip className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-white/10">
                <SmilePlus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSaveDraft}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={onSchedule}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2 text-sm text-[var(--text-secondary)]"
              >
                <CalendarDays className="h-4 w-4" />
                Schedule
              </button>
              <button
                type="button"
                onClick={onSend}
                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent)] to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_var(--accent-glow)]"
              >
                Send Now <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </Tooltip.Provider>
  );
}
