import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, CheckCircle2, Send, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { actions } from "@/lib/store";
import { ROUTE_LABEL, eur, pct } from "@/lib/engine";
import type { ClaimRecord, HumanAction, ReviewSnapshot } from "@/lib/types";
import { Disclaimer, Panel, RouteBadge, fmtDate } from "@/components/workbench/ui-bits";
import { AuditTimeline } from "@/components/workbench/AuditTimeline";
import { useClaim } from "@/components/workbench/useClaim";

export const Route = createFileRoute("/claims/$claimId/outcome")({
  component: OutcomePage,
});

function OutcomePage() {
  const { claimId } = Route.useParams();
  const { rec, recon } = useClaim(claimId);
  if (!rec || !recon) return null;
  const review = rec.reviews.at(-1);
  if (!review) {
    return (
      <Panel tone="pale" className="py-12 text-center">
        <p className="text-sm text-muted-foreground">No recommendation yet. Review the reconciliation first.</p>
        <Button asChild className="mt-4"><Link to="/claims/$claimId/reconcile" params={{ claimId }}>Open reconciliation</Link></Button>
      </Panel>
    );
  }
  const humanActed = !!rec.queuedForPaymentAt || rec.decisions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <RouteBadge route={review.decision}>{ROUTE_LABEL[review.decision]}</RouteBadge>
          <span className="text-xs text-muted-foreground">Recommendation v{review.version} · {fmtDate(review.created_at)} · Price DB {review.db_version}</span>
        </div>
        <Disclaimer />
      </div>
      {review.decision === "ready_for_payment" ? (
        <ReadyPath rec={rec} review={review} checks={recon.checks} />
      ) : (
        <HumanReviewPath rec={rec} review={review} />
      )}
      {humanActed && <FeedbackForm rec={rec} review={review} />}
    </div>
  );
}

function ReadyPath({ rec, review, checks }: { rec: ClaimRecord; review: ReviewSnapshot; checks: { id: string; label: string; detail: string; pass: boolean }[] }) {
  const id = rec.claim.claim_id;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <Panel tone="forest">
          <div className="eyebrow text-current opacity-70">Recommended settlement amount</div>
          <div className="mt-1 font-display text-4xl font-semibold tabular">{eur(review.recommended_amount)}</div>
          <p className="mt-2 text-sm opacity-85">Incl. 6% VAT, minus {eur(parseFloat(rec.fields.deductible.value))} deductible.</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-brand-foreground">
            <BadgeCheck className="h-4 w-4" /> Ready for authorised payment approval
          </div>
        </Panel>
        <Panel eyebrow="Summary of the two estimates">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground">Quote (excl. VAT)</div><div className="text-lg font-semibold tabular">{eur(review.quote_total)}</div></div>
            <div><div className="text-xs text-muted-foreground">Benchmark (excl. VAT)</div><div className="text-lg font-semibold tabular">{eur(review.benchmark_total)}</div></div>
            <div><div className="text-xs text-muted-foreground">Variance</div><div className="text-lg font-semibold tabular">{eur(review.variance_absolute)} <span className="text-sm text-muted-foreground">({pct(review.variance_percentage)})</span></div></div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{review.rationale}</p>
        </Panel>
        <Panel eyebrow="Proposed payment details" tone="review">
          <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Payee</dt><dd>{rec.fields.contractor.value.split(" (")[0]}</dd>
            <dt className="text-muted-foreground">IBAN</dt><dd className="font-mono">BE68 •••• •••• 4471</dd>
            <dt className="text-muted-foreground">Reference</dt><dd className="font-mono">{id} / {rec.fields.policyId.value}</dd>
            <dt className="text-muted-foreground">Approver role</dt><dd>Authorised payment approver (4-eyes)</dd>
          </dl>
        </Panel>
      </div>
      <div className="space-y-6">
        <Panel eyebrow="Controls" title="Passed controls">
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.id} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><span>{c.label} <span className="text-xs text-muted-foreground">— {c.detail}</span></span></li>
            ))}
          </ul>
        </Panel>
        <Panel tone="navy">
          {rec.queuedForPaymentAt ? (
            <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-brand" /> Sent to the payment approval queue on {fmtDate(rec.queuedForPaymentAt)}. No payment has been triggered — an authorised approver will release it.</p>
          ) : (
            <>
              <p className="text-sm opacity-90">The workbench never triggers a payment. Sending puts the dossier in the queue of an authorised approver.</p>
              <Button variant="brand" className="mt-4 w-full" onClick={() => { actions.queuePayment(id); toast.success("Sent to payment approval queue"); }}>
                <Send /> Send to payment approval queue
              </Button>
            </>
          )}
        </Panel>
        <Panel eyebrow="Recent activity"><AuditTimeline events={rec.audit} compact /></Panel>
      </div>
    </div>
  );
}

function followUps(review: ReviewSnapshot): string[] {
  const all = review.line_flags.flatMap((l) => l.flags.map((f) => ({ f, item: l.item })));
  const q: string[] = [];
  const seen = new Set<string>();
  for (const { f, item } of all) {
    const key = f + item;
    if (seen.has(key)) continue;
    seen.add(key);
    if (f.startsWith("Labour rate")) q.push(`Ask the contractor to justify the hourly rate for “${item}” versus the regional benchmark.`);
    else if (f.startsWith("Quantity")) q.push(`Request a measurement or photo evidence supporting the quantity for “${item}”.`);
    else if (f.startsWith("Item has insufficient")) q.push(`Is “${item}” related to the hail event and covered by the policy? Request evidence of damage.`);
    else if (f.startsWith("Repair versus")) q.push(`Can “${item}” be repaired instead of replaced? Ask for the glazing-only price.`);
    else if (f.startsWith("Unit price")) q.push(`Ask for the product reference and supplier price for “${item}”.`);
    else if (f.startsWith("Repair scope")) q.push(`Request an itemised, legible line for “${item}”.`);
  }
  if (review.reasons.some((r) => r.startsWith("VAT"))) q.push("Confirm the dwelling is older than 10 years so the 6% VAT rate applies.");
  return q;
}

const ACTIONS: { value: HumanAction; label: string }[] = [
  { value: "approve", label: "Approve final amount" },
  { value: "request_info", label: "Request more information" },
  { value: "revised_quote", label: "Return for revised quote" },
  { value: "escalate", label: "Escalate to expert" },
];

function HumanReviewPath({ rec, review }: { rec: ClaimRecord; review: ReviewSnapshot }) {
  const id = rec.claim.claim_id;
  const [action, setAction] = useState<HumanAction>("approve");
  const [amount, setAmount] = useState(review.recommended_amount.toFixed(2));
  const [just, setJust] = useState("");
  const recommendedAction: HumanAction =
    review.decision === "request_info" ? "request_info" : review.decision === "request_revised_quote" ? "revised_quote" : "approve";
  const amt = parseFloat(amount);
  const override = action !== recommendedAction || (action === "approve" && Math.abs(amt - review.recommended_amount) > 0.005);
  const last = rec.decisions.at(-1);

  const submit = () => {
    if (override && just.trim().length < 10) {
      toast.error("A written justification (min. 10 characters) is required when overriding the recommendation.");
      return;
    }
    if (action === "approve" && !(amt >= 0)) { toast.error("Enter a valid final amount."); return; }
    actions.decide(id, { action, final_amount: action === "approve" ? amt : null, override, justification: just.trim() });
    toast.success("Decision recorded in the audit trail");
    setJust("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <Panel tone="review" eyebrow="Why a human is needed" title="Flagged issues">
          <ul className="space-y-2 text-sm">
            {review.reasons.map((r) => <li key={r} className="rounded-md bg-background/70 px-3 py-2">{r}</li>)}
          </ul>
          {review.line_flags.length > 0 && (
            <div className="mt-4">
              <div className="eyebrow mb-2">Line items</div>
              <ul className="space-y-1.5 text-sm">
                {review.line_flags.map((l) => <li key={l.item}><span className="font-medium">{l.item}</span> — <span className="text-muted-foreground">{l.flags.join(" · ")}</span></li>)}
              </ul>
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">{review.rationale}</p>
        </Panel>
        <Panel eyebrow="Recommended follow-up questions">
          <ol className="list-decimal space-y-2 pl-5 text-sm">{followUps(review).map((q) => <li key={q}>{q}</li>)}</ol>
        </Panel>
        <Panel eyebrow="Full audit trail"><AuditTimeline events={rec.audit} /></Panel>
      </div>
      <div className="space-y-6">
        <Panel tone="navy" eyebrow="Claims-handler decision" title={<span className="flex items-center gap-2"><UserCheck className="h-5 w-5" /> You decide</span>}>
          <div className="mb-4 grid grid-cols-2 gap-3 rounded-md bg-navy-foreground/10 p-3 text-sm">
            <div><div className="text-xs opacity-70">Quote (excl. VAT)</div><div className="font-semibold tabular">{eur(review.quote_total)}</div></div>
            <div><div className="text-xs opacity-70">Indicative amount</div><div className="font-semibold tabular text-brand">{eur(review.recommended_amount)}</div></div>
          </div>
          <RadioGroup value={action} onValueChange={(v) => setAction(v as HumanAction)} className="space-y-2">
            {ACTIONS.map((a) => (
              <label key={a.value} className="flex cursor-pointer items-center gap-3 rounded-md border border-navy-foreground/20 px-3 py-2.5 text-sm has-[[data-state=checked]]:bg-navy-foreground/10">
                <RadioGroupItem value={a.value} className="border-navy-foreground text-navy-foreground" /> {a.label}
                {a.value === recommendedAction && <span className="ml-auto text-[11px] opacity-70">matches recommendation</span>}
              </label>
            ))}
          </RadioGroup>
          {action === "approve" && (
            <div className="mt-4">
              <Label htmlFor="final" className="text-xs opacity-80">Final amount (EUR, incl. VAT, after deductible)</Label>
              <Input id="final" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 bg-background text-foreground tabular" inputMode="decimal" />
            </div>
          )}
          <div className="mt-4">
            <Label htmlFor="just" className="text-xs opacity-80">Justification {override ? <span className="font-semibold text-warning">— required (override)</span> : "(optional)"}</Label>
            <Textarea id="just" value={just} onChange={(e) => setJust(e.target.value)} rows={3} className="mt-1 bg-background text-foreground" placeholder="Explain your decision…" />
          </div>
          <Button variant="brand" className="mt-4 w-full" onClick={submit}>Record decision</Button>
          {last && (
            <p className="mt-3 text-xs opacity-80">Last decision v{last.version}: {ACTIONS.find((a) => a.value === last.action)?.label}{last.final_amount != null ? ` · ${eur(last.final_amount)}` : ""}{last.override ? " · override" : ""} — {fmtDate(last.at)}</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

const REASON_CODES = ["RC01 Labour rate corrected", "RC02 Quantity corrected", "RC03 Scope not hail-related", "RC04 Repair instead of replacement", "RC05 VAT corrected", "RC06 Recommendation accepted as-is", "RC07 Price DB item outdated"];

function FeedbackForm({ rec, review }: { rec: ClaimRecord; review: ReviewSnapshot }) {
  const last = rec.decisions.at(-1);
  const [correct, setCorrect] = useState<"yes" | "partly" | "no">("yes");
  const [line, setLine] = useState("none");
  const [qty, setQty] = useState(false);
  const [price, setPrice] = useState(false);
  const [reclass, setReclass] = useState(false);
  const [finalAmt, setFinalAmt] = useState(String(last?.final_amount ?? review.recommended_amount));
  const [code, setCode] = useState<string>(REASON_CODES[5]!);
  const [comment, setComment] = useState("");

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Panel eyebrow="Feedback & learning" title="How good was the recommendation?">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Was the recommendation correct?</Label>
            <RadioGroup value={correct} onValueChange={(v) => setCorrect(v as typeof correct)} className="mt-2 flex gap-4">
              {(["yes", "partly", "no"] as const).map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm capitalize"><RadioGroupItem value={v} /> {v}</label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label className="text-xs">Which line item changed?</Label>
            <Select value={line} onValueChange={setLine}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {rec.lines.map((l) => <SelectItem key={l.id} value={l.description}>{l.description}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Final amount (EUR)</Label>
            <Input className="mt-1 tabular" value={finalAmt} onChange={(e) => setFinalAmt(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={qty} onCheckedChange={(v) => setQty(!!v)} /> Quantity was changed</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={price} onCheckedChange={(v) => setPrice(!!v)} /> Unit price was changed</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={reclass} onCheckedChange={(v) => setReclass(!!v)} /> Repair category was reclassified</label>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Reason code</Label>
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{REASON_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Reviewer comment</Label>
            <Textarea className="mt-1" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
        <Button
          className="mt-4"
          onClick={() => {
            actions.addFeedback(rec.claim.claim_id, {
              recommendation_correct: correct, line_item_changed: line === "none" ? "" : line, quantity_changed: qty,
              unit_price_changed: price, category_reclassified: reclass, final_amount: parseFloat(finalAmt) || null,
              reason_code: code, comment,
            });
            toast.success("Feedback stored as a new version");
            setComment("");
          }}
        >
          Save feedback as new version
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">Original quote, benchmark estimate, recommendation and prior decisions are never overwritten.</p>
      </Panel>
      <Panel eyebrow="Version history" title={`${rec.feedback.length} feedback version(s)`}>
        {rec.feedback.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feedback yet.</p>
        ) : (
          <ul className="space-y-3">
            {[...rec.feedback].reverse().map((f) => (
              <li key={f.version} className="rounded-md border p-3 text-sm">
                <div className="flex justify-between"><span className="font-medium">v{f.version} · {f.reason_code}</span><span className="text-xs text-muted-foreground">{fmtDate(f.at)}</span></div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Correct: {f.recommendation_correct} · Final {eur(f.final_amount)}{f.line_item_changed && ` · Line: ${f.line_item_changed}`}
                  {f.quantity_changed && " · qty"}{f.unit_price_changed && " · unit price"}{f.category_reclassified && " · reclassified"}
                </div>
                {f.comment && <p className="mt-1 text-xs">“{f.comment}”</p>}
              </li>
            ))}
          </ul>
        )}
        <Link to="/learning" className="mt-4 inline-block text-xs text-forest hover:underline">View learning signals →</Link>
      </Panel>
    </div>
  );
}
