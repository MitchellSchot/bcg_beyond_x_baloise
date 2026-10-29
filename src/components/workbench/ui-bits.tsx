import { cn } from "@/lib/utils";
import type { ClaimStatus, Route } from "@/lib/types";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  new: "New",
  ready_for_estimation: "Ready for estimation",
  under_review: "Under review",
  ready_for_payment: "Ready for payment approval",
  needs_human_review: "Needs human review",
  resolved: "Resolved",
};

const STATUS_STYLE: Record<ClaimStatus, string> = {
  new: "bg-muted text-muted-foreground",
  ready_for_estimation: "bg-pale text-pale-foreground",
  under_review: "bg-navy/10 text-navy",
  ready_for_payment: "bg-brand/15 text-forest",
  needs_human_review: "bg-review text-review-foreground",
  resolved: "bg-secondary text-secondary-foreground",
};

export function StatusBadge({ status, className }: { status: ClaimStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const ROUTE_STYLE: Record<Route, string> = {
  ready_for_payment: "bg-brand text-brand-foreground",
  human_review: "bg-review text-review-foreground border border-review-foreground/20",
  request_info: "bg-warning-soft text-warning-foreground",
  request_revised_quote: "bg-warning-soft text-warning-foreground",
};

export function RouteBadge({ route, children }: { route: Route; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-md px-3 py-1 text-sm font-semibold", ROUTE_STYLE[route])}>{children}</span>;
}

export function Confidence({ value, className }: { value: number; className?: string }) {
  const p = Math.round(value * 100);
  const tone = p >= 90 ? "bg-brand" : p >= 80 ? "bg-warning" : "bg-destructive";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs tabular text-muted-foreground", className)} title={`Confidence ${p}%`}>
      <span className="relative h-1.5 w-10 overflow-hidden rounded-full bg-muted">
        <span className={cn("absolute inset-y-0 left-0 rounded-full", tone)} style={{ width: `${p}%` }} />
      </span>
      {p}%
    </span>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-md border border-navy/20 bg-navy/5 px-3 py-1.5 text-xs font-medium text-navy", className)}>
      <ShieldCheck className="h-3.5 w-3.5" />
      Recommendation only — not a coverage or payment decision.
    </div>
  );
}

export function Panel({ title, eyebrow, tone = "default", children, className, action }: {
  title?: ReactNode; eyebrow?: string; tone?: "default" | "pale" | "review" | "navy" | "forest";
  children: ReactNode; className?: string; action?: ReactNode;
}) {
  const tones = {
    default: "bg-card border",
    pale: "bg-pale border border-brand/15",
    review: "bg-review border border-review-foreground/10",
    navy: "bg-navy text-navy-foreground",
    forest: "bg-forest text-forest-foreground",
  } as const;
  const dark = tone === "navy" || tone === "forest";
  return (
    <section className={cn("rounded-xl p-5 shadow-card", tones[tone], className)}>
      {(title || eyebrow || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {eyebrow && <div className={cn("eyebrow", dark && "text-current opacity-70")}>{eyebrow}</div>}
            {title && <h2 className={cn("text-lg font-semibold", dark && "text-current")}>{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
