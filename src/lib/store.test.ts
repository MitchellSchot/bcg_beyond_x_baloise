import { beforeEach, describe, expect, it, vi } from "vitest";
import { actions, getState } from "./store";

describe("simulated email ingestion", () => {
  beforeEach(() => actions.resetDemo());

  it("creates a separate record and a different total for every ingestion, not repeated EUR 973.08", () => {
    const original = structuredClone(getState().claims);
    const ids = Array.from({ length: 100 }, () => actions.ingestEmail());
    const totals = ids.map((id) => getState().claims[id]?.fields.quoteTotal.value);
    expect(new Set(ids).size).toBe(100);
    expect(new Set(totals).size).toBe(100);
    expect(totals).not.toContain("973.08");
    expect(Object.keys(getState().claims)).toHaveLength(Object.keys(original).length + 100);
    for (const [id, record] of Object.entries(original)) {
      expect(getState().claims[id]).toEqual(record);
    }
  });

  it("keeps the extracted quote total consistent with line items including VAT", () => {
    for (let i = 0; i < 10; i++) {
      const id = actions.ingestEmail();
      actions.extract(id);
      const record = getState().claims[id];
      if (!record) throw new Error("Ingestion did not create a record");
      const subtotal = record.lines.reduce((sum, line) => sum + line.quoted_total, 0);
      const vat = Number.parseFloat(record.fields.vat.value) / 100;
      expect(Number(record.fields.quoteTotal.value)).toBe(Math.round(subtotal * (1 + vat) * 100) / 100);
      expect(record.fields.quoteTotal.original).toBe(record.fields.quoteTotal.value);
    }
  });

  it("continues creating different records and totals after reloading saved demo data", async () => {
    const firstId = actions.ingestEmail();
    const firstTotal = getState().claims[firstId]?.fields.quoteTotal.value;
    vi.resetModules();
    const reloaded = await import("./store");
    reloaded.hydrate();
    const nextId = reloaded.actions.ingestEmail();
    expect(nextId).not.toBe(firstId);
    expect(reloaded.getState().claims[nextId]?.fields.quoteTotal.value).not.toBe(firstTotal);
    expect(reloaded.getState().claims[firstId]?.fields.quoteTotal.value).toBe(firstTotal);
  });
});