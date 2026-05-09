import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Sparkles, Save, CalendarDays, Send, Copy, RefreshCw, GitCompare } from 'lucide-react';
import { PreviewPane } from './PreviewPane';

type Props = {
  open: boolean;
  bottomDrawer: boolean;
  prompt: string;
  setPrompt: (value: string) => void;
  tone: string;
  setTone: (tone: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  generated: string;
  generating: boolean;
  compareMode: boolean;
  onToggleCompare: () => void;
  onGenerate: () => void;
  onCollapse: () => void;
  onSendToEditor: () => void;
  onSaveDraft: () => void;
  previewMode: 'email' | 'desktop' | 'mobile' | 'dark' | 'push';
  onPreviewModeChange: (mode: 'email' | 'desktop' | 'mobile' | 'dark' | 'push') => void;
  subject: string;
  body: string;
  slashCommands: string[];
  onApplyCommand: (cmd: string) => void;
};

const tones = ['Friendly', 'Professional', 'Urgent', 'Formal'];

export function AICopilotPanel(props: Props) {
  const {
    open,
    bottomDrawer,
    prompt,
    setPrompt,
    tone,
    setTone,
    language,
    setLanguage,
    generated,
    generating,
    compareMode,
    onToggleCompare,
    onGenerate,
    onCollapse,
    onSendToEditor,
    onSaveDraft,
    previewMode,
    onPreviewModeChange,
    subject,
    body,
    slashCommands,
    onApplyCommand,
  } = props;

  const wordCount = useMemo(
    () => prompt.trim().split(/\s+/).filter(Boolean).length,
    [prompt]
  );

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.aside
          initial={bottomDrawer ? { y: 350 } : { x: 380 }}
          animate={bottomDrawer ? { y: 0 } : { x: 0 }}
          exit={bottomDrawer ? { y: 350 } : { x: 380 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className={`${bottomDrawer ? 'fixed bottom-0 left-0 right-0 z-50 max-h-[84vh] rounded-t-2xl' : 'w-[380px] shrink-0'} border-l border-[var(--border)] bg-[var(--bg-elevated)]`}
        >
          <div className="flex h-full flex-col">
            <div className="relative flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="absolute inset-x-0 bottom-0 h-px animate-pulse bg-gradient-to-r from-transparent via-[var(--accent)]/70 to-transparent" />
              <h3 className="font-['Syne'] text-lg text-[var(--text-primary)]">
                <Sparkles className="mr-1 inline h-4 w-4 text-[var(--accent)]" /> AI Notification Copilot
              </h3>
              <button
                type="button"
                onClick={onCollapse}
                className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-white/10"
                aria-label="Collapse AI panel"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Tone</p>
                <div className="flex flex-wrap gap-2">
                  {tones.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`rounded-full px-3 py-1.5 text-xs ${
                        tone === t
                          ? 'bg-[var(--accent)] text-white'
                          : 'border border-[var(--border)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-xs text-[var(--text-muted)]">
                Language
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                >
                  {['EN', 'FR', 'RW', 'AR', 'ES'].map((lang) => (
                    <option key={lang}>{lang}</option>
                  ))}
                </select>
              </label>

              <div className="flex gap-2 overflow-x-auto">
                {slashCommands.map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() => onApplyCommand(cmd)}
                    className="whitespace-nowrap rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:bg-[var(--accent)]/10"
                  >
                    {cmd}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-2">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Use /promo, /refund, /shipping..."
                  className="min-h-[96px] w-full resize-none bg-transparent p-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
                <div className="flex items-center justify-between px-2 pb-1 text-xs text-[var(--text-muted)]">
                  <span>{wordCount} words</span>
                  <span>{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Generate', icon: Sparkles, onClick: onGenerate },
                  { label: 'Rewrite', icon: RefreshCw, onClick: onGenerate },
                  { label: 'Save Draft', icon: Save, onClick: onSaveDraft },
                  { label: 'Schedule', icon: CalendarDays, onClick: onSaveDraft },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Enhanced Generated Output</p>
                  <button className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-secondary)]">
                    <Copy className="mr-1 inline h-3 w-3" /> Copy
                  </button>
                  <button className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-secondary)]">
                    <RefreshCw className="mr-1 inline h-3 w-3" /> Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={onSendToEditor}
                    className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-secondary)]"
                  >
                    <Send className="mr-1 inline h-3 w-3" /> Send to Editor
                  </button>
                  <button
                    type="button"
                    onClick={onToggleCompare}
                    className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-secondary)]"
                  >
                    <GitCompare className="mr-1 inline h-3 w-3" /> Compare
                  </button>
                </div>
                <div className="max-h-[180px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-secondary)]">
                  {generating ? 'Generating...' : generated || 'Generated output appears here.'}
                </div>
                {compareMode ? (
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-2 text-xs text-[var(--text-secondary)]">
                      <p className="mb-1 uppercase text-[var(--text-muted)]">Original</p>
                      <p className="line-clamp-6">{body}</p>
                    </div>
                    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-2 text-xs text-[var(--text-secondary)]">
                      <p className="mb-1 uppercase text-[var(--text-muted)]">AI Version</p>
                      <p className="line-clamp-6">{generated}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <PreviewPane mode={previewMode} onModeChange={onPreviewModeChange} subject={subject} body={body} />
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
