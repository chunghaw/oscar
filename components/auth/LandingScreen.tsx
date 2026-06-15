/**
 * Landing (logged-out) — the calm front door. Three clear paths: create your own pet,
 * log in, or explore the live demo (Oscar) with no sign-up. Mirrors the onboarding
 * Welcome's warm "track · remember · prepare" framing and non-clinical shield line.
 */
import Link from "next/link";
import { AuthHero, NonClinicalLine } from "./authShared";
import { Ico } from "@/components/ui/icons";
import { A, C } from "@/components/ui/tokens";

const ACC = { pet: A.sage, cond: A.slate, plan: A.teal };

export function LandingScreen({ demoPetId }: { demoPetId: string }) {
  const rows = [
    { ic: Ico.heart, a: ACC.pet, t: "Track", d: "A gentle daily note of how they’re doing." },
    { ic: Ico.sparkles, a: ACC.cond, t: "Remember", d: "Goldvale spots the patterns you’d miss day to day." },
    { ic: Ico.activity, a: ACC.plan, t: "Prepare", d: "Walk into every vet visit with the full picture." },
  ];
  return (
    <main className="gv-scroll" style={{ width: "100%", maxWidth: 440, margin: "0 auto", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, padding: "24px 16px" }}>
      <AuthHero
        title="A calmer way to care"
        subtitle="For the senior and chronically-ill pets who need a little extra looking-after."
      />

      <div style={{ padding: "0 6px", display: "flex", flexDirection: "column", gap: 15 }}>
        {rows.map((r) => (
          <div key={r.t} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: r.a.soft, color: r.a.c, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.ic({ s: 19, c: r.a.c })}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, letterSpacing: -0.2 }}>{r.t}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.45, marginTop: 1 }}>{r.d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 4px" }}>
        <NonClinicalLine />
      </div>

      <div style={{ padding: "4px 4px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <Link href="/signup" className="gv-press" style={{
          width: "100%", padding: "15px", borderRadius: 15, border: "none", cursor: "pointer", textDecoration: "none",
          background: "linear-gradient(180deg, #59978a, #437a6d)", color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: -0.2,
          boxShadow: "0 6px 16px rgba(63,123,109,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          Set up your own pet {Ico.chevR({ s: 17, c: "#fff" })}
        </Link>

        <Link href="/login" className="gv-press" style={{
          width: "100%", padding: "14px", borderRadius: 14, cursor: "pointer", textDecoration: "none",
          border: `1px solid ${C.hair}`, background: "#fff", color: C.charcoal, fontSize: 15, fontWeight: 650,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          Log in
        </Link>

        <Link href={`/pets/${demoPetId}`} className="gv-press" style={{
          textAlign: "center", textDecoration: "none", color: C.sage, fontSize: 13.5, fontWeight: 650,
          padding: "8px 0 2px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          {Ico.paw({ s: 15, c: C.sage })} Explore the live demo
        </Link>
      </div>
    </main>
  );
}
