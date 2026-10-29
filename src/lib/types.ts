export type ClaimStatus =
  | "new"
  | "ready_for_estimation"
  | "under_review"
  | "ready_for_payment"
  | "needs_human_review"
  | "resolved";

export type Category =
  | "roof_tiles"
  | "gutter"
  | "scaffold"
  | "labour"
  | "travel"
  | "skylight"
  | "other";

export type FieldKey =
  | "claimId"
  | "policyId"
  | "customer"
  | "lossDate"
  | "eventType"
  | "address"
  | "assetType"
  | "contractor"
  | "damageDescription"
  | "vat"
  | "deductible"
  | "quoteTotal";

export interface Field {
  value: string;
  original: string;
  confidence: number; // 0..1
  source: string;
  corrected?: boolean;
}

export interface ExtractedItem {
  id: string;
  category: Category;
  description: string;
  unit: string;
  quantity: number | null;
  quoted_unit_price: number;
  quoted_total: number;
  confidence: number;
  source_reference: string;
}

export interface BenchmarkPrice {
  id: string;
  category: Category;
  material_or_specification: string;
  region: string;
  unit: string;
  labour_rate: number;
  material_rate: number;
  expected_range_min: number;
  expected_range_max: number;
  confidence: number;
  source: string;
  last_updated_at: string;
  database_version: string;
}

export interface RiskFlags {
  coverageConfirmed: boolean;
  deductibleUncertain: boolean;
  duplicate: boolean;
  fraud: boolean;
  safety: boolean;
  policyIssue: boolean;
  vulnerability: boolean;
}

export interface Attachment {
  name: string;
  kind: "pdf" | "photo";
  image?: "roof" | "gutter" | "skylight";
}

export interface Claim {
  claim_id: string;
  customer_name: string;
  received_at: string;
  email_subject: string;
  email_from: string;
  email_body: string;
  attachments: Attachment[];
  quote_available: boolean;
  status: ClaimStatus;
  flags: RiskFlags;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}

export type Route =
  | "ready_for_payment"
  | "request_info"
  | "request_revised_quote"
  | "human_review";

export interface ReviewSnapshot {
  version: number;
  created_at: string;
  db_version: string;
  quote_total: number;
  benchmark_total: number;
  variance_absolute: number;
  variance_percentage: number;
  confidence: number;
  recommended_amount: number;
  decision: Route;
  rationale: string;
  reasons: string[];
  line_flags: { item: string; flags: string[] }[];
}

export type HumanAction = "approve" | "request_info" | "revised_quote" | "escalate";

export interface HumanDecision {
  version: number;
  at: string;
  actor: string;
  action: HumanAction;
  final_amount: number | null;
  override: boolean;
  justification: string;
}

export interface FeedbackVersion {
  version: number;
  at: string;
  actor: string;
  recommendation_correct: "yes" | "partly" | "no";
  line_item_changed: string;
  quantity_changed: boolean;
  unit_price_changed: boolean;
  category_reclassified: boolean;
  final_amount: number | null;
  reason_code: string;
  comment: string;
}

export interface ClaimRecord {
  claim: Claim;
  extracted: boolean;
  fields: Record<FieldKey, Field>;
  lines: ExtractedItem[];
  estimatesRunAt?: string;
  reviews: ReviewSnapshot[];
  decisions: HumanDecision[];
  feedback: FeedbackVersion[];
  queuedForPaymentAt?: string;
  audit: AuditEvent[];
}

export interface Settings {
  minConfidence: number; // 0..1
  maxVariancePct: number; // %
  maxVarianceAbs: number; // EUR
  approvalCap: number; // EUR
  lineVariancePct: number;
  lineVarianceAbs: number;
  expectedVatRate: number; // 0..1
  lowExtractionConfidence: number; // 0..1
}
