# Goldvale — design handoff (3 demo-critical screens)

Designed in claude.ai/design, ready to wire. These mirror the `design/incoming/` staging
structure from `HANDOFF.md` — drop each folder into `design/incoming/`, or read the code +
`notes.md` and integrate directly.

```
handoff/
  onboarding/      → /onboarding   (first-run setup → first check-in)
  daily-checkin/   → /pets/[id]/checkin
  dashboard/       → /pets/[id]
  exercise-track/  → /pets/[id]/exercises
  vet-brief/       → /pets/[id]/brief
```

Each screen folder is **self-contained and runnable** — open its `index.html` in a browser.
Each has a `notes.md` with its states, the verbatim copy, and a field-by-field mapping to the
real backend (`lib/db/schema.ts`, `lib/domain/*`, `lib/db/seed-data.ts`).

## What this is / isn't
- **Is:** the visual + interaction spec. Brand-accurate, mobile, all five sections per screen real.
- **Isn't:** production code. Styling is inline (no Tailwind), data is hardcoded demo state, and
  `ios-frame.jsx` is just a device bezel for preview — **not** part of the product. On integration:
  extract a presentational component into `components/`, port styles to Tailwind v4 tokens, and type
  props from the DB shapes.

## Brand tokens used (cooled, higher-contrast variant of `app/globals.css`)
The product's canonical tokens are warm cream `#FBF7EF` / charcoal `#2A2622` / gold `#E0A526` /
sage `#5B8C82`. These mocks use a slightly **cooled, higher-contrast** reading of the same system
(per the "more contrast / calmer" design review) plus an editorial serif for headings:

| Token | Mock value | Role |
| --- | --- | --- |
| `--cream` (bg) | `#eef1ef` | page background (cooled cream) |
| `--charcoal` (text) | `#20262a` | body text (cool charcoal) |
| `--sage` (primary) | `#4f8a7d` | primary actions + positive trends |
| `--gold` | `#d6981e` | highlight only, used sparingly |
| `--danger` | `#c0492b` | bounded "contact your vet now" only |
| section accents | slate `#5b7a99` · teal `#3f8f86` · plum `#7d6b96` · clay `#b3654a` | muted per-section icon tiles |
| `--radius` | 18px | cards |
| heading font | Newsreader (serif) | titles + key figures |
| body/data font | system sans + `tabular-nums` | labels, data |

> Decide at integration whether to keep the cooled variant or snap back to the canonical warm
> tokens. The structure and components are identical either way — it's a token swap.

## Domain logic the screens depend on (all server-side, never the LLM)
- **GenPup-M mobility** (`lib/domain/mobility.ts`): score 0–108, **higher = worse**; bands
  none/mild/moderate/severe; **MCID = 8** is the "meaningful change vs the pet's own baseline" mark.
- **Progression nudge** (`lib/domain/progression.ts`): surfaces after **6 clean sessions spanning
  ≥14 days**; always phrased as a **question**, never an auto-advance. Tolerance enum
  `handled / a_bit_tired / sore / refused`.
- **Guardrails** (`lib/domain/guardrails.ts`): non-clinical — track, remember, prepare; never
  diagnose. All model narration passes `narrateSafe`. Red-flag UI routes to the vet.
- **Recall**: the "pattern memory" insight is pgvector recall over `journal_entries` /
  `mobility_score_events` — surfacing what was logged, framed for the vet.

## ⚠️ Placeholder values to confirm before demo
All invented for the mock — replace with real pet/record data:
- **Oscar · 12 yr · Toy poodle** (signalment + `assets/oscar.jpg`)
- **Dr. Okafor**, next visit **Jun 18**, Week 5 post-op (TPLO)
- Meds: **Carprofen 75 mg / Gabapentin 100 mg / Omega-3** + their adherence counts
- All demo figures: GenPup-M 34 (baseline 42), QoL week, 6 sessions / 18 days, the "3× in 2 weeks" pattern

## Integration checklist (from HANDOFF.md)
- [ ] Extract presentational component → `components/`, port to Tailwind v4 tokens
- [ ] Type props from `lib/db/schema.ts` (`daily_checkins`, `medication_events`, `exercise_session_events`, mobility/adherence MVs)
- [ ] Wire data via server components / route handlers / server actions (DB + Bedrock stay server-side)
- [ ] Run mobility/progression through `lib/domain/*`; enforce `narrateSafe` on all narration
- [ ] Keep red-flag "contact your vet now" routing
- [ ] `npx tsc --noEmit` + `npm run test` + lint, then preview
