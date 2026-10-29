import { describe, expect, it } from "vitest";
import { reconcile } from "./engine";
import { DEFAULT_SETTINGS, SEED_PRICES, seedClaims } from "./seed";

const claims = seedClaims() as Record<string, import("./types").ClaimRecord>;
const get = (k: string) => structuredClone(claims[k]!);

describe("decision rules", () => {
  it("routes the simple claim to ready for payment approval", () => {
    const r = reconcile(get("CLM-2026-10481"), SEED_PRICES, DEFAULT_SETTINGS);
    expect(r.route).toBe("ready_for_payment");
    expect(r.benchmarkSubtotal).toBe(887);
    expect(r.quoteSubtotal).toBe(918);
    expect(r.recommendedAmount).toBe(673.08); // 918 × 1.06 − 300
  });

  it("routes the exception claim to human review", () => {
    const r = reconcile(get("CLM-2026-10517"), SEED_PRICES, DEFAULT_SETTINGS);
    expect(r.route).toBe("human_review");
    expect(r.vatDiffers).toBe(true);
  });

  it("routes a claim with no policy ID to request more information", () => {
    const r = reconcile(get("CLM-2026-10529"), SEED_PRICES, DEFAULT_SETTINGS);
    expect(r.route).toBe("request_info");
  });

  it("sends variance above EUR 250 to human review even if under 10%", () => {
    const c = get("CLM-2026-10481");
    c.lines[0]!.quantity = 140; c.lines[0]!.quoted_unit_price = 13; c.lines[0]!.quoted_total = 1820; // bench 1540 → +280, 18%
    const r = reconcile(c, SEED_PRICES, { ...DEFAULT_SETTINGS, maxVariancePct: 50, approvalCap: 99999 });
    expect(r.route).toBe("human_review");
  });

  it("blocks auto-routing when claim total reaches the approval cap", () => {
    const r = reconcile(get("CLM-2026-10481"), SEED_PRICES, { ...DEFAULT_SETTINGS, approvalCap: 900 });
    expect(r.route).toBe("human_review");
  });
});
