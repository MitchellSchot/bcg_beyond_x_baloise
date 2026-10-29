import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { actions } from "@/lib/store";
import { CATEGORY_LABEL, ROUTE_LABEL, eur, pct, type LineComparison } from "@/lib/engine";
import { Confidence, Disclaimer, Panel, RouteBadge } from "@/components/workbench/ui-bits";
import { LineDetailSheet } from "@/components/workbench/LineDetailSheet";
import { useClaim } from "@/components/workbench/useClaim";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/claims/$claimId/reconcile")({
  component: ReconcilePage,
});

function ReconcilePage() {
  const { claimId } = Route.useParams();
  const { rec, recon, prices } = useClaim(claimId);
  const [open, setOpen] = useState<LineComparison | null>(null);
  const navigate = useNavigate();
  if (!rec || !recon) return null;
  if (!rec.estimatesRunAt) {
    return (
      <Panel tone="pale" className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Run the dual cost estimation first.</p>
        <Button asChild className="mt-4"><Link to="/claims/$claimId" params={{ claimId }}>Go to intake</Link></Button>
      </Panel>
    );
  }
  const r = recon;
  const latest = rec.reviews.at(-1);

  const create = () => {
    actions.createRecommendation(claimId, {
      db_version: prices[0]?.database_version ?? "",
      quote_total: r.quoteSubtotal,
      benchmark_total: r.benchmarkSubtotal,
      variance_absolute: r.variance,
      variance_percentage: r.variancePct,
      confidence: r.confidence,
      recommended_amount: r.recommendedAmount,
      decision: r.route,
      rationale: r.rationale,
      reasons: r.reasons,
      line_flags: r.lines.filter((l) => l.flags.length).map((l) => ({ item: l.item.description, flags: l.flags })),
    });
    toast.success(`Recommendation created: ${ROUTE_LABEL[r.route]}`);
    navigate({ to: "/claims/$claimId/outcome", params: { claimId } });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr_1fr]">
        <EstimateSummary title="Quote-based estimate" subtitle={rec.fields.contractor.value.split(" (")[0] ?? ""} subtotal={r.quoteSubtotal} vatLabel={`VAT ${Math.round(r.quoteVatRate * 100)}%`} vat={r.quoteVat} total={r.quoteTotal} conf={r.quoteConfidence} />
        <Panel tone="navy" eyebrow="Reconciliation engine" title="Decision point">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Metric label="Quote (excl. VAT)" value={eur(r.quoteSubtotal)} />
            <Metric label="Benchmark (excl. VAT)" value={eur(r.benchmarkSubtotal)} />
            <Metric label="Variance" value={eur(r.variance)} />
            <Metric label="Variance %" value={pct(r.variancePct)} />
            <Metric label="Confidence" value={`${Math.round(r.confidence * 100)}%`} />
            <Metric label="Recommended amount" value={eur(r.recommendedAmount)} big />
          </div>
          <div className="mt-4 border-t border-navy-foreground/15 pt-4">
            <div className="mb-2 text-xs opacity-70">Decision recommendation</div>
            <RouteBadge route={r.route}>{ROUTE_LABEL[r.route]}</RouteBadge>
            <p className="mt-3 text-sm leading-relaxed opacity-90">{r.rationale}</p>
          </div>
        </Panel>
        <EstimateSummary title="Market benchmark estimate" subtitle={`Price database ${prices[0]?.database_version ?? ""}`} subtotal={r.benchmarkSubtotal} vatLabel="VAT 6% (expected)" vat={r.benchmarkVat} total={r.benchmarkTotal} conf={r.benchmarkConfidence} />
      </div>

      <Panel eyebrow="Line-item comparison" title="Click any line to see evidence, formula and assumptions">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repair item</TableHead><TableHead className="text-right">Quote</TableHead><TableHead className="text-right">Benchmark</TableHead>
              <TableHead className="text-right">Variance €</TableHead><TableHead className="text-right">Variance %</TableHead>
              <TableHead>Flag reason</TableHead><TableHead>Recommended action</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {r.lines.map((l) => (
              <TableRow key={l.item.id} onClick={() => setOpen(l)} className={cn("cursor-pointer", l.material && "bg-warning-soft/60 hover:bg-warning-soft")}>
                <TableCell>
                  <div className="font-medium">{l.item.description}</div>
                  <div className="text-[11px] text-muted-foreground">{CATEGORY_LABEL[l.item.category]}</div>
                </TableCell>
                <TableCell className="text-right tabular">{eur(l.quote)}</TableCell>
                <TableCell className="text-right tabular">{eur(l.benchmark)}</TableCell>
                <TableCell className={cn("text-right tabular", l.material && "font-semibold text-warning-foreground")}>{eur(l.variance)}</TableCell>
                <TableCell className="text-right tabular">{pct(l.variancePct)}</TableCell>
                <TableCell className="max-w-64 text-xs">{l.flags.length ? l.flags.join(" · ") : <span className="text-brand">—</span>}</TableCell>
                <TableCell className="text-xs">{l.action}</TableCell>
                <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
              </TableRow>
            ))}
            {r.vatDiffers && (
              <TableRow className="bg-warning-soft/60">
                <TableCell className="font-medium">VAT</TableCell>
                <TableCell className="text-right tabular">{eur(r.quoteVat)}</TableCell>
                <TableCell className="text-right tabular">{eur(r.benchmarkVat)}</TableCell>
                <TableCell className="text-right tabular">{eur(r.quoteVat - r.benchmarkVat)}</TableCell>
                <TableCell />
                <TableCell className="text-xs">VAT treatment differs</TableCell>
                <TableCell className="text-xs">Apply 6% renovation rate, confirm dwelling age</TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel eyebrow="Decision rules" title="Controls evaluated" action={<Link to="/settings" className="text-xs text-forest hover:underline">Edit rules</Link>}>
          <ul className="grid gap-2 md:grid-cols-2">
            {r.checks.map((c) => (
              <li key={c.id} className={cn("flex gap-2 rounded-md border p-3 text-sm", c.pass ? "border-brand/20 bg-pale" : "border-review-foreground/15 bg-review")}>
                {c.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-review-foreground" />}
                <span><span className="font-medium">{c.label}</span><br /><span className="text-xs text-muted-foreground">{c.detail}</span></span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel tone="forest">
          <Disclaimer className="border-forest-foreground/20 bg-forest-foreground/10 text-forest-foreground" />
          {latest && <p className="mt-3 text-xs opacity-80">Recommendation v{latest.version} already exists. Creating a new one adds a version; earlier ones are kept.</p>}
          <Button variant="brand" className="mt-4 w-full" onClick={create}>
            {latest ? "Create new recommendation version" : "Create recommendation"} <ArrowRight />
          </Button>
        </Panel>
      </div>

      <LineDetailSheet line={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function Metric({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <div className="text-xs opacity-70">{label}</div>
      <div className={cn("tabular font-semibold", big ? "text-xl text-brand" : "text-base")}>{value}</div>
    </div>
  );
}

function EstimateSummary({ title, subtitle, subtotal, vatLabel, vat, total, conf }: { title: string; subtitle: string; subtotal: number; vatLabel: string; vat: number; total: number; conf: number }) {
  return (
    <Panel tone="pale" eyebrow={subtitle} title={title}>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular">{eur(subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">{vatLabel}</dt><dd className="tabular">{eur(vat)}</dd></div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold"><dt>Total</dt><dd className="tabular">{eur(total)}</dd></div>
        <div className="flex justify-between pt-2"><dt className="text-muted-foreground">Confidence</dt><dd><Confidence value={conf} /></dd></div>
      </dl>
    </Panel>
  );
}
