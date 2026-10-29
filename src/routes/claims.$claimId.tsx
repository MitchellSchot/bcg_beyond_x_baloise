import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/workbench/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/claims/$claimId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.claimId} · Hail Claim Cost Review Workbench` },
      { name: "description", content: `Evidence, dual cost estimates and recommendation for hail claim ${params.claimId}.` },
      { property: "og:title", content: `${params.claimId} · Hail claim review` },
      { property: "og:description", content: "Explainable quote vs. market benchmark reconciliation with human control." },
    ],
  }),
  component: ClaimLayout,
});

const STEPS = [
  { to: "/claims/$claimId", label: "1 · Intake & evidence", exact: true },
  { to: "/claims/$claimId/estimates", label: "2 · Dual estimates" },
  { to: "/claims/$claimId/reconcile", label: "3 · Reconciliation" },
  { to: "/claims/$claimId/outcome", label: "4 · Outcome" },
  { to: "/claims/$claimId/audit", label: "Audit trail" },
] as const;

function ClaimLayout() {
  const { claimId } = Route.useParams();
  const rec = useStore((s) => s.claims[claimId]);
  const hydrated = useStore((s) => s.hydrated);

  if (!rec) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        {hydrated ? (
          <>
            Claim {claimId} not found. <Link to="/" className="text-forest underline">Back to inbox</Link>
          </>
        ) : "Loading claim…"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-forest">
            <ChevronLeft className="h-3.5 w-3.5" /> Claims inbox
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{rec.claim.customer_name}</h1>
            <span className="font-mono text-sm text-muted-foreground">{claimId}</span>
            <StatusBadge status={rec.claim.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Hail · {rec.fields.address.value} · {rec.fields.contractor.value}</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b">
        {STEPS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            params={{ claimId }}
            activeOptions={{ exact: "exact" in s }}
            className={cn("whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-sm text-muted-foreground hover:text-forest")}
            activeProps={{ className: "border-brand! font-medium text-forest" }}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
