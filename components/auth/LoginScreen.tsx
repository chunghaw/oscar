"use client";

/**
 * Log in (client) — email + password, posts to the logIn server action, then routes
 * to "/" (the landing redirect resolves the owner's pet). Friendly inline error; the
 * action never reveals whether the email exists.
 */
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthHero, FieldLabel, NonClinicalLine, PrimaryButton, authInputStyle } from "./authShared";
import { C } from "@/components/ui/tokens";
import { logIn } from "@/lib/actions/auth";

export function LoginScreen({ demoPetId }: { demoPetId: string }) {
  const router = useRouter();
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
      const res = await logIn({ email, password });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(res.error ?? "Email or password is incorrect.");
        setBusy(false);
      }
    } catch {
      setError("Something went wrong — please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="gv-scroll" style={{ width: "100%", maxWidth: 440, margin: "0 auto", minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, padding: "24px 16px" }}>
      <AuthHero title="Welcome back" subtitle="Pick up right where you and your companion left off." />

      <form onSubmit={onSubmit} style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16 }}>
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
            type="password" autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="Your password" style={authInputStyle}
          />
        </div>

        {error && <div style={{ fontSize: 12.5, color: C.danger, lineHeight: 1.45 }}>{error}</div>}

        <PrimaryButton disabled={busy || !email || !password}>
          {busy ? "Logging in…" : "Log in"}
        </PrimaryButton>
      </form>

      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 14 }}>
        <NonClinicalLine />
        <div style={{ textAlign: "center", fontSize: 13, color: C.muted }}>
          New here?{" "}
          <Link href="/signup" style={{ color: C.sage, fontWeight: 650, textDecoration: "none" }}>Set up your pet</Link>
          {"  ·  "}
          <Link href={`/pets/${demoPetId}`} style={{ color: C.sage, fontWeight: 650, textDecoration: "none" }}>Explore the demo</Link>
        </div>
      </div>
    </main>
  );
}
