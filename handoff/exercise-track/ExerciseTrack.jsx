// Goldvale — Exercise track (mobile). The vet-plan-GATED rehab tracker.
// The vet prescribes; Goldvale only LOGS adherence and, when earned, surfaces a
// QUESTION-framed "ask your vet about progressing" nudge. It never advances the dose.
// Grounded in: plan_items + exercises(display_name, default_fitt, is_active_exercise) ·
// exercise_session_events(planned_reps, completed_reps, tolerance) · adherence_rollup_mv ·
// progression.ts (6 clean sessions ≥14d → ask, never auto-advance) · red_flag_rules ·
// modification_types (the non-gated on-ramp).

const { useState, useEffect, useRef } = React;

// ── tokens ──────────────────────────────────────────────────────────────────
const C = {
  cream: '#eef1ef', charcoal: '#20262a', gold: '#d6981e', sage: '#4f8a7d',
  danger: '#c0492b', muted: '#687069', mutedSoft: '#8a938e', card: '#ffffff',
  hair: '#dde3df', hairSoft: '#e8ece9', field: '#f2f5f3',
};
const A = {
  plan:  { c: '#4f8a7d', soft: 'var(--sage-soft)' },
  prog:  { c: '#5b7a99', soft: 'var(--slate-soft)' },
  mods:  { c: '#3f8f86', soft: 'var(--teal-soft)' },
};

// ── icons ────────────────────────────────────────────────────────────────────
const Ico = {
  activity: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>),
  trend: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 7 13.5 15.5l-5-5L2 17"/><path d="M16 7h6v6"/></svg>),
  check: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth={p.w||2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>),
  chevR: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>),
  plus: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>),
  file: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>),
  sparkles: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M5 12H3M21 12h-2M6.3 6.3 7.7 7.7M16.3 16.3l1.4 1.4M6.3 17.7 7.7 16.3M16.3 7.7l1.4-1.4"/></svg>),
  home: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"/><path d="M9 21v-6h6v6"/></svg>),
  alert: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>),
  minus: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>),
  paw: (p={}) => (<svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke={p.c||'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="7.5" cy="15" r="2"/><path d="M14.5 15c2.5 0 4 2 4 4a3 3 0 0 1-3 3c-1.2 0-2-.5-3.5-.5s-2.3.5-3.5.5a3 3 0 0 1-3-3c0-2 1.5-4 4-4 .8 0 1.5.3 2.5.3s1.7-.3 2.5-.3Z"/></svg>),
};

// ── shared shells ─────────────────────────────────────────────────────────────
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
      {hint && <div style={{ fontSize: 11.5, color: C.muted, flexShrink: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{hint}</div>}
    </div>
  );
}

// ── data (grounded) ───────────────────────────────────────────────────────────
const EXERCISES = [
  { id: 'sit_to_stand', name: 'Sit-to-stand', fitt: '3 × 5', planned: 15, active: true },
  { id: 'weight_shift', name: 'Weight shifts', fitt: '2 × 8', planned: 16, active: true },
  { id: 'cavaletti', name: 'Cavaletti poles', fitt: '3 passes', planned: 3, active: true },
  { id: 'prom', name: 'Passive range-of-motion', fitt: '1 × 10 each', planned: 10, active: false },
];
const TOL = [
  { id: 'handled', label: 'Handled', soft: 'var(--sage-soft)', ink: 'var(--sage-ink)' },
  { id: 'a_bit_tired', label: 'A bit tired', soft: 'var(--slate-soft)', ink: '#46617d' },
  { id: 'sore', label: 'Sore', soft: 'var(--gold-soft)', ink: 'var(--gold-ink)' },
  { id: 'refused', label: 'Refused', soft: 'var(--clay-soft)', ink: 'var(--clay-ink)' },
];
// session history, last 14 days — clean = handled/a bit tired, completed dose
const HISTORY = [3,2,0,3,2,3,3,0,2,3,3,2,3,2]; // 0=rest, height proxy
const CLEAN_DOTS = [1,1,0,1,1,1]; // recent 6 sessions, 1=clean
const RED_FLAGS = [
  { label: 'Sudden lameness after improvement', guide: 'Stop today’s exercises and call your vet.' },
  { label: 'Swelling or heat at the incision', guide: 'Pause and check with your vet before continuing.' },
];
const MODS = [
  { t: 'Non-slip mats', d: 'Steady footing on slick floors' },
  { t: 'A gentle ramp', d: 'For the sofa, bed, or car' },
  { t: 'Raised food & water', d: 'Less strain bending down' },
];

// ── hero ──────────────────────────────────────────────────────────────────────
function Hero({ gated }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 22, marginBottom: 16,
      background: 'linear-gradient(150deg, #4f8a7d 0%, #46796f 42%, #50708a 100%)',
      boxShadow: '0 14px 30px rgba(58,107,96,0.26)', padding: '17px 17px 16px',
    }}>
      <svg width="190" height="190" viewBox="0 0 190 190" style={{ position: 'absolute', top: -54, right: -46, opacity: 0.16 }}>
        <circle cx="95" cy="95" r="78" fill="none" stroke="#fff" strokeWidth="1.4" />
        <circle cx="95" cy="95" r="56" fill="none" stroke="#fff" strokeWidth="1.4" />
        <circle cx="95" cy="95" r="34" fill="none" stroke="#fff" strokeWidth="1.4" />
      </svg>
      <svg width="120" height="60" viewBox="0 0 120 60" style={{ position: 'absolute', bottom: -8, left: -10, opacity: 0.14 }}>
        <path d="M2 50 Q30 6 60 30 T118 18" fill="none" stroke="#fff" strokeWidth="1.4" />
      </svg>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 58, height: 58, borderRadius: 999, flexShrink: 0, padding: 3, background: 'rgba(255,255,255,0.22)', boxShadow: '0 4px 12px rgba(0,0,0,0.14)' }}>
          <img src="assets/oscar.jpg" alt="Oscar" style={{ width: '52px', height: '52px', borderRadius: '999px', objectFit: 'cover', display: 'block' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.78)', fontWeight: 600, letterSpacing: 0.3 }}>Home rehab</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 23, fontWeight: 500, letterSpacing: -0.3, lineHeight: 1.05, marginTop: 2, color: '#fff', whiteSpace: 'nowrap' }}>
            Oscar’s rehab
          </div>
        </div>
        <div style={{ alignSelf: 'flex-start', fontSize: 10.5, color: '#fff', fontWeight: 650, background: 'rgba(255,255,255,0.18)', padding: '5px 9px', borderRadius: 999, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.22)' }}>
          {gated ? 'No plan yet' : 'Week 5 · post-op'}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STATE A — GATED (no plan)
// ════════════════════════════════════════════════════════════════════════════
function GatedState({ onAddPlan }) {
  return (
    <React.Fragment>
      <Hero gated />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card style={{ textAlign: 'center', padding: '26px 20px 22px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, margin: '0 auto 16px', background: 'var(--sage-soft)', color: C.sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Ico.activity({ s: 27, c: C.sage })}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 21, fontWeight: 500, letterSpacing: -0.3, lineHeight: 1.2 }}>Your vet sets the plan</div>
          <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5, marginTop: 9, maxWidth: 270, marginLeft: 'auto', marginRight: 'auto' }}>
            Goldvale doesn’t prescribe exercises. Once you add your vet’s plan, we’ll track it here — dose, tolerance, and progress.
          </div>
          <button className="gv-press" onClick={onAddPlan} style={{
            width: '100%', marginTop: 20, padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(180deg, #59978a, #437a6d)', color: '#fff', fontSize: 15.5, fontWeight: 700,
            boxShadow: '0 6px 16px rgba(63,123,109,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}><span>Add your vet’s plan</span> {Ico.chevR({ s: 17, c: '#fff' })}</button>
        </Card>

        {/* non-gated on-ramp: home modifications */}
        <Card>
          <SectionHead icon={Ico.home({ s: 18, c: A.mods.c })} accent={A.mods} title="Meanwhile: home setup" hint="No plan needed" />
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: -4, marginBottom: 13, lineHeight: 1.45 }}>
            Small changes you can make today to keep Oscar steady and comfortable.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {MODS.map((m) => (
              <div key={m.t} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 13, padding: '11px 13px' }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: A.mods.soft, color: A.mods.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ico.home({ s: 15, c: A.mods.c })}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 650 }}>{m.t}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{m.d}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="gv-press" style={{
            width: '100%', marginTop: 13, padding: '11px', borderRadius: 12, cursor: 'pointer',
            border: `1px solid ${A.mods.c}`, background: 'var(--teal-soft)', color: '#2f6a62',
            fontSize: 13.5, fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}><span>See all home modifications</span> {Ico.chevR({ s: 15, c: '#2f6a62' })}</button>
        </Card>

        <VetFlagRow />
        <div style={{ height: 16 }} />
      </div>
    </React.Fragment>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STATE B — ACTIVE plan
// ════════════════════════════════════════════════════════════════════════════
function ExerciseRow({ ex, st, onToggle, onReps, onTol }) {
  return (
    <div style={{ borderTop: `1px solid ${C.hairSoft}`, padding: '13px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="gv-press" onClick={() => onToggle(ex.id)} style={{
          width: 27, height: 27, borderRadius: 8, flexShrink: 0, cursor: 'pointer',
          border: `1.8px solid ${st.done ? C.sage : C.hair}`, background: st.done ? C.sage : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{st.done && Ico.check({ s: 15, c: '#fff', w: 3 })}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: st.done ? C.charcoal : '#5d655e' }}>{ex.name}</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: ex.active ? C.sage : '#7d6b96', background: ex.active ? 'var(--sage-soft)' : 'var(--plum-soft)', padding: '2px 6px', borderRadius: 999, flexShrink: 0 }}>{ex.active ? 'Active' : 'Passive'}</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{ex.fitt}</div>
        </div>
      </div>

      {st.done && (
        <div className="gv-rise" style={{ paddingLeft: 39, marginTop: 12 }}>
          {/* reps stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Reps done</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginLeft: 'auto', border: `1px solid ${C.hair}`, borderRadius: 10, overflow: 'hidden' }}>
              <button className="gv-press" onClick={() => onReps(ex.id, -1)} style={{ width: 34, height: 32, border: 'none', background: '#fff', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ico.minus({ s: 15, c: C.muted })}</button>
              <span style={{ minWidth: 42, textAlign: 'center', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{st.reps}<span style={{ color: C.mutedSoft, fontWeight: 500, fontSize: 12 }}> / {ex.planned}</span></span>
              <button className="gv-press" onClick={() => onReps(ex.id, 1)} style={{ width: 34, height: 32, border: 'none', borderLeft: `1px solid ${C.hair}`, background: '#fff', cursor: 'pointer', color: C.sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ico.plus({ s: 15, c: C.sage })}</button>
            </div>
          </div>
          {/* tolerance pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {TOL.map((t) => {
              const on = st.tol === t.id;
              return (
                <button key={t.id} className="gv-press" onClick={() => onTol(ex.id, t.id)} style={{
                  flex: 1, padding: '8px 2px', borderRadius: 999, cursor: 'pointer', fontSize: 10.5, fontWeight: on ? 700 : 600, lineHeight: 1.1,
                  border: `1px solid ${on ? 'transparent' : C.hair}`, background: on ? t.soft : '#fff', color: on ? t.ink : C.muted,
                  boxShadow: on ? `inset 0 0 0 1px ${t.ink}33` : 'none',
                }}>{t.label}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Sparkline() {
  const W = 300, H = 46, max = 3;
  const n = HISTORY.length;
  const bw = (W - (n - 1) * 4) / n;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {HISTORY.map((v, i) => {
        const h = v === 0 ? 4 : 8 + (v / max) * (H - 12);
        const x = i * (bw + 4);
        const rest = v === 0;
        return <rect key={i} x={x} y={H - h} width={bw} height={h} rx={2.5} fill={rest ? '#d9e0db' : C.sage} opacity={rest ? 1 : 0.45 + (v / max) * 0.45} />;
      })}
    </svg>
  );
}

function ActiveState({ ex, setEx, onLog, loggedCount }) {
  const toggle = (id) => setEx((s) => ({ ...s, [id]: { ...s[id], done: !s[id].done, reps: s[id].done ? 0 : EXERCISES.find((e) => e.id === id).planned, tol: s[id].done ? null : s[id].tol } }));
  const reps = (id, d) => setEx((s) => { const planned = EXERCISES.find((e) => e.id === id).planned; return { ...s, [id]: { ...s[id], reps: Math.max(0, Math.min(planned, s[id].reps + d)) } }; });
  const tol = (id, t) => setEx((s) => ({ ...s, [id]: { ...s[id], tol: t } }));
  const doneCount = Object.values(ex).filter((e) => e.done).length;

  return (
    <React.Fragment>
      <Hero />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* today's plan */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 12px' }}>
            <SectionHead icon={Ico.activity({ s: 18, c: A.plan.c })} accent={A.plan} title="Today’s plan" hint={`${doneCount}/${EXERCISES.length} logged`} />
            <div style={{ fontSize: 12, color: C.muted, marginTop: -4, lineHeight: 1.45 }}>Prescribed by Dr. Okafor · check off as you go.</div>
          </div>
          {EXERCISES.map((e) => (
            <ExerciseRow key={e.id} ex={e} st={ex[e.id]} onToggle={toggle} onReps={reps} onTol={tol} />
          ))}
          <div style={{ padding: 16, borderTop: `1px solid ${C.hairSoft}` }}>
            <button className="gv-press" onClick={onLog} disabled={doneCount === 0} style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: doneCount ? 'pointer' : 'not-allowed',
              background: doneCount ? 'linear-gradient(180deg, #59978a, #437a6d)' : '#dbe3df', color: doneCount ? '#fff' : '#9aa49e',
              fontSize: 15, fontWeight: 700, boxShadow: doneCount ? '0 6px 16px rgba(63,123,109,0.28)' : 'none',
            }}>{doneCount ? `Log today’s session (${doneCount})` : 'Check off an exercise to log'}</button>
          </div>
        </Card>

        {/* progress */}
        <Card>
          <SectionHead icon={Ico.trend({ s: 18, c: A.prog.c })} accent={A.prog} title="Progress" hint="this week" />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 34, fontWeight: 500, letterSpacing: -0.8, lineHeight: 1 }}>86</span>
                <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>%</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>adherence · 6 of 7 days</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', marginBottom: 5 }}>
                {CLEAN_DOTS.map((d, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: 999, background: d ? C.sage : '#fff', border: `1.5px solid ${d ? C.sage : C.hair}` }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>last 6 sessions</div>
            </div>
          </div>
          <div style={{ paddingTop: 14, borderTop: `1px solid ${C.hairSoft}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 8 }}>Last 2 weeks</div>
            <Sparkline />
          </div>
        </Card>

        {/* progression nudge — earned, question-framed, gold */}
        <div className="gv-rise" style={{
          background: 'linear-gradient(165deg, #ffffff, #fdf6e8)', border: '1px solid rgba(214,152,30,0.34)',
          borderRadius: 'var(--radius)', padding: 18, boxShadow: '0 10px 26px rgba(214,152,30,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11 }}>
            <span style={{ display: 'flex', color: C.gold }}>{Ico.sparkles({ s: 15, c: '#b9831a' })}</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#a5751a' }}>A milestone worth a chat</span>
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 17.5, fontWeight: 500, lineHeight: 1.4, letterSpacing: -0.1 }}>
            Oscar has handled this dose well for <span style={{ fontStyle: 'italic', fontWeight: 600 }}>2+ weeks</span>.
          </div>
          <div style={{ fontSize: 13, color: '#5a5343', lineHeight: 1.5, marginTop: 9 }}>
            That can be a sign he’s ready for a little more — but it’s your vet’s call, never ours. Want to raise it with Dr. Okafor?
          </div>
          <button className="gv-press" style={{
            width: '100%', marginTop: 14, padding: '12px', borderRadius: 13, cursor: 'pointer',
            border: '1px solid rgba(214,152,30,0.5)', background: 'var(--gold-soft)', color: '#8a6410',
            fontSize: 14, fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}><span>Add to vet brief</span> {Ico.chevR({ s: 16, c: '#8a6410' })}</button>
        </div>

        <VetFlagRow flags />
        <div style={{ height: 16 }} />
      </div>
    </React.Fragment>
  );
}

// ── bounded red-flag row ──────────────────────────────────────────────────────
function VetFlagRow({ flags }) {
  return (
    <Card style={{ borderColor: 'rgba(192,73,43,0.22)', background: 'linear-gradient(170deg, #fff, #fdf3f0)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: flags ? 13 : 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: 'var(--danger-soft)', color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ico.alert({ s: 18, c: C.danger })}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 650, lineHeight: 1.3 }}>Noticed something worrying?</div>
          <div style={{ fontSize: 12, marginTop: 1 }}>
            <span style={{ color: C.danger, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}>Contact your vet now</span>
          </div>
        </div>
      </div>
      {flags && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 13, borderTop: '1px solid rgba(192,73,43,0.14)' }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>For Oscar’s recovery, watch for:</div>
          {RED_FLAGS.map((f) => (
            <button key={f.label} className="gv-press" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${C.hairSoft}`, borderRadius: 12, padding: '10px 12px' }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: C.danger, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#5a4540', lineHeight: 1.35 }}>{f.label}</span>
              {Ico.chevR({ s: 15, c: C.mutedSoft })}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── logged confirmation (bottom sheet) ────────────────────────────────────────
function LoggedSheet({ count, onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(32,38,42,0.34)', animation: 'gv-rise .3s ease both' }} />
      <div className="gv-sheet" style={{ position: 'relative', background: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '12px 22px 30px', boxShadow: '0 -10px 40px rgba(0,0,0,0.16)' }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: '#dde3df', margin: '0 auto 20px' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, margin: '0 auto 16px', background: 'var(--sage-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'gv-pop .5s cubic-bezier(.2,.7,.3,1) both' }}>
            {Ico.check({ s: 30, c: C.sage, w: 2.6 })}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 23, fontWeight: 500, letterSpacing: -0.4 }}>Logged — that’s how progress shows</div>
          <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5, marginTop: 9, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
            {count} {count === 1 ? 'exercise' : 'exercises'} saved to Oscar’s rehab record. Every session adds to the bigger picture.
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 999, padding: '7px 14px', fontSize: 12.5, fontWeight: 650, color: '#46504a' }}>
            {Ico.activity({ s: 14, c: C.sage })} <span>7-session streak</span>
          </div>
        </div>
        <button className="gv-press" onClick={onClose} style={{
          width: '100%', marginTop: 22, padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(180deg, #59978a, #437a6d)', color: '#fff', fontSize: 15.5, fontWeight: 700,
          boxShadow: '0 6px 16px rgba(63,123,109,0.30)',
        }}>Done</button>
      </div>
    </div>
  );
}

// ── demo state switcher (review aid — not product UI) ─────────────────────────
function StateSwitcher({ value, onChange }) {
  const opts = [{ k: 'gated', l: 'Gated' }, { k: 'active', l: 'Active' }, { k: 'logged', l: 'Logged' }];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
      <span style={{ fontSize: 10.5, color: C.mutedSoft, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Demo state</span>
      <div style={{ display: 'flex', gap: 3, background: '#fff', border: `1px solid ${C.hair}`, borderRadius: 999, padding: 3, boxShadow: '0 2px 8px rgba(32,38,42,0.06)' }}>
        {opts.map((o) => {
          const on = value === o.k;
          return (
            <button key={o.k} className="gv-press" onClick={() => onChange(o.k)} style={{
              padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: on ? 700 : 600,
              background: on ? C.sage : 'transparent', color: on ? '#fff' : C.muted,
            }}>{o.l}</button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// APP
// ════════════════════════════════════════════════════════════════════════════
function ExerciseTrackApp() {
  const [view, setView] = useState('active'); // gated · active · logged
  const [ex, setEx] = useState(() => {
    // demo: first two pre-logged so the active state shows progress
    const base = EXERCISES.reduce((a, e) => ({ ...a, [e.id]: { done: false, reps: 0, tol: null } }), {});
    base.sit_to_stand = { done: true, reps: 15, tol: 'handled' };
    base.weight_shift = { done: true, reps: 16, tol: 'a_bit_tired' };
    return base;
  });
  const [sheet, setSheet] = useState(false);

  const doneCount = Object.values(ex).filter((e) => e.done).length;
  const openLog = () => { setSheet(true); };
  const onSwitch = (v) => {
    if (v === 'logged') { setView('active'); setSheet(true); }
    else { setView(v); setSheet(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <StateSwitcher value={sheet ? 'logged' : view} onChange={onSwitch} />
      <IOSDevice>
        <div className="gv-scroll" style={{ position: 'relative', height: '100%', overflowY: 'auto', background: C.cream, padding: '54px 16px 40px' }}>
          {view === 'gated'
            ? <GatedState onAddPlan={() => setView('active')} />
            : <ActiveState ex={ex} setEx={setEx} onLog={openLog} loggedCount={doneCount} />}
          {sheet && <LoggedSheet count={doneCount} onClose={() => setSheet(false)} />}
        </div>
      </IOSDevice>
    </div>
  );
}

window.ExerciseTrackApp = ExerciseTrackApp;
