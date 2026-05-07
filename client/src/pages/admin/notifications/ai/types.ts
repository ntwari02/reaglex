export type PreviewMode = 'email' | 'desktop' | 'mobile' | 'dark' | 'push';

export type ModerationItem = {
  id: string;
  level: 'warning' | 'critical';
  label: string;
  detail: string;
};

export type AiInsight = {
  label: string;
  value: string;
  delta?: string;
};
