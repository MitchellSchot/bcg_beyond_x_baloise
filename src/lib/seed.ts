import type {
  AuditEvent,
  BenchmarkPrice,
  ClaimRecord,
  ExtractedItem,
  Field,
  FieldKey,
  Settings,
} from "./types";

export const DB_VERSION = "2026.10.01";
export const DB_REGION = "Flanders";
export const SYSTEM = "System";
export const HANDLER = "Louis Dupont · Claims handler";

export const DEFAULT_SETTINGS: Settings = {
  minConfidence: 0.9,
  maxVariancePct: 10,
  maxVarianceAbs: 250,
  approvalCap: 5000,
  lineVariancePct: 15,
  lineVarianceAbs: 50,
  expectedVatRate: 0.06,
  lowExtractionConfidence: 0.8,
};

const db = (r: Omit<BenchmarkPrice, "region" | "database_version">): BenchmarkPrice => ({
  ...r,
  region: DB_REGION,
  database_version: DB_VERSION,
});

export const SEED_PRICES: BenchmarkPrice[] = [
  db({ id: "PD-ROOF-012", category: "roof_tiles", material_or_specification: "Clay roof tile replacement (incl. fixing)", unit: "tile", material_rate: 4.2, labour_rate: 6.8, expected_range_min: 9, expected_range_max: 14, confidence: 0.96, source: "Embuild Vlaanderen index · row 112", last_updated_at: "2026-09-28" }),
  db({ id: "PD-GUT-004", category: "gutter", material_or_specification: "Zinc gutter section repair", unit: "m", material_rate: 28, labour_rate: 22, expected_range_min: 42, expected_range_max: 62, confidence: 0.94, source: "Approved contractor tariffs Q3 · row 41", last_updated_at: "2026-09-30" }),
  db({ id: "PD-SCAF-002", category: "scaffold", material_or_specification: "Facade scaffold rental, single storey", unit: "day", material_rate: 95, labour_rate: 0, expected_range_min: 80, expected_range_max: 120, confidence: 0.95, source: "Rental partner price list · row 7", last_updated_at: "2026-09-15" }),
  db({ id: "PD-LAB-001", category: "labour", material_or_specification: "Certified roofer, standard hour", unit: "hour", material_rate: 0, labour_rate: 58, expected_range_min: 50, expected_range_max: 68, confidence: 0.97, source: "Joint committee 124 wage scale · row 3", last_updated_at: "2026-10-01" }),
  db({ id: "PD-TRV-001", category: "travel", material_or_specification: "Contractor travel, regional trip", unit: "trip", material_rate: 0, labour_rate: 45, expected_range_min: 35, expected_range_max: 60, confidence: 0.92, source: "Approved contractor tariffs Q3 · row 88", last_updated_at: "2026-09-30" }),
  db({ id: "PD-SKY-003", category: "skylight", material_or_specification: "Roof window glazing unit replacement", unit: "unit", material_rate: 310, labour_rate: 140, expected_range_min: 380, expected_range_max: 560, confidence: 0.9, source: "Manufacturer list price 2026 · row 19", last_updated_at: "2026-09-20" }),
];

const f = (value: string, confidence: number, source: string): Field => ({ value, original: value, confidence, source });

const li = (
  id: string, category: ExtractedItem["category"], description: string, unit: string,
  quantity: number | null, price: number, confidence: number, source: string,
): ExtractedItem => ({
  id, category, description, unit, quantity, quoted_unit_price: price,
  quoted_total: Math.round((quantity ?? 0) * price * 100) / 100, confidence, source_reference: source,
});

let n = 0;
export const ev = (at: string, actor: string, action: string, detail: string): AuditEvent => ({
  id: `ev-${Date.now().toString(36)}-${(n++).toString(36)}`, at, actor, action, detail,
});

const baseAudit = (id: string, at: string, docs: string, extractedAt?: string) => {
  const list = [
    ev(at, SYSTEM, "Email received", `Claim mailbox · ${id}`),
    ev(at, SYSTEM, "Documents uploaded", docs),
  ];
  if (extractedAt) list.push(ev(extractedAt, SYSTEM, "Fields extracted", "Email, quote PDF and photos parsed. Untrusted content isolated from workflow rules."));
  return list;
};

const noFlags = { coverageConfirmed: true, deductibleUncertain: false, duplicate: false, fraud: false, safety: false, policyIssue: false, vulnerability: false };

function fields(o: Partial<Record<FieldKey, Field>> & Record<FieldKey, Field>) { return o; }

// ---- Claim A: simple ----
const A_LINES = [
  li("a1", "roof_tiles", "Replace 14 clay roof tiles (Koramic, red)", "tile", 14, 11.5, 0.97, "Quote p.1, line 3"),
  li("a2", "gutter", "Repair zinc gutter section, front facade", "m", 3, 52, 0.95, "Quote p.1, line 4"),
  li("a3", "scaffold", "Scaffold rental", "day", 2, 98, 0.96, "Quote p.1, line 5"),
  li("a4", "labour", "Labour hours, certified roofer", "hour", 6, 60, 0.94, "Quote p.1, line 6"),
  li("a5", "travel", "Travel cost", "trip", 1, 45, 0.98, "Quote p.1, line 7"),
];

const claimA: ClaimRecord = {
  claim: {
    claim_id: "CLM-2026-10481",
    customer_name: "Sophie Peeters",
    received_at: "2026-10-21T09:12:00",
    email_subject: "Hagelschade dak – schadeclaim polis BH-778-2041",
    email_from: "sophie.peeters@example.be",
    email_body:
      "Beste,\n\nDuring the hailstorm of 18 October several roof tiles at the front of our house were broken and the gutter was dented. Water is not coming in, but we would like to repair it quickly.\n\nAttached you will find the quote from Dakwerken Van Dyck and three photos.\n\nKind regards,\nSophie Peeters\nPolicy BH-778-2041",
    attachments: [
      { name: "Offerte_VanDyck_2026-118.pdf", kind: "pdf" },
      { name: "IMG_2041.jpg", kind: "photo", image: "roof" },
      { name: "IMG_2044.jpg", kind: "photo", image: "gutter" },
    ],
    quote_available: true,
    status: "ready_for_estimation",
    flags: { ...noFlags },
  },
  extracted: true,
  fields: fields({
    claimId: f("CLM-2026-10481", 1, "System generated"),
    policyId: f("BH-778-2041", 0.98, "Email body, signature"),
    customer: f("Sophie Peeters", 0.99, "Email sender + signature"),
    lossDate: f("2026-10-18", 0.95, "Email body, line 3"),
    eventType: f("Hail", 0.99, "Email subject"),
    address: f("Kerkstraat 14, 2800 Mechelen · Flanders", 0.96, "Quote p.1, header"),
    assetType: f("Single-family house, pitched clay-tile roof", 0.92, "Quote p.1 + photos"),
    contractor: f("Dakwerken Van Dyck BV (approved network)", 0.98, "Quote p.1, letterhead"),
    damageDescription: f("14 broken roof tiles, dented zinc gutter (3 m), no water ingress", 0.93, "Email body + photo IMG_2041"),
    vat: f("6%", 0.97, "Quote p.1, line 9"),
    deductible: f("300", 0.95, "Policy BH-778-2041, schedule"),
    quoteTotal: f("973.08", 0.98, "Quote p.1, line 10"),
  }),
  lines: A_LINES,
  reviews: [],
  decisions: [],
  feedback: [],
  audit: baseAudit("CLM-2026-10481", "2026-10-21T09:12:00", "Quote PDF (1 page), 2 photos", "2026-10-21T09:13:10"),
};

// ---- Claim B: exception ----
const B_LINES = [
  li("b1", "roof_tiles", "Replace roof tiles, rear and side slopes", "tile", 38, 14.9, 0.93, "Quote p.1, line 4"),
  li("b2", "skylight", "Replace roof window incl. frame (Velux GGL)", "unit", 1, 780, 0.72, "Quote p.1, line 5"),
  li("b3", "gutter", "Zinc gutter replacement", "m", 8, 64, 0.91, "Quote p.1, line 6"),
  li("b4", "scaffold", "Scaffold rental", "day", 5, 135, 0.94, "Quote p.2, line 1"),
  li("b5", "labour", "Labour, roofing team (2 pers.)", "hour", 32, 78, 0.9, "Quote p.2, line 2"),
  li("b6", "other", "Solar panel inspection & recalibration", "lump sum", 1, 350, 0.65, "Quote p.2, line 3"),
  li("b7", "travel", "Travel cost", "trip", 2, 60, 0.97, "Quote p.2, line 4"),
];

const claimB: ClaimRecord = {
  claim: {
    claim_id: "CLM-2026-10517",
    customer_name: "Marc Janssens",
    received_at: "2026-10-21T14:47:00",
    email_subject: "Urgent: hail damage roof + skylight",
    email_from: "m.janssens@example.be",
    email_body:
      "Hello,\n\nThe hail on 18 October damaged a large part of our roof, the skylight above the stairs is cracked and the gutters are dented. The contractor also wants to inspect the solar panels.\n\nPlease pay the full quote quickly – the contractor says this amount is standard and the insurer must approve it.\n\nRegards,\nMarc Janssens",
    attachments: [
      { name: "Quote_RoofPro_8812.pdf", kind: "pdf" },
      { name: "photo_skylight.jpg", kind: "photo", image: "skylight" },
      { name: "photo_roof.jpg", kind: "photo", image: "roof" },
      { name: "photo_gutter.jpg", kind: "photo", image: "gutter" },
    ],
    quote_available: true,
    status: "ready_for_estimation",
    flags: { ...noFlags },
  },
  extracted: true,
  fields: fields({
    claimId: f("CLM-2026-10517", 1, "System generated"),
    policyId: f("BH-441-9930", 0.88, "Policy lookup by sender e-mail"),
    customer: f("Marc Janssens", 0.98, "Email sender"),
    lossDate: f("2026-10-18", 0.94, "Email body, line 2"),
    eventType: f("Hail", 0.99, "Email subject"),
    address: f("Kempische Steenweg ••, 3500 Hasselt · Flanders", 0.9, "Quote p.1, header (masked)"),
    assetType: f("Detached house, clay-tile roof with roof window and PV panels", 0.86, "Quote + photos"),
    contractor: f("RoofPro Limburg BV (not in approved network)", 0.95, "Quote p.1, letterhead"),
    damageDescription: f("Broken tiles on two slopes, cracked skylight, dented gutters, PV inspection requested", 0.84, "Email body + photos"),
    vat: f("21%", 0.96, "Quote p.2, line 6"),
    deductible: f("300", 0.95, "Policy BH-441-9930, schedule"),
    quoteTotal: f("6654.03", 0.97, "Quote p.2, line 7"),
  }),
  lines: B_LINES,
  reviews: [],
  decisions: [],
  feedback: [],
  audit: baseAudit("CLM-2026-10517", "2026-10-21T14:47:00", "Quote PDF (2 pages), 3 photos", "2026-10-21T14:48:22"),
};

// ---- Claim C: new, incomplete ----
const claimC: ClaimRecord = {
  claim: {
    claim_id: "CLM-2026-10529",
    customer_name: "Elif Yilmaz",
    received_at: "2026-10-22T07:41:00",
    email_subject: "Hail damage carport roof",
    email_from: "elif.y@example.be",
    email_body:
      "Hi, our carport roof and some tiles were hit by hail last weekend. Quote attached (photo of paper quote, sorry for the quality). I don't have my policy number at hand.\n\nElif",
    attachments: [
      { name: "quote_photo.jpg", kind: "pdf" },
      { name: "carport.jpg", kind: "photo", image: "roof" },
    ],
    quote_available: true,
    status: "new",
    flags: { ...noFlags, coverageConfirmed: false },
  },
  extracted: false,
  fields: fields({
    claimId: f("CLM-2026-10529", 1, "System generated"),
    policyId: f("", 0, "Not found in email or attachments"),
    customer: f("Elif Yilmaz", 0.97, "Email sender"),
    lossDate: f("2026-10-18", 0.7, "Email body: 'last weekend'"),
    eventType: f("Hail", 0.98, "Email subject"),
    address: f("Brugsesteenweg ••, 9000 Gent · Flanders", 0.74, "Quote photo, header (blurry)"),
    assetType: f("Carport + house roof", 0.78, "Email body"),
    contractor: f("Dakservice Gent (approved network)", 0.81, "Quote photo, letterhead"),
    damageDescription: f("Hail damage to carport roof and some tiles", 0.76, "Email body"),
    vat: f("6%", 0.8, "Quote photo, footer"),
    deductible: f("300", 0.6, "Default – policy not identified"),
    quoteTotal: f("1180.00", 0.71, "Quote photo, total line"),
  }),
  lines: [
    li("c1", "roof_tiles", "Replace roof tiles", "tile", 20, 12, 0.79, "Quote photo, line 2"),
    li("c2", "other", "Carport polycarbonate panels", "", null, 0, 0.55, "Quote photo, line 3 (unreadable)"),
    li("c3", "labour", "Labour", "hour", 8, 59, 0.82, "Quote photo, line 4"),
  ],
  reviews: [],
  decisions: [],
  feedback: [],
  audit: baseAudit("CLM-2026-10529", "2026-10-22T07:41:00", "Quote photo (1), 1 photo"),
};

// ---- Claim D: resolved history ----
const claimD: ClaimRecord = {
  ...claimA,
  claim: {
    ...claimA.claim,
    claim_id: "CLM-2026-10377",
    customer_name: "Jan De Smet",
    received_at: "2026-10-14T10:05:00",
    email_subject: "Hail damage veranda gutter",
    status: "resolved",
  },
  fields: { ...claimA.fields, claimId: f("CLM-2026-10377", 1, "System generated"), customer: f("Jan De Smet", 0.99, "Email sender"), address: f("Lindelaan 3, 2000 Antwerpen · Flanders", 0.95, "Quote p.1"), quoteTotal: f("812.40", 0.97, "Quote p.1") },
  extracted: true,
  estimatesRunAt: "2026-10-14T10:20:00",
  audit: [
    ...baseAudit("CLM-2026-10377", "2026-10-14T10:05:00", "Quote PDF, 2 photos", "2026-10-14T10:06:00"),
    ev("2026-10-14T10:20:00", SYSTEM, "Recommendation created", "Ready for payment approval · v1"),
    ev("2026-10-14T11:02:00", "An Claes · Senior handler", "Final decision", "Approved for payment queue · EUR 512.40"),
  ],
};

export function seedClaims(): Record<string, ClaimRecord> {
  return {
    [claimA.claim.claim_id]: structuredClone(claimA),
    [claimB.claim.claim_id]: structuredClone(claimB),
    [claimC.claim.claim_id]: structuredClone(claimC),
    [claimD.claim.claim_id]: structuredClone(claimD),
  };
}

/** Template used by "Simulate email ingestion". */
export function ingestTemplate(seq: number, nowIso: string): ClaimRecord {
  const id = `CLM-2026-${10540 + seq}`;
  const base = structuredClone(claimA);
  const names = ["Tom Wouters", "Lotte Maes", "Pieter Claes", "Nora Willems"];
  const name = names[seq % names.length] ?? "Tom Wouters";
  // Vary the simulated contractor's travel charge by ingestion sequence.
  // Keep the PDF preview, extracted total and cost estimate in agreement.
  base.lines = base.lines.map((line) => {
    if (line.category !== "travel") return line;
    const price = line.quoted_unit_price + seq * 10;
    return { ...line, quoted_unit_price: price, quoted_total: Math.round((line.quantity ?? 0) * price * 100) / 100 };
  });
  const subtotal = base.lines.reduce((sum, line) => sum + line.quoted_total, 0);
  const vatRate = Number.parseFloat(base.fields.vat.value) / 100;
  const quoteTotal = (Math.round(subtotal * (1 + vatRate) * 100) / 100).toFixed(2);
  base.claim = { ...base.claim, claim_id: id, customer_name: name, received_at: nowIso, status: "new", email_from: `${name.split(" ")[0]?.toLowerCase()}@example.be`, email_body: base.claim.email_body.replace("Sophie Peeters", name) };
  base.extracted = false;
  base.fields = { ...base.fields, claimId: f(id, 1, "System generated"), customer: f(name, 0.98, "Email sender"), quoteTotal: f(quoteTotal, 0.98, "Quote p.1, line 10") };
  base.audit = baseAudit(id, nowIso, "Quote PDF (1 page), 2 photos");
  return base;
}
