import { Clock3 } from 'lucide-react';
import type { ChannelTabDefinition, NotificationChannel } from './types';

type Props = {
  tabs: ChannelTabDefinition[];
  activeTab: NotificationChannel;
  onChange: (tab: NotificationChannel) => void;
  autoSaveEnabled: boolean;
  isSaving: boolean;
  onToggleAutoSave: () => void;
  onScheduleClick: () => void;
};

export function ChannelTabs({
  tabs,
  activeTab,
  onChange,
  autoSaveEnabled,
  isSaving,
  onToggleAutoSave,
  onScheduleClick,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition duration-150 ${
                active
                  ? 'bg-[var(--accent)] text-white shadow-[0_0_18px_var(--accent-glow)]'
                  : 'text-[var(--text-secondary)] hover:-translate-y-0.5 hover:bg-white/5 hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleAutoSave}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${isSaving ? 'animate-pulse bg-[var(--accent)]' : 'bg-white/20'}`} />
          <span role="status">Auto-save {autoSaveEnabled ? 'On' : 'Off'}</span>
        </button>

        <button
          type="button"
          onClick={onScheduleClick}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <Clock3 className="h-4 w-4" />
          Schedule
        </button>
      </div>
    </div>
  );
}
