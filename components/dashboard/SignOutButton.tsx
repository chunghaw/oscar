"use client";

/**
 * Discreet sign-out control for a logged-in owner on their own pet. Calls the logOut
 * server action then returns to the landing page. Tiny + calm — never shown on the
 * public demo pet.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/components/ui/tokens";
import { logOut } from "@/lib/actions/auth";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      await logOut();
      router.push("/");
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "6px 0 2px" }}>
      <button onClick={onClick} disabled={busy} className="gv-press" style={{
        background: "none", border: "none", cursor: busy ? "default" : "pointer",
        color: C.mutedSoft, fontSize: 12.5, fontWeight: 600, padding: "6px 10px",
      }}>
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
