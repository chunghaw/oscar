# Exercise track — notes

**Route:** `/pets/[id]/exercises`
**Backend:** `plan_items` + `exercises`, `exercise_session_events`, `adherence_rollup_mv`, `red_flag_rules`, `modification_types`. Progression rule from `lib/domain/progression.ts`.

## Files
- `index.html` — runnable host (React 18 + Babel CDN). Open directly in a browser.
- `ExerciseTrack.jsx` — the screen. Presentational; hardcoded demo state.
- `ios-frame.jsx` — device bezel only (not product code).
- `assets/oscar.jpg` — demo pet photo (placeholder).

> **Demo aid:** a small "Demo state" segmented control sits *above* the device frame so reviewers can flip Gated / Active / Logged. It is **not** part of the product UI — delete `<StateSwitcher>` on integration; the real app derives the state from whether a plan exists + a logging action.

## The cardinal rule (gating + nudge)
The **vet prescribes; Goldvale only logs**. The screen is gated behind a vet plan, and the progression signal is a **question routed to the owner/vet — never an "advance dose" action**. No exercise is ever shown or suggested without a prescribed plan.

## States
### A · Gated (no plan)
On-ramp only. Copy: "Your vet sets the plan… Once you add your vet's plan, we'll track it here." Two CTAs: **Add your vet's plan** (→ onboarding step 4 / plan capture) and the **non-gated home-modifications** on-ramp (non-slip mats, ramp, raised bowls). No exercises shown or suggested.

### B · Active plan (main)
- **Hero:** avatar + "Oscar's rehab" + "Week 5 · post-op" pill.
- **Today's plan:** prescribed exercises, each with its FITT dose + an **Active/Passive** tag. Checking one reveals a **reps stepper** (completed vs planned) and the **four tolerance pills**. "Log today's session" commits.
- **Progress:** weekly adherence %, a row of clean-session dots, and a 2-week session sparkline.
- **Progression nudge** (gold, only when earned — 6 clean sessions over ≥14 days): question-framed, "…that can be a sign he's ready for a little more — it's your vet's call… Raise it with Dr. Okafor?" with **Add to vet brief**. There is deliberately **no advance button**.
- **Red-flag row:** bounded "Contact your vet now" + the condition's red flags (sudden lameness; swelling/heat at incision) that route to the vet.

### C · Session logged
A confirmation bottom sheet over the active state: "Logged — that's how progress shows", count saved + streak, "Done".

## Field mapping
| UI element | Field / source | Notes |
| --- | --- | --- |
| Today's plan list | `plan_items` → `exercises.display_name` | only the vet's prescribed items |
| FITT dose ("3 × 5") | `exercises.default_fitt` | display string |
| Active / Passive tag | `exercises.is_active_exercise` | boolean |
| Mark done | creates `exercise_session_events` row | one per exercise |
| Reps stepper | `exercise_session_events.planned_reps` / `completed_reps` | clamp 0..planned |
| Tolerance pills | `exercise_session_events.tolerance` | enum `handled \| a_bit_tired \| sore \| refused` (verbatim) |
| Weekly adherence % | `adherence_rollup_mv` | "86% · 6 of 7 days" |
| Clean-session dots / sparkline | derived from `exercise_session_events` | clean = dose completed + tolerance handled/a-bit-tired |
| Progression nudge | `lib/domain/progression.ts` | fires at **6 clean sessions over ≥14 days**; question only, never auto-advance |
| Add to vet brief | append to brief aggregation | → `/pets/[id]/brief` |
| Red-flag rows | `red_flag_rules(label, guidance)` | per the pet's condition; route to vet |
| Home modifications | `modification_types` | non-gated on-ramp in the gated state |
| "Add your vet's plan" | → plan capture (`exercise_plans` + `plan_items`) | reuses onboarding step 4 |

## Copy to keep verbatim
- Gated: "Your vet sets the plan. Goldvale doesn't prescribe exercises. Once you add your vet's plan, we'll track it here — dose, tolerance, and progress."
- Nudge: "Oscar has handled this dose well for 2+ weeks. That can be a sign he's ready for a little more — but it's your vet's call, never ours. Want to raise it with Dr. Okafor?"
- Logged: "Logged — that's how progress shows."
- Tolerance: Handled / A bit tired / Sore / Refused.

## Non-clinical guardrail
Gated behind a vet plan; logs only; the progression signal is a question to the owner/vet, never an automatic dose change; red flags route to the vet without judgement.
