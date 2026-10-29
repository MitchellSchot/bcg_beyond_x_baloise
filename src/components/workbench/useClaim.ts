import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { reconcile } from "@/lib/engine";

export function useClaim(claimId: string) {
  const rec = useStore((s) => s.claims[claimId]);
  const prices = useStore((s) => s.prices);
  const settings = useStore((s) => s.settings);
  const recon = useMemo(() => (rec ? reconcile(rec, prices, settings) : null), [rec, prices, settings]);
  return { rec, recon, prices, settings };
}
