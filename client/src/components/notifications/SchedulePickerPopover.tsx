import * as Popover from '@radix-ui/react-popover';
import { CalendarDays } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  time: string;
  timezone: string;
  repeatEnabled: boolean;
  repeatFrequency: 'once' | 'daily' | 'weekly';
  is24Hour: boolean;
  onChange: (next: {
    date?: string;
    time?: string;
    timezone?: string;
    repeatEnabled?: boolean;
    repeatFrequency?: 'once' | 'daily' | 'weekly';
    is24Hour?: boolean;
  }) => void;
  onConfirm: () => void;
};

export function SchedulePickerPopover(props: Props) {
  const {
    open,
    onOpenChange,
    date,
    time,
    timezone,
    repeatEnabled,
    repeatFrequency,
    is24Hour,
    onChange,
    onConfirm,
  } = props;

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <CalendarDays className="h-4 w-4" />
          Schedule
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          className="z-[110] w-[330px] rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
        >
          <div className="space-y-3">
            <label className="block text-xs text-[var(--text-muted)]">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => onChange({ date: e.target.value })}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </label>
            <label className="block text-xs text-[var(--text-muted)]">
              Time
              <input
                type="time"
                value={time}
                onChange={(e) => onChange({ time: e.target.value })}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </label>
            <label className="block text-xs text-[var(--text-muted)]">
              Timezone
              <select
                value={timezone}
                onChange={(e) => onChange({ timezone: e.target.value })}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option>Africa/Kigali</option>
                <option>UTC</option>
                <option>Europe/Paris</option>
                <option>America/New_York</option>
              </select>
            </label>
            <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-white/5 p-2">
              <span className="text-xs text-[var(--text-secondary)]">24 hour format</span>
              <button
                type="button"
                onClick={() => onChange({ is24Hour: !is24Hour })}
                className={`h-6 w-11 rounded-full p-1 transition ${is24Hour ? 'bg-[var(--accent)]' : 'bg-white/15'}`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-white transition ${
                    is24Hour ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-white/5 p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Repeat</span>
                <button
                  type="button"
                  onClick={() => onChange({ repeatEnabled: !repeatEnabled })}
                  className={`h-6 w-11 rounded-full p-1 transition ${repeatEnabled ? 'bg-[var(--accent)]' : 'bg-white/15'}`}
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-white transition ${
                      repeatEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <select
                disabled={!repeatEnabled}
                value={repeatFrequency}
                onChange={(e) => onChange({ repeatFrequency: e.target.value as 'once' | 'daily' | 'weekly' })}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-50"
              >
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <button
              type="button"
              onClick={onConfirm}
              className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:brightness-110"
            >
              Confirm schedule
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
