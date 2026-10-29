import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { actions, useStore } from "@/lib/store";
import { CATEGORY_LABEL } from "@/lib/engine";
import type { BenchmarkPrice } from "@/lib/types";
import { Panel, fmtDate } from "@/components/workbench/ui-bits";
import { PriceDbCard } from "@/components/workbench/PriceDbCard";

export const Route = createFileRoute("/price-database")({
  head: () => ({
    meta: [
      { title: "Approved price database · Hail Claim Workbench" },
      { name: "description", content: "Curated, versioned reference prices for roofing, gutters, scaffolding and labour in Flanders." },
      { property: "og:title", content: "Approved price database · Hail Claim Workbench" },
      { property: "og:description", content: "Versioned reference prices used by the market benchmark estimate." },
    ],
  }),
  component: PriceDbPage,
});

type NumKey = "material_rate" | "labour_rate" | "expected_range_min" | "expected_range_max";

function PriceDbPage() {
  const prices = useStore((s) => s.prices);
  const log = useStore((s) => s.priceLog);
  const cell = (p: BenchmarkPrice, k: NumKey) => (
    <Input
      key={`${p.id}-${k}-${p[k]}`}
      aria-label={`${p.id} ${k}`}
      defaultValue={p[k]}
      inputMode="decimal"
      className="h-8 w-20 text-right tabular"
      onBlur={(e) => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v) && v !== p[k]) actions.updatePrice(p.id, { [k]: v });
      }}
    />
  );
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        <div>
          <div className="eyebrow mb-2">Admin</div>
          <h1 className="text-3xl font-semibold">Approved price database</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            A curated reference table that simulates an Excel file refreshed from approved sources. No live web scraping. Edits apply to new estimates and are logged.
          </p>
        </div>
        <PriceDbCard />
      </div>
      <Panel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Row</TableHead><TableHead>Category</TableHead><TableHead>Specification</TableHead><TableHead>Unit</TableHead>
              <TableHead className="text-right">Material €</TableHead><TableHead className="text-right">Labour €</TableHead>
              <TableHead className="text-right">Range min</TableHead><TableHead className="text-right">Range max</TableHead>
              <TableHead>Source</TableHead><TableHead>Updated</TableHead><TableHead>Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.id}</TableCell>
                <TableCell>{CATEGORY_LABEL[p.category]}</TableCell>
                <TableCell className="font-medium">{p.material_or_specification}</TableCell>
                <TableCell>{p.unit}</TableCell>
                <TableCell className="text-right">{cell(p, "material_rate")}</TableCell>
                <TableCell className="text-right">{cell(p, "labour_rate")}</TableCell>
                <TableCell className="text-right">{cell(p, "expected_range_min")}</TableCell>
                <TableCell className="text-right">{cell(p, "expected_range_max")}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.source}</TableCell>
                <TableCell className="text-xs">{p.last_updated_at}</TableCell>
                <TableCell className="text-xs">{p.database_version} · {p.region}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
      <Panel eyebrow="Change log" title={log.length ? `${log.length} change(s)` : "No changes since refresh"}>
        <ul className="space-y-1.5 text-sm">
          {log.map((l, i) => <li key={i}><span className="text-xs text-muted-foreground">{fmtDate(l.at)} · {l.actor}</span> — {l.detail}</li>)}
        </ul>
      </Panel>
    </div>
  );
}
