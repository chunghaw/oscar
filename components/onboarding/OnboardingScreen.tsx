"use client";

/**
 * Onboarding (mobile) — calm, skippable multi-step setup. CAPTURES what the owner/vet
 * already know; it never assesses, grades, or diagnoses. On finish, a saveOnboarding
 * server action creates the owner → pet → (optional) protocol/plan/meds, then routes
 * into the first daily check-in.
 *
 * Form ids use the real DB vocabulary (protocol_templates / exercises) so the insert
 * maps cleanly. See lib/data/onboarding-write.ts.
 */
import { useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";
import { Ico } from "@/components/ui/icons";
import { A, C } from "@/components/ui/tokens";
import { saveOnboarding } from "@/lib/actions/onboarding";

const ACC = { pet: A.sage, cond: A.slate, plan: A.teal, meds: A.plum };

const CONDITIONS = [
  { id: "osteoarthritis", label: "Osteoarthritis", template: false, exclusive: false },
  { id: "ivdd", label: "IVDD", template: true, exclusive: false },
  { id: "post_op", label: "Post-op (TPLO / cruciate)", template: true, exclusive: false },
  { id: "other", label: "Other", template: false, exclusive: false },
  { id: "none", label: "Nothing specific", template: false, exclusive: true },
];
const TEMPLATES = [
  { id: "tplo_post_op", label: "TPLO post-op", detail: "Knee surgery recovery" },
  { id: "ivdd_conservative", label: "IVDD conservative", detail: "Crate rest & rebuild" },
];
const PLAN_EXERCISES = [
  { id: "sit_to_stand", name: "Sit-to-stand" },
  { id: "weight_shift", name: "Weight shifts" },
  { id: "cookie_stretch", name: "Cookie stretch" },
  { id: "cavaletti", name: "Cavaletti rails" },
  { id: "leash_walk", name: "Controlled leash walk" },
];
const TIMINGS = ["Morning", "Evening", "With food", "As needed"];
const CAPTURE_STEPS = 5;

interface FormData {
  name: string;
  species: "dog" | "cat" | null;
  breed: string;
  age: string;
  photo: boolean;
  senior: boolean;
  conditions: string[];
  template: string | null;
  onsetDate: string;
  vetClinic: string;
  vetPhone: string;
  hasPlan: "yes" | "no" | null;
  prescriber: string;
  exercises: string[];
  meds: { name: string; timing: string }[];
}

const inputStyle: CSSProperties = {
  width: "100%", border: `1px solid ${C.hair}`, borderRadius: 12, background: C.field,
  padding: "12px 13px", fontSize: 14.5, color: C.charcoal, fontFamily: "inherit", outline: "none",
};

function FieldLabel({ children, optional }: { children: ReactNode; optional?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 7 }}>
      <span style={{ fontSize: 12.5, fontWeight: 650, color: C.charcoal }}>{children}</span>
      {optional && <span style={{ fontSize: 10.5, color: C.mutedSoft, fontWeight: 500 }}>optional</span>}
    </div>
  );
}

function Primary({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="gv-press" onClick={() => !disabled && onClick()} disabled={disabled} style={{
      width: "100%", padding: "15px", borderRadius: 15, border: "none", cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "#dbe3df" : "linear-gradient(180deg, #59978a, #437a6d)",
      color: disabled ? "#9aa49e" : "#fff", fontSize: 16, fontWeight: 700, letterSpacing: -0.2,
      boxShadow: disabled ? "none" : "0 6px 16px rgba(63,123,109,0.30)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    }}>{children}</button>
  );
}

function TopBar({ stepIdx, onBack, onSkip, canSkip }: { stepIdx: number; onBack?: () => void; onSkip: () => void; canSkip: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      {onBack ? (
        <button className="gv-press" onClick={onBack} aria-label="Back" style={{
          width: 34, height: 34, borderRadius: 999, border: `1px solid ${C.hair}`, background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
        }}>{Ico.chevL({ s: 17, c: C.charcoal })}</button>
      ) : (
        <span style={{ width: 34, flexShrink: 0 }} aria-hidden />
      )}
      <div style={{ flex: 1, display: "flex", gap: 5 }}>
        {Array.from({ length: CAPTURE_STEPS }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i < stepIdx ? C.sage : "#dbe3df", transition: "background .3s ease" }} />
        ))}
      </div>
      {canSkip ? (
        <button className="gv-press" onClick={onSkip} style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 13, fontWeight: 650, padding: "6px 2px" }}>Skip</button>
      ) : (
        <span style={{ flexShrink: 0, fontSize: 12, color: C.mutedSoft, fontWeight: 600, fontVariantNumeric: "tabular-nums", width: 30, textAlign: "right" }}>{stepIdx}/{CAPTURE_STEPS}</span>
      )}
    </div>
  );
}

function StepPet({ data, set }: { data: FormData; set: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  return (
    <div className="gv-step">
      <div style={{ fontFamily: "var(--serif)", fontSize: 25, fontWeight: 500, letterSpacing: -0.4 }}>Who are we caring for?</div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>Just the basics for now — you can fill in the rest any time.</div>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
          <button className="gv-press" onClick={() => set("photo", !data.photo)} style={{
            width: 64, height: 64, borderRadius: 999, flexShrink: 0, cursor: "pointer", overflow: "hidden",
            border: data.photo ? `1px solid ${C.hair}` : `1.5px dashed ${C.hair}`, background: data.photo ? "#fff" : C.field, padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {data.photo ? (
              <Image src="/demo/oscar.jpg" alt="pet" width={64} height={64} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: C.muted }}>{Ico.camera({ s: 19, c: C.muted })}<span style={{ fontSize: 9, fontWeight: 600 }}>Photo</span></span>
            )}
          </button>
          <div style={{ flex: 1 }}>
            <FieldLabel>Pet&rsquo;s name</FieldLabel>
            <input value={data.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Oscar" style={inputStyle} />
          </div>
        </div>

        <div>
          <FieldLabel>Species</FieldLabel>
          <div style={{ display: "flex", gap: 9 }}>
            {([{ k: "dog", label: "Dog", ic: Ico.dog }, { k: "cat", label: "Cat", ic: Ico.cat }] as const).map((s) => {
              const on = data.species === s.k;
              return (
                <button key={s.k} className="gv-press" onClick={() => set("species", s.k)} style={{
                  flex: 1, padding: "13px", borderRadius: 13, cursor: "pointer",
                  border: `1.5px solid ${on ? C.sage : C.hair}`, background: on ? "var(--sage-soft)" : "#fff",
                  color: on ? C.sage : C.muted, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontSize: 14.5, fontWeight: on ? 700 : 600,
                }}>{s.ic({ s: 20, c: on ? C.sage : C.muted })} {s.label}</button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1.4 }}>
            <FieldLabel optional>Breed</FieldLabel>
            <input value={data.breed} onChange={(e) => set("breed", e.target.value)} placeholder="Toy poodle" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel optional>Age</FieldLabel>
            <input value={data.age} onChange={(e) => set("age", e.target.value)} placeholder="12 yr" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 650 }}>This is a senior pet</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1, lineHeight: 1.4 }}>Tunes the reminders to a gentler pace.</div>
          </div>
          <button className="gv-press" onClick={() => set("senior", !data.senior)} aria-pressed={data.senior} aria-label="Senior toggle" style={{
            width: 48, height: 29, borderRadius: 999, border: "none", cursor: "pointer", flexShrink: 0,
            background: data.senior ? C.sage : "#d3dbd6", position: "relative", transition: "background .18s ease",
          }}>
            <span style={{ position: "absolute", top: 3, left: data.senior ? 22 : 3, width: 23, height: 23, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left .18s ease" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StepConditions({ data, set, toggleCond }: { data: FormData; set: <K extends keyof FormData>(k: K, v: FormData[K]) => void; toggleCond: (id: string) => void }) {
  const showTemplate = data.conditions.some((c) => CONDITIONS.find((x) => x.id === c)?.template);
  return (
    <div className="gv-step">
      <div style={{ fontFamily: "var(--serif)", fontSize: 25, fontWeight: 500, letterSpacing: -0.4 }}>What&rsquo;s going on?</div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>Tap anything your vet has already mentioned. This just helps us remember — it&rsquo;s not a diagnosis.</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 18 }}>
        {CONDITIONS.map((c) => {
          const on = data.conditions.includes(c.id);
          return (
            <button key={c.id} className="gv-press" onClick={() => toggleCond(c.id)} style={{
              padding: "10px 15px", borderRadius: 999, cursor: "pointer", fontSize: 13.5, fontWeight: on ? 700 : 600,
              border: `1.5px solid ${on ? ACC.cond.c : C.hair}`, background: on ? ACC.cond.soft : "#fff",
              color: on ? "#46617d" : C.muted, display: "flex", alignItems: "center", gap: 6,
            }}>{on && Ico.check({ s: 14, c: "#46617d", w: 2.6 })}{c.label}</button>
          );
        })}
      </div>

      {showTemplate && (
        <div className="gv-rise" style={{ marginTop: 20 }}>
          <Card style={{ borderColor: "rgba(63,143,134,0.3)", background: "linear-gradient(165deg, #ffffff, #f4f9f7)" }}>
            <SectionHead icon={Ico.activity({ s: 18, c: ACC.plan.c })} accent={ACC.plan} title="Recovery template" />
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: -4, marginBottom: 13, lineHeight: 1.45 }}>
              We&rsquo;ll store the right milestones for the road ahead. You can change this with your vet.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {TEMPLATES.map((t) => {
                const on = data.template === t.id;
                return (
                  <button key={t.id} className="gv-press" onClick={() => set("template", on ? null : t.id)} style={{
                    width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 13px", borderRadius: 13, border: `1.5px solid ${on ? ACC.plan.c : C.hair}`, background: on ? "var(--teal-soft)" : "#fff",
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: 999, flexShrink: 0, border: `1.8px solid ${on ? ACC.plan.c : C.hair}`, background: on ? ACC.plan.c : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && Ico.check({ s: 12, c: "#fff", w: 3 })}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 650, color: C.charcoal }}>{t.label}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{t.detail}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 13 }}>
              <FieldLabel optional>Surgery or onset date</FieldLabel>
              <input value={data.onsetDate} onChange={(e) => set("onsetDate", e.target.value)} placeholder="e.g. 2 May 2026" style={inputStyle} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function StepPlan({ data, set, toggleEx }: { data: FormData; set: <K extends keyof FormData>(k: K, v: FormData[K]) => void; toggleEx: (id: string) => void }) {
  return (
    <div className="gv-step">
      <div style={{ fontFamily: "var(--serif)", fontSize: 25, fontWeight: 500, letterSpacing: -0.4 }}>Your vet</div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>Their clinic, and any rehab plan they&rsquo;ve given — we&rsquo;ll store both, so you can reach them fast and follow along.</div>

      <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
        <div style={{ flex: 1.4 }}>
          <FieldLabel optional>Vet clinic</FieldLabel>
          <input value={data.vetClinic} onChange={(e) => set("vetClinic", e.target.value)} placeholder="Riverside Veterinary" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <FieldLabel optional>Clinic phone</FieldLabel>
          <input value={data.vetPhone} onChange={(e) => set("vetPhone", e.target.value)} placeholder="+61 2 9555 0142" inputMode="tel" autoComplete="tel" style={inputStyle} />
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: C.mutedSoft, marginTop: 7, lineHeight: 1.4 }}>
        So &ldquo;contact your vet now&rdquo; reaches the right place in one tap.
      </div>

      <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
        {([{ k: "yes", label: "Yes, I have one" }, { k: "no", label: "Not yet" }] as const).map((o) => {
          const on = data.hasPlan === o.k;
          return (
            <button key={o.k} className="gv-press" onClick={() => set("hasPlan", o.k)} style={{
              flex: 1, padding: "13px", borderRadius: 13, cursor: "pointer",
              border: `1.5px solid ${on ? C.sage : C.hair}`, background: on ? "var(--sage-soft)" : "#fff",
              color: on ? C.sage : C.muted, fontSize: 14, fontWeight: on ? 700 : 600,
            }}>{o.label}</button>
          );
        })}
      </div>

      {data.hasPlan === "yes" && (
        <div className="gv-rise" style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <FieldLabel optional>Who prescribed it?</FieldLabel>
            <input value={data.prescriber} onChange={(e) => set("prescriber", e.target.value)} placeholder="e.g. Dr. Okafor" style={inputStyle} />
          </div>
          <div>
            <FieldLabel optional>Prescribed exercises</FieldLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PLAN_EXERCISES.map((e) => {
                const on = data.exercises.includes(e.id);
                return (
                  <button key={e.id} className="gv-press" onClick={() => toggleEx(e.id)} style={{
                    width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 13px", borderRadius: 12, border: `1px solid ${on ? "#3f8f8666" : C.hair}`, background: on ? "var(--teal-soft)" : C.field,
                  }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, border: `1.8px solid ${on ? ACC.plan.c : C.hair}`, background: on ? ACC.plan.c : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && Ico.check({ s: 13, c: "#fff", w: 3 })}</div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: on ? C.charcoal : "#5a625b" }}>{e.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 12, padding: "11px 13px" }}>
            <span style={{ color: C.sage, flexShrink: 0, marginTop: 1 }}>{Ico.shield({ s: 15, c: C.sage })}</span>
            <div style={{ fontSize: 11.5, color: "#4a544f", lineHeight: 1.45 }}>We store your vet&rsquo;s plan exactly as given. We never change a dose or recommend exercises.</div>
          </div>
        </div>
      )}

      {data.hasPlan === "no" && (
        <div className="gv-rise" style={{ marginTop: 16, background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 14, padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: 13.5, color: "#4a544f", lineHeight: 1.5 }}>No problem — you can add your vet&rsquo;s plan any time from your pet&rsquo;s profile.</div>
        </div>
      )}
    </div>
  );
}

function StepMeds({ data, addMed, removeMed }: { data: FormData; addMed: (m: { name: string; timing: string }) => void; removeMed: (i: number) => void }) {
  const [name, setName] = useState("");
  const [timing, setTiming] = useState("Morning");
  const add = () => { const t = name.trim(); if (!t) return; addMed({ name: t, timing }); setName(""); setTiming("Morning"); };
  return (
    <div className="gv-step">
      <div style={{ fontFamily: "var(--serif)", fontSize: 25, fontWeight: 500, letterSpacing: -0.4 }}>Any medications?</div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>Add what they take so daily check-ins can include them. Skip if there&rsquo;s nothing yet.</div>

      {data.meds.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
          {data.meds.map((m, i) => (
            <div key={i} className="gv-rise" style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `1px solid ${C.hair}`, borderRadius: 13, padding: "12px 14px" }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: ACC.meds.soft, color: ACC.meds.c, display: "flex", alignItems: "center", justifyContent: "center" }}>{Ico.pill({ s: 17, c: ACC.meds.c })}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 650 }}>{m.name}</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{m.timing}</div>
              </div>
              <button className="gv-press" onClick={() => removeMed(i)} aria-label="Remove" style={{ width: 28, height: 28, borderRadius: 999, border: `1px solid ${C.hair}`, background: "#fff", color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: "rotate(45deg)" }}>{Ico.plus({ s: 15, c: C.muted })}</button>
            </div>
          ))}
        </div>
      )}

      <Card style={{ marginTop: 16 }}>
        <FieldLabel>Add a medication</FieldLabel>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="e.g. Carprofen 75 mg" style={inputStyle} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 11 }}>
          {TIMINGS.map((t) => {
            const on = timing === t;
            return (
              <button key={t} className="gv-press" onClick={() => setTiming(t)} style={{
                padding: "7px 13px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: on ? 700 : 600,
                border: `1px solid ${on ? ACC.meds.c : C.hair}`, background: on ? ACC.meds.soft : C.field, color: on ? "#5e5077" : C.muted,
              }}>{t}</button>
            );
          })}
        </div>
        <button className="gv-press" onClick={add} disabled={!name.trim()} style={{
          width: "100%", marginTop: 13, padding: "11px", borderRadius: 12, cursor: name.trim() ? "pointer" : "not-allowed",
          border: `1px solid ${name.trim() ? ACC.meds.c : C.hair}`, background: name.trim() ? "var(--plum-soft)" : C.field,
          color: name.trim() ? "#5e5077" : C.mutedSoft, fontSize: 13.5, fontWeight: 650,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>{Ico.plus({ s: 16, c: name.trim() ? "#5e5077" : C.mutedSoft })} Add medication</button>
      </Card>
    </div>
  );
}

function AllSet({ data, onStart, saving }: { data: FormData; onStart: () => void; saving: boolean }) {
  const name = data.name.trim() || "your pet";
  const conditionCount = data.conditions.filter((c) => c !== "none").length;
  const chips = [
    data.species && { ic: data.species === "cat" ? Ico.cat : Ico.dog, t: data.species === "cat" ? "Cat" : "Dog" },
    data.senior && { ic: Ico.heart, t: "Senior" },
    conditionCount > 0 && { ic: Ico.sparkles, t: `${conditionCount} condition${conditionCount > 1 ? "s" : ""}` },
    data.template && { ic: Ico.activity, t: TEMPLATES.find((t) => t.id === data.template)?.label ?? "Template" },
    data.exercises.length > 0 && { ic: Ico.activity, t: `${data.exercises.length} exercise${data.exercises.length > 1 ? "s" : ""}` },
    data.meds.length > 0 && { ic: Ico.pill, t: `${data.meds.length} med${data.meds.length > 1 ? "s" : ""}` },
  ].filter(Boolean) as { ic: (p?: { s?: number; c?: string }) => ReactNode; t: string }[];

  return (
    <div className="gv-step" style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", padding: "12px 0" }}>
        <div style={{ width: 84, height: 84, borderRadius: 999, margin: "0 auto 20px", background: "var(--sage-soft)", display: "flex", alignItems: "center", justifyContent: "center", animation: "gv-pop .5s var(--gv-ease) both", overflow: "hidden", border: `2px solid ${C.sage}33` }}>
          {data.photo ? <Image src="/demo/oscar.jpg" alt={name} width={84} height={84} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : Ico.check({ s: 40, c: C.sage, w: 2.4 })}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 27, fontWeight: 500, letterSpacing: -0.5, lineHeight: 1.1 }}>You&rsquo;re all set</div>
        <div style={{ fontSize: 14, color: "#4a544f", marginTop: 10, lineHeight: 1.5, maxWidth: 290, marginLeft: "auto", marginRight: "auto" }}>
          {name}&rsquo;s companion is ready. Let&rsquo;s do the first check-in together — it only takes a minute.
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 22 }}>
          {chips.map((chip, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid ${C.hair}`, borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 650, color: "#46504a", whiteSpace: "nowrap" }}>
              {chip.ic({ s: 14, c: C.sage })} <span>{chip.t}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "8px 4px 4px" }}>
        <Primary onClick={onStart} disabled={saving}>
          {saving ? "Setting up…" : <><span>Start {name}&rsquo;s first check-in</span> {Ico.chevR({ s: 17, c: "#fff" })}</>}
        </Primary>
        <div style={{ textAlign: "center", fontSize: 12, color: C.muted, padding: "14px 0 2px", lineHeight: 1.5 }}>
          Noticed something worrying?{" "}
          <a href="https://www.google.com/maps/search/?api=1&query=emergency+vet+near+me" target="_blank" rel="noopener noreferrer" style={{ color: C.danger, fontWeight: 650, textDecoration: "underline", textUnderlineOffset: 2 }}>Contact your vet now</a>
        </div>
      </div>
    </div>
  );
}

export function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 pet · 2 conditions · 3 plan · 4 meds · 5 allset (the value prop lives on the landing, so we open straight on setup)
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FormData>({
    name: "", species: null, breed: "", age: "", photo: false, senior: false,
    conditions: [], template: null, onsetDate: "",
    vetClinic: "", vetPhone: "",
    hasPlan: null, prescriber: "", exercises: [], meds: [],
  });

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setData((s) => ({ ...s, [k]: v }));
  const toggleCond = (id: string) => setData((s) => {
    const cfg = CONDITIONS.find((c) => c.id === id)!;
    let next: string[];
    if (cfg.exclusive) next = s.conditions.includes(id) ? [] : [id];
    else next = s.conditions.includes(id) ? s.conditions.filter((c) => c !== id) : [...s.conditions.filter((c) => c !== "none"), id];
    const stillTemplate = next.some((c) => CONDITIONS.find((x) => x.id === c)?.template);
    return { ...s, conditions: next, template: stillTemplate ? s.template : null, onsetDate: stillTemplate ? s.onsetDate : "" };
  });
  const toggleEx = (id: string) => setData((s) => ({ ...s, exercises: s.exercises.includes(id) ? s.exercises.filter((e) => e !== id) : [...s.exercises, id] }));
  const addMed = (m: { name: string; timing: string }) => setData((s) => ({ ...s, meds: [...s.meds, m] }));
  const removeMed = (i: number) => setData((s) => ({ ...s, meds: s.meds.filter((_, j) => j !== i) }));

  const petReady = Boolean(data.name.trim() && data.species);
  const go = (n: number) => setStep(n);

  async function handleStart() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const { petId } = await saveOnboarding({
        name: data.name,
        species: data.species as "dog" | "cat",
        breed: data.breed,
        age: data.age,
        senior: data.senior,
        conditions: data.conditions,
        template: data.template,
        onsetDate: data.onsetDate,
        vetClinic: data.vetClinic,
        vetPhone: data.vetPhone,
        hasPlan: data.hasPlan,
        prescriber: data.prescriber,
        exercises: data.exercises,
        meds: data.meds,
      });
      router.push(`/pets/${petId}/checkin`);
    } catch {
      setError("Couldn't finish setup — please try again.");
      setSaving(false);
    }
  }

  const fullBleed = step === 5;
  let body: ReactNode;
  let footer: ReactNode = null;
  let top: ReactNode = null;

  if (step === 5) {
    body = <AllSet data={data} onStart={handleStart} saving={saving} />;
  } else {
    top = <TopBar stepIdx={step} onBack={step > 1 ? () => go(step - 1) : undefined} onSkip={() => go(step + 1)} canSkip={step >= 2} />;
    if (step === 1) body = <StepPet data={data} set={set} />;
    else if (step === 2) body = <StepConditions data={data} set={set} toggleCond={toggleCond} />;
    else if (step === 3) body = <StepPlan data={data} set={set} toggleEx={toggleEx} />;
    else body = <StepMeds data={data} addMed={addMed} removeMed={removeMed} />;
    footer = (
      <div style={{ padding: "12px 4px 4px" }}>
        {step === 1 ? (
          <Primary onClick={() => go(2)} disabled={!petReady}>{petReady ? "Continue" : "Add a name & species"} {petReady && Ico.chevR({ s: 17, c: "#fff" })}</Primary>
        ) : (
          <Primary onClick={() => go(step + 1)}>Continue {Ico.chevR({ s: 17, c: "#fff" })}</Primary>
        )}
      </div>
    );
  }

  return (
    <main className="gv-scroll gv-screen-fill" style={{ width: "100%", maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: "column", padding: fullBleed ? "28px 16px 22px" : "28px 16px 18px" }}>
      {top}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{body}</div>
      {error && <div role="alert" style={{ textAlign: "center", fontSize: 12.5, color: C.danger, paddingTop: 10 }}>{error}</div>}
      {footer}
    </main>
  );
}
