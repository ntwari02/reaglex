import * as Dialog from '@radix-ui/react-dialog';
import { Search, X } from 'lucide-react';
import type { NotificationTemplate, TemplateCategory } from './types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: NotificationTemplate[];
  query: string;
  category: 'All' | TemplateCategory;
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: 'All' | TemplateCategory) => void;
  onUseTemplate: (template: NotificationTemplate) => void;
};

const categories: Array<'All' | TemplateCategory> = ['All', 'Promo', 'Transactional', 'Alert', 'Welcome'];

export function TemplateLibraryModal(props: Props) {
  const {
    open,
    onOpenChange,
    templates,
    query,
    category,
    onQueryChange,
    onCategoryChange,
    onUseTemplate,
  } = props;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[110] max-h-[86vh] w-[900px] max-w-[94vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          <div className="border-b border-[var(--border)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="font-['Syne'] text-xl text-[var(--text-primary)]">
                Template Library
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[260px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onCategoryChange(item)}
                  className={`rounded-full px-3 py-2 text-xs ${
                    item === category
                      ? 'bg-[var(--accent)] text-white'
                      : 'border border-[var(--border)] text-[var(--text-secondary)]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid max-h-[62vh] grid-cols-1 gap-3 overflow-y-auto p-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <div key={template.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
                <p className="text-sm font-medium text-[var(--text-primary)]">{template.name}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{template.snippet}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
                    {template.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUseTemplate(template)}
                    className="rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-xs font-medium text-white"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
