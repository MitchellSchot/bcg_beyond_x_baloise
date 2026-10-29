import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATEGORY_LABEL, eur, pct, type LineComparison } from "@/lib/engine";
import { Confidence } from "./ui-bits";
import type { ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t py-4">
      <h3 className="eyebrow mb-2">{title}</h3>
      <div className="text-sm">{children}</div>
    </section>
  );
}

export function LineDetailSheet({ line, onClose }: { line: LineComparison | null; onClose: () => void }) {
  return (
    <Sheet open={!!line} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {line && (
          <>
            <SheetHeader>
              <div className="eyebrow">{CATEGORY_LABEL[line.item.category]}</div>
              <SheetTitle className="font-display text-forest">{line.item.description}</SheetTitle>
              <SheetDescription>
                Quote {eur(line.quote)} · Benchmark {eur(line.benchmark)} · Variance {eur(line.variance)} ({pct(line.variancePct)})
              </SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <Section title="Original quote evidence">
                <div className="rounded-md border bg-muted p-3 font-mono text-xs">
                  {line.item.source_reference}: “{line.item.description} — {line.item.quantity ?? "?"} {line.item.unit} × {eur(line.item.quoted_unit_price)} = {eur(line.item.quoted_total)}”
                </div>
                <div className="mt-2"><Confidence value={line.item.confidence} /> extraction confidence</div>
              </Section>
              <Section title="Benchmark-price source">
                {line.bench.price ? (
                  <dl className="grid grid-cols-[120px_1fr] gap-y-1">
                    <dt className="text-muted-foreground">Row</dt><dd>{line.bench.price.id}</dd>
                    <dt className="text-muted-foreground">Specification</dt><dd>{line.bench.price.material_or_specification}</dd>
                    <dt className="text-muted-foreground">Source</dt><dd>{line.bench.price.source}</dd>
                    <dt className="text-muted-foreground">Version</dt><dd>{line.bench.price.database_version} · {line.bench.price.region}</dd>
                    <dt className="text-muted-foreground">Updated</dt><dd>{line.bench.price.last_updated_at}</dd>
                  </dl>
                ) : (
                  <p className="text-warning-foreground">No matching row in the approved price database.</p>
                )}
              </Section>
              <Section title="Calculation formula">
                <code className="block rounded-md bg-navy p-3 text-xs text-navy-foreground">{line.bench.formula}</code>
              </Section>
              <Section title="Assumptions">
                <ul className="list-disc space-y-1 pl-4">{line.bench.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
              </Section>
              <Section title="Explanation of the recommendation">
                {line.flags.length ? (
                  <ul className="mb-2 space-y-1">{line.flags.map((f) => <li key={f} className="rounded bg-warning-soft px-2 py-1 text-warning-foreground">{f}</li>)}</ul>
                ) : <p className="mb-2 text-forest">No flags — quote is consistent with the market benchmark.</p>}
                <p>
                  <span className="font-medium">{line.action}.</span> Recommended line amount {eur(line.recommended)}.
                  {line.recommended === 0 && " The amount is held, not rejected: the workbench never invents a cost it cannot evidence."}
                </p>
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
