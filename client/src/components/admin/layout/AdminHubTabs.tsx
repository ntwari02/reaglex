import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AdminHubTabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

export type AdminHubTabAccent = 'emerald' | 'amber';

export interface AdminHubTabsProps<T extends string = string> {
  tabs: AdminHubTabItem<T>[];
  activeTab: T;
  onTabChange: (id: T) => void;
  accent?: AdminHubTabAccent;
  className?: string;
  /** Optional wrapper for motion-enhanced tab buttons (e.g. Support Center). */
  renderTabButton?: (
    tab: AdminHubTabItem<T>,
    isActive: boolean,
    button: React.ReactElement,
  ) => React.ReactNode;
}

const activeAccentClasses: Record<AdminHubTabAccent, string> = {
  emerald: 'admin-hub-tab--active',
  amber:
    'border-amber-500/50 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/25 dark:text-amber-400 md:border-amber-500 md:bg-transparent',
};

export function AdminHubTabs<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  accent = 'emerald',
  className,
  renderTabButton,
}: AdminHubTabsProps<T>) {
  return (
    <nav
      className={cn('admin-hub-tabs', className)}
      aria-label="Section navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const button = (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'admin-hub-tab',
              isActive ? activeAccentClasses[accent] : 'admin-hub-tab--inactive',
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden /> : null}
            <span className="truncate">{tab.label}</span>
          </button>
        );
        return renderTabButton ? (
          <React.Fragment key={tab.id}>{renderTabButton(tab, isActive, button)}</React.Fragment>
        ) : (
          button
        );
      })}
    </nav>
  );
}
