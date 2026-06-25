"use client";

/**
 * Daily check-in (mobile) — the 20-second wedge. Five sections (QoL, movement,
 * rehab + tolerance, meds, note) feed a completion meter; saving reveals the
 * pgvector pattern-memory recall card. All clinical framing is recall, never
 * diagnosis (the insight copy is guardrail-checked in lib/data/demo.ts).
 *
 * Props are typed from the real DB/domain shapes (lib/data/view.ts). The save
 * handler is a local transition today; wire it to a server action that inserts
 * daily_checkins + child events when Aurora is live.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";
import { Face } from "@/components/ui/Face";
import { VetLine } from "@/components/ui/VetLine";
import { Hero } from "@/components/ui/Hero";
import { Ico } from "@/components/ui/icons";
import { A, C } from "@/components/ui/tokens";
import { saveCheckin } from "@/lib/actions/checkin";
import type { Tolerance } from "@/lib/domain/progression";
import type { CheckinConfig, PatternMemory, PetHeader } from "@/lib/data/view";

const ACC = { day: A.sage, move: A.slate, rehab: A.teal, meds: A.plum, note: A.clay };

type ExerciseState = Record<string, { done: boolean; tol: string | null }>;

function Header({ header, config, progress }: { header: PetHeader; config: CheckinConfig; progress: number }) {
  const pct = Math.round(progress * 100);
  return (
    <div>
      <Hero
        avatarSrc={header.photoUrl}
        avatarAlt={header.name}
        back={`/pets/${header.id}`}
        eyebrow={config.dateLabel}
        title={`${header.name}’s day`}
        badge={header.phaseLabel}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginTop: 14,
            background: "rgba(255,255,255,0.14)",
            borderRadius: 13,
            padding: "10px 12px",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          <span style={{ color: "#fff", flexShrink: 0, display: "flex", opacity: 0.92 }}>
            {Ico.heart({ s: 16, c: "#fff" })}
          </span>
          <div style={{ fontSize: 12.5, lineHeight: 1.4, color: "rgba(255,255,255,0.94)" }}>
            However today went, you&rsquo;re here for {header.name}. A few quick notes are all today needs.
          </div>
        </div>
      </Hero>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px", marginBottom: 16 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 999, background: "#e0e6e2", overflow: "hidden" }}>
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, #4f8a7d, #5b7a99)",
              transition: "width .35s var(--gv-ease)",
            }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            color: C.muted,
            fontWeight: 650,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {pct}% done
        </div>
      </div>
    </div>
  );
}

function QolBlock({
  name,
  options,
  value,
  onPick,
}: {
  name: string;
  options: CheckinConfig["qol"];
  value: number | null;
  onPick: (i: number) => void;
}) {
  return (
    <Card>
      <SectionHead icon={Ico.heart({ s: 18, c: ACC.day.c })} accent={ACC.day} title={`How was ${name}’s day?`} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: -4,
          marginBottom: 15,
        }}
      >
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.4, flex: 1, minWidth: 0 }}>
          Overall sense — comfort, appetite, mood, mobility.
        </div>
      </div>
      <div
        role="radiogroup"
        aria-label={`How was ${name}'s day?`}
        style={{ display: "flex", justifyContent: "space-between", gap: 4 }}
      >
        {options.map((f, i) => {
          const on = value === i;
          return (
            <button
              key={f.key}
              className="gv-press"
              onClick={() => onPick(i)}
              role="radio"
              aria-checked={on}
              aria-label={f.sub}
              style={{
                flex: 1,
                border: "none",
                background: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 7,
                padding: "4px 0",
              }}
            >
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: on ? "var(--sage-soft)" : "transparent",
                  boxShadow: on ? `0 0 0 2.5px ${C.sage}` : "none",
                  transition: "background .15s ease, box-shadow .15s ease",
                }}
              >
                <Face level={i} active={on} stroke={on ? C.charcoal : "#7e8884"} />
              </span>
              <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 550, color: on ? C.charcoal : C.muted }}>
                {f.sub}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function MobilityBlock({
  items,
  options,
  pool,
  value,
  onPick,
}: {
  items: CheckinConfig["mobilityItems"];
  options: string[];
  pool: number;
  value: Record<string, number>;
  onPick: (id: string, oi: number) => void;
}) {
  return (
    <Card>
      <SectionHead
        icon={Ico.footprints({ s: 18, c: ACC.move.c })}
        accent={ACC.move}
        title="Today&rsquo;s movement check"
        hint={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {Ico.rotate({ s: 12, c: C.muted })} {items.length} of {pool}
          </span>
        }
      />
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: -4, marginBottom: 15, lineHeight: 1.4 }}>
        A rotating sample of the mobility items — quick to answer daily.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map((m) => (
          <div key={m.id}>
            <div style={{ fontSize: 13.5, fontWeight: 550, marginBottom: 8 }}>{m.label}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {options.map((opt, oi) => {
                const on = value[m.id] === oi;
                return (
                  <button
                    key={opt}
                    className="gv-press"
                    onClick={() => onPick(m.id, oi)}
                    style={{
                      flex: 1,
                      padding: "8px 2px",
                      borderRadius: 11,
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: on ? 700 : 550,
                      lineHeight: 1.15,
                      border: `1px solid ${on ? ACC.move.c : C.hair}`,
                      background: on ? ACC.move.soft : C.field,
                      color: on ? "#46617d" : C.muted,
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RehabBlock({
  exercises,
  tolerances,
  ex,
  onToggle,
  onTol,
  vetName,
}: {
  exercises: CheckinConfig["exercises"];
  tolerances: CheckinConfig["tolerances"];
  ex: ExerciseState;
  onToggle: (id: string) => void;
  onTol: (id: string, tol: string) => void;
  vetName: string;
}) {
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 16px 12px" }}>
        <SectionHead icon={Ico.activity({ s: 18, c: ACC.rehab.c })} accent={ACC.rehab} title="Rehab plan" hint={`${vetName}’s plan`} />
      </div>
      {exercises.map((e) => {
        const st = ex[e.id];
        return (
          <div key={e.id} style={{ borderTop: `1px solid ${C.hairSoft}`, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className="gv-press"
                onClick={() => onToggle(e.id)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  flexShrink: 0,
                  cursor: "pointer",
                  border: `1.8px solid ${st.done ? ACC.rehab.c : C.hair}`,
                  background: st.done ? ACC.rehab.c : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {st.done && Ico.check({ s: 15, c: "#fff", w: 3 })}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: st.done ? C.charcoal : "#6f675c" }}>{e.name}</div>
                <div style={{ fontSize: 11.5, color: C.muted, fontVariantNumeric: "tabular-nums", marginTop: 1 }}>{e.dose}</div>
              </div>
            </div>
            {st.done && (
              <div className="gv-rise" style={{ display: "flex", gap: 6, marginTop: 11, paddingLeft: 38 }}>
                {tolerances.map((t) => {
                  const on = st.tol === t.id;
                  return (
                    <button
                      key={t.id}
                      className="gv-press"
                      onClick={() => onTol(e.id, t.id)}
                      style={{
                        flex: 1,
                        padding: "7px 2px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontSize: 10.5,
                        fontWeight: on ? 700 : 600,
                        lineHeight: 1.1,
                        border: `1px solid ${on ? "transparent" : C.hair}`,
                        background: on ? t.soft : "#fff",
                        color: on ? t.ink : C.muted,
                        boxShadow: on ? `inset 0 0 0 1px ${t.ink}33` : "none",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

function MedsBlock({
  meds,
  state,
  onToggle,
}: {
  meds: CheckinConfig["meds"];
  state: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 16px 12px" }}>
        <SectionHead icon={Ico.pill({ s: 18, c: ACC.meds.c })} accent={ACC.meds} title="Medications" />
      </div>
      {meds.map((m) => {
        const on = state[m.id];
        return (
          <div
            key={m.id}
            style={{
              borderTop: `1px solid ${C.hairSoft}`,
              padding: "11px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{m.detail}</div>
            </div>
            <button
              className="gv-press"
              onClick={() => onToggle(m.id)}
              aria-pressed={on}
              style={{
                width: 48,
                height: 29,
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
                background: on ? C.sage : "#e2dccf",
                position: "relative",
                transition: "background .18s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: on ? 22 : 3,
                  width: 23,
                  height: 23,
                  borderRadius: 999,
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transition: "left .18s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {on && Ico.check({ s: 13, c: C.sage, w: 3 })}
              </span>
            </button>
          </div>
        );
      })}
    </Card>
  );
}

function Confirmation({
  header,
  insight,
  checkinNumber,
  onBack,
}: {
  header: PetHeader;
  insight: PatternMemory;
  checkinNumber: number;
  onBack: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
      <div className="gv-rise" style={{ textAlign: "center", padding: "10px 0 2px" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            margin: "0 auto 14px",
            background: "var(--sage-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "gv-pop .5s var(--gv-ease) both",
          }}
        >
          {Ico.heart({ s: 30, c: C.sage })}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 25, fontWeight: 500, letterSpacing: -0.3 }}>
          You showed up for {header.name}
        </div>
        <div
          style={{
            fontSize: 13.5,
            color: "#52605a",
            marginTop: 7,
            lineHeight: 1.5,
            maxWidth: 280,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Another gentle day on the record. That&rsquo;s how the bigger picture comes together.
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 9, fontVariantNumeric: "tabular-nums" }}>
          Check-in #{checkinNumber + 1} logged · {header.streakDays + 1}-day streak
        </div>
      </div>

      <div
        className="gv-rise"
        style={{
          background: "linear-gradient(165deg, #ffffff, #f5f9f7)",
          border: `1px solid ${C.hair}`,
          borderRadius: "var(--radius)",
          padding: 18,
          boxShadow: "0 12px 30px rgba(63,123,109,0.12)",
          animationDelay: ".12s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
          <span style={{ display: "flex", color: C.sage }}>{Ico.sparkles({ s: 15, c: C.sage })}</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: C.sage }}>
            {insight.eyebrow}
          </span>
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 17.5, fontWeight: 500, lineHeight: 1.36, letterSpacing: -0.1 }}>
          {insight.lead}{" "}
          <span style={{ color: C.charcoal, fontWeight: 600, fontStyle: "italic" }}>{insight.emphasis}</span>.
        </div>

        <div style={{ display: "flex", gap: 7, marginTop: 14, marginBottom: 4 }}>
          {insight.occurrences.map((x) => (
            <div
              key={x.date}
              style={{
                flex: 1,
                background: C.field,
                border: `1px solid ${C.hairSoft}`,
                borderRadius: 12,
                padding: "9px 8px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 7,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-end", height: 28 }}>
                <div style={{ width: 7, height: x.weight, borderRadius: 3, background: C.sage, opacity: 0.55 }} />
              </div>
              <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {x.date}
              </div>
            </div>
          ))}
        </div>

        <Link
          href={`/pets/${header.id}/recall`}
          className="gv-press"
          style={{
            width: "100%",
            marginTop: 14,
            padding: "12px",
            borderRadius: 13,
            cursor: "pointer",
            border: `1px solid ${C.sage}`,
            background: "var(--sage-soft)",
            color: "var(--sage-ink)",
            fontSize: 14,
            fontWeight: 650,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            textDecoration: "none",
          }}
        >
          See how those days went {Ico.chevR({ s: 16, c: "var(--sage-ink)" })}
        </Link>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 11, textAlign: "center", lineHeight: 1.45 }}>
          {insight.vetFraming}
        </div>
      </div>

      <button
        className="gv-press"
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: C.muted,
          fontSize: 13.5,
          fontWeight: 600,
          padding: "4px",
          textAlign: "center",
        }}
      >
        Back to today&rsquo;s check-in
      </button>

      <VetLine petId={header.id} paddingTop={4} />
      <div style={{ height: 8 }} />
    </div>
  );
}

export function CheckinScreen({ header, config }: { header: PetHeader; config: CheckinConfig }) {
  const [qol, setQol] = useState<number | null>(null);
  const [mob, setMob] = useState<Record<string, number>>({});
  const [ex, setEx] = useState<ExerciseState>(() =>
    config.exercises.reduce<ExerciseState>((a, e) => ({ ...a, [e.id]: { done: false, tol: null } }), {}),
  );
  const [meds, setMeds] = useState<Record<string, boolean>>(() =>
    config.meds.reduce<Record<string, boolean>>((a, m) => ({ ...a, [m.id]: false }), {}),
  );
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = qol !== null;

  const progress = useMemo(() => {
    let done = 0;
    if (qol !== null) done++;
    if (Object.keys(mob).length >= config.mobilityItems.length) done++;
    if (config.exercises.some((e) => ex[e.id]?.done)) done++;
    if (Object.values(meds).some(Boolean)) done++;
    if (note.trim()) done++;
    return done / 5;
  }, [qol, mob, ex, meds, note, config.mobilityItems.length, config.exercises]);

  async function handleSave() {
    if (qol === null || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveCheckin({
        petId: header.id,
        qol,
        mobilityItems: mob,
        exercises: config.exercises
          .filter((e) => ex[e.id]?.done)
          .map((e) => ({ exerciseId: e.id, tolerance: (ex[e.id].tol ?? "handled") as Tolerance })),
        meds: config.meds.map((m) => ({ medName: m.name, given: Boolean(meds[m.id]) })),
        note,
      });
      setSubmitted(true);
    } catch {
      setError("Couldn't save your check-in — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="gv-scroll" style={{ width: "100%", maxWidth: 440, margin: "0 auto", padding: "24px 16px 32px" }}>
      {submitted ? (
        <Confirmation header={header} insight={config.insight} checkinNumber={config.checkinNumber} onBack={() => setSubmitted(false)} />
      ) : (
        <>
          <Header header={header} config={config} progress={progress} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <QolBlock name={header.name} options={config.qol} value={qol} onPick={setQol} />
            <MobilityBlock
              items={config.mobilityItems}
              options={config.mobilityOptions}
              pool={config.mobilityItemPool}
              value={mob}
              onPick={(id, oi) => setMob((s) => ({ ...s, [id]: oi }))}
            />
            <RehabBlock
              exercises={config.exercises}
              tolerances={config.tolerances}
              vetName={header.vetName}
              ex={ex}
              onToggle={(id) => setEx((s) => ({ ...s, [id]: { ...s[id], done: !s[id].done } }))}
              onTol={(id, tol) => setEx((s) => ({ ...s, [id]: { ...s[id], tol } }))}
            />
            <MedsBlock meds={config.meds} state={meds} onToggle={(id) => setMeds((s) => ({ ...s, [id]: !s[id] }))} />
            <Card>
              <SectionHead icon={Ico.clip({ s: 18, c: ACC.note.c })} accent={ACC.note} title="Anything else about today?" />
              <textarea
                className="gv-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="A short note — what you noticed, a good moment…"
                rows={2}
                style={{
                  width: "100%",
                  resize: "none",
                  border: `1px solid ${C.hair}`,
                  borderRadius: 12,
                  background: C.field,
                  padding: "11px 12px",
                  fontSize: 14,
                  color: C.charcoal,
                  lineHeight: 1.45,
                }}
              />
            </Card>

            <button
              className="gv-press"
              onClick={handleSave}
              disabled={!ready || saving}
              style={{
                marginTop: 2,
                width: "100%",
                padding: "15px",
                borderRadius: 15,
                border: "none",
                cursor: ready && !saving ? "pointer" : "not-allowed",
                background: ready ? "linear-gradient(180deg, #59978a, #437a6d)" : "#dbe3df",
                color: ready ? "#ffffff" : "#9aa49e",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: -0.2,
                boxShadow: ready ? "0 6px 16px rgba(63,123,109,0.30)" : "none",
                opacity: ready ? (saving ? 0.85 : 1) : 0.9,
              }}
            >
              {saving ? "Saving…" : ready ? "Save today’s check-in" : "Tap a face to start"}
            </button>
            {error && (
              <div role="alert" style={{ fontSize: 12.5, color: C.danger, textAlign: "center", fontWeight: 600 }}>{error}</div>
            )}
            <VetLine petId={header.id} paddingTop={4} />
            <div style={{ height: 6 }} />
          </div>
        </>
      )}
    </main>
  );
}
