import { useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, HANDLER, SEED_PRICES, SYSTEM, ev, ingestTemplate, seedClaims } from "./seed";
import type { BenchmarkPrice, ClaimRecord, ClaimStatus, FieldKey, Settings } from "./types";

export interface State {
  hydrated: boolean;
  claims: Record<string, ClaimRecord>;
  prices: BenchmarkPrice[];
  priceLog: { at: string; actor: string; detail: string }[];
  settings: Settings;
  ingestSeq: number;
}

const KEY = "hail-workbench-v1";
const seed = (): State => ({ hydrated: false, claims: seedClaims(), prices: structuredClone(SEED_PRICES), priceLog: [], settings: { ...DEFAULT_SETTINGS }, ingestSeq: 0 });

let state: State = seed();
const listeners = new Set<() => void>();

function set(updater: (s: State) => State) {
  state = updater(state);
  if (typeof window !== "undefined") {
    try {
      const { hydrated: _h, ...rest } = state;
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

export function hydrate() {
  if (state.hydrated) return;
  let next = { ...state, hydrated: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) next = { ...next, ...JSON.parse(raw), hydrated: true };
  } catch {
    /* ignore */
  }
  state = next;
  listeners.forEach((l) => l());
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
    () => sel(state),
  );
}

export const getState = () => state;
const now = () => new Date().toISOString();

function updateClaim(id: string, fn: (r: ClaimRecord) => ClaimRecord) {
  set((s) => (s.claims[id] ? { ...s, claims: { ...s.claims, [id]: fn(s.claims[id]) } } : s));
}

function log(r: ClaimRecord, action: string, detail: string, actor = SYSTEM): ClaimRecord {
  return { ...r, audit: [...r.audit, ev(now(), actor, action, detail)] };
}

export const actions = {
  resetDemo() {
    const fresh = seed();
    set(() => ({ ...fresh, hydrated: true }));
  },
  ingestEmail(): string {
    const seq = state.ingestSeq + 1;
    const rec = ingestTemplate(seq, now());
    set((s) => ({ ...s, ingestSeq: seq, claims: { [rec.claim.claim_id]: rec, ...s.claims } }));
    return rec.claim.claim_id;
  },
  extract(id: string) {
    updateClaim(id, (r) =>
      log(
        { ...r, extracted: true, claim: { ...r.claim, status: r.claim.status === "new" ? "ready_for_estimation" : r.claim.status } },
        "Fields extracted",
        `${Object.keys(r.fields).length} fields and ${r.lines.length} quote lines extracted with source references. Email content treated as untrusted input.`,
      ),
    );
  },
  correctField(id: string, key: FieldKey, value: string) {
    updateClaim(id, (r) => {
      const f = r.fields[key];
      if (f.value === value) return r;
      return log(
        { ...r, fields: { ...r.fields, [key]: { ...f, value, corrected: value !== f.original } } },
        "Field corrected",
        `${key}: “${f.value || "—"}” → “${value || "—"}” (original extraction retained)`,
        HANDLER,
      );
    });
  },
  correctLine(id: string, lineId: string, patch: { quantity?: number | null; unit?: string }) {
    updateClaim(id, (r) => {
      const lines = r.lines.map((l) => {
        if (l.id !== lineId) return l;
        const n = { ...l, ...patch, confidence: 1 };
        n.quoted_total = Math.round((n.quantity ?? 0) * n.quoted_unit_price * 100) / 100;
        return n;
      });
      const l = r.lines.find((x) => x.id === lineId)!;
      return log({ ...r, lines }, "Quote line corrected", `${l.description}: ${JSON.stringify(patch)}`, HANDLER);
    });
  },
  setFlag(id: string, flag: keyof ClaimRecord["claim"]["flags"], value: boolean) {
    updateClaim(id, (r) => log({ ...r, claim: { ...r.claim, flags: { ...r.claim.flags, [flag]: value } } }, "Risk flag updated", `${flag} = ${value}`, HANDLER));
  },
  runEstimates(id: string) {
    const v = state.prices[0]?.database_version;
    updateClaim(id, (r) => {
      let n: ClaimRecord = { ...r, estimatesRunAt: now(), claim: { ...r.claim, status: "under_review" } };
      n = log(n, "Quote estimate created", `${r.lines.length} line items structured from contractor quote`);
      n = log(n, "Benchmark estimate created", "Independent estimate calculated from approved price database");
      n = log(n, "Price database version used", `Version ${v} · Flanders`);
      return n;
    });
  },
  createRecommendation(id: string, snap: Omit<ClaimRecord["reviews"][number], "version" | "created_at">) {
    updateClaim(id, (r) => {
      const review = { ...snap, version: r.reviews.length + 1, created_at: now() };
      const status: ClaimStatus = snap.decision === "ready_for_payment" ? "ready_for_payment" : "needs_human_review";
      let n: ClaimRecord = { ...r, reviews: [...r.reviews, review], claim: { ...r.claim, status } };
      n = log(n, "Variance calculated", `€${snap.variance_absolute.toFixed(2)} (${snap.variance_percentage.toFixed(1)}%)`);
      n = log(n, "Rules triggered", snap.reasons.join(" · "));
      n = log(n, "Recommendation created", `v${review.version} · ${snap.decision.replace(/_/g, " ")} · €${snap.recommended_amount.toFixed(2)} — recommendation only`);
      return n;
    });
  },
  queuePayment(id: string) {
    updateClaim(id, (r) =>
      log({ ...r, queuedForPaymentAt: now() }, "Human action", "Sent to payment approval queue — awaiting authorised approver. No payment triggered.", HANDLER),
    );
  },
  decide(id: string, d: Omit<ClaimRecord["decisions"][number], "version" | "at" | "actor">) {
    updateClaim(id, (r) => {
      const dec = { ...d, version: r.decisions.length + 1, at: now(), actor: HANDLER };
      const status: ClaimStatus = d.action === "approve" ? "resolved" : "needs_human_review";
      let n: ClaimRecord = { ...r, decisions: [...r.decisions, dec], claim: { ...r.claim, status } };
      n = log(n, "Human action", `${d.action.replace("_", " ")}${d.override ? " (override)" : ""}${d.justification ? ` — “${d.justification}”` : ""}`, HANDLER);
      if (d.action === "approve") n = log(n, "Final decision", `Approved final amount €${(d.final_amount ?? 0).toFixed(2)} for payment queue`, HANDLER);
      return n;
    });
  },
  addFeedback(id: string, fb: Omit<ClaimRecord["feedback"][number], "version" | "at" | "actor">) {
    updateClaim(id, (r) => {
      const v = { ...fb, version: r.feedback.length + 1, at: now(), actor: HANDLER };
      return log({ ...r, feedback: [...r.feedback, v] }, "Feedback recorded", `Feedback v${v.version} · reason ${fb.reason_code} · stored as new version`, HANDLER);
    });
  },
  updatePrice(pid: string, patch: Partial<BenchmarkPrice>) {
    set((s) => ({
      ...s,
      prices: s.prices.map((p) => (p.id === pid ? { ...p, ...patch, last_updated_at: now().slice(0, 10) } : p)),
      priceLog: [{ at: now(), actor: HANDLER, detail: `${pid}: ${Object.entries(patch).map(([k, v]) => `${k} → ${v}`).join(", ")}` }, ...s.priceLog],
    }));
  },
  updateSettings(patch: Partial<Settings>) {
    set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },
};
