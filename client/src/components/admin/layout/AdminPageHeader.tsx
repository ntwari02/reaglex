import React from 'react';
import { cn } from '@/lib/utils';

export interface AdminPageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <header className={cn('admin-page-header', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="admin-page-eyebrow">{eyebrow}</p> : null}
        <h1 className="admin-page-title">{title}</h1>
        {description ? <p className="admin-page-desc">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
