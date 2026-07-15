import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ComplianceProfile } from '../models/ComplianceProfile';
import type { IComplianceProfile } from '../models/ComplianceProfile';

const DEFINITIONS = [
  { key: 'personal_data', title: 'Personal data', description: 'Any information relating to an identified or identifiable natural person.' },
  { key: 'sensitive_personal_data', title: 'Sensitive personal data', description: 'Personal data requiring higher protection, including health, biometrics, children data, and similar high-risk categories.' },
  { key: 'privacy', title: 'Privacy', description: 'The right of individuals to control how their personal data is collected, used, and disclosed.' },
  { key: 'data_controller', title: 'Data controller', description: 'Entity determining the purposes and means of processing personal data.' },
  { key: 'data_processor', title: 'Data processor', description: 'Entity processing personal data on behalf of a controller.' },
  { key: 'processing', title: 'Processing', description: 'Any operation performed on personal data, including collection, storage, transfer, use, and deletion.' },
];

const CLASSIFICATION_QUESTIONS = [
  { key: 'decides_purposes', question: 'Do you decide why personal data is processed?' },
  { key: 'decides_means', question: 'Do you decide how personal data is processed?' },
  { key: 'processes_on_behalf', question: 'Do you process personal data on behalf of another entity?' },
  { key: 'contracted_instructions', question: 'Are processing activities primarily based on another entity instructions?' },
  { key: 'direct_relationship_with_subject', question: 'Do you have a direct relationship with the data subject for the relevant activity?' },
];

const REGISTRATION_REQUIRED_DOCS = [
  { key: 'application_letter', name: 'Application letter' },
  { key: 'application_form', name: 'Application form' },
  { key: 'operating_license', name: 'Operating license' },
  { key: 'local_representative_agreement', name: 'Local representative agreement (if needed)' },
  { key: 'dpo_id_or_passport', name: 'DPO ID/passport' },
  { key: 'hosting_evidence', name: 'Hosting evidence' },
  { key: 'company_profile', name: 'Company profile' },
  { key: 'supporting_documents', name: 'Supporting documents' },
];

const POLICY_REQUIRED_DOCS = [
  { key: 'consent_form', title: 'Consent forms' },
  { key: 'consent_withdrawal_form', title: 'Consent withdrawal forms' },
  { key: 'parental_consent_form', title: 'Parental consent forms' },
  { key: 'inventory_processing_activities', title: 'Inventory of processing activities' },
  { key: 'privacy_notice', title: 'Privacy notice' },
  { key: 'website_privacy_policy', title: 'Website privacy policy' },
  { key: 'cookie_policy', title: 'Cookie policy' },
  { key: 'personal_data_protection_policy', title: 'Personal data protection policy' },
  { key: 'dpia_register', title: 'DPIA register' },
  { key: 'retention_policy', title: 'Retention policy' },
  { key: 'third_party_processing_agreements', title: 'Third-party processing agreements' },
  { key: 'breach_procedures', title: 'Breach procedures' },
  { key: 'breach_register', title: 'Breach register' },
  { key: 'breach_notification_forms', title: 'Breach notification forms' },
];

function ensureAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: admin access required' });
    return false;
  }
  return true;
}

async function getOrCreateProfile() {
  let profile = await ComplianceProfile.findOne();
  if (!profile) {
    const seedProfile: Partial<IComplianceProfile> = {
      registrationReadinessDocuments: REGISTRATION_REQUIRED_DOCS.map((d) => ({ ...d, status: 'missing' })),
      consentDocuments: [
        { key: 'consent_forms', name: 'Consent forms', status: 'missing' },
        { key: 'consent_withdrawal_forms', name: 'Consent withdrawal forms', status: 'missing' },
        { key: 'parental_consent_forms', name: 'Parental consent forms', status: 'missing' },
      ],
      policyDocuments: POLICY_REQUIRED_DOCS.map((d) => ({ ...d, status: 'missing' })),
      reminderSettings: {
        enabled: true,
        inAppEnabled: true,
        emailEnabled: false,
        daysBeforeExpiry: [90, 30, 7],
      },
      exportSettings: {
        officialNcsaLayout: true,
        blockIncompletePdfExport: true,
      },
    };
    profile = await new ComplianceProfile(seedProfile).save();
  }
  return profile;
}

function evaluateClassification(answers: Record<string, boolean>) {
  const controllerSignals = [
    answers.decides_purposes,
    answers.decides_means,
    answers.direct_relationship_with_subject,
  ].filter(Boolean).length;
  const processorSignals = [
    answers.processes_on_behalf,
    answers.contracted_instructions,
  ].filter(Boolean).length;

  let result: 'controller' | 'processor' | 'both' | 'undetermined' = 'undetermined';
  if (controllerSignals > 0 && processorSignals > 0) result = 'both';
  else if (controllerSignals > 0) result = 'controller';
  else if (processorSignals > 0) result = 'processor';

  const rationale: string[] = [];
  if (answers.decides_purposes) rationale.push('Entity determines purpose of processing.');
  if (answers.decides_means) rationale.push('Entity determines means of processing.');
  if (answers.processes_on_behalf) rationale.push('Entity processes data for another organization.');
  if (answers.contracted_instructions) rationale.push('Processing follows third-party contractual instructions.');
  if (answers.direct_relationship_with_subject) rationale.push('Entity has direct relationship with data subject.');
  if (!rationale.length) rationale.push('Insufficient signals to determine role.');

  return { result, rationale, evaluatedAt: new Date() };
}

function buildMissingChecklist(profile: any) {
  type ChecklistDocRow = { key?: string; url?: string; status?: string };
  const registrationRows: ChecklistDocRow[] = Array.isArray(profile.registrationReadinessDocuments)
    ? profile.registrationReadinessDocuments
    : [];
  const policyRows: ChecklistDocRow[] = Array.isArray(profile.policyDocuments) ? profile.policyDocuments : [];
  const registrationDocMap = new Map<string, ChecklistDocRow>(
    registrationRows.map((d) => [String(d.key || ''), d]),
  );
  const policyDocMap = new Map<string, ChecklistDocRow>(policyRows.map((d) => [String(d.key || ''), d]));

  const missingRegistration = REGISTRATION_REQUIRED_DOCS.filter((d) => {
    const row = registrationDocMap.get(d.key);
    return !row || !row.url || row.status === 'missing';
  }).map((d) => d.name);

  const missingPolicies = POLICY_REQUIRED_DOCS.filter((d) => {
    const row = policyDocMap.get(d.key);
    return !row || !row.url || row.status === 'missing';
  }).map((d) => d.title);

  const certificateMissing = !profile.certificateNumber || !profile.certificateIssuedAt || !profile.certificateExpiresAt;
  const dpoMissing = !profile.dpoDetails?.fullName || !profile.dpoDetails?.idOrPassport;
  const processingActivitiesMissing = !Array.isArray(profile.processingActivities) || profile.processingActivities.length === 0;
  const thirdPartyMissing = !Array.isArray(profile.thirdPartyAgreements) || profile.thirdPartyAgreements.length === 0;

  return {
    missingRegistration,
    missingPolicies,
    certificateMissing,
    dpoMissing,
    processingActivitiesMissing,
    thirdPartyMissing,
    readyForSubmission:
      missingRegistration.length === 0 &&
      missingPolicies.length === 0 &&
      !certificateMissing &&
      !dpoMissing &&
      !processingActivitiesMissing,
  };
}

export async function getComplianceDefinitions(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  return res.json({
    definitions: DEFINITIONS,
    classificationQuestions: CLASSIFICATION_QUESTIONS,
    registrationRequiredDocuments: REGISTRATION_REQUIRED_DOCS,
    policyRequiredDocuments: POLICY_REQUIRED_DOCS,
  });
}

export async function getComplianceProfile(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const profile = await getOrCreateProfile();
    const checklist = buildMissingChecklist(profile.toObject());
    return res.json({ profile, checklist });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to load compliance profile' });
  }
}

export async function upsertComplianceProfile(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const payload = req.body || {};
    const profile = await getOrCreateProfile();
    const allowedFields = [
      'complianceProfile',
      'registrationStatus',
      'certificateNumber',
      'certificateIssuedAt',
      'certificateExpiresAt',
      'dpoDetails',
      'processingActivities',
      'consentDocuments',
      'breachRecords',
      'retentionRules',
      'thirdPartyAgreements',
      'transferApprovals',
      'policyDocuments',
      'registrationReadinessDocuments',
      'classificationChecklistAnswers',
      'reminderSettings',
      'exportSettings',
    ];

    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        (profile as any)[key] = payload[key];
      }
    }

    profile.auditLogs.push({
      action: 'profile_updated',
      actorId: req.user?.id,
      at: new Date(),
      details: 'Compliance profile updated',
    });

    await profile.save();
    const checklist = buildMissingChecklist(profile.toObject());
    return res.json({ message: 'Compliance profile updated', profile, checklist });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to update compliance profile' });
  }
}

export async function evaluateClassificationChecklist(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const answers = (req.body?.answers || {}) as Record<string, boolean>;
    const summary = evaluateClassification(answers);
    const profile = await getOrCreateProfile();
    profile.classificationChecklistAnswers = answers;
    profile.classificationSummary = summary;
    profile.auditLogs.push({
      action: 'classification_evaluated',
      actorId: req.user?.id,
      at: new Date(),
      details: `Result: ${summary.result}`,
    });
    await profile.save();
    return res.json({ summary, profile });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to evaluate classification' });
  }
}

export async function getRegistrationReadiness(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const profile = await getOrCreateProfile();
    const checklist = buildMissingChecklist(profile.toObject());
    return res.json({
      registrationRequiredDocuments: REGISTRATION_REQUIRED_DOCS,
      policyRequiredDocuments: POLICY_REQUIRED_DOCS,
      checklist,
      profile,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to load readiness checklist' });
  }
}

export async function exportRegistrationPack(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const profile = await getOrCreateProfile();
    const checklist = buildMissingChecklist(profile.toObject());
    const pack = {
      generatedAt: new Date().toISOString(),
      jurisdiction: 'Rwanda',
      authority: 'NCSA',
      profile,
      checklist,
      definitions: DEFINITIONS,
      registrationDocuments: REGISTRATION_REQUIRED_DOCS,
      policyDocuments: POLICY_REQUIRED_DOCS,
    };
    return res.json({ pack });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to export registration pack' });
  }
}

function escapePdfText(input: string): string {
  return String(input || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]): Buffer {
  const safeLines = lines.slice(0, 120);
  const contentRows = ['BT', '/F1 10 Tf', '50 790 Td'];
  for (let i = 0; i < safeLines.length; i += 1) {
    if (i > 0) contentRows.push('0 -14 Td');
    contentRows.push(`(${escapePdfText(safeLines[i])}) Tj`);
  }
  contentRows.push('ET');
  const content = contentRows.join('\n');

  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Count 1 /Kids [3 0 R] >>';
  objects[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[5] = `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let i = 1; i <= 5; i += 1) {
    offsets[i] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

export async function exportRegistrationPackPdf(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const profile = await getOrCreateProfile();
    const checklist = buildMissingChecklist(profile.toObject());
    const brand = profile.complianceProfile?.brandingName || profile.complianceProfile?.tradeName || 'Spacilly';
    const strictQuery = String(req.query.strict || '').toLowerCase();
    const strictRequested = strictQuery === '1' || strictQuery === 'true' || strictQuery === 'yes';
    if (strictRequested) {
      const missingItems: string[] = [];
      if (checklist.certificateMissing) missingItems.push('Certificate number, issue date, and expiry date');
      if (checklist.dpoMissing) missingItems.push('DPO full name and ID/passport');
      if (checklist.processingActivitiesMissing) missingItems.push('At least one processing activity');
      if ((checklist.missingRegistration || []).length > 0) missingItems.push('All registration readiness documents uploaded');
      if ((checklist.missingPolicies || []).length > 0) missingItems.push('All policy documents uploaded');

      if (missingItems.length > 0) {
        return res.status(400).json({
          message: 'NCSA strict export blocked: required items are missing.',
          code: 'NCSA_STRICT_EXPORT_BLOCKED',
          missingItems,
        });
      }
    }

    const lines: string[] = [
      `${brand} - Rwanda NCSA Data Protection Submission Pack`,
      `Generated: ${new Date().toISOString()}`,
      'Prepared for NCSA Controller/Processor registration readiness.',
      `Template mode: ${strictRequested ? 'Official NCSA strict' : 'Standard compliance'}.`,
      '',
      'SECTION 1: ORGANIZATION DETAILS',
      `Legal Entity: ${profile.complianceProfile?.legalEntityName || 'N/A'}`,
      `Trade Name: ${profile.complianceProfile?.tradeName || 'N/A'}`,
      `Registration No: ${profile.complianceProfile?.registrationNumber || 'N/A'}`,
      `Primary Contact: ${profile.complianceProfile?.primaryContactEmail || 'N/A'}`,
      `Branding Logo: ${profile.complianceProfile?.brandingLogoUrl || 'N/A'}`,
      '',
      'SECTION 2: REGISTRATION STATUS',
      `Status: ${profile.registrationStatus}`,
      `Certificate: ${profile.certificateNumber || 'N/A'}`,
      `Issued: ${profile.certificateIssuedAt ? new Date(profile.certificateIssuedAt).toLocaleDateString() : 'N/A'}`,
      `Expires: ${profile.certificateExpiresAt ? new Date(profile.certificateExpiresAt).toLocaleDateString() : 'N/A'}`,
      '',
      'SECTION 3: CONTROLLER/PROCESSOR CLASSIFICATION',
      `Result: ${profile.classificationSummary?.result || 'undetermined'}`,
      ...(profile.classificationSummary?.rationale || []).map((r: string) => `- ${r}`),
      '',
      'SECTION 4: READINESS CHECKLIST',
      `Ready for submission: ${checklist.readyForSubmission ? 'Yes' : 'No'}`,
      'Missing registration items:',
      ...((checklist.missingRegistration || []).map((x: string) => `- ${x}`)),
      '',
      'Missing policy items:',
      ...((checklist.missingPolicies || []).map((x: string) => `- ${x}`)),
      '',
      'SECTION 5: PROCESSING ACTIVITIES',
      ...((profile.processingActivities || []).map((a: any) => `- ${a.name || 'Unnamed activity'}`)),
    ];
    const pdf = buildSimplePdf(lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="spacilly-compliance-pack-${new Date().toISOString().slice(0, 10)}.pdf"`);
    return res.send(pdf);
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to export PDF pack' });
  }
}

export async function uploadComplianceDocument(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    return res.json({
      url: (file as any).path || '',
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to upload compliance document' });
  }
}

