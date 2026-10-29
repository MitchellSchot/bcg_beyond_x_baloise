import type {
  BenchmarkPrice,
  Category,
  ClaimRecord,
  ExtractedItem,
  Route,
  Settings,
} from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const CATEGORY_LABEL: Record<Category, string> = {
  roof_tiles: "Roof tiles",
  gutter: "Gutters",
  scaffold: "Scaffolding",
  labour: "Labour",
  travel: "Travel",
  skylight: "Roof window",
  other: "Unmapped",
};

/** Labour hours assumed per unit of repair work (benchmark assumption). */
export const LABOUR_HOURS_PER_UNIT: Partial<Record<Category, number>> = {
  roof_tiles: 0.3,
  gutter: 0.5,
  skylight: 3,
};

export function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(/[^0-9.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export interface BenchmarkLine {
  item: ExtractedItem;
  price: BenchmarkPrice | null;
  quantity: number | null;
  total: number | null;
  formula: string;
  assumptions: string[];
}

function qtyOf(lines: ExtractedItem[], c: Category) {
  return lines.filter((l) => l.category === c).reduce((s, l) => s + (l.quantity ?? 0), 0);
}

export function benchmarkQuantity(item: ExtractedItem, lines: ExtractedItem[]): { qty: number | null; assumption: string } {
  const tiles = qtyOf(lines, "roof_tiles");
  const sky = qtyOf(lines, "skylight");
  if (item.category === "labour") {
    const parts = (Object.keys(LABOUR_HOURS_PER_UNIT) as Category[])
      .map((c) => ({ c, q: qtyOf(lines, c), h: LABOUR_HOURS_PER_UNIT[c]! }))
      .filter((p) => p.q > 0);
    const raw = parts.reduce((s, p) => s + p.q * p.h, 0);
    return {
      qty: Math.ceil(raw),
      assumption: `Labour hours = ⌈${parts.map((p) => `${p.q} ${CATEGORY_LABEL[p.c].toLowerCase()} × ${p.h} h`).join(" + ") || "0"}⌉ = ${Math.ceil(raw)} h`,
    };
  }
  if (item.category === "scaffold") {
    const days = 2 + (tiles > 20 || sky > 0 ? 1 : 0);
    return { qty: days, assumption: `Scaffold days = 2 base days${days > 2 ? " + 1 (more than 20 tiles or roof window)" : ""} = ${days}` };
  }
  if (item.category === "travel") {
    const days = 2 + (tiles > 20 || sky > 0 ? 1 : 0);
    const trips = Math.ceil(days / 2);
    return { qty: trips, assumption: `Trips = ⌈scaffold days ${days} ÷ 2⌉ = ${trips}` };
  }
  return { qty: item.quantity, assumption: "Quantity taken from the verified quote line" };
}

export function benchmarkLines(lines: ExtractedItem[], prices: BenchmarkPrice[]): BenchmarkLine[] {
  return lines.map((item) => {
    const price = item.category === "other" ? null : prices.find((p) => p.category === item.category) ?? null;
    if (!price) {
      return { item, price: null, quantity: null, total: null, formula: "No approved price row — not estimated", assumptions: ["Item cannot be mapped to the approved price database. No amount is invented."] };
    }
    const { qty, assumption } = benchmarkQuantity(item, lines);
    const rate = price.material_rate + price.labour_rate;
    const total = qty == null ? null : round2(qty * rate);
    return {
      item,
      price,
      quantity: qty,
      total,
      formula: `${qty ?? "?"} ${price.unit} × (material €${price.material_rate.toFixed(2)} + labour €${price.labour_rate.toFixed(2)}) = €${total?.toFixed(2) ?? "—"}`,
      assumptions: [assumption, `Region ${price.region}, database ${price.database_version}`, `Expected unit range €${price.expected_range_min}–€${price.expected_range_max}`],
    };
  });
}

export interface LineComparison {
  item: ExtractedItem;
  bench: BenchmarkLine;
  quote: number;
  benchmark: number | null;
  variance: number | null;
  variancePct: number | null;
  flags: string[];
  material: boolean;
  recommended: number;
  action: string;
}

export function compareLines(lines: ExtractedItem[], prices: BenchmarkPrice[], s: Settings): LineComparison[] {
  return benchmarkLines(lines, prices).map((bench) => {
    const item = bench.item;
    const quote = item.quoted_total;
    const flags: string[] = [];
    if (!bench.price) flags.push("Item has insufficient market-price data");
    if (item.quantity == null || !item.unit) flags.push("Repair scope is unclear");
    else if (item.confidence < s.lowExtractionConfidence) flags.push("Repair scope is unclear");
    if (item.category === "skylight") flags.push("Repair versus replacement needs confirmation");
    let variance: number | null = null;
    let variancePct: number | null = null;
    if (bench.price && bench.total != null) {
      variance = round2(quote - bench.total);
      variancePct = bench.total ? round2((variance / bench.total) * 100) : null;
      if (item.quoted_unit_price > bench.price.expected_range_max)
        flags.push(item.category === "labour" ? "Labour rate exceeds benchmark" : "Unit price above market range");
      if (bench.quantity != null && item.quantity != null && bench.quantity !== item.quantity)
        flags.push("Quantity differs from benchmark assumption");
    }
    const material =
      !bench.price ||
      (variance != null && Math.abs(variance) > s.lineVarianceAbs && Math.abs(variancePct ?? 0) > s.lineVariancePct) ||
      flags.includes("Repair scope is unclear");
    // Recommended: never invent — unmapped/unclear lines are held at 0 pending evidence.
    let recommended = quote;
    let action = "Accept quoted amount";
    if (!bench.price || item.quantity == null) {
      recommended = 0;
      action = "Hold — request evidence or revised quote";
    } else if (material && bench.total != null) {
      recommended = Math.min(quote, bench.total);
      action = "Adjust to benchmark, handler to confirm";
    } else if (flags.length) {
      action = "Accept, note for review";
    }
    return { item, bench, quote, benchmark: bench.total, variance, variancePct, flags: [...new Set(flags)], material, recommended: round2(recommended), action };
  });
}

export interface QualityIssue {
  kind: "missing_policy" | "missing_quote" | "low_confidence" | "missing_qty" | "unmapped" | "duplicate";
  severity: "error" | "warning";
  message: string;
}

export function qualityChecks(r: ClaimRecord, s: Settings): QualityIssue[] {
  const out: QualityIssue[] = [];
  if (!r.fields.policyId.value.trim()) out.push({ kind: "missing_policy", severity: "error", message: "Policy ID missing — cannot confirm coverage." });
  if (!r.claim.quote_available) out.push({ kind: "missing_quote", severity: "error", message: "Contractor quote missing or unreadable." });
  const low = Object.entries(r.fields).filter(([, f]) => !f.corrected && f.value && f.confidence < s.lowExtractionConfidence);
  if (low.length) out.push({ kind: "low_confidence", severity: "warning", message: `Low extraction confidence on ${low.length} field(s): ${low.map(([k]) => FIELD_LABEL[k as keyof typeof FIELD_LABEL]).join(", ")}.` });
  r.lines.filter((l) => l.quantity == null || !l.unit).forEach((l) => out.push({ kind: "missing_qty", severity: "warning", message: `Missing quantity or unit: “${l.description}”.` }));
  r.lines.filter((l) => l.category === "other").forEach((l) => out.push({ kind: "unmapped", severity: "warning", message: `Unmapped repair item: “${l.description}”.` }));
  if (r.claim.flags.duplicate) out.push({ kind: "duplicate", severity: "warning", message: "Possible duplicate claim on this policy and loss date." });
  return out;
}

export const FIELD_LABEL = {
  claimId: "Claim ID",
  policyId: "Policy ID",
  customer: "Customer",
  lossDate: "Loss date",
  eventType: "Event type",
  address: "Address / region",
  assetType: "Asset type",
  contractor: "Contractor",
  damageDescription: "Damage description",
  vat: "VAT",
  deductible: "Excess / deductible",
  quoteTotal: "Quote total",
} as const;

export interface Check { id: string; label: string; pass: boolean; detail: string }

export interface Reconciliation {
  lines: LineComparison[];
  quoteSubtotal: number;
  benchmarkSubtotal: number;
  quoteVatRate: number;
  quoteVat: number;
  quoteTotal: number;
  benchmarkVat: number;
  benchmarkTotal: number;
  deductible: number;
  variance: number;
  variancePct: number;
  quoteConfidence: number;
  benchmarkConfidence: number;
  confidence: number;
  recommendedSubtotal: number;
  recommendedAmount: number;
  vatDiffers: boolean;
  checks: Check[];
  route: Route;
  reasons: string[];
  rationale: string;
}

export function reconcile(r: ClaimRecord, prices: BenchmarkPrice[], s: Settings): Reconciliation {
  const lines = compareLines(r.lines, prices, s);
  const quoteSubtotal = round2(lines.reduce((a, l) => a + l.quote, 0));
  const benchmarkSubtotal = round2(lines.reduce((a, l) => a + (l.benchmark ?? 0), 0));
  const quoteVatRate = parseNum(r.fields.vat.value) / 100;
  const quoteVat = round2(quoteSubtotal * quoteVatRate);
  const benchmarkVat = round2(benchmarkSubtotal * s.expectedVatRate);
  const deductible = parseNum(r.fields.deductible.value);
  const variance = round2(quoteSubtotal - benchmarkSubtotal);
  const variancePct = benchmarkSubtotal ? round2((variance / benchmarkSubtotal) * 100) : 100;
  const quoteConfidence = round2(lines.reduce((a, l) => a + l.item.confidence, 0) / Math.max(lines.length, 1));
  const mapped = lines.filter((l) => l.bench.price);
  const benchmarkConfidence = round2(
    (mapped.reduce((a, l) => a + l.bench.price!.confidence, 0) / Math.max(mapped.length, 1)) * (mapped.length / Math.max(lines.length, 1)),
  );
  const confidence = round2(Math.min(quoteConfidence, benchmarkConfidence));
  const vatDiffers = Math.abs(quoteVatRate - s.expectedVatRate) > 0.001;
  const recommendedSubtotal = round2(lines.reduce((a, l) => a + l.recommended, 0));
  const recommendedAmount = Math.max(0, round2(recommendedSubtotal * (1 + s.expectedVatRate) - deductible));
  const quoteTotal = round2(quoteSubtotal + quoteVat);

  const issues = qualityChecks(r, s);
  const f = r.claim.flags;
  const riskFlags = [f.fraud && "fraud", f.duplicate && "duplicate", f.safety && "safety", f.policyIssue && "policy", f.vulnerability && "vulnerability"].filter(Boolean) as string[];
  const unmapped = lines.filter((l) => !l.bench.price);
  const unclear = lines.filter((l) => l.flags.includes("Repair scope is unclear"));
  const evidenceMissing = issues.filter((i) => i.kind === "missing_policy" || i.kind === "missing_quote");

  const checks: Check[] = [
    { id: "coverage", label: "Coverage confirmed", pass: f.coverageConfirmed && !f.deductibleUncertain, detail: f.coverageConfirmed ? (f.deductibleUncertain ? "Deductible uncertain" : "Policy active, hail peril covered") : "Coverage not confirmed" },
    { id: "evidence", label: "Required evidence complete", pass: evidenceMissing.length === 0, detail: evidenceMissing.length ? evidenceMissing.map((i) => i.message).join(" ") : "Email, quote and photos present" },
    { id: "confidence", label: `Both estimates ≥ ${Math.round(s.minConfidence * 100)}% confidence`, pass: quoteConfidence >= s.minConfidence && benchmarkConfidence >= s.minConfidence, detail: `Quote ${Math.round(quoteConfidence * 100)}% · Benchmark ${Math.round(benchmarkConfidence * 100)}%` },
    { id: "variance", label: `Variance ≤ ${s.maxVariancePct}% and ≤ €${s.maxVarianceAbs}`, pass: Math.abs(variancePct) <= s.maxVariancePct && Math.abs(variance) <= s.maxVarianceAbs, detail: `€${variance.toFixed(2)} (${variancePct.toFixed(1)}%)` },
    { id: "cap", label: `Claim total below approval cap (€${s.approvalCap.toLocaleString("en-GB")})`, pass: quoteTotal < s.approvalCap, detail: `Quote total €${quoteTotal.toFixed(2)}` },
    { id: "mapped", label: "All repair items mapped to price database", pass: unmapped.length === 0, detail: unmapped.length ? `${unmapped.length} unmapped item(s)` : "All items mapped" },
    { id: "flags", label: "No fraud, duplicate, safety, policy or vulnerability flags", pass: riskFlags.length === 0, detail: riskFlags.length ? `Flags: ${riskFlags.join(", ")}` : "No flags raised" },
  ];

  const reasons: string[] = [];
  let route: Route;
  if (evidenceMissing.length) {
    route = "request_info";
    reasons.push(...evidenceMissing.map((i) => i.message));
  } else {
    const hr: string[] = [];
    if (!checks[3]!.pass) hr.push(`Variance €${variance.toFixed(2)} (${variancePct.toFixed(1)}%) exceeds threshold`);
    if (!checks[2]!.pass) hr.push("Estimate confidence below threshold");
    if (!checks[0]!.pass) hr.push("Coverage or deductible uncertain");
    if (f.safety) hr.push("Structural or safety damage present");
    if (!checks[4]!.pass) hr.push("Quote exceeds approval cap");
    if (unmapped.length) hr.push(`Unmapped repair item: ${unmapped.map((l) => l.item.description).join(", ")}`);
    if (f.duplicate || f.fraud) hr.push("Potential duplicate or fraud indicator");
    if (hr.length) {
      route = "human_review";
      reasons.push(...hr);
    } else if (unclear.length) {
      route = "request_revised_quote";
      reasons.push(...unclear.map((l) => `Scope unclear: ${l.item.description}`));
    } else {
      route = "ready_for_payment";
      reasons.push("All controls passed");
    }
  }
  if (vatDiffers) reasons.push(`VAT treatment differs: quote applies ${Math.round(quoteVatRate * 100)}%, expected ${Math.round(s.expectedVatRate * 100)}% for renovation of a dwelling older than 10 years`);

  const rationale =
    route === "ready_for_payment"
      ? `The contractor quote (€${quoteSubtotal.toFixed(2)} excl. VAT) and the independent market benchmark (€${benchmarkSubtotal.toFixed(2)}) differ by only ${Math.abs(variancePct).toFixed(1)}%. All line items are mapped to approved prices and every control passed. A settlement of €${recommendedAmount.toFixed(2)} (incl. ${Math.round(s.expectedVatRate * 100)}% VAT, minus €${deductible.toFixed(0)} deductible) is proposed for authorised payment approval.`
      : route === "human_review"
        ? `The quote exceeds the independent benchmark by €${variance.toFixed(2)} (${variancePct.toFixed(1)}%). ${lines.filter((l) => l.material).length} line item(s) differ materially${unmapped.length ? " and at least one item has no approved market price" : ""}. A claims handler should review before any amount is approved. Indicative benchmark-based amount: €${recommendedAmount.toFixed(2)}.`
        : route === "request_info"
          ? "Key evidence is missing, so no reliable recommendation can be prepared. Request the missing information from the customer before estimating."
          : "Some quote lines are unclear or lack quantities. Request a revised, itemised quote from the contractor.";

  return {
    lines, quoteSubtotal, benchmarkSubtotal, quoteVatRate, quoteVat, quoteTotal, benchmarkVat,
    benchmarkTotal: round2(benchmarkSubtotal + benchmarkVat), deductible, variance, variancePct,
    quoteConfidence, benchmarkConfidence, confidence, recommendedSubtotal, recommendedAmount,
    vatDiffers, checks, route, reasons, rationale,
  };
}

export const ROUTE_LABEL: Record<Route, string> = {
  ready_for_payment: "Ready for payment approval",
  request_info: "Request more information",
  request_revised_quote: "Request revised quote",
  human_review: "Human review",
};

export const eur = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(n);
export const pct = (n: number | null | undefined, d = 1) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(d)}%`);
