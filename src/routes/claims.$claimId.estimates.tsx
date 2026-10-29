import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Calculator, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CATEGORY_LABEL, eur } from "@/lib/engine";
import { Confidence, Panel } from "@/components/workbench/ui-bits";
import { PriceDbCard } from "@/components/workbench/PriceDbCard";
import { useClaim } from "@/components/workbench/useClaim";

export const Route = createFileRoute("/claims/$claimId/estimates")({
  component: EstimatesPage,
});

function NotRunYet({ claimId }: { claimId: string }) {
  return (
    <Panel tone="pale" className="py-12 text-center">
      <p className="text-sm text-muted-foreground">Estimates have not been run yet for this claim.</p>
      <Button asChild className="mt-4"><Link to="/claims/$claimId" params={{ claimId }}>Go to intake</Link></Button>
    </Panel>
  );
}

function EstimatesPage() {
  const { claimId } = Route.useParams();
  const { rec, recon } = useClaim(claimId);
  const navigate = useNavigate();
  if (!rec || !recon) return null;
  if (!rec.estimatesRunAt) return <NotRunYet claimId={claimId} />;

  return (
    <div className="space-y-6">
      <Panel
        eyebrow="Estimate A · reads the contractor quote"
        title={<span className="flex items-center gap-2"><FileText className="h-5 w-5 text-brand" /> Quote analysis</span>}
        action={<div className="text-right"><div className="eyebrow">Confidence</div><Confidence value={recon.quoteConfidence} /></div>}
      >
        <p className="mb-4 text-sm text-muted-foreground">Structures each quote line with its original evidence. Missing cost items are never invented.</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repair category</TableHead><TableHead>Description</TableHead><TableHead>Unit</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Quoted unit price</TableHead>
              <TableHead className="text-right">Quoted total</TableHead><TableHead>Source</TableHead><TableHead>Extraction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rec.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{CATEGORY_LABEL[l.category]}</TableCell>
                <TableCell className="font-medium">{l.description}</TableCell>
                <TableCell>{l.unit || "—"}</TableCell>
                <TableCell className="text-right tabular">{l.quantity ?? "—"}</TableCell>
                <TableCell className="text-right tabular">{eur(l.quoted_unit_price)}</TableCell>
                <TableCell className="text-right tabular">{eur(l.quoted_total)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.source_reference}</TableCell>
                <TableCell><Confidence value={l.confidence} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TotalRow label="Subtotal" value={recon.quoteSubtotal} span={5} />
            <TotalRow label={`VAT ${Math.round(recon.quoteVatRate * 100)}%`} value={recon.quoteVat} span={5} />
            <TotalRow label="Quote total" value={recon.quoteTotal} span={5} strong />
            <TotalRow label="Deductible (applied at settlement)" value={-recon.deductible} span={5} />
          </TableFooter>
        </Table>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Panel
          eyebrow="Estimate B · independent of the quote prices"
          title={<span className="flex items-center gap-2"><Calculator className="h-5 w-5 text-brand" /> Market benchmark</span>}
          action={<div className="text-right"><div className="eyebrow">Confidence</div><Confidence value={recon.benchmarkConfidence} /></div>}
        >
          <p className="mb-4 text-sm text-muted-foreground">Calculated from the approved price database with standard quantity assumptions. Every cost driver is traceable to a source row.</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead><TableHead>Benchmark description</TableHead><TableHead>Unit</TableHead>
                <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Material</TableHead>
                <TableHead className="text-right">Labour</TableHead><TableHead className="text-right">Benchmark total</TableHead>
                <TableHead>Source</TableHead><TableHead>Updated</TableHead><TableHead>Conf.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recon.lines.map(({ bench: b, item }) => (
                <TableRow key={item.id}>
                  <TableCell>{CATEGORY_LABEL[item.category]}</TableCell>
                  {b.price ? (
                    <>
                      <TableCell className="font-medium">{b.price.material_or_specification}<div className="text-[11px] font-normal text-muted-foreground">{b.assumptions[0]}</div></TableCell>
                      <TableCell>{b.price.unit}</TableCell>
                      <TableCell className="text-right tabular">{b.quantity}</TableCell>
                      <TableCell className="text-right tabular">{eur(b.price.material_rate)}</TableCell>
                      <TableCell className="text-right tabular">{eur(b.price.labour_rate)}</TableCell>
                      <TableCell className="text-right font-medium tabular">{eur(b.total)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{b.price.id}<br />{b.price.source}</TableCell>
                      <TableCell className="text-xs">{b.price.last_updated_at}</TableCell>
                      <TableCell><Confidence value={b.price.confidence} /></TableCell>
                    </>
                  ) : (
                    <TableCell colSpan={9} className="text-sm text-warning-foreground">
                      “{item.description}” — no approved market price. Not estimated; flagged for review.
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TotalRow label="Subtotal" value={recon.benchmarkSubtotal} span={6} trail={3} />
              <TotalRow label="VAT 6% (expected)" value={recon.benchmarkVat} span={6} trail={3} />
              <TotalRow label="Benchmark total" value={recon.benchmarkTotal} span={6} trail={3} strong />
            </TableFooter>
          </Table>
        </Panel>
        <div className="space-y-4">
          <PriceDbCard />
          <Panel tone="navy">
            <p className="text-sm opacity-90">Compare both estimates line by line.</p>
            <Button variant="brand" className="mt-4 w-full" onClick={() => navigate({ to: "/claims/$claimId/reconcile", params: { claimId } })}>
              Open reconciliation <ArrowRight />
            </Button>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value, span, strong, trail = 2 }: { label: string; value: number; span: number; strong?: boolean; trail?: number }) {
  return (
    <TableRow className={strong ? "font-semibold" : ""}>
      <TableCell colSpan={span} className="text-right">{label}</TableCell>
      <TableCell className="text-right tabular">{eur(value)}</TableCell>
      <TableCell colSpan={trail} />
    </TableRow>
  );
}
