import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, useStore } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/seed";
import type { Settings } from "@/lib/types";
import { Disclaimer, Panel } from "@/components/workbench/ui-bits";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Decision rules · Hail Claim Workbench" },
      { name: "description", content: "Configure thresholds that route hail claims to payment approval or human review." },
      { property: "og:title", content: "Decision rules · Hail Claim Workbench" },
      { property: "og:description", content: "Configurable, transparent routing rules for hail-claim recommendations." },
    ],
  }),
  component: SettingsPage,
});

const FIELDS: { k: keyof Settings; label: string; help: string; scale?: number; suffix: string }[] = [
  { k: "minConfidence", label: "Minimum confidence per estimate", help: "Both estimates must reach this confidence to auto-route.", scale: 100, suffix: "%" },
  { k: "maxVariancePct", label: "Maximum variance (%)", help: "Quote vs. benchmark, excl. VAT.", suffix: "%" },
  { k: "maxVarianceAbs", label: "Maximum variance (EUR)", help: "Both % and EUR limits must be met.", suffix: "€" },
  { k: "approvalCap", label: "Approval cap", help: "Claims at or above this quote total always go to human review.", suffix: "€" },
  { k: "lineVariancePct", label: "Material line variance (%)", help: "A line is material when both % and EUR limits are exceeded.", suffix: "%" },
  { k: "lineVarianceAbs", label: "Material line variance (EUR)", help: "", suffix: "€" },
  { k: "expectedVatRate", label: "Expected VAT rate", help: "Renovation of dwellings older than 10 years in Belgium.", scale: 100, suffix: "%" },
  { k: "lowExtractionConfidence", label: "Low extraction confidence", help: "Values below this are flagged for verification.", scale: 100, suffix: "%" },
];

function SettingsPage() {
  const s = useStore((st) => st.settings);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Configuration</div>
          <h1 className="text-3xl font-semibold">Decision rules</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Thresholds used by the reconciliation engine. Changes apply immediately to open claims; existing recommendation versions are not altered.</p>
        </div>
        <Button variant="outline" onClick={() => actions.updateSettings(DEFAULT_SETTINGS)}><RotateCcw /> Restore demo defaults</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel>
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            {FIELDS.map((f) => {
              const scale = f.scale ?? 1;
              return (
                <div key={f.k}>
                  <label htmlFor={f.k} className="text-sm font-medium">{f.label}</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      id={f.k}
                      key={`${f.k}-${s[f.k]}`}
                      defaultValue={+(s[f.k] * scale).toFixed(2)}
                      inputMode="decimal"
                      className="w-36 tabular"
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        if (Number.isFinite(v)) actions.updateSettings({ [f.k]: v / scale });
                      }}
                    />
                    <span className="text-sm text-muted-foreground">{f.suffix}</span>
                  </div>
                  {f.help && <p className="mt-1 text-xs text-muted-foreground">{f.help}</p>}
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel tone="pale" eyebrow="Routing logic" title="How claims are routed">
          <div className="space-y-3 text-sm">
            <div><span className="font-semibold text-forest">Ready for payment approval</span> — only when coverage is confirmed, evidence is complete, both estimates ≥ {Math.round(s.minConfidence * 100)}% confidence, variance ≤ {s.maxVariancePct}% and ≤ €{s.maxVarianceAbs}, total below €{s.approvalCap.toLocaleString("en-GB")}, and no fraud, duplicate, safety, policy or vulnerability flags.</div>
            <div><span className="font-semibold text-warning-foreground">Request more information</span> — information missing or unreadable.</div>
            <div><span className="font-semibold text-warning-foreground">Request revised quote</span> — scope or quote lines unclear.</div>
            <div><span className="font-semibold text-review-foreground">Human review</span> — variance above threshold, low confidence, coverage/deductible uncertain, structural or safety damage, above approval cap, unmapped item, duplicate or fraud indicator.</div>
            <Disclaimer />
          </div>
        </Panel>
      </div>
    </div>
  );
}
