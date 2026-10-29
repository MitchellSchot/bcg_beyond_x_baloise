import { Link } from "@tanstack/react-router";
import { Database } from "lucide-react";
import { useStore } from "@/lib/store";

export function PriceDbCard() {
  const v = useStore((s) => s.prices[0]?.database_version);
  return (
    <div className="rounded-lg border border-brand/20 bg-pale p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-display font-semibold text-forest">
        <Database className="h-4 w-4 text-brand" /> Approved price database
      </div>
      <dl className="grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Version</dt><dd className="font-medium">{v}</dd>
        <dt className="text-muted-foreground">Region</dt><dd>Flanders</dd>
        <dt className="text-muted-foreground">Last refreshed</dt><dd>08:00 today</dd>
        <dt className="text-muted-foreground">Source status</dt>
        <dd><span className="rounded bg-brand/15 px-1.5 py-0.5 font-medium text-forest">validated</span></dd>
      </dl>
      <Link to="/price-database" className="mt-3 inline-block text-xs text-forest underline-offset-2 hover:underline">Open price database →</Link>
    </div>
  );
}
