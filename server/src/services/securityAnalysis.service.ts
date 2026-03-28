/**
 * Rule-based security overview + seeded findings for admin Security Analysis UI.
 * Additive — in-memory snapshots; extend with Mongo models later if needed.
 */

export interface SecurityOverview {
  score: number;
  grade: string;
  findingsSummary: { critical: number; high: number; medium: number; low: number; pass: number };
  lastScanAt: string | null;
  mttdHours: number;
  mttrHours: number;
  subScores: {
    network: number;
    application: number;
    data: number;
    access: number;
    dependencies: number;
  };
}

export interface SecurityFindingRow {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'PASS';
  title: string;
  component: string;
  cveId?: string;
  cvss?: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'FIXED' | 'ACCEPTED_RISK';
  firstDetected: string;
}

export interface SurfaceNode {
  id: string;
  label: string;
  ring: 'external' | 'application' | 'data' | 'core';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK';
  shortLabel: string;
}

export interface SecurityEventRow {
  id: string;
  type: string;
  title: string;
  description: string;
  actor: string;
  at: string;
}

export interface ComplianceItem {
  id: string;
  title: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'NEEDS_REVIEW';
  description: string;
}

const findingsSeed: SecurityFindingRow[] = [
  {
    id: 'f1',
    severity: 'CRITICAL',
    title: 'Unexpected database port exposed publicly',
    component: 'MySQL 3306',
    cveId: 'CWE-200',
    cvss: 9.1,
    status: 'OPEN',
    firstDetected: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'f2',
    severity: 'HIGH',
    title: 'Dependency with known ReDoS advisory',
    component: 'express@4.x',
    cveId: 'CVE-2024-XXXX',
    cvss: 7.5,
    status: 'OPEN',
    firstDetected: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'f3',
    severity: 'MEDIUM',
    title: 'Rate limiting not uniform on all public routes',
    component: 'API Gateway',
    status: 'IN_PROGRESS',
    firstDetected: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'f4',
    severity: 'LOW',
    title: 'Security header X-Frame-Options missing on legacy asset path',
    component: 'Static /uploads',
    status: 'OPEN',
    firstDetected: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'f5',
    severity: 'PASS',
    title: 'Helmet middleware active',
    component: 'Express',
    status: 'FIXED',
    firstDetected: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
];

const surfaceSeed: SurfaceNode[] = [
  { id: 'n1', label: 'WAF', ring: 'external', severity: 'OK', shortLabel: 'WAF' },
  { id: 'n2', label: 'CDN', ring: 'external', severity: 'LOW', shortLabel: 'CDN' },
  { id: 'n3', label: 'Auth API', ring: 'application', severity: 'OK', shortLabel: 'Auth' },
  { id: 'n4', label: 'Payment API', ring: 'application', severity: 'MEDIUM', shortLabel: 'Pay' },
  { id: 'n5', label: 'MongoDB', ring: 'data', severity: 'OK', shortLabel: 'DB' },
  { id: 'n6', label: 'Secrets', ring: 'data', severity: 'LOW', shortLabel: 'Env' },
  { id: 'n7', label: 'Admin Core', ring: 'core', severity: 'OK', shortLabel: 'ADM' },
];

const eventsSeed: SecurityEventRow[] = [
  {
    id: 'e1',
    type: 'SCAN_COMPLETE',
    title: 'Scheduled scan finished',
    description: 'Standard scan completed with 2 open findings.',
    actor: '[automated]',
    at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'e2',
    type: 'VULN_FOUND',
    title: 'New vulnerability recorded',
    description: 'Critical: public port mismatch detected in template data.',
    actor: '[automated]',
    at: new Date(Date.now() - 7200000).toISOString(),
  },
];

let lastScan = new Date(Date.now() - 14 * 60 * 1000).toISOString();

export function getSecurityOverview(): SecurityOverview {
  const critical = findingsSeed.filter((f) => f.severity === 'CRITICAL').length;
  const high = findingsSeed.filter((f) => f.severity === 'HIGH').length;
  const medium = findingsSeed.filter((f) => f.severity === 'MEDIUM').length;
  const low = findingsSeed.filter((f) => f.severity === 'LOW').length;
  const pass = findingsSeed.filter((f) => f.severity === 'PASS').length;
  let score = 100 - critical * 12 - high * 6 - medium * 3 - low * 1;
  score = Math.max(0, Math.min(100, score));
  const grade =
    score >= 85 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 50 ? 'FAIR' : score >= 30 ? 'POOR' : 'CRITICAL';
  return {
    score,
    grade,
    findingsSummary: { critical, high, medium, low, pass },
    lastScanAt: lastScan,
    mttdHours: 2.4,
    mttrHours: 18,
    subScores: {
      network: 88,
      application: 76,
      data: 91,
      access: 84,
      dependencies: 62,
    },
  };
}

export function getSecurityFindings(): SecurityFindingRow[] {
  return [...findingsSeed];
}

export function getAttackSurface(): { nodes: SurfaceNode[] } {
  return { nodes: surfaceSeed };
}

export function getSecurityEvents(): SecurityEventRow[] {
  return [...eventsSeed];
}

export function getComplianceOwasp(): ComplianceItem[] {
  return [
    { id: 'a01', title: 'A01: Broken Access Control', status: 'PARTIAL', description: 'Route guards verified for admin.' },
    { id: 'a02', title: 'A02: Cryptographic Failures', status: 'PASS', description: 'JWT + HTTPS enforced in production configs.' },
    { id: 'a03', title: 'A03: Injection', status: 'PASS', description: 'Validation on critical POST routes.' },
    { id: 'a04', title: 'A04: Insecure Design', status: 'NEEDS_REVIEW', description: 'Review threat model per release.' },
    { id: 'a05', title: 'A05: Security Misconfiguration', status: 'PARTIAL', description: 'Helmet + CORS; tune headers on static paths.' },
    { id: 'a06', title: 'A06: Vulnerable Components', status: 'FAIL', description: 'See dependency findings.' },
    { id: 'a07', title: 'A07: Identification & Auth', status: 'PASS', description: 'bcrypt + device flows for sensitive actions.' },
    { id: 'a08', title: 'A08: Software Integrity', status: 'NEEDS_REVIEW', description: 'CI signing recommended.' },
    { id: 'a09', title: 'A09: Logging & Monitoring', status: 'PASS', description: 'Structured logs + admin monitor module.' },
    { id: 'a10', title: 'A10: SSRF', status: 'NEEDS_REVIEW', description: 'Validate outbound URLs in integrations.' },
    { id: 'x1', title: 'Rate limiting active', status: 'PASS', description: 'Global API limiter enabled.' },
    { id: 'x2', title: 'Admin routes protected', status: 'PASS', description: 'JWT + role check on /api/admin/*.' },
  ];
}

export function runSecurityScan(mode: 'quick' | 'standard' | 'deep'): { jobId: string; message: string } {
  lastScan = new Date().toISOString();
  return { jobId: `scan-${Date.now()}`, message: `Scan queued (${mode})` };
}
