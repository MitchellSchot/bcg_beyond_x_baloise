import { CheckCircle2 } from "lucide-react";
import { Panel } from "./ui-bits";

const CONTROLS = [
  ["Approved contractor network check", "Contractor checked against the approved network register."],
  ["Price database versioning", "Every estimate records the price-database version it used."],
  ["Evidence references", "Each extracted value and line cites its source document and line."],
  ["Role-based approval", "Only authorised approvers can release payments (4-eyes)."],
  ["Human override", "Handlers can override any recommendation with written justification."],
  ["Audit trail", "Append-only log with user identity and timestamp."],
  ["Data minimisation", "Addresses are masked where not needed; only claim-relevant data is processed."],
  ["Untrusted input isolation", "Email text and attachments can never change workflow rules or instructions."],
];

export function ControlsList() {
  return (
    <Panel tone="navy" eyebrow="Controls" title="Governance in place">
      <ul className="space-y-2.5">
        {CONTROLS.map(([t, d]) => (
          <li key={t} className="flex gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span><span className="font-medium">{t}</span><br /><span className="text-xs opacity-75">{d}</span></span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
