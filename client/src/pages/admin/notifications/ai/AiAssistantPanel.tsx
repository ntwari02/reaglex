import { useEffect, useMemo, useState } from 'react';
import { AiControls } from './AiControls';
import { AiInsightPanel } from './AiInsightPanel';
import { AiOutputCard } from './AiOutputCard';
import { AiPromptInput } from './AiPromptInput';
import { ModerationWarnings } from './ModerationWarnings';
import { NotificationPreviewPanel } from './NotificationPreviewPanel';
import { SmartActionsToolbar } from './SmartActionsToolbar';
import type { AiInsight, ModerationItem, PreviewMode } from './types';

const MEMORY_KEY = 'reaglex_notifications_ai_memory_v2';

function moderate(text: string): ModerationItem[] {
  const src = text.toLowerCase();
  const issues: ModerationItem[] = [];
  if (/(guaranteed profit|double your money|wire funds)/i.test(src)) {
    issues.push({ id: 'scam', level: 'critical', label: 'Scam-like language', detail: 'Remove financial guarantees and risky claims.' });
  }
  if (/(act now|last chance|expires in \d+ minutes)/i.test(src)) {
    issues.push({ id: 'urgency', level: 'warning', label: 'Aggressive urgency', detail: 'Consider softer urgency to avoid trust loss.' });
  }
  if (/(idiot|stupid|dumb|hate you)/i.test(src)) {
    issues.push({ id: 'offensive', level: 'critical', label: 'Offensive wording', detail: 'Use respectful, neutral language.' });
  }
  return issues;
}

type GenerateResult = { subject: string; body: string };

type Props = {
  collapsed: boolean;
  isWorkspaceMode?: boolean;
  isMobileViewport?: boolean;
  onCollapse: () => void;
  subject: string;
  body: string;
  onApplyToEditor: (subject: string, body: string) => void;
  onSaveDraft: () => void;
  onSchedule: () => void;
  onSend: () => void;
  onRewriteEditor: () => void;
  generate: (input: { context: string; tone: string; language: string; command?: string }) => Promise<GenerateResult>;
  loading: boolean;
};

export function AiAssistantPanel(props: Props) {
  const {
    collapsed,
    isWorkspaceMode,
    isMobileViewport,
    onCollapse,
    subject,
    body,
    onApplyToEditor,
    onSaveDraft,
    onSchedule,
    onSend,
    onRewriteEditor,
    generate,
    loading,
  } = props;
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [language, setLanguage] = useState('English');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('email');
  const [generatedSubject, setGeneratedSubject] = useState(subject);
  const [generatedBody, setGeneratedBody] = useState(body);
  const [originalBody, setOriginalBody] = useState(body);
  const [thinking, setThinking] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [compare, setCompare] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  const insights: AiInsight[] = useMemo(
    () => [
      { label: 'Open rate', value: '41.2%', delta: '+2.3%' },
      { label: 'Click rate', value: '18.7%', delta: '+1.1%' },
      { label: 'Response rate', value: '12.4%', delta: '+0.9%' },
    ],
    []
  );
  const warnings = useMemo(() => moderate(`${generatedSubject}\n${generatedBody}`), [generatedSubject, generatedBody]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MEMORY_KEY);
      if (!raw) return;
      const m = JSON.parse(raw);
      if (m?.tone) setTone(String(m.tone));
      if (m?.language) setLanguage(String(m.language));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify({ tone, language, recentAt: Date.now() }));
    } catch {
      // ignore
    }
  }, [tone, language]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowPalette((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
        e.preventDefault();
        onSend();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSend]);

  async function runGenerate(command?: string) {
    setThinking(true);
    setStreaming(true);
    setOriginalBody(body);
    try {
      const result = await generate({ context: prompt.trim(), tone, language, command });
      setGeneratedSubject(result.subject || subject);
      const fullText = result.body || '';
      let i = 0;
      setGeneratedBody('');
      const tick = window.setInterval(() => {
        i += Math.max(1, Math.floor(fullText.length / 40));
        setGeneratedBody(fullText.slice(0, i));
        if (i >= fullText.length) {
          window.clearInterval(tick);
          setStreaming(false);
        }
      }, 25);
    } finally {
      setThinking(false);
    }
  }

  if (collapsed) return null;

  return (
    <div className="nc-right nc-ai-panel right-ai-panel" style={{ width: 380, flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {isWorkspaceMode && isMobileViewport && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '10px 12px',
            borderBottom: '1px solid var(--divider)',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--card-bg) 94%, rgba(0,191,165,0.1)) 0%, var(--card-bg) 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <button
            type="button"
            onClick={onCollapse}
            style={{
              border: '1px solid var(--border-visible)',
              borderRadius: 10,
              background: 'var(--bg-tertiary)',
              minHeight: 40,
              padding: '0 12px',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            style={{
              border: '1px solid var(--border-visible)',
              borderRadius: 10,
              background: 'var(--bg-tertiary)',
              minHeight: 40,
              padding: '0 12px',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={onSend}
            style={{
              marginLeft: 'auto',
              border: 'none',
              borderRadius: 10,
              background: '#00BFA5',
              minHeight: 40,
              padding: '0 14px',
              fontSize: 12,
              fontWeight: 800,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Send
          </button>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 48,
          padding: '0 12px',
          borderBottom: '1px solid var(--divider)',
          background: 'linear-gradient(90deg, rgba(0,191,165,0.12), transparent)',
        }}
      >
        <span style={{ fontSize: 18 }}>✦</span>
        <strong style={{ fontSize: 13 }}>AI Notification Copilot</strong>
        <button type="button" onClick={onCollapse} style={{ marginLeft: 'auto', border: '1px solid var(--border-visible)', borderRadius: 999, background: 'transparent', minHeight: 30, minWidth: 30, cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ overflowY: 'auto', minHeight: 0 }}>
        <AiControls tone={tone} language={language} onToneChange={setTone} onLanguageChange={setLanguage} onQuickCommand={(cmd) => void runGenerate(cmd)} />
        <AiPromptInput value={prompt} onChange={setPrompt} onSubmit={() => void runGenerate()} />
        <SmartActionsToolbar
          onGenerate={() => void runGenerate()}
          onRewrite={() => {
            onRewriteEditor();
            void runGenerate('rewrite');
          }}
          onSaveDraft={onSaveDraft}
          onSchedule={onSchedule}
          onSend={onSend}
          disabled={loading}
        />
        <AiOutputCard
          title="Enhanced Generated Output"
          value={generatedBody}
          compareValue={originalBody}
          compareMode={compare}
          isThinking={thinking}
          isStreaming={streaming}
          onChange={setGeneratedBody}
          onCopy={() => void navigator.clipboard?.writeText(generatedBody || '')}
          onRegenerate={() => void runGenerate()}
          onSaveDraft={onSaveDraft}
          onSendToEditor={() => onApplyToEditor(generatedSubject, generatedBody)}
          onCompareToggle={() => setCompare((v) => !v)}
        />
        <NotificationPreviewPanel mode={previewMode} onModeChange={setPreviewMode} subject={generatedSubject || subject} body={generatedBody || body} />
        <ModerationWarnings items={warnings} />
        <AiInsightPanel insights={insights} />
      </div>

      {showPalette && (
        <div style={{ position: 'absolute', right: 20, top: 80, width: 260, border: '1px solid var(--border-visible)', borderRadius: 12, background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)', padding: 10, zIndex: 30 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Command Palette</div>
          {['Generate (Ctrl+Enter to send)', 'Rewrite', 'Schedule', 'Save Draft', '/promo /refund /shipping'].map((line) => (
            <div key={line} style={{ padding: '6px 4px', fontSize: 12 }}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
