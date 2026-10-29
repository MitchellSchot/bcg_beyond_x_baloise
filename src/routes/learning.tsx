import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { Panel } from "@/components/workbench/ui-bits";
import { ControlsList } from "@/components/workbench/ControlsList";

export const Route = createFileRoute("/learning")({
  head: () => ({
    meta: [
      { title: "Learning signals & controls · Hail Claim Workbench" },
      { name: "description", content: "Patterns from claims-handler feedback and the governance controls around every recommendation." },
      { property: "og:title", content: "Learning signals & controls · Hail Claim Workbench" },
      { property: "og:description", content: "Human feedback informs calibration; controls keep every decision auditable." },
    ],
  }),
  component: LearningPage,
});

function LearningPage() {
  const claims = useStore((s) => s.claims);
  const fb = useMemo(() => Object.values(claims).flatMap((c) => c.feedback), [claims]);
  const n = (p: (f: (typeof fb)[number]) => boolean) => fb.filter(p).length;

  // Historical baseline (last 30 days, fictional) + feedback captured in this session.
  const signals = [
    { title: "Repeated labour-rate variance", base: 7, add: n((f) => f.reason_code.startsWith("RC01") || f.unit_price_changed), detail: "Contractors outside the approved network quote 15–35% above the roofer wage benchmark." },
    { title: "Frequently unmapped repair category", base: 4, add: n((f) => f.category_reclassified), detail: "“Solar panel inspection” has no approved price row. Candidate for a new database entry." },
    { title: "Repeated missing quote detail", base: 5, add: n((f) => f.quantity_changed), detail: "Quotes with lump-sum lines or missing quantities trigger revised-quote requests." },
    { title: "Price-database item requiring review", base: 2, add: n((f) => f.reason_code.startsWith("RC07")), detail: "PD-SCAF-002 scaffold rate last updated 15 Sep; handlers adjusted it twice." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-2">Feedback & governance</div>
        <h1 className="text-3xl font-semibold">Learning signals & controls</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Handler feedback is stored as new versions and surfaces patterns for calibration reviews. The system does not retrain automatically — changes to rules or prices are made by people.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {signals.map((s) => (
              <Panel key={s.title} tone="review">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  <TrendingUp className="h-4 w-4 text-review-foreground" />
                </div>
                <div className="mt-3 font-display text-3xl font-semibold text-navy tabular">{s.base + s.add}</div>
                <div className="text-xs text-muted-foreground">occurrences, last 30 days{s.add ? ` (+${s.add} this session)` : ""}</div>
                <p className="mt-3 text-sm">{s.detail}</p>
              </Panel>
            ))}
          </div>
          <Panel eyebrow="Feedback captured" title={`${fb.length} feedback version(s) this session`}>
            <p className="text-sm text-muted-foreground">Recommendation judged correct: {n((f) => f.recommendation_correct === "yes")} · partly: {n((f) => f.recommendation_correct === "partly")} · no: {n((f) => f.recommendation_correct === "no")}</p>
          </Panel>
        </div>
        <ControlsList />
      </div>
    </div>
  );
}
