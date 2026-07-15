import mongoose, { Document, Schema } from 'mongoose';

type RegistrationStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'registered'
  | 'rejected'
  | 'expired';

interface IComplianceDocument {
  key: string;
  name: string;
  url?: string;
  status?: 'missing' | 'draft' | 'ready' | 'submitted' | 'approved';
  notes?: string;
  updatedAt?: Date;
}

interface IProcessingActivity {
  name: string;
  dataTypes: string[];
  dataSubjects: string[];
  purposes: string[];
  recipients: string[];
  specialCategories: string[];
  transferOutsideRwanda: boolean;
  safeguards?: string;
}

interface IBreachRecord {
  incidentDate: Date;
  discoveredAt?: Date;
  summary: string;
  affectedSubjects?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  notifiedNCSA?: boolean;
  notificationDate?: Date;
  status?: 'open' | 'contained' | 'reported' | 'closed';
}

interface IRetentionRule {
  category: string;
  retentionPeriod: string;
  legalBasis?: string;
  disposalMethod?: string;
}

interface IThirdPartyAgreement {
  vendorName: string;
  purpose: string;
  signedAt?: Date;
  expiresAt?: Date;
  agreementUrl?: string;
  status?: 'active' | 'expired' | 'pending';
}

interface ITransferApproval {
  destinationCountry: string;
  dataCategory: string;
  lawfulBasis: string;
  safeguards: string;
  approvedAt?: Date;
  expiresAt?: Date;
}

interface IPolicyDocument {
  key: string;
  title: string;
  version?: string;
  status?: 'missing' | 'draft' | 'ready' | 'published';
  effectiveDate?: Date;
  url?: string;
}

export interface IComplianceProfile extends Document {
  complianceProfile: {
    legalEntityName?: string;
    tradeName?: string;
    registrationNumber?: string;
    country?: string;
    primaryContactEmail?: string;
    brandingName?: string;
    brandingLogoUrl?: string;
  };
  registrationStatus: RegistrationStatus;
  certificateNumber?: string;
  certificateIssuedAt?: Date;
  certificateExpiresAt?: Date;
  dpoDetails: {
    fullName?: string;
    email?: string;
    phone?: string;
    idOrPassport?: string;
    localRepresentativeRequired?: boolean;
    localRepresentativeAgreementUrl?: string;
  };
  classificationChecklistAnswers: Record<string, boolean>;
  classificationSummary?: {
    result: 'controller' | 'processor' | 'both' | 'undetermined';
    rationale: string[];
    evaluatedAt: Date;
  };
  registrationReadinessDocuments: IComplianceDocument[];
  processingActivities: IProcessingActivity[];
  consentDocuments: IComplianceDocument[];
  breachRecords: IBreachRecord[];
  retentionRules: IRetentionRule[];
  thirdPartyAgreements: IThirdPartyAgreement[];
  transferApprovals: ITransferApproval[];
  policyDocuments: IPolicyDocument[];
  reminderSettings: {
    enabled: boolean;
    inAppEnabled: boolean;
    emailEnabled: boolean;
    daysBeforeExpiry: number[];
  };
  exportSettings: {
    officialNcsaLayout: boolean;
    blockIncompletePdfExport: boolean;
  };
  auditLogs: Array<{
    action: string;
    actorId?: string;
    at: Date;
    details?: string;
  }>;
  certificateReminderLogs: Array<{
    stage: string;
    sentAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const complianceDocumentSchema = new Schema<IComplianceDocument>(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, trim: true },
    status: { type: String, enum: ['missing', 'draft', 'ready', 'submitted', 'approved'], default: 'missing' },
    notes: { type: String, trim: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const processingActivitySchema = new Schema<IProcessingActivity>(
  {
    name: { type: String, required: true, trim: true },
    dataTypes: { type: [String], default: [] },
    dataSubjects: { type: [String], default: [] },
    purposes: { type: [String], default: [] },
    recipients: { type: [String], default: [] },
    specialCategories: { type: [String], default: [] },
    transferOutsideRwanda: { type: Boolean, default: false },
    safeguards: { type: String, trim: true },
  },
  { _id: false }
);

const breachRecordSchema = new Schema<IBreachRecord>(
  {
    incidentDate: { type: Date, required: true },
    discoveredAt: { type: Date },
    summary: { type: String, required: true, trim: true },
    affectedSubjects: { type: Number, default: 0 },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    notifiedNCSA: { type: Boolean, default: false },
    notificationDate: { type: Date },
    status: { type: String, enum: ['open', 'contained', 'reported', 'closed'], default: 'open' },
  },
  { _id: false }
);

const retentionRuleSchema = new Schema<IRetentionRule>(
  {
    category: { type: String, required: true, trim: true },
    retentionPeriod: { type: String, required: true, trim: true },
    legalBasis: { type: String, trim: true },
    disposalMethod: { type: String, trim: true },
  },
  { _id: false }
);

const thirdPartyAgreementSchema = new Schema<IThirdPartyAgreement>(
  {
    vendorName: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, trim: true },
    signedAt: { type: Date },
    expiresAt: { type: Date },
    agreementUrl: { type: String, trim: true },
    status: { type: String, enum: ['active', 'expired', 'pending'], default: 'pending' },
  },
  { _id: false }
);

const transferApprovalSchema = new Schema<ITransferApproval>(
  {
    destinationCountry: { type: String, required: true, trim: true },
    dataCategory: { type: String, required: true, trim: true },
    lawfulBasis: { type: String, required: true, trim: true },
    safeguards: { type: String, required: true, trim: true },
    approvedAt: { type: Date },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const policyDocumentSchema = new Schema<IPolicyDocument>(
  {
    key: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    version: { type: String, trim: true },
    status: { type: String, enum: ['missing', 'draft', 'ready', 'published'], default: 'missing' },
    effectiveDate: { type: Date },
    url: { type: String, trim: true },
  },
  { _id: false }
);

const complianceProfileSchema = new Schema<IComplianceProfile>(
  {
    complianceProfile: {
      legalEntityName: { type: String, trim: true },
      tradeName: { type: String, trim: true },
      registrationNumber: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Rwanda' },
      primaryContactEmail: { type: String, trim: true },
      brandingName: { type: String, trim: true, default: 'Spacilly' },
      brandingLogoUrl: { type: String, trim: true },
    },
    registrationStatus: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'registered', 'rejected', 'expired'],
      default: 'not_started',
      index: true,
    },
    certificateNumber: { type: String, trim: true },
    certificateIssuedAt: { type: Date },
    certificateExpiresAt: { type: Date, index: true },
    dpoDetails: {
      fullName: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      idOrPassport: { type: String, trim: true },
      localRepresentativeRequired: { type: Boolean, default: false },
      localRepresentativeAgreementUrl: { type: String, trim: true },
    },
    classificationChecklistAnswers: { type: Schema.Types.Mixed, default: {} },
    classificationSummary: {
      result: { type: String, enum: ['controller', 'processor', 'both', 'undetermined'], default: 'undetermined' },
      rationale: { type: [String], default: [] },
      evaluatedAt: { type: Date },
    },
    registrationReadinessDocuments: { type: [complianceDocumentSchema], default: [] },
    processingActivities: { type: [processingActivitySchema], default: [] },
    consentDocuments: { type: [complianceDocumentSchema], default: [] },
    breachRecords: { type: [breachRecordSchema], default: [] },
    retentionRules: { type: [retentionRuleSchema], default: [] },
    thirdPartyAgreements: { type: [thirdPartyAgreementSchema], default: [] },
    transferApprovals: { type: [transferApprovalSchema], default: [] },
    policyDocuments: { type: [policyDocumentSchema], default: [] },
    reminderSettings: {
      enabled: { type: Boolean, default: true },
      inAppEnabled: { type: Boolean, default: true },
      emailEnabled: { type: Boolean, default: false },
      daysBeforeExpiry: { type: [Number], default: [90, 30, 7] },
    },
    exportSettings: {
      officialNcsaLayout: { type: Boolean, default: true },
      blockIncompletePdfExport: { type: Boolean, default: true },
    },
    auditLogs: {
      type: [
        {
          action: { type: String, required: true, trim: true },
          actorId: { type: String, trim: true },
          at: { type: Date, default: Date.now },
          details: { type: String, trim: true },
        },
      ],
      default: [],
    },
    certificateReminderLogs: {
      type: [
        {
          stage: { type: String, required: true },
          sentAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const ComplianceProfile = mongoose.model<IComplianceProfile>('ComplianceProfile', complianceProfileSchema);

