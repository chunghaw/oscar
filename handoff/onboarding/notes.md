# Onboarding — notes

**Route:** `/onboarding` (→ `/pets/[id]/checkin` on completion)
**Backend:** `owners`, `pets`, `protocol_instances`, `exercise_plans` + `plan_items`, `medication_events`.

## Files
- `index.html` — runnable host (React 18 + Babel CDN). Open directly in a browser.
- `Onboarding.jsx` — the flow. Presentational; all answers held in one local `data` object (demo state) to be replaced with a real form store + server action on submit.
- `ios-frame.jsx` — device bezel only (starter scaffold; not product code).
- `assets/oscar.jpg` — demo pet photo (placeholder; the photo control is a stub that toggles this image — wire to a real upload).

## Flow (6 steps; only step 2 name + species are required, the rest skippable)
1. **Welcome** — track / remember / prepare promise + the non-clinical line. CTA "Get started".
2. **Your pet** *(required)* — photo, name, species (dog/cat), breed, age, senior toggle. Continue is disabled until **name + species** are set.
3. **What's going on** *(optional)* — condition chips; picking a `template` condition (IVDD / Post-op) reveals the **recovery template** choice + onset date.
4. **Your vet's plan** *(optional, gated)* — "Yes / Not yet". Yes reveals prescriber name + prescribed-exercise checklist. Copy reads **"we store your vet's plan"**, never "recommend".
5. **Medications** *(optional)* — add meds (name + timing chip); each appears as a removable row.
6. **All set** — confirmation with a summary-chip recap + primary CTA into the daily check-in, and the bounded "Contact your vet now".

## States to preserve
- **Step 2 empty/required:** CTA disabled, label "Add a name & species", no Skip control, counter `1/5`.
- **Step 2 filled:** CTA enabled → "Continue".
- **Optional steps skipped:** Skip advances without writing; All-set shows only what was captured (e.g. just the species chip).
- **Optional steps filled:** conditions → template reveal; plan → prescriber + exercises; meds → rows.
- Top chrome: back chevron + 5-segment progress bar; **Skip** shows only on optional steps (2–5 of the flow), the counter shows on the required step.
- Micro-interactions: press-scale on buttons (`.gv-press`), fade-up on step + reveal (`.gv-step`, `.gv-rise`), honored under `prefers-reduced-motion`.

## Field mapping
| UI element | Field | Notes |
| --- | --- | --- |
| (account, implicit) | `owners.display_name` | not collected here; set at sign-up |
| Pet's name | `pets.name` | **required** |
| Species dog/cat | `pets.species` | **required**; enum `dog \| cat` |
| Breed | `pets.breed` | optional text |
| Age / DOB | `pets.date_of_birth` | demo uses free text "12 yr"; store as date |
| Senior toggle | `pets.is_senior` | boolean |
| Photo | `pets.avatar_url` (upload) | stub in mock |
| Condition chips | `pets.chronic_conditions[]` | `osteoarthritis · ivdd · post_op · other · none` (none is exclusive) |
| Recovery template | `protocol_instances.template_id` | revealed only for IVDD / post-op; `tplo_postop \| ivdd_conservative` |
| Surgery/onset date | `protocol_instances.onset_date` | optional |
| Has a plan? (gate) | UI-only | gates the next fields |
| Prescriber name | `exercise_plans.prescriber_name` | e.g. "Dr. Okafor" |
| Prescribed exercises | `plan_items.exercise_id[]` | from the `exercises` library |
| Medication (name + timing) | `medication_events.med_name` (+ schedule) | timing chip → schedule fields |
| "Start first check-in" | navigate → `/pets/[id]/checkin` | after the insert server action |
| "Contact your vet now" | bounded danger → vet routing | per `lib/domain/guardrails.ts` |

## Copy to keep verbatim
- Welcome promise: "Goldvale helps you track, remember, and prepare — it doesn't diagnose. Your vet decides."
- Conditions subhead: "Tap anything your vet has already mentioned. This just helps Goldvale remember — it's not a diagnosis."
- Plan guardrail: "We store your vet's plan exactly as given. Goldvale never changes a dose or recommends exercises."
- All set: "You're all set" / "Start Oscar's first check-in".

## Non-clinical guardrail
Onboarding **captures** what the owner/vet already know — it never assesses, grades, or prescribes. The condition chips are memory aids, the template is a milestone store (not a diagnosis), and the vet's plan is stored verbatim. Keep every label in that voice.
