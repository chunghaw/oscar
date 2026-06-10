// Goldvale — Onboarding (mobile). Calm, skippable multi-step setup.
// CAPTURES what the owner/vet already know — it never assesses, grades, or diagnoses.
// Field map (see notes.md): owners.display_name · pets(name, species, breed, date_of_birth,
// is_senior, chronic_conditions[]) · protocol_instances(template_id, onset_date) ·
// exercise_plans.prescriber_name + plan_items.exercise_id · medication_events.med_name.

const { useState } = React;

// ── tokens ──────────────────────────────────────────────────────────────────
const C = {
  cream: '#eef1ef', charcoal: '#20262a', gold: '#d6981e', sage: '#4f8a7d',
  danger: '#c0492b', muted: '#687069', mutedSoft: '#8a938e', card: '#ffffff',
  hair: '#dde3df', hairSoft: '#e8ece9', field: '#f2f5f3',
};
const A = {
  pet:  { c: '#4f8a7d', soft: 'var(--sage-soft)' },
  cond: { c: '#5b7a99', soft: 'var(--slate-soft)' },
  plan: { c: '#3f8f86', soft: 'var(--teal-soft)' },
  meds: { c: '#7d6b96', soft: 'var(--plum-soft)' },
};

// ── icons ───────────────────────────────────────────────────────────────────
const Ico = {
  paw: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="7.5" cy="15" r="2"/><path d="M14.5 15c2.5 0 4 2 4 4a3 3 0 0 1-3 3c-1.2 0-2-.5-3.5-.5s-2.3.5-3.5.5a3 3 0 0 1-3-3c0-2 1.5-4 4-4 .8 0 1.5.3 2.5.3s1.7-.3 2.5-.3Z"/></svg>),
  heart: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>),
  activity: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>),
  pill: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5-7-7a4.95 4.95 0 1 1 7-7l7 7a4.95 4.95 0 1 1-7 7Z"/><path d="m8.5 8.5 7 7"/></svg>),
  chevL: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>),
  chevR: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>),
  check: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth={p.w||2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>),
  plus: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>),
  camera: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/></svg>),
  dog: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5"/><path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5"/><path d="M8 14v.5M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/><path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306"/></svg>),
  cat: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/><path d="M8 14v.5M16 14v.5M11.25 16.25h1.5L12 17l-.75-.75Z"/></svg>),
  shield: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/></svg>),
  sparkles: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M5 12H3M21 12h-2M6.3 6.3 7.7 7.7M16.3 16.3l1.4 1.4M6.3 17.7 7.7 16.3M16.3 7.7l1.4-1.4"/></svg>),
};

// ── shared shells ────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: C.card, borderRadius: 'var(--radius)', border: `1px solid ${C.hair}`,
      boxShadow: '0 1px 2px rgba(32,38,42,0.04), 0 10px 26px rgba(32,38,42,0.05)',
      padding: 16, ...style,
    }}>{children}</div>
  );
}
function SectionHead({ icon, accent, title, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 13 }}>
      <div style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: accent.soft, color: accent.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500, letterSpacing: -0.2 }}>{title}</div>
      {hint && <div style={{ fontSize: 11.5, color: C.muted, flexShrink: 0, whiteSpace: 'nowrap' }}>{hint}</div>}
    </div>
  );
}
function FieldLabel({ children, optional }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 7 }}>
      <span style={{ fontSize: 12.5, fontWeight: 650, color: C.charcoal }}>{children}</span>
      {optional && <span style={{ fontSize: 10.5, color: C.mutedSoft, fontWeight: 500 }}>optional</span>}
    </div>
  );
}
const inputStyle = {
  width: '100%', border: `1px solid ${C.hair}`, borderRadius: 12, background: C.field,
  padding: '12px 13px', fontSize: 14.5, color: C.charcoal,
  transition: 'border-color .15s ease, background .15s ease',
};

// ── progress chrome (steps 2–6) ──────────────────────────────────────────────
const CAPTURE_STEPS = 5; // steps 2..6 (pet, conditions, plan, meds, all-set)
function TopBar({ stepIdx, onBack, onSkip, canSkip }) {
  // stepIdx: 1..5 within capture flow
  return (
    <div style={{ padding: '8px 4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <button className="gv-press" onClick={onBack} aria-label="Back" style={{
          width: 34, height: 34, borderRadius: 999, border: `1px solid ${C.hair}`, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
        }}>{Ico.chevL({ s: 17, c: C.charcoal })}</button>
        <div style={{ flex: 1, display: 'flex', gap: 5 }}>
          {Array.from({ length: CAPTURE_STEPS }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i < stepIdx ? C.sage : '#dbe3df', transition: 'background .3s ease' }} />
          ))}
        </div>
        {canSkip
          ? <button className="gv-press" onClick={onSkip} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 13, fontWeight: 650, padding: '6px 2px' }}>Skip</button>
          : <span style={{ flexShrink: 0, fontSize: 12, color: C.mutedSoft, fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: 30, textAlign: 'right' }}>{stepIdx}/{CAPTURE_STEPS}</span>}
      </div>
    </div>
  );
}

// ── primary / ghost buttons ───────────────────────────────────────────────────
function Primary({ children, onClick, disabled }) {
  return (
    <button className="gv-press" onClick={() => !disabled && onClick()} disabled={disabled} style={{
      width: '100%', padding: '15px', borderRadius: 15, border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: disabled ? '#dbe3df' : 'linear-gradient(180deg, #59978a, #437a6d)',
      color: disabled ? '#9aa49e' : '#fff', fontSize: 16, fontWeight: 700, letterSpacing: -0.2,
      boxShadow: disabled ? 'none' : '0 6px 16px rgba(63,123,109,0.30)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    }}>{children}</button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 1 — Welcome
// ════════════════════════════════════════════════════════════════════════════
function Welcome({ onNext }) {
  return (
    <div className="gv-step" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '8px 2px 4px' }}>
      {/* hero */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 22,
        background: 'linear-gradient(150deg, #4f8a7d 0%, #46796f 42%, #50708a 100%)',
        boxShadow: '0 14px 30px rgba(58,107,96,0.26)', padding: '28px 22px 26px', textAlign: 'center',
      }}>
        <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'absolute', top: -64, right: -60, opacity: 0.16 }}>
          <circle cx="110" cy="110" r="92" fill="none" stroke="#fff" strokeWidth="1.5" />
          <circle cx="110" cy="110" r="66" fill="none" stroke="#fff" strokeWidth="1.5" />
          <circle cx="110" cy="110" r="40" fill="none" stroke="#fff" strokeWidth="1.5" />
        </svg>
        <svg width="150" height="74" viewBox="0 0 150 74" style={{ position: 'absolute', bottom: -10, left: -14, opacity: 0.14 }}>
          <path d="M2 62 Q38 8 76 38 T148 22" fill="none" stroke="#fff" strokeWidth="1.5" />
        </svg>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, margin: '0 auto 16px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Ico.paw({ s: 30, c: '#fff' })}
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.8)', fontWeight: 650, letterSpacing: 1.4, textTransform: 'uppercase' }}>Goldvale</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1.1, color: '#fff', marginTop: 8 }}>
            A calmer way to care
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, marginTop: 12, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
            For the senior and chronically-ill pets who need a little extra looking-after.
          </div>
        </div>
      </div>

      {/* promise list */}
      <div style={{ padding: '22px 6px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { ic: Ico.heart, a: A.pet, t: 'Track', d: 'A gentle daily note of how they’re doing.' },
          { ic: Ico.sparkles, a: A.cond, t: 'Remember', d: 'Goldvale spots the patterns you’d miss day to day.' },
          { ic: Ico.activity, a: A.plan, t: 'Prepare', d: 'Walk into every vet visit with the full picture.' },
        ].map((r) => (
          <div key={r.t} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: r.a.soft, color: r.a.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.ic({ s: 19, c: r.a.c })}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 600, letterSpacing: -0.2 }}>{r.t}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.45, marginTop: 1 }}>{r.d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* non-clinical promise */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 14, padding: '13px 14px', margin: '12px 4px 0' }}>
        <span style={{ color: C.sage, flexShrink: 0, marginTop: 1 }}>{Ico.shield({ s: 17, c: C.sage })}</span>
        <div style={{ fontSize: 12.5, color: '#42504b', lineHeight: 1.5 }}>
          Goldvale helps you <strong style={{ color: C.charcoal, fontWeight: 700 }}>track, remember, and prepare</strong> — it doesn’t diagnose. Your vet decides.
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 18 }} />
      <div style={{ padding: '8px 4px 4px' }}>
        <Primary onClick={onNext}>Get started {Ico.chevR({ s: 17, c: '#fff' })}</Primary>
        <div style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 13 }}>Takes about two minutes · everything’s optional but the basics.</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 2 — Your pet (name + species required)
// ════════════════════════════════════════════════════════════════════════════
function StepPet({ data, set }) {
  return (
    <div className="gv-step">
      <div style={{ padding: '2px 2px 4px' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 25, fontWeight: 500, letterSpacing: -0.4 }}>Who are we caring for?</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>Just the basics for now — you can fill in the rest any time.</div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* photo + name */}
        <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
          <button className="gv-press" onClick={() => set('photo', !data.photo)} style={{
            width: 64, height: 64, borderRadius: 999, flexShrink: 0, cursor: 'pointer', overflow: 'hidden',
            border: data.photo ? `1px solid ${C.hair}` : `1.5px dashed ${C.hair}`,
            background: data.photo ? '#fff' : C.field, padding: 0, position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {data.photo
              ? <img src="assets/oscar.jpg" alt="pet" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: C.muted }}>{Ico.camera({ s: 19, c: C.muted })}<span style={{ fontSize: 9, fontWeight: 600 }}>Photo</span></span>}
          </button>
          <div style={{ flex: 1 }}>
            <FieldLabel>Pet’s name</FieldLabel>
            <input className="gv-input" value={data.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Oscar" style={inputStyle} />
          </div>
        </div>

        {/* species toggle */}
        <div>
          <FieldLabel>Species</FieldLabel>
          <div style={{ display: 'flex', gap: 9 }}>
            {[{ k: 'dog', label: 'Dog', ic: Ico.dog }, { k: 'cat', label: 'Cat', ic: Ico.cat }].map((s) => {
              const on = data.species === s.k;
              return (
                <button key={s.k} className="gv-press" onClick={() => set('species', s.k)} style={{
                  flex: 1, padding: '13px', borderRadius: 13, cursor: 'pointer',
                  border: `1.5px solid ${on ? C.sage : C.hair}`, background: on ? 'var(--sage-soft)' : '#fff',
                  color: on ? C.sage : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 14.5, fontWeight: on ? 700 : 600,
                }}>{s.ic({ s: 20, c: on ? C.sage : C.muted })} {s.label}</button>
              );
            })}
          </div>
        </div>

        {/* breed + age */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1.4 }}>
            <FieldLabel optional>Breed</FieldLabel>
            <input className="gv-input" value={data.breed} onChange={(e) => set('breed', e.target.value)} placeholder="Toy poodle" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel optional>Age</FieldLabel>
            <input className="gv-input" value={data.age} onChange={(e) => set('age', e.target.value)} placeholder="12 yr" style={inputStyle} />
          </div>
        </div>

        {/* senior toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 650 }}>This is a senior pet</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1, lineHeight: 1.4 }}>Tunes Goldvale’s reminders to a gentler pace.</div>
          </div>
          <button className="gv-press" onClick={() => set('senior', !data.senior)} aria-label="Senior toggle" style={{
            width: 48, height: 29, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
            background: data.senior ? C.sage : '#d3dbd6', position: 'relative', transition: 'background .18s ease',
          }}>
            <span style={{ position: 'absolute', top: 3, left: data.senior ? 22 : 3, width: 23, height: 23, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left .18s ease' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 3 — Conditions (optional) + recovery template reveal
// ════════════════════════════════════════════════════════════════════════════
const CONDITIONS = [
  { id: 'osteoarthritis', label: 'Osteoarthritis' },
  { id: 'ivdd', label: 'IVDD', template: true },
  { id: 'post_op', label: 'Post-op (TPLO / cruciate)', template: true },
  { id: 'other', label: 'Other' },
  { id: 'none', label: 'Nothing specific', exclusive: true },
];
const TEMPLATES = [
  { id: 'tplo_postop', label: 'TPLO post-op', detail: 'Knee surgery recovery' },
  { id: 'ivdd_conservative', label: 'IVDD conservative', detail: 'Crate rest & rebuild' },
];
function StepConditions({ data, set, toggleCond }) {
  const showTemplate = data.conditions.some((c) => CONDITIONS.find((x) => x.id === c)?.template);
  return (
    <div className="gv-step">
      <div style={{ padding: '2px 2px 4px' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 25, fontWeight: 500, letterSpacing: -0.4 }}>What’s going on?</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>Tap anything your vet has already mentioned. This just helps Goldvale remember — it’s not a diagnosis.</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 18 }}>
        {CONDITIONS.map((c) => {
          const on = data.conditions.includes(c.id);
          return (
            <button key={c.id} className="gv-press" onClick={() => toggleCond(c.id)} style={{
              padding: '10px 15px', borderRadius: 999, cursor: 'pointer', fontSize: 13.5, fontWeight: on ? 700 : 600,
              border: `1.5px solid ${on ? A.cond.c : C.hair}`, background: on ? A.cond.soft : '#fff',
              color: on ? '#46617d' : C.muted, display: 'flex', alignItems: 'center', gap: 6,
            }}>{on && Ico.check({ s: 14, c: '#46617d', w: 2.6 })}{c.label}</button>
          );
        })}
      </div>

      {showTemplate && (
        <div className="gv-rise" style={{ marginTop: 20 }}>
          <Card style={{ borderColor: 'rgba(63,143,134,0.3)', background: 'linear-gradient(165deg, #ffffff, #f4f9f7)' }}>
            <SectionHead icon={Ico.activity({ s: 18, c: A.plan.c })} accent={A.plan} title="Recovery template" />
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: -4, marginBottom: 13, lineHeight: 1.45 }}>
              We’ll store the right milestones for the road ahead. You can change this with your vet.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {TEMPLATES.map((t) => {
                const on = data.template === t.id;
                return (
                  <button key={t.id} className="gv-press" onClick={() => set('template', on ? null : t.id)} style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 13px', borderRadius: 13, border: `1.5px solid ${on ? A.plan.c : C.hair}`, background: on ? 'var(--teal-soft)' : '#fff',
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: 999, flexShrink: 0, border: `1.8px solid ${on ? A.plan.c : C.hair}`, background: on ? A.plan.c : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && Ico.check({ s: 12, c: '#fff', w: 3 })}</div>
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
              <input className="gv-input" value={data.onsetDate} onChange={(e) => set('onsetDate', e.target.value)} placeholder="e.g. 2 May 2026" style={inputStyle} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 4 — Vet's plan (optional, gated)
// ════════════════════════════════════════════════════════════════════════════
const PLAN_EXERCISES = [
  { id: 'sit_to_stand', name: 'Sit-to-stand' },
  { id: 'weight_shift', name: 'Weight shifts' },
  { id: 'cookie_stretch', name: 'Cookie stretch' },
  { id: 'cavaletti', name: 'Cavaletti poles' },
  { id: 'leash_walk', name: 'Controlled leash walk' },
];
function StepPlan({ data, set, toggleEx }) {
  return (
    <div className="gv-step">
      <div style={{ padding: '2px 2px 4px' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 25, fontWeight: 500, letterSpacing: -0.4 }}>Your vet’s plan</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>Has your vet given Oscar a rehab or exercise plan? We’ll store it so you can follow along.</div>
      </div>

      {/* gate */}
      <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
        {[{ k: 'yes', label: 'Yes, I have one' }, { k: 'no', label: 'Not yet' }].map((o) => {
          const on = data.hasPlan === o.k;
          return (
            <button key={o.k} className="gv-press" onClick={() => set('hasPlan', o.k)} style={{
              flex: 1, padding: '13px', borderRadius: 13, cursor: 'pointer',
              border: `1.5px solid ${on ? C.sage : C.hair}`, background: on ? 'var(--sage-soft)' : '#fff',
              color: on ? C.sage : C.muted, fontSize: 14, fontWeight: on ? 700 : 600,
            }}>{o.label}</button>
          );
        })}
      </div>

      {data.hasPlan === 'yes' && (
        <div className="gv-rise" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <FieldLabel optional>Who prescribed it?</FieldLabel>
            <input className="gv-input" value={data.prescriber} onChange={(e) => set('prescriber', e.target.value)} placeholder="e.g. Dr. Okafor" style={inputStyle} />
          </div>
          <div>
            <FieldLabel optional>Prescribed exercises</FieldLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PLAN_EXERCISES.map((e) => {
                const on = data.exercises.includes(e.id);
                return (
                  <button key={e.id} className="gv-press" onClick={() => toggleEx(e.id)} style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 13px', borderRadius: 12, border: `1px solid ${on ? A.plan.c + '66' : C.hair}`, background: on ? 'var(--teal-soft)' : C.field,
                  }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, border: `1.8px solid ${on ? A.plan.c : C.hair}`, background: on ? A.plan.c : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && Ico.check({ s: 13, c: '#fff', w: 3 })}</div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: on ? C.charcoal : '#5a625b' }}>{e.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 12, padding: '11px 13px' }}>
            <span style={{ color: C.sage, flexShrink: 0, marginTop: 1 }}>{Ico.shield({ s: 15, c: C.sage })}</span>
            <div style={{ fontSize: 11.5, color: '#4a544f', lineHeight: 1.45 }}>We store your vet’s plan exactly as given. Goldvale never changes a dose or recommends exercises.</div>
          </div>
        </div>
      )}

      {data.hasPlan === 'no' && (
        <div className="gv-rise" style={{ marginTop: 16, background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 14, padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, color: '#4a544f', lineHeight: 1.5 }}>No problem — you can add your vet’s plan any time from Oscar’s profile.</div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 5 — Medications (optional)
// ════════════════════════════════════════════════════════════════════════════
const TIMINGS = ['Morning', 'Evening', 'With food', 'As needed'];
function StepMeds({ data, set, addMed, removeMed }) {
  const [name, setName] = useState('');
  const [timing, setTiming] = useState('Morning');
  const add = () => { const t = name.trim(); if (!t) return; addMed({ name: t, timing }); setName(''); setTiming('Morning'); };
  return (
    <div className="gv-step">
      <div style={{ padding: '2px 2px 4px' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 25, fontWeight: 500, letterSpacing: -0.4 }}>Any medications?</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>Add what Oscar takes so daily check-ins can include them. Skip if there’s nothing yet.</div>
      </div>

      {/* added meds */}
      {data.meds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          {data.meds.map((m, i) => (
            <div key={i} className="gv-rise" style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1px solid ${C.hair}`, borderRadius: 13, padding: '12px 14px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: A.meds.soft, color: A.meds.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ico.pill({ s: 17, c: A.meds.c })}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 650 }}>{m.name}</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{m.timing}</div>
              </div>
              <button className="gv-press" onClick={() => removeMed(i)} aria-label="Remove" style={{ width: 28, height: 28, borderRadius: 999, border: `1px solid ${C.hair}`, background: '#fff', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transform: 'rotate(45deg)' }}>{Ico.plus({ s: 15, c: C.muted })}</button>
            </div>
          ))}
        </div>
      )}

      {/* add form */}
      <Card style={{ marginTop: 16 }}>
        <FieldLabel>Add a medication</FieldLabel>
        <input className="gv-input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="e.g. Carprofen 75 mg" style={inputStyle} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 11 }}>
          {TIMINGS.map((t) => {
            const on = timing === t;
            return (
              <button key={t} className="gv-press" onClick={() => setTiming(t)} style={{
                padding: '7px 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: on ? 700 : 600,
                border: `1px solid ${on ? A.meds.c : C.hair}`, background: on ? A.meds.soft : C.field, color: on ? '#5e5077' : C.muted,
              }}>{t}</button>
            );
          })}
        </div>
        <button className="gv-press" onClick={add} disabled={!name.trim()} style={{
          width: '100%', marginTop: 13, padding: '11px', borderRadius: 12, cursor: name.trim() ? 'pointer' : 'not-allowed',
          border: `1px solid ${name.trim() ? A.meds.c : C.hair}`, background: name.trim() ? 'var(--plum-soft)' : C.field,
          color: name.trim() ? '#5e5077' : C.mutedSoft, fontSize: 13.5, fontWeight: 650,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>{Ico.plus({ s: 16, c: name.trim() ? '#5e5077' : C.mutedSoft })} Add medication</button>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 6 — All set
// ════════════════════════════════════════════════════════════════════════════
function AllSet({ data, onStart }) {
  const name = data.name.trim() || 'your pet';
  return (
    <div className="gv-step" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '8px 2px 4px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '12px 0' }}>
        <div style={{ width: 84, height: 84, borderRadius: 999, margin: '0 auto 20px', background: 'var(--sage-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'gv-pop .5s cubic-bezier(.2,.7,.3,1) both', overflow: 'hidden', border: `2px solid ${C.sage}33` }}>
          {data.photo ? <img src="assets/oscar.jpg" alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : Ico.check({ s: 40, c: C.sage, w: 2.4 })}
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 27, fontWeight: 500, letterSpacing: -0.5, lineHeight: 1.1 }}>You’re all set</div>
        <div style={{ fontSize: 14, color: '#4a544f', marginTop: 10, lineHeight: 1.5, maxWidth: 290, marginLeft: 'auto', marginRight: 'auto' }}>
          {name}’s companion is ready. Let’s do the first check-in together — it only takes a minute.
        </div>

        {/* summary chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 22 }}>
          {[
            data.species && { ic: data.species === 'cat' ? Ico.cat : Ico.dog, t: data.species === 'cat' ? 'Cat' : 'Dog' },
            data.senior && { ic: Ico.heart, t: 'Senior' },
            data.conditions.filter((c) => c !== 'none').length > 0 && { ic: Ico.sparkles, t: `${data.conditions.filter((c) => c !== 'none').length} condition${data.conditions.filter((c) => c !== 'none').length > 1 ? 's' : ''}` },
            data.template && { ic: Ico.activity, t: TEMPLATES.find((t) => t.id === data.template)?.label },
            data.exercises.length > 0 && { ic: Ico.activity, t: `${data.exercises.length} exercise${data.exercises.length > 1 ? 's' : ''}` },
            data.meds.length > 0 && { ic: Ico.pill, t: `${data.meds.length} med${data.meds.length > 1 ? 's' : ''}` },
          ].filter(Boolean).map((chip, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: `1px solid ${C.hair}`, borderRadius: 999, padding: '7px 13px', fontSize: 12.5, fontWeight: 650, color: '#46504a', whiteSpace: 'nowrap' }}>
              {chip.ic({ s: 14, c: C.sage })} <span>{chip.t}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 4px 4px' }}>
        <Primary onClick={onStart}><span>Start {name}’s first check-in</span> {Ico.chevR({ s: 17, c: '#fff' })}</Primary>
        <div style={{ textAlign: 'center', fontSize: 12, color: C.muted, padding: '14px 0 2px', lineHeight: 1.5 }}>
          Noticed something worrying?{' '}
          <span style={{ color: C.danger, fontWeight: 650, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}>Contact your vet now</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// APP
// ════════════════════════════════════════════════════════════════════════════
function OnboardingApp() {
  const [step, setStep] = useState(0); // 0 welcome · 1 pet · 2 conditions · 3 plan · 4 meds · 5 allset
  const [data, setData] = useState({
    name: '', species: null, breed: '', age: '', photo: false, senior: false,
    conditions: [], template: null, onsetDate: '',
    hasPlan: null, prescriber: '', exercises: [],
    meds: [],
  });
  const set = (k, v) => setData((s) => ({ ...s, [k]: v }));
  const toggleCond = (id) => setData((s) => {
    const cfg = CONDITIONS.find((c) => c.id === id);
    let next;
    if (cfg.exclusive) next = s.conditions.includes(id) ? [] : [id];
    else {
      next = s.conditions.includes(id) ? s.conditions.filter((c) => c !== id) : [...s.conditions.filter((c) => c !== 'none'), id];
    }
    const stillTemplate = next.some((c) => CONDITIONS.find((x) => x.id === c)?.template);
    return { ...s, conditions: next, template: stillTemplate ? s.template : null, onsetDate: stillTemplate ? s.onsetDate : '' };
  });
  const toggleEx = (id) => setData((s) => ({ ...s, exercises: s.exercises.includes(id) ? s.exercises.filter((e) => e !== id) : [...s.exercises, id] }));
  const addMed = (m) => setData((s) => ({ ...s, meds: [...s.meds, m] }));
  const removeMed = (i) => setData((s) => ({ ...s, meds: s.meds.filter((_, j) => j !== i) }));

  const petReady = data.name.trim() && data.species;
  const go = (n) => setStep(n);

  // Welcome + All-set are full-bleed; capture steps share chrome
  let body, footer = null, top = null;
  if (step === 0) {
    body = <Welcome onNext={() => go(1)} />;
  } else if (step === 5) {
    body = <AllSet data={data} onStart={() => { /* → /pets/[id]/checkin */ }} />;
  } else {
    const stepIdx = step; // 1..4 map to bar; bar length 5 (incl all-set as final fill)
    const isOptional = step >= 2; // pet required; conditions/plan/meds optional
    top = <TopBar stepIdx={stepIdx} onBack={() => go(step - 1)} onSkip={() => go(step + 1)} canSkip={isOptional} />;
    if (step === 1) body = <StepPet data={data} set={set} />;
    if (step === 2) body = <StepConditions data={data} set={set} toggleCond={toggleCond} />;
    if (step === 3) body = <StepPlan data={data} set={set} toggleEx={toggleEx} />;
    if (step === 4) body = <StepMeds data={data} set={set} addMed={addMed} removeMed={removeMed} />;
    footer = (
      <div style={{ padding: '12px 4px 4px' }}>
        {step === 1
          ? <Primary onClick={() => go(2)} disabled={!petReady}>{petReady ? 'Continue' : 'Add a name & species'} {petReady && Ico.chevR({ s: 17, c: '#fff' })}</Primary>
          : <Primary onClick={() => go(step + 1)}>Continue {Ico.chevR({ s: 17, c: '#fff' })}</Primary>}
      </div>
    );
  }

  const fullBleed = step === 0 || step === 5;
  return (
    <IOSDevice>
      <div className="gv-scroll" style={{ height: '100%', overflowY: 'auto', background: C.cream, display: 'flex', flexDirection: 'column', padding: fullBleed ? '54px 16px 22px' : '54px 16px 18px' }}>
        {top}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{body}</div>
        {footer}
      </div>
    </IOSDevice>
  );
}

window.OnboardingApp = OnboardingApp;
