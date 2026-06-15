/**
 * Shared building blocks for the auth screens — the same calm gradient hero, field,
 * and primary button the onboarding Welcome uses, factored so login/signup/landing
 * stay visually consistent. Non-clinical shield line lives here too.
 */
import type { CSSProperties, ReactNode } from "react";
import { Ico } from "@/components/ui/icons";
import { C } from "@/components/ui/tokens";

export const authInputStyle: CSSProperties = {
  width: "100%", border: `1px solid ${C.hair}`, borderRadius: 12, background: C.field,
  padding: "12px 13px", fontSize: 14.5, color: C.charcoal, fontFamily: "inherit", outline: "none",
};

/** The Goldvale logo + tagline hero shared with onboarding's Welcome. */
export function AuthHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{
      position: "relative", overflow: "hidden", borderRadius: 22,
      background: "linear-gradient(150deg, #4f8a7d 0%, #46796f 42%, #50708a 100%)",
      boxShadow: "0 14px 30px rgba(58,107,96,0.26)", padding: "28px 22px 26px", textAlign: "center",
    }}>
      <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: "absolute", top: -64, right: -60, opacity: 0.16 }}>
        <circle cx="110" cy="110" r="92" fill="none" stroke="#fff" strokeWidth="1.5" />
        <circle cx="110" cy="110" r="66" fill="none" stroke="#fff" strokeWidth="1.5" />
        <circle cx="110" cy="110" r="40" fill="none" stroke="#fff" strokeWidth="1.5" />
      </svg>
      <div style={{ position: "relative" }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, margin: "0 auto 16px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {Ico.paw({ s: 30, c: "#fff" })}
        </div>
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.8)", fontWeight: 650, letterSpacing: 1.4, textTransform: "uppercase" }}>Goldvale</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1.12, color: "#fff", marginTop: 8 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.9)", lineHeight: 1.5, marginTop: 12, maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

/** The "we never diagnose" reassurance line shared across screens. */
export function NonClinicalLine() {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 14, padding: "13px 14px" }}>
      <span style={{ color: C.sage, flexShrink: 0, marginTop: 1 }}>{Ico.shield({ s: 17, c: C.sage })}</span>
      <div style={{ fontSize: 12.5, color: "#42504b", lineHeight: 1.5 }}>
        Goldvale helps you <strong style={{ color: C.charcoal, fontWeight: 700 }}>track, remember, and prepare</strong> — it doesn&rsquo;t diagnose. Your vet decides.
      </div>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 12.5, fontWeight: 650, color: C.charcoal, marginBottom: 7 }}>{children}</div>
  );
}

export function PrimaryButton({ children, disabled, type = "submit", onClick }: {
  children: ReactNode; disabled?: boolean; type?: "submit" | "button"; onClick?: () => void;
}) {
  return (
    <button type={type} className="gv-press" disabled={disabled} onClick={onClick} style={{
      width: "100%", padding: "15px", borderRadius: 15, border: "none", cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "#dbe3df" : "linear-gradient(180deg, #59978a, #437a6d)",
      color: disabled ? "#9aa49e" : "#fff", fontSize: 16, fontWeight: 700, letterSpacing: -0.2,
      boxShadow: disabled ? "none" : "0 6px 16px rgba(63,123,109,0.30)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    }}>{children}</button>
  );
}
