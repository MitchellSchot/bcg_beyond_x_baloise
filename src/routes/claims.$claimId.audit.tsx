import { createFileRoute } from "@tanstack/react-router";
import { eur, ROUTE_LABEL } from "@/lib/engine";
import { Panel, fmtDate } from "@/components/workbench/ui-bits";
import { AuditTimeline } from "@/components/workbench/AuditTimeline";
import { ControlsList } from "@/components/workbench/ControlsList";
import { useClaim } from "@/components/workbench/useClaim";

export const Route = createFileRoute("/claims/$claimId/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { claimId } = Route.useParams();
  const { rec } = useClaim(claimId);
  if (!rec) return null;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Panel eyebrow="Immutable activity timeline" title={`${rec.audit.length} events`}>
        <AuditTimeline events={rec.audit} />
      </Panel>
      <div className="space-y-6">
        <Panel eyebrow="Versions" title="Recommendations & decisions">
          {rec.reviews.length === 0 && rec.decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recommendation created yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {rec.reviews.map((r) => (
                <li key={`r${r.version}`} className="rounded-md bg-pale p-2.5">
                  <span className="font-medium">Recommendation v{r.version}</span> · {ROUTE_LABEL[r.decision]} · {eur(r.recommended_amount)}
                  <div className="text-xs text-muted-foreground">{fmtDate(r.created_at)} · Price DB {r.db_version}</div>
                </li>
              ))}
              {rec.decisions.map((d) => (
                <li key={`d${d.version}`} className="rounded-md bg-review p-2.5">
                  <span className="font-medium">Decision v{d.version}</span> · {d.action.replace("_", " ")}{d.final_amount != null && ` · ${eur(d.final_amount)}`}{d.override && " · override"}
                  <div className="text-xs text-muted-foreground">{fmtDate(d.at)} · {d.actor}</div>
                  {d.justification && <p className="mt-1 text-xs">“{d.justification}”</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <ControlsList />
      </div>
    </div>
  );
}
