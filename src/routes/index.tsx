import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Inbox, MailPlus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { actions, useStore } from "@/lib/store";
import { eur, reconcile } from "@/lib/engine";
import type { ClaimStatus } from "@/lib/types";
import { STATUS_LABEL, StatusBadge, fmtDate } from "@/components/workbench/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Claims inbox · Hail Claim Cost Review Workbench" },
      { name: "description", content: "Incoming hail-damage claims with status, quote totals and exception flags." },
      { property: "og:title", content: "Claims inbox · Hail Claim Cost Review Workbench" },
      { property: "og:description", content: "Two independent, explainable cost estimates for faster hail-claim payment recommendations." },
    ],
  }),
  component: InboxPage,
});

const FILTERS: (ClaimStatus | "all")[] = ["all", "new", "ready_for_estimation", "under_review", "ready_for_payment", "needs_human_review", "resolved"];

function InboxPage() {
  const claims = useStore((s) => s.claims);
  const prices = useStore((s) => s.prices);
  const settings = useStore((s) => s.settings);
  const [filter, setFilter] = useState<ClaimStatus | "all">("all");
  const navigate = useNavigate();

  const list = useMemo(
    () => Object.values(claims).sort((a, b) => b.claim.received_at.localeCompare(a.claim.received_at)),
    [claims],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    list.forEach((r) => (c[r.claim.status] = (c[r.claim.status] ?? 0) + 1));
    return c;
  }, [list]);
  const shown = filter === "all" ? list : list.filter((r) => r.claim.status === filter);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <div className="eyebrow mb-2">Hail event 18 October 2026 · Flanders</div>
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
            ClaimIQ - by Baloise, faster validation, smarter decisions
          </h1>
          <p className="mt-3 text-muted-foreground">
            Each claim is checked against the contractor quote and an approved market benchmark. The workbench prepares a payment recommendation; a claims handler always decides.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { actions.resetDemo(); toast("Demo data reset"); }}>
            <RotateCcw /> Reset demo
          </Button>
          <Button
            variant="navy"
            onClick={() => {
              const id = actions.ingestEmail();
              toast.success(`New claim email ingested: ${id}`);
            }}
          >
            <MailPlus /> Simulate email ingestion
          </Button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-b pb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              filter === f ? "border-navy bg-navy text-navy-foreground" : "bg-background text-muted-foreground hover:border-forest/40 hover:text-forest",
            )}
          >
            {f === "all" ? "All claims" : STATUS_LABEL[f]}
            <span className="ml-1.5 tabular opacity-70">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed py-16 text-muted-foreground">
          <Inbox className="mb-2 h-6 w-6" /> No claims with this status.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => {
            const rec = r.extracted ? reconcile(r, prices, settings) : null;
            const risk =
              r.claim.status === "resolved" ? null
              : !r.fields.policyId.value ? "Missing policy ID"
              : rec && rec.route === "human_review" ? `Material variance ${rec.variancePct.toFixed(0)}%`
              : rec && rec.lines.some((l) => !l.bench.price) ? "Unmapped item"
              : null;
            return (
              <article key={r.claim.claim_id} className="flex flex-col rounded-xl border bg-card p-5 shadow-card transition-shadow hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{r.claim.claim_id}</div>
                    <h3 className="mt-0.5 text-lg font-semibold">{r.claim.customer_name}</h3>
                  </div>
                  <StatusBadge status={r.claim.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Event</dt><dd>Hail</dd>
                  <dt className="text-muted-foreground">Address</dt><dd className="truncate" title={r.fields.address.value}>{r.fields.address.value.split(" · ")[0]}</dd>
                  <dt className="text-muted-foreground">Received</dt><dd>{fmtDate(r.claim.received_at)}</dd>
                  <dt className="text-muted-foreground">Quote total</dt><dd className="font-semibold tabular">{eur(parseFloat(r.fields.quoteTotal.value))}</dd>
                </dl>
                <div className="mt-4 flex min-h-7 items-center">
                  {risk && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-warning-soft px-2 py-1 text-xs font-medium text-warning-foreground">
                      <AlertTriangle className="h-3.5 w-3.5" /> {risk}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <Link to="/claims/$claimId/audit" params={{ claimId: r.claim.claim_id }} className="text-xs text-muted-foreground hover:text-forest">
                    Audit trail
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!r.extracted) actions.extract(r.claim.claim_id);
                      navigate({ to: "/claims/$claimId", params: { claimId: r.claim.claim_id } });
                    }}
                  >
                    Analyse claim <ArrowRight />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
