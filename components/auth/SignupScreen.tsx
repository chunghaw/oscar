"use client";

/**
 * Sign up (client) — email + password (+ optional name), posts to the signUp server
 * action which creates the owner, hashes the password, and signs them in. On success
 * routes to /onboarding to set up their first pet. Friendly inline error.
 */
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthHero, FieldLabel, NonClinicalLine, PrimaryButton, authInputStyle } from "./authShared";
import { C } from "@/components/ui/tokens";
import { MIN_PASSWORD_LENGTH } from "@/lib/domain/credentials";
import { signUp } from "@/lib/actions/auth";

export function SignupScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signUp({ email, password, displayName });
      if (res.ok) {
        router.push("/onboarding");
        router.refresh();
      } else {
        setError(res.error ?? "Couldn’t create your account — please try again.");
        setBusy(false);
      }
    } catch {
      setError("Something went wrong — please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="gv-scroll" style={{ width: "100%", maxWidth: 440, margin: "0 auto", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, padding: "24px 16px" }}>
      <AuthHero title="Set up your pet" subtitle="A calm home for everything your senior or chronically-ill companion needs." />

      <form onSubmit={onSubmit} style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <FieldLabel>Your name <span style={{ color: C.mutedSoft, fontWeight: 500, fontSize: 10.5 }}>optional</span></FieldLabel>
          <input
            type="text" autoComplete="name" value={displayName}
            onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Sam" style={authInputStyle}
          />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <input
            type="email" autoComplete="email" inputMode="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={authInputStyle}
          />
        </div>
        <div>
          <FieldLabel>Password</FieldLabel>
          <input
            type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} style={authInputStyle}
          />
        </div>

        {error && <div style={{ fontSize: 12.5, color: C.danger, lineHeight: 1.45 }}>{error}</div>}

        <PrimaryButton disabled={busy || !email || password.length < MIN_PASSWORD_LENGTH}>
          {busy ? "Creating your account…" : "Create account"}
        </PrimaryButton>
      </form>

      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 14 }}>
        <NonClinicalLine />
        <div style={{ textAlign: "center", fontSize: 13, color: C.muted }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: C.sage, fontWeight: 650, textDecoration: "none" }}>Log in</Link>
        </div>
      </div>
    </main>
  );
}
