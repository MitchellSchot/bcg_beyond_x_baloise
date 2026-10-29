import { Lock } from "lucide-react";
import type { AuditEvent } from "@/lib/types";
import { fmtDate } from "./ui-bits";
import { cn } from "@/lib/utils";

export function AuditTimeline({ events, compact }: { events: AuditEvent[]; compact?: boolean }) {
  const list = compact ? events.slice(-6) : events;
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {list.map((e) => {
        const human = e.actor !== "System";
        return (
          <li key={e.id} className="relative">
            <span className={cn("absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-background", human ? "bg-navy" : "bg-brand")} />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium">{e.action}</span>
              <span className="text-[11px] text-muted-foreground">{fmtDate(e.at)} · {e.actor}</span>
            </div>
            <p className="text-xs text-muted-foreground">{e.detail}</p>
          </li>
        );
      })}
      <li className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" /> Append-only log — entries cannot be edited or deleted.</li>
    </ol>
  );
}
