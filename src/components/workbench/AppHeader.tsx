import { Link } from "@tanstack/react-router";
import { Database, HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import logo from "@/assets/baloise-logo.png.asset.json";

const NAV = [
  { to: "/", label: "Claims inbox" },
  { to: "/price-database", label: "Price database" },
  { to: "/settings", label: "Decision rules" },
  { to: "/learning", label: "Learning & controls" },
] as const;

const STEPS = [
  ["Claim email received", "Email, quote and photos land in the inbox."],
  ["AI extraction", "Fields and quote lines are extracted with confidence and source references."],
  ["Two independent estimates", "Quote analysis and market benchmark are calculated in parallel."],
  ["Reconciliation", "Line-by-line comparison with flags and a transparent rationale."],
  ["Routing", "Ready for payment approval, request info, or human review."],
  ["Human decision", "The claims handler keeps final authority. Everything is audited."],
];

export function AppHeader() {
  const version = useStore((s) => s.prices[0]?.database_version);
  return (
    <header className="sticky top-0 z-30">
      <div className="h-2 bg-strip" />
      <div className="bg-navy text-navy-foreground">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 items-center rounded-md bg-card px-2">
            <img src={logo.url} alt="Baloise" className="h-9 w-28 object-cover" />
          </span>
          <span className="hidden whitespace-nowrap leading-tight xl:block">
            <span className="block font-display text-sm font-semibold">ClaimIQ</span>
            <span className="block text-[11px] opacity-75">Hail claim cost review</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-navy-foreground/80 transition-colors hover:text-navy-foreground"
              activeProps={{ className: "bg-navy-foreground/15 font-medium text-navy-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/price-database" className="hidden whitespace-nowrap items-center gap-2 rounded-md border border-navy-foreground/30 px-2.5 py-1.5 text-xs text-navy-foreground/80 lg:flex">
            <Database className="h-3.5 w-3.5" />
            DB <span className="font-medium text-navy-foreground">{version}</span>
          </Link>
          <Popover>
            <PopoverTrigger className="flex whitespace-nowrap items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-navy-foreground hover:bg-navy-foreground/15">
              <HelpCircle className="h-4 w-4" /> How it works
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96">
              <div className="eyebrow mb-1">Workflow</div>
              <p className="mb-3 font-display text-sm font-semibold text-forest">
                Two independent, explainable cost estimates — exceptions stay under human control.
              </p>
              <ol className="space-y-2">
                {STEPS.map(([t, d], i) => (
                  <li key={t} className="flex gap-3 text-sm">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-pale text-[11px] font-semibold text-forest">{i + 1}</span>
                    <span><span className="font-medium">{t}.</span> <span className="text-muted-foreground">{d}</span></span>
                  </li>
                ))}
              </ol>
            </PopoverContent>
          </Popover>
          <div className="hidden items-center gap-2 border-l border-navy-foreground/30 pl-3 xl:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-card text-xs font-semibold text-navy">LD</span>
            <span className="whitespace-nowrap text-xs leading-tight">
              <span className="block font-medium">Louis Dupont</span>
              <span className="opacity-75">Claims handler</span>
            </span>
          </div>
        </div>
      </div>
      </div>
    </header>
  );
}
