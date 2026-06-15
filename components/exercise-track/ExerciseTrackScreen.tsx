"use client";

/**
 * Exercise track (mobile) — the vet-plan-GATED rehab tracker. The vet prescribes;
 * Goldvale only LOGS adherence and, when earned (lib/domain/progression), surfaces a
 * QUESTION-framed "ask your vet about progressing" nudge — never an advance-dose
 * action, never a diagnosis. No exercise is shown without an active plan.
 *
 * Props typed from lib/data/view.ts; logging writes via the logSession server action.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";
import { Hero } from "@/components/ui/Hero";
import { Ico } from "@/components/ui/icons";
import { A, C } from "@/components/ui/tokens";
import { logSession } from "@/lib/actions/exercises";
import type { Tolerance } from "@/lib/domain/progression";
import type { ExerciseTrackView, PetHeader, RedFlag, TrackExercise } from "@/lib/data/view";

const ACC = { plan: A.sage, prog: A.slate, mods: A.teal };

const TOL: { id: Tolerance; label: string; soft: string; ink: string }[] = [
  { id: "handled", label: "Handled", soft: "var(--sage-soft)", ink: "var(--sage-ink)" },
  { id: "a_bit_tired", label: "A bit tired", soft: "var(--slate-soft)", ink: "#46617d" },
  { id: "sore", label: "Sore", soft: "var(--gold-soft)", ink: "var(--gold-ink)" },
  { id: "refused", label: "Refused", soft: "var(--clay-soft)", ink: "var(--clay-ink)" },
];

type RowState = { done: boolean; reps: number; tol: Tolerance | null };
type ExState = Record<string, RowState>;

function Sparkline({ history }: { history: number[] }) {
  const W = 300, H = 46, max = 3;
  const n = history.length || 1;
  const bw = (W - (n - 1) * 4) / n;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {history.map((v, i) => {
        const rest = v === 0;
        const h = rest ? 4 : 8 + (v / max) * (H - 12);
        const x = i * (bw + 4);
        return (
          <rect key={i} x={x} y={H - h} width={bw} height={h} rx={2.5} fill={rest ? "#d9e0db" : C.sage} opacity={rest ? 1 : 0.45 + (v / max) * 0.45} />
        );
      })}
    </svg>
  );
}

function VetFlagRow({ redFlags }: { redFlags?: RedFlag[] }) {
  const show = redFlags && redFlags.length > 0;
  return (
    <Card style={{ borderColor: "rgba(192,73,43,0.22)", background: "linear-gradient(170deg, #fff, #fdf3f0)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: show ? 13 : 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: "var(--danger-soft)", color: C.danger, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {Ico.alert({ s: 18, c: C.danger })}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 650, lineHeight: 1.3 }}>Noticed something worrying?</div>
          <div style={{ fontSize: 12, marginTop: 1 }}>
            <a href="#contact-vet" style={{ color: C.danger, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer" }}>
              Contact your vet now
            </a>
          </div>
        </div>
      </div>
      {show && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 13, borderTop: "1px solid rgba(192,73,43,0.14)" }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>For recovery, watch for:</div>
          {redFlags!.map((f) => (
            <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${C.hairSoft}`, borderRadius: 12, padding: "10px 12px" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: C.danger, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "#5a4540", lineHeight: 1.35 }}>{f.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ExerciseRow({ ex, st, onToggle, onReps, onTol }: {
  ex: TrackExercise; st: RowState; onToggle: (id: string) => void; onReps: (id: string, d: number) => void; onTol: (id: string, t: Tolerance) => void;
}) {
  return (
    <div style={{ borderTop: `1px solid ${C.hairSoft}`, padding: "13px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="gv-press" onClick={() => onToggle(ex.id)} aria-pressed={st.done} style={{
          width: 27, height: 27, borderRadius: 8, flexShrink: 0, cursor: "pointer",
          border: `1.8px solid ${st.done ? C.sage : C.hair}`, background: st.done ? C.sage : "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{st.done && Ico.check({ s: 15, c: "#fff", w: 3 })}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: st.done ? C.charcoal : "#5d655e" }}>{ex.name}</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: ex.active ? C.sage : "#7d6b96", background: ex.active ? "var(--sage-soft)" : "var(--plum-soft)", padding: "2px 6px", borderRadius: 999, flexShrink: 0 }}>
              {ex.active ? "Active" : "Passive"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{ex.fitt}</div>
        </div>
      </div>
      {st.done && (
        <div className="gv-rise" style={{ paddingLeft: 39, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 11 }}>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Reps done</span>
            <div style={{ display: "flex", alignItems: "center", marginLeft: "auto", border: `1px solid ${C.hair}`, borderRadius: 10, overflow: "hidden" }}>
              <button className="gv-press" onClick={() => onReps(ex.id, -1)} aria-label="fewer reps" style={{ width: 34, height: 32, border: "none", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ico.minus({ s: 15, c: C.muted })}</button>
              <span style={{ minWidth: 42, textAlign: "center", fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {st.reps}<span style={{ color: C.mutedSoft, fontWeight: 500, fontSize: 12 }}> / {ex.planned}</span>
              </span>
              <button className="gv-press" onClick={() => onReps(ex.id, 1)} aria-label="more reps" style={{ width: 34, height: 32, border: "none", borderLeft: `1px solid ${C.hair}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ico.plus({ s: 15, c: C.sage })}</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {TOL.map((t) => {
              const on = st.tol === t.id;
              return (
                <button key={t.id} className="gv-press" onClick={() => onTol(ex.id, t.id)} style={{
                  flex: 1, padding: "8px 2px", borderRadius: 999, cursor: "pointer", fontSize: 10.5, fontWeight: on ? 700 : 600, lineHeight: 1.1,
                  border: `1px solid ${on ? "transparent" : C.hair}`, background: on ? t.soft : "#fff", color: on ? t.ink : C.muted,
                  boxShadow: on ? `inset 0 0 0 1px ${t.ink}33` : "none",
                }}>{t.label}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LoggedSheet({ count, name, onClose }: { count: number; name: string; onClose: () => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(32,38,42,0.34)" }} />
      <div style={{ position: "relative", background: "#fff", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: "12px 22px 30px", boxShadow: "0 -10px 40px rgba(0,0,0,0.16)" }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: "#dde3df", margin: "0 auto 20px" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, margin: "0 auto 16px", background: "var(--sage-soft)", display: "flex", alignItems: "center", justifyContent: "center", animation: "gv-pop .5s var(--gv-ease) both" }}>
            {Ico.check({ s: 30, c: C.sage, w: 2.6 })}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 23, fontWeight: 500, letterSpacing: -0.4 }}>Logged — that&rsquo;s how progress shows up</div>
          <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5, marginTop: 9, maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>
            {count} {count === 1 ? "exercise" : "exercises"} saved to {name}&rsquo;s rehab record. Every session adds to the bigger picture.
          </div>
        </div>
        <button className="gv-press" onClick={onClose} style={{
          width: "100%", marginTop: 22, padding: "14px", borderRadius: 14, border: "none", cursor: "pointer",
          background: "linear-gradient(180deg, #59978a, #437a6d)", color: "#fff", fontSize: 15.5, fontWeight: 700,
          boxShadow: "0 6px 16px rgba(63,123,109,0.30)",
        }}>Done</button>
      </div>
    </div>
  );
}

function GatedView({ petId, view }: { petId: string; view: ExerciseTrackView }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ textAlign: "center", padding: "26px 20px 22px" }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, margin: "0 auto 16px", background: "var(--sage-soft)", color: C.sage, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {Ico.activity({ s: 27, c: C.sage })}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 500, letterSpacing: -0.3, lineHeight: 1.2 }}>Your vet sets the plan</div>
        <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5, marginTop: 9, maxWidth: 270, marginLeft: "auto", marginRight: "auto" }}>
          Goldvale doesn&rsquo;t prescribe exercises. Once you add your vet&rsquo;s plan, we&rsquo;ll track it here — dose, tolerance, and progress.
        </div>
        <Link href="/onboarding" className="gv-press" style={{
          width: "100%", marginTop: 20, padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", textDecoration: "none",
          background: "linear-gradient(180deg, #59978a, #437a6d)", color: "#fff", fontSize: 15.5, fontWeight: 700,
          boxShadow: "0 6px 16px rgba(63,123,109,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>Add your vet&rsquo;s plan {Ico.chevR({ s: 17, c: "#fff" })}</Link>
      </Card>

      <Card>
        <SectionHead icon={Ico.home({ s: 18, c: ACC.mods.c })} accent={ACC.mods} title="Meanwhile: home setup" hint="No plan needed" />
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: -4, marginBottom: 13, lineHeight: 1.45 }}>
          Small changes you can make today to keep them steady and comfortable.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {view.modifications.map((m) => (
            <div key={m.title} style={{ display: "flex", alignItems: "center", gap: 12, background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 13, padding: "11px 13px" }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: ACC.mods.soft, color: ACC.mods.c, display: "flex", alignItems: "center", justifyContent: "center" }}>{Ico.home({ s: 15, c: ACC.mods.c })}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 650 }}>{m.title}</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{m.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <VetFlagRow />
      <div style={{ height: 8 }} />
      <BackToDashboard petId={petId} />
    </div>
  );
}

function ActiveView({ header, view, ex, setEx, onLog, saving }: {
  header: PetHeader; view: ExerciseTrackView; ex: ExState; setEx: React.Dispatch<React.SetStateAction<ExState>>; onLog: () => void; saving: boolean;
}) {
  const planned = (id: string) => view.exercises.find((e) => e.id === id)?.planned ?? 0;
  const toggle = (id: string) => setEx((s) => ({ ...s, [id]: { ...s[id], done: !s[id].done, reps: s[id].done ? 0 : planned(id), tol: s[id].done ? null : s[id].tol } }));
  const reps = (id: string, d: number) => setEx((s) => ({ ...s, [id]: { ...s[id], reps: Math.max(0, Math.min(planned(id), s[id].reps + d)) } }));
  const tol = (id: string, t: Tolerance) => setEx((s) => ({ ...s, [id]: { ...s[id], tol: t } }));
  const doneCount = Object.values(ex).filter((e) => e.done).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 16px 12px" }}>
          <SectionHead icon={Ico.activity({ s: 18, c: ACC.plan.c })} accent={ACC.plan} title="Today&rsquo;s plan" hint={`${doneCount}/${view.exercises.length} logged`} />
          <div style={{ fontSize: 12, color: C.muted, marginTop: -4, lineHeight: 1.45 }}>Prescribed by {view.prescriberName} · check off as you go.</div>
        </div>
        {view.exercises.map((e) => (
          <ExerciseRow key={e.id} ex={e} st={ex[e.id]} onToggle={toggle} onReps={reps} onTol={tol} />
        ))}
        <div style={{ padding: 16, borderTop: `1px solid ${C.hairSoft}` }}>
          <button className="gv-press" onClick={onLog} disabled={doneCount === 0 || saving} style={{
            width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: doneCount && !saving ? "pointer" : "not-allowed",
            background: doneCount ? "linear-gradient(180deg, #59978a, #437a6d)" : "#dbe3df", color: doneCount ? "#fff" : "#9aa49e",
            fontSize: 15, fontWeight: 700, boxShadow: doneCount ? "0 6px 16px rgba(63,123,109,0.28)" : "none",
          }}>{saving ? "Saving…" : doneCount ? `Log today’s session (${doneCount})` : "Check off an exercise to log"}</button>
        </div>
      </Card>

      <Card>
        <SectionHead icon={Ico.trendUp({ s: 18, c: ACC.prog.c })} accent={ACC.prog} title="Progress" hint="this week" />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: "var(--serif)", fontSize: 34, fontWeight: 500, letterSpacing: -0.8, lineHeight: 1 }}>{view.adherencePct}</span>
              <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>%</span>
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>adherence · {view.adherenceDays}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", marginBottom: 5 }}>
              {view.cleanDots.map((d, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: 999, background: d ? C.sage : "#fff", border: `1.5px solid ${d ? C.sage : C.hair}` }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>last {view.cleanDots.length} sessions</div>
          </div>
        </div>
        <div style={{ paddingTop: 14, borderTop: `1px solid ${C.hairSoft}` }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 8 }}>Last 2 weeks</div>
          <Sparkline history={view.history} />
        </div>
      </Card>

      {view.nudge.fires && (
        <div className="gv-rise" style={{ background: "linear-gradient(165deg, #ffffff, #fdf6e8)", border: "1px solid rgba(214,152,30,0.34)", borderRadius: "var(--radius)", padding: 18, boxShadow: "0 10px 26px rgba(214,152,30,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
            <span style={{ display: "flex" }}>{Ico.sparkles({ s: 15, c: "#b9831a" })}</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#a5751a" }}>A milestone worth a chat</span>
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 17.5, fontWeight: 500, lineHeight: 1.4, letterSpacing: -0.1 }}>{view.nudge.headline}</div>
          <div style={{ fontSize: 13, color: "#5a5343", lineHeight: 1.5, marginTop: 9 }}>{view.nudge.question}</div>
          <Link href={`/pets/${header.id}/brief`} className="gv-press" style={{
            width: "100%", marginTop: 14, padding: "12px", borderRadius: 13, cursor: "pointer", textDecoration: "none",
            border: "1px solid rgba(214,152,30,0.5)", background: "var(--gold-soft)", color: "#8a6410",
            fontSize: 14, fontWeight: 650, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>Add to vet brief {Ico.chevR({ s: 16, c: "#8a6410" })}</Link>
        </div>
      )}

      <VetFlagRow redFlags={view.redFlags} />
      <div style={{ height: 8 }} />
      <BackToDashboard petId={header.id} />
    </div>
  );
}

function BackToDashboard({ petId }: { petId: string }) {
  return (
    <Link href={`/pets/${petId}`} className="gv-press" style={{
      width: "100%", padding: "12px", borderRadius: 13, border: `1px solid ${C.hair}`, background: "#fff",
      color: C.charcoal, fontSize: 13.5, fontWeight: 650, textAlign: "center", textDecoration: "none",
    }}>Back to dashboard</Link>
  );
}

export function ExerciseTrackScreen({ header, view }: { header: PetHeader; view: ExerciseTrackView }) {
  const router = useRouter();
  const [ex, setEx] = useState<ExState>(() =>
    view.exercises.reduce<ExState>((a, e) => ({ ...a, [e.id]: { done: false, reps: 0, tol: null } }), {}),
  );
  const [saving, setSaving] = useState(false);
  const [loggedCount, setLoggedCount] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessions = useMemo(
    () => view.exercises.filter((e) => ex[e.id]?.done).map((e) => ({
      exerciseId: e.id, plannedReps: e.planned, completedReps: ex[e.id].reps, tolerance: (ex[e.id].tol ?? "handled") as Tolerance,
    })),
    [ex, view.exercises],
  );

  async function handleLog() {
    if (!sessions.length || saving) return;
    setSaving(true);
    setError(null);
    try {
      const r = await logSession({ petId: header.id, sessions });
      setLoggedCount(r.count);
      setSheet(true);
    } catch {
      setError("Couldn't log the session — please try again.");
    } finally {
      setSaving(false);
    }
  }

  function closeSheet() {
    setSheet(false);
    setEx(view.exercises.reduce<ExState>((a, e) => ({ ...a, [e.id]: { done: false, reps: 0, tol: null } }), {}));
    router.refresh(); // pull fresh adherence + nudge from the server
  }

  return (
    <main className="gv-scroll" style={{ position: "relative", width: "100%", maxWidth: 440, margin: "0 auto", padding: "24px 16px 32px" }}>
      <Hero
        avatarSrc={header.photoUrl}
        avatarAlt={header.name}
        eyebrow="Home rehab"
        title={`${header.name}’s rehab`}
        badge={view.gated ? "No plan yet" : header.phaseLabel}
      />
      {view.gated ? <GatedView petId={header.id} view={view} /> : (
        <ActiveView header={header} view={view} ex={ex} setEx={setEx} onLog={handleLog} saving={saving} />
      )}
      {error && (
        <div style={{ marginTop: 12, textAlign: "center", fontSize: 12.5, color: C.danger }}>{error}</div>
      )}
      {sheet && <LoggedSheet count={loggedCount} name={header.name} onClose={closeSheet} />}
    </main>
  );
}
