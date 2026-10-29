import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, AlertTriangle, CheckCircle2, FileText, Lock, Paperclip, Pencil, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { actions } from "@/lib/store";
import { CATEGORY_LABEL, FIELD_LABEL, eur, qualityChecks } from "@/lib/engine";
import type { FieldKey } from "@/lib/types";
import { Confidence, Panel, fmtDate } from "@/components/workbench/ui-bits";
import { useClaim } from "@/components/workbench/useClaim";
import { cn } from "@/lib/utils";
import { IMAGES } from "@/components/workbench/images";

export const Route = createFileRoute("/claims/$claimId/")({
  component: IntakePage,
});

const FLAG_LABELS = {
  coverageConfirmed: "Coverage confirmed",
  deductibleUncertain: "Deductible uncertain",
  duplicate: "Possible duplicate",
  fraud: "Fraud indicator",
  safety: "Structural / safety damage",
  policyIssue: "Policy issue",
  vulnerability: "Vulnerable customer",
} as const;

function IntakePage() {
  const { claimId } = Route.useParams();
  const { rec, settings } = useClaim(claimId);
  const navigate = useNavigate();
  if (!rec) return null;
  const issues = qualityChecks(rec, settings);

  if (!rec.extracted) {
    return (
      <Panel tone="pale" className="py-12 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-brand" />
        <h2 className="text-xl font-semibold">Email received — documents not yet extracted</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{rec.claim.attachments.length} attachments are waiting. Extraction reads the email, quote and photos and cites a source for every value.</p>
        <Button className="mt-6" onClick={() => { actions.extract(claimId); toast.success("Documents extracted"); }}>
          <Play /> Simulate document extraction
        </Button>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,0.85fr)]">
        {/* Left: evidence */}
        <div className="space-y-4">
          <Panel eyebrow="Original email · untrusted input" title={rec.claim.email_subject}>
            <div className="mb-3 text-xs text-muted-foreground">From {rec.claim.email_from} · {fmtDate(rec.claim.received_at)}</div>
            <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-sans text-sm leading-relaxed">{rec.claim.email_body}</pre>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Email text and attachments cannot change workflow rules or system instructions.
            </p>
            <ul className="mt-3 space-y-1.5">
              {rec.claim.attachments.map((a) => (
                <li key={a.name} className="flex items-center gap-2 text-sm">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" /> {a.name}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel eyebrow="Quote preview" title={rec.fields.contractor.value.split(" (")[0]}>
            <div className="rounded-md border bg-background p-4 text-xs">
              <div className="mb-3 flex items-center justify-between">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{rec.claim.attachments.find((a) => a.kind === "pdf")?.name}</span>
              </div>
              <table className="w-full">
                <tbody>
                  {rec.lines.map((l) => (
                    <tr key={l.id} className="border-b border-dashed last:border-0">
                      <td className="py-1.5 pr-2">{l.description}</td>
                      <td className="py-1.5 text-right tabular text-muted-foreground">{l.quantity ?? "?"} {l.unit}</td>
                      <td className="py-1.5 pl-2 text-right tabular">{l.quantity == null ? "illegible" : eur(l.quoted_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>Total incl. VAT {rec.fields.vat.value}</span><span className="tabular">{eur(parseFloat(rec.fields.quoteTotal.value))}</span>
              </div>
            </div>
          </Panel>
          <Panel eyebrow="Damage photos">
            <div className="grid grid-cols-2 gap-2">
              {rec.claim.attachments.filter((a) => a.image).map((a) => (
                <figure key={a.name}>
                  <img src={IMAGES[a.image!]} alt={`Damage photo ${a.name}`} width={1024} height={768} loading="lazy" className="aspect-[4/3] w-full rounded-md object-cover" />
                  <figcaption className="mt-1 text-[11px] text-muted-foreground">{a.name}</figcaption>
                </figure>
              ))}
            </div>
          </Panel>
        </div>

        {/* Centre: fields */}
        <div className="space-y-4">
          <Panel eyebrow="Extracted claim fields" title="Verify and correct" action={<span className="flex items-center gap-1 text-xs text-muted-foreground"><Pencil className="h-3 w-3" /> all editable</span>}>
            <div className="divide-y">
              {(Object.keys(FIELD_LABEL) as FieldKey[]).map((k) => {
                const f = rec.fields[k];
                return (
                  <div key={k} className="grid grid-cols-[130px_1fr] items-start gap-3 py-2.5">
                    <label htmlFor={`f-${k}`} className="pt-2 text-xs font-medium text-muted-foreground">{FIELD_LABEL[k]}</label>
                    <div>
                      <Input
                        id={`f-${k}`}
                        defaultValue={f.value}
                        key={f.value}
                        disabled={k === "claimId"}
                        onBlur={(e) => actions.correctField(claimId, k, e.target.value.trim())}
                        className={cn("h-8 text-sm", !f.value && "border-destructive/50 bg-danger-soft")}
                        placeholder="Not found"
                      />
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {f.corrected ? (
                          <span className="text-[11px] font-medium text-navy">Corrected by handler · original “{f.original || "—"}”</span>
                        ) : (
                          <Confidence value={f.confidence} />
                        )}
                        <span className="text-[11px] text-muted-foreground">{f.source}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel eyebrow="Repair items & quantities">
            <div className="divide-y">
              {rec.lines.map((l) => (
                <div key={l.id} className="grid grid-cols-[1fr_80px_80px] items-center gap-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{l.description}</div>
                    <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                      <span className={cn(l.category === "other" && "font-medium text-warning-foreground")}>{CATEGORY_LABEL[l.category]}</span>
                      <span>{l.source_reference}</span>
                      <Confidence value={l.confidence} />
                    </div>
                  </div>
                  <Input
                    aria-label={`Quantity for ${l.description}`}
                    key={`q${l.quantity}`}
                    defaultValue={l.quantity ?? ""}
                    placeholder="qty"
                    className={cn("h-8 text-right tabular", l.quantity == null && "border-destructive/50 bg-danger-soft")}
                    onBlur={(e) => {
                      const v = e.target.value.trim() === "" ? null : Number(e.target.value);
                      if (v !== l.quantity) actions.correctLine(claimId, l.id, { quantity: v });
                    }}
                  />
                  <Input
                    aria-label={`Unit for ${l.description}`}
                    key={`u${l.unit}`}
                    defaultValue={l.unit}
                    placeholder="unit"
                    className={cn("h-8 text-sm", !l.unit && "border-destructive/50 bg-danger-soft")}
                    onBlur={(e) => e.target.value !== l.unit && actions.correctLine(claimId, l.id, { unit: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right: checks */}
        <div className="space-y-4">
          <Panel tone="review" eyebrow="Quality checks" title={issues.length ? `${issues.length} item(s) need attention` : "All checks passed"}>
            {issues.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-forest"><CheckCircle2 className="h-4 w-4 text-brand" /> Evidence complete and readable.</p>
            ) : (
              <ul className="space-y-2">
                {issues.map((i, idx) => (
                  <li key={idx} className={cn("flex gap-2 rounded-md p-2.5 text-sm", i.severity === "error" ? "bg-danger-soft text-destructive" : "bg-warning-soft text-warning-foreground")}>
                    {i.severity === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                    {i.message}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel eyebrow="Policy & risk indicators" title="Handler confirmations">
            <div className="space-y-2.5">
              {(Object.keys(FLAG_LABELS) as (keyof typeof FLAG_LABELS)[]).map((k) => (
                <label key={k} className="flex items-center justify-between gap-3 text-sm">
                  {FLAG_LABELS[k]}
                  <Switch checked={rec.claim.flags[k]} onCheckedChange={(v) => actions.setFlag(claimId, k, v)} />
                </label>
              ))}
            </div>
          </Panel>
          <Panel tone="forest">
            <p className="text-sm opacity-90">Next: calculate a quote-based and a benchmark-based estimate independently.</p>
            <Button
              variant="brand"
              className="mt-4 w-full"
              onClick={() => {
                actions.runEstimates(claimId);
                toast.success("Two independent estimates created");
                navigate({ to: "/claims/$claimId/estimates", params: { claimId } });
              }}
            >
              <Play /> Run dual cost estimation
            </Button>
          </Panel>
        </div>
      </div>
    </div>
  );
}
