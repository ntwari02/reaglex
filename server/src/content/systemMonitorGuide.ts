/** Admin-facing guide for System / Security Analysis hubs. */

export interface SystemGuideSection {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
}

export const SYSTEM_MONITOR_GUIDE: SystemGuideSection[] = [
  {
    id: 'overview',
    title: 'What this dashboard does',
    summary:
      'Live health of the API server: CPU, memory, disk, request rate, slow routes, and error spikes. Data comes from in-process sampling plus every API call timed by middleware.',
    bullets: [
      'Green / amber / red metrics follow thresholds you set in Thresholds & alerts.',
      'The activity stream and engine logs show recent requests and monitor events.',
      'WebSocket channel `/system` pushes bundle updates without refreshing the page.',
    ],
  },
  {
    id: 'alerts',
    title: 'Alerts & notifications',
    summary:
      'When CPU, RAM, disk, or API latency crosses a threshold, an alert appears. If you add contact emails, the server can email admins (with cooldown so you are not spammed).',
    bullets: [
      'Critical alerts: CPU/RAM/disk critical, very slow APIs.',
      'Warning alerts: elevated usage, latency warnings, error-rate warnings.',
      'Use “Test notification” after saving contacts to verify email delivery.',
      'Phone numbers are stored for your records; SMS requires a provider (e.g. Twilio) — use Slack webhook for instant chat alerts.',
    ],
  },
  {
    id: 'ai',
    title: 'AI diagnosis',
    summary:
      'Click “Diagnose” on any alert to get a plain-language explanation: likely cause, impact, and suggested fixes. Uses Gemini when configured; otherwise rule-based guidance.',
    bullets: [
      'Requires GEMINI_API_KEY on the server for richest answers.',
      'Does not auto-execute fixes — review suggestions before changing production.',
    ],
  },
  {
    id: 'security',
    title: 'Security Analysis vs System Analysis',
    summary:
      'System Analysis = infrastructure & API performance. Security Analysis = auth events, sessions, risk scores, and API configuration posture.',
    bullets: [
      'Both share the same alert contact settings when you save notifications here.',
      'Security scans and session viewer live under Security Analysis.',
    ],
  },
  {
    id: 'render',
    title: 'Production (Render) tips',
    summary: 'Common causes of “site down” on cloud hosts.',
    bullets: [
      'Check /api/health returns 200.',
      'Verify MONGODB_URI, JWT_SECRET, CLIENT_URL, and ALLOWED_ORIGINS.',
      'Free tier may sleep — keep-alive pings / paid plan reduce cold starts.',
      'Payment gateway sync failures are logged but should not block listen if wrapped in startup steps.',
    ],
  },
];
