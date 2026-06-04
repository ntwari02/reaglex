import type { SystemAlert } from './systemMonitor.service';

export interface AlertDiagnosis {
  summary: string;
  likelyCause: string;
  impact: string;
  fixes: string[];
  urgency: 'low' | 'medium' | 'high';
  source: 'ai' | 'rules';
}

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = String(process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest').trim();

function ruleBasedDiagnosis(alert: SystemAlert): AlertDiagnosis {
  const t = `${alert.title} ${alert.message}`.toLowerCase();
  if (t.includes('cpu')) {
    return {
      summary: 'The server CPU is overloaded relative to your threshold.',
      likelyCause:
        'Heavy API traffic, background workers, or inefficient hot paths. On small Render instances, traffic spikes can saturate a single core quickly.',
      impact: 'Slower responses, timeouts, and risk of process restarts under sustained load.',
      fixes: [
        'Open System Analysis → API intelligence and identify the slowest endpoints.',
        'Scale up the Render instance or enable autoscaling if available.',
        'Review recent deploys and cron jobs; pause non-essential workers temporarily.',
        'Add caching or pagination on high-traffic list endpoints.',
      ],
      urgency: alert.level === 'critical' ? 'high' : 'medium',
      source: 'rules',
    };
  }
  if (t.includes('ram') || t.includes('memory')) {
    return {
      summary: 'Memory usage is high on the API host.',
      likelyCause: 'Large in-memory caches, Mongo connection pool, or memory leaks after a deploy.',
      impact: 'GC pauses, OOM kills, and failed requests during pressure.',
      fixes: [
        'Restart the service after confirming no data loss risk.',
        'Lower Mongo maxPoolSize in production if set very high.',
        'Inspect recent code for unbounded arrays or caches.',
      ],
      urgency: alert.level === 'critical' ? 'high' : 'medium',
      source: 'rules',
    };
  }
  if (t.includes('disk')) {
    return {
      summary: 'Disk utilization is elevated.',
      likelyCause: 'Log growth, temp uploads, or full volume on the host.',
      impact: 'Writes may fail; deploys can fail if disk is full.',
      fixes: [
        'Rotate or trim logs on the host.',
        'Move uploads to Cloudinary/S3 if storing locally.',
        'Upgrade disk on the hosting plan.',
      ],
      urgency: 'medium',
      source: 'rules',
    };
  }
  if (t.includes('slow api') || t.includes('latency')) {
    return {
      summary: 'One or more API routes are responding slower than configured thresholds.',
      likelyCause: 'Slow database queries, missing indexes, external payment/shipping API latency, or cold Mongo connections.',
      impact: 'Poor checkout and dashboard UX; timeouts on mobile networks.',
      fixes: [
        'Check the named endpoint in the activity stream for status codes and timing.',
        'Add Mongo indexes for filters used on that route.',
        'Cache read-heavy public endpoints.',
        'Verify third-party APIs (Stripe, shipping) are reachable from Render.',
      ],
      urgency: alert.level === 'critical' ? 'high' : 'medium',
      source: 'rules',
    };
  }
  if (t.includes('error rate')) {
    return {
      summary: 'An API route is returning errors above the warning threshold.',
      likelyCause: 'Validation failures, auth errors, 500s from unhandled exceptions, or dependency outages.',
      impact: 'Users cannot complete flows tied to that endpoint.',
      fixes: [
        'Filter engine logs for `error` around the alert time.',
        'Reproduce the endpoint in staging with the same payload.',
        'Check MongoDB and payment provider status pages.',
      ],
      urgency: 'high',
      source: 'rules',
    };
  }
  if (t.includes('nominal')) {
    return {
      summary: 'No active infrastructure alerts right now.',
      likelyCause: 'Metrics are within configured thresholds.',
      impact: 'None expected.',
      fixes: ['Keep monitoring enabled and alert contacts configured for production.'],
      urgency: 'low',
      source: 'rules',
    };
  }
  return {
    summary: alert.message,
    likelyCause: 'Automated monitor detected an anomaly; review logs and recent deploys.',
    impact: 'Depends on which user flows hit affected services.',
    fixes: [
      'Review System Analysis engine logs and Security Analysis auth events.',
      'Confirm environment variables on Render match MISSING_ENV_VARIABLES.md.',
      'Use “Test notification” to verify admins receive emails when issues occur.',
    ],
    urgency: alert.level === 'critical' ? 'high' : 'medium',
    source: 'rules',
  };
}

export async function diagnoseSystemAlert(
  alert: SystemAlert,
  context: Record<string, unknown>,
): Promise<AlertDiagnosis> {
  if (!GEMINI_API_KEY) {
    return ruleBasedDiagnosis(alert);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL,
  )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const prompt = `You are a senior SRE helping a marketplace admin. Respond ONLY with JSON:
{"summary":"","likelyCause":"","impact":"","fixes":["",""],"urgency":"low|medium|high"}

Alert: ${JSON.stringify(alert)}
Context: ${JSON.stringify(context).slice(0, 4000)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: { temperature: 0.35, responseMimeType: 'application/json' },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error?.message || 'Gemini request failed');
    }
    const text =
      payload?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ||
      '';
    const parsed = JSON.parse(text);
    const fixes = Array.isArray(parsed.fixes)
      ? parsed.fixes.map((f: unknown) => String(f || '').trim()).filter(Boolean).slice(0, 6)
      : [];
    return {
      summary: String(parsed.summary || alert.message).slice(0, 500),
      likelyCause: String(parsed.likelyCause || '').slice(0, 800),
      impact: String(parsed.impact || '').slice(0, 500),
      fixes: fixes.length ? fixes : ruleBasedDiagnosis(alert).fixes,
      urgency: ['low', 'medium', 'high'].includes(parsed.urgency) ? parsed.urgency : 'medium',
      source: 'ai',
    };
  } catch (err) {
    console.warn('[systemMonitorAi] fallback to rules:', err);
    return ruleBasedDiagnosis(alert);
  }
}
