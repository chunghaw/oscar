"use client";

/**
 * Vet-prep brief (mobile) — the curated summary the owner brings to a visit.
 * Oscar surfaces "things to mention" (a trend, a recalled pattern, a question);
 * the owner toggles each in/out and adds their own questions. It PREPARES and
 * REMEMBERS — no item asserts a diagnosis, and the progression item stays a
 * question (mention bodies are guardrail-checked in lib/data/demo.ts).
 */
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";
import { Hero, HeroStats } from "@/components/ui/Hero";
import { Ico, type IconProps } from "@/components/ui/icons";
import { A, C, type Accent } from "@/components/ui/tokens";
import type { BriefMention, BriefView, PetHeader, SnapshotStat, MedAdherence } from "@/lib/data/view";

const ICONS: Record<BriefMention["iconKey"], (p?: IconProps) => React.JSX.Element> = {
  trend: Ico.trendUp,
  repeat: Ico.repeat,
  activity: Ico.activity,
};
const ACCENTS: Record<BriefMention["accentKey"], Accent> = {
  snap: A.sage,
  mention: A.clay,
  teal: A.teal,
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function MentionRow({ m, on, onToggle }: { m: BriefMention; on: boolean; onToggle: () => void }) {
  const accent = ACCENTS[m.accentKey];
  const icon = ICONS[m.iconKey];
  return (
    <button
      className="gv-press"
      onClick={onToggle}
      aria-pressed={on}
      style={{
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        gap: 12,
        padding: "13px 14px",
        borderRadius: 14,
        alignItems: "flex-start",
        border: `1px solid ${on ? C.hair : C.hairSoft}`,
        background: on ? "#fff" : C.field,
        opacity: on ? 1 : 0.55,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          flexShrink: 0,
          background: accent.soft,
          color: accent.c,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon({ s: 18, c: accent.c })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.1, flex: 1 }}>{m.title}</span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: accent.c,
              background: accent.soft,
              padding: "2px 6px",
              borderRadius: 999,
              flexShrink: 0,
            }}
          >
            {m.tag}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#4a544f", lineHeight: 1.4, marginTop: 4 }}>{m.body}</div>
      </div>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          flexShrink: 0,
          marginTop: 2,
          border: `1.8px solid ${on ? accent.c : C.hair}`,
          background: on ? accent.c : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {on && Ico.check({ s: 13, c: "#fff", w: 3 })}
      </div>
    </button>
  );
}

function Snapshot({ stats }: { stats: SnapshotStat[] }) {
  return (
    <Card>
      <SectionHead icon={Ico.trendUp({ s: 18, c: A.sage.c })} accent={A.sage} title="28-day snapshot" />
      <div style={{ display: "flex", gap: 9 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{ flex: 1, background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 13, padding: "12px 10px" }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 24,
                  fontWeight: 500,
                  letterSpacing: -0.5,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.value}
              </span>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{s.unit}</span>
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4, lineHeight: 1.2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MedsCard({ meds }: { meds: MedAdherence[] }) {
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 16px 12px" }}>
        <SectionHead icon={Ico.pill({ s: 18, c: A.plum.c })} accent={A.plum} title="Current medications" />
      </div>
      {meds.map((m) => (
        <div
          key={m.name}
          style={{
            borderTop: `1px solid ${C.hairSoft}`,
            padding: "11px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{m.detail}</div>
          </div>
          <div
            style={{ fontSize: 11.5, color: A.plum.c, fontWeight: 650, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
          >
            {m.adherence}
          </div>
        </div>
      ))}
    </Card>
  );
}

function QuestionsCard({ seed }: { seed: string[] }) {
  const [qs, setQs] = useState<string[]>(seed);
  const [draft, setDraft] = useState("");
  function add() {
    const t = draft.trim();
    if (!t) return;
    setQs((s) => [...s, t]);
    setDraft("");
  }
  return (
    <Card>
      <SectionHead icon={Ico.help({ s: 18, c: A.slate.c })} accent={A.slate} title="Questions to ask" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {qs.map((q, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              background: C.field,
              border: `1px solid ${C.hairSoft}`,
              borderRadius: 12,
              padding: "10px 12px",
            }}
          >
            <span style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, color: A.slate.c, lineHeight: 1.4, flexShrink: 0 }}>
              {i + 1}.
            </span>
            <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "#3c453f" }}>{q}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Add a question for the visit…"
          style={{
            flex: 1,
            border: `1px solid ${C.hair}`,
            borderRadius: 11,
            background: "#fff",
            padding: "10px 12px",
            fontSize: 13,
            fontFamily: "inherit",
            color: C.charcoal,
            outline: "none",
          }}
        />
        <button
          className="gv-press"
          onClick={add}
          aria-label="Add question"
          style={{
            flexShrink: 0,
            width: 42,
            borderRadius: 11,
            border: `1px solid ${A.slate.c}`,
            background: "var(--slate-soft)",
            color: A.slate.c,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Ico.plus({ s: 18, c: A.slate.c })}
        </button>
      </div>
    </Card>
  );
}

type ShareState = { kind: "idle" } | { kind: "copied" } | { kind: "error"; message: string };

function buildBriefMarkdown(header: PetHeader, brief: BriefView, included: Record<string, boolean>): string {
  const out: string[] = [];
  out.push(`# Vet brief — ${header.name}`);
  out.push(`Prepared for ${header.vetName}. Window: ${brief.windowDays} days.\n`);
  const mentions = brief.mentions.filter((m) => included[m.id]);
  if (mentions.length) {
    out.push("## Things to mention");
    for (const m of mentions) out.push(`- **${m.title}** — ${m.body}`);
    out.push("");
  }
  if (brief.snapshot.length) {
    out.push("## Snapshot");
    for (const s of brief.snapshot) out.push(`- ${s.label}: ${s.value}${s.unit}`);
    out.push("");
  }
  if (brief.meds.length) {
    out.push("## Medications");
    for (const m of brief.meds) out.push(`- ${m.name} (${m.detail}) — ${m.adherence}`);
    out.push("");
  }
  if (brief.seedQuestions.length) {
    out.push("## Questions");
    brief.seedQuestions.forEach((q, i) => out.push(`${i + 1}. ${q}`));
  }
  out.push("\n_Prepared by Oscar — non-clinical. Your vet reads the full picture._");
  return out.join("\n");
}

export function VetBriefScreen({ header, brief }: { header: PetHeader; brief: BriefView }) {
  const [inc, setInc] = useState<Record<string, boolean>>(() =>
    brief.mentions.reduce<Record<string, boolean>>((a, m) => ({ ...a, [m.id]: true }), {}),
  );
  const [share, setShare] = useState<ShareState>({ kind: "idle" });
  const includedCount = useMemo(() => Object.values(inc).filter(Boolean).length, [inc]);

  async function handleShare() {
    const text = buildBriefMarkdown(header, brief, inc);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard not available in this browser.");
      await navigator.clipboard.writeText(text);
      setShare({ kind: "copied" });
      setTimeout(() => setShare({ kind: "idle" }), 3500);
    } catch {
      setShare({ kind: "error", message: "Couldn't copy automatically — select the brief in your screenshot tool, or try again." });
    }
  }

  return (
    <main className="gv-scroll" style={{ width: "100%", maxWidth: 440, margin: "0 auto", padding: "24px 16px 32px" }}>
      <Hero
        avatarSrc={header.photoUrl}
        avatarAlt={header.name}
        back={`/pets/${header.id}`}
        eyebrow={`Brief for ${header.vetName}`}
        title={`${header.name}’s vet brief`}
        badge={header.nextVisit ? (
          <>
            {Ico.cal({ s: 12, c: "#fff" })} {header.nextVisit}
          </>
        ) : undefined}
      >
        <HeroStats
          stats={[
            { k: `${brief.windowDays}-day`, l: "window" },
            { k: `${includedCount} of ${brief.mentions.length}`, l: "to mention" },
            { k: cap(brief.band), l: "mobility band" },
          ]}
        />
      </Hero>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <SectionHead
            icon={Ico.share({ s: 18, c: A.clay.c })}
            accent={A.clay}
            title="Things to mention"
            hint={`${includedCount} of ${brief.mentions.length}`}
          />
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: -4, marginBottom: 13, lineHeight: 1.45 }}>
            {brief.mentions.length > 0
              ? "We surfaced these from your check-ins. Tap to choose what goes in the brief."
              : `Nothing to flag yet. As you log check-ins, photos, and rehab, the things worth mentioning to ${header.name}’s vet will gather here.`}
          </div>
          {brief.mentions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {brief.mentions.map((m) => (
                <MentionRow key={m.id} m={m} on={inc[m.id]} onToggle={() => setInc((s) => ({ ...s, [m.id]: !s[m.id] }))} />
              ))}
            </div>
          )}
        </Card>

        <Snapshot stats={brief.snapshot} />
        <MedsCard meds={brief.meds} />
        <QuestionsCard seed={brief.seedQuestions} />

        <button
          className="gv-press"
          onClick={handleShare}
          aria-label="Copy brief to clipboard"
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: 15,
            cursor: "pointer",
            background: share.kind === "copied" ? "var(--sage-soft)" : "linear-gradient(180deg, #59978a, #437a6d)",
            color: share.kind === "copied" ? "var(--sage-ink)" : "#fff",
            fontSize: 15.5,
            fontWeight: 700,
            letterSpacing: -0.2,
            boxShadow: share.kind === "copied" ? "none" : "0 6px 16px rgba(63,123,109,0.30)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            whiteSpace: "nowrap",
            border: share.kind === "copied" ? `1px solid ${C.sage}` : "none",
          }}
        >
          {share.kind === "copied" ? (
            <>{Ico.check({ s: 17, c: "var(--sage-ink)", w: 2.6 })} Copied — paste it to your vet</>
          ) : (
            <>{Ico.share({ s: 17, c: "#fff" })} Copy brief for {header.vetName}</>
          )}
        </button>
        {share.kind === "copied" && (
          <div role="status" aria-live="polite" style={{ fontSize: 11.5, color: "var(--sage-ink)", textAlign: "center", marginTop: -6 }}>
            Brief copied to your clipboard.
          </div>
        )}
        {share.kind === "error" && (
          <div role="alert" style={{ fontSize: 11.5, color: C.danger, textAlign: "center", marginTop: -6, lineHeight: 1.4 }}>
            {share.message}
          </div>
        )}

        <div style={{ fontSize: 11.5, color: C.muted, textAlign: "center", lineHeight: 1.5, padding: "2px 14px" }}>
          We prepare and remember — it doesn&rsquo;t diagnose. Your vet reads the full picture.
        </div>
        <div style={{ height: 6 }} />
      </div>
    </main>
  );
}
