# AGENT_HANDOFF.md — context transfer

> **New agent / fresh session: read this + `CLAUDE.md` first, then `docs/BUILD_PLAN.md` and `HANDOFF.md`.**
> This is the living "memory" of the project — what it is, the decisions and *why*, what's built, what's blocked, and the exact next move. Update it as state changes.

---

## 1. Your role (the prompt)

You are the **orchestrator + builder** for **Goldvale**. You decompose work, implement it (Next.js / TypeScript / Drizzle / Bedrock), and keep `main` demo-ready. A reviewer ("Codex") and an evaluation gate sit in the loop:

**Build → Codex review → evaluation gate → fix → next.** Run features through the `feature-loop` workflow (`.claude/workflows/feature-loop.js`). A feature only ships when it passes the 6-point **Definition of Done** (see `docs/BUILD_PLAN.md`): works on real data · data-model integrity · **non-clinical guardrails** · AWS features exercised · `tsc`+`vitest` green · demo-ready.

**The cardinal rule — NON-CLINICAL:** Goldvale tracks, remembers, and prepares; it never diagnoses, grades, stages, or prescribes. Clinical scores are computed by **deterministic code in `lib/domain`, never the LLM**. Every model output passes `assertNonClinical()` (use `narrateSafe()`). Red flags route to "contact your vet now."

---

## 2. What Goldvale is

A calm daily companion + **home-rehabilitation tracker** for owners of **senior or chronically-ill dogs/cats**. A 20-second daily check-in (QoL + mobility) trends a **validated mobility score**, logs the vet-prescribed rehab plan, uses **pgvector** to surface "this flare resembles 5 weeks ago" pattern memory, and packages a cited, **vet-ready brief**. It supports the vet's plan — the vet decides.

Six features (full detail in `docs/proposals/H0_GOLDVALE_BRIEF.html`): ① mobility sub-score on the daily check-in (the wedge) · ② vet-plan-gated exercise track + FITT progression *nudge* · ③ pose form-coaching (non-clinical) · ④ condition templates (TPLO/IVDD) + red-flag escalation · ⑤ environmental-modification audit (ungated on-ramp) · ⑥ rehab-aware vet-prep brief + referral.

---

## 3. The hackathon

**H0: "Hack the Zero Stack with Vercel v0 + AWS Databases"** (hosted by AWS). **Track: Monetizable B2C.** Deadline **2026-06-29 17:00 PDT**. Required: a **published Vercel** project link + **an AWS database (Aurora PostgreSQL) as the primary backend**, public repo + MIT license, <3-min video, architecture diagram, screenshots proving Aurora use, Vercel Team ID. Judging (equal weight): Technical Implementation (the **DB modeling** is the centerpiece — judges are AWS database specialists), Design, Impact/real-world, Originality. +0.6 bonus for #H0Hackathon build-log posts.

---

## 4. Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 16 (App Router) + React 19 + TS + Tailwind v4 → **claude.ai/design** screens (NOT v0) |
| Hosting | **Vercel** (it's a responsive **web app**, mobile-first + an installable PWA shell in It.5 — not native) |
| Database | **AWS Aurora PostgreSQL + pgvector** — relational + time-series + vector + analytics (the one backend) |
| ORM | Drizzle (`db/schema.sql` is canonical DDL; `lib/db/schema.ts` is the typed query layer) |
| AI | Vercel AI SDK + **Amazon Bedrock (Claude)**; Titan/Cohere embeddings (1024-dim) |
| Auth/pay | Auth.js + Stripe (Iteration 4) |

---

## 5. Decision log (the "why")

- **Pivoted off the original product (Prism)** when the prior hackathon's $100 GCP credits dried up → switched to H0 (AWS+Vercel), which fits the user's stack (Vercel Pro, SQL/dbt). The old `prism` repo is **dead/disposable** (see §9).
- **Chose a new product, not Prism**, and after research picked **Goldvale** (senior-pet care) over other pet/stock/mental-health ideas. Then a **monetization pass reframed the field**: lost-pet ("Reunipet") scored highest on craft but **2/5 on revenue realism** (search is a free/nonprofit commodity); dog-training ("Tideline") had the best proven money but is crowded; **Goldvale won on balance** — original niche + sticky daily loop + rich data model.
- **Added animal physiotherapy** — mobility decline is the #1 senior/chronic burden and home-manageable, so it threads through every surface (not bolted on).
- **AWS DB = Aurora PostgreSQL + pgvector** (over DSQL/DynamoDB): relational + time-series + vector + analytics in one engine = the richest "deliberate data modeling" story for these judges, and fits the user's SQL strength.
- **AI = Bedrock Claude via Vercel AI SDK** (hits both sponsors).
- **Validated scales licensing (critical):** only embed **GenPup-M** (CC-BY, 24-item mobility) + **HCPI** (free). **LOAD / CBPI / FMPI / COAST are license-gated → vet-administered** (store the vet's result, never reproduce the form).
- **Pose/CV = form-coaching only**, never gait analysis — no validated home dog-gait system exists (2026 review); framing it clinically would be wrong + a liability.
- **Mobile-first responsive *web* app + installable PWA shell (It.5); real web-push deferred** (post-hackathon stretch — high effort, iOS-flaky, not judge-scored).
- **New separate GitHub repo** (`chunghaw/goldvale`), not a restructure of prism.

---

## 6. Current build state (✅ done + tested)

Repo: **github.com/chunghaw/goldvale**, local `C:\Users\EdmundTan\projects\goldvale`, branch `main`. `tsc --noEmit` clean, **13 vitest tests pass**.

| Area | Files |
| --- | --- |
| Aurora DDL (4 layers) | `db/schema.sql` — relational + partitioned time-series + pgvector HNSW + materialized views |
| **Non-clinical core** (pure, tested) | `lib/domain/mobility.ts` (GenPup-M scoring + MCID), `guardrails.ts` (`assertNonClinical`), `progression.ts` (FITT nudge) + `.test.ts` each |
| Data layer | `lib/db/schema.ts` (typed Drizzle), `lib/db/client.ts` (lazy Aurora singleton) |
| AI | `lib/ai/bedrock.ts` (chat + embeddings; `narrateSafe` enforces the guardrail) |
| Seed + scripts | `lib/db/seed-data.ts`, `scripts/migrate.ts` (applies schema.sql), `scripts/seed.ts` |
| Agentic factory | `.claude/agents/{builder,reviewer-codex,db-specialist}.md`, `.claude/workflows/feature-loop.js`, `scripts/codex-review.ps1`, `.claude/settings.json`, `.mcp.json` (Postgres MCP) |
| Brand | `app/globals.css` — tokens: `bg-cream` #fbf7ef, `text-charcoal` #2a2622, `gold` #e0a526, `sage` #5b8c82, danger red, `rounded-card` 18px |
| Docs | `CLAUDE.md`, `docs/BUILD_PLAN.md`, `HANDOFF.md` (frontend), `docs/proposals/*.html` |
| **No UI yet** | `components/` is empty; `app/page.tsx` is the default starter |

---

## 7. What's pending / blocked

1. **AWS go-live (blocks Iteration 0/1).** Need from the user: `DATABASE_URL` (Aurora PostgreSQL 16, Serverless v2, pgvector, publicly reachable), `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, the enabled `BEDROCK_CHAT_MODEL` id, and Bedrock model access enabled (Claude + Titan). Then: create `.env` (gitignored) → `npx tsx scripts/migrate.ts` → `npx tsx scripts/seed.ts` → smoke-test a real query + a live Bedrock call.
2. **Frontend screens** — designed in claude.ai/design (mobile, hi-fi, **Goldvale tokens — not** the "Unstructured AI Studio Design System"). User drops exports in `design/incoming/<screen>/`; you refactor into typed `components/` and wire to the backend. See `HANDOFF.md` for the screen→route→data map. Priority: **daily-checkin → dashboard → vet-brief**, then onboarding + exercise-track.
3. **Iterations 1–5** — see `docs/BUILD_PLAN.md`. It.1 (the wedge) is the first real end-to-end loop (Bramble demo).

---

## 8. User profile (Edmund)

Pragmatic data engineer (SQL / dbt / Microsoft Fabric / ACHA migration). Values: **working software, local-first, honest reporting (no fabricated success), and NO mock data in the demo path.** Designs the frontend himself in claude.ai/design and hands code over. GitHub handle `chunghaw`; email `etan@imsystems.com.au`.

---

## 9. Environment + folders (gotchas)

- **`goldvale` is the canonical project.** The sibling `C:\Users\EdmundTan\projects\prism` is the old/dead repo (different GitHub remote) — disposable; its useful HTMLs were copied into `docs/proposals/`. Don't merge them (two separate `.git`s). Open VS Code on the **goldvale** folder for future sessions.
- **Windows + PowerShell.** The terminal tool is PowerShell (a `Bash` tool may or may not be present in a given session — don't rely on it). `git push` prints stderr that PowerShell renders as a red "error" — it usually **succeeded** (look for the `<sha>..<sha> main -> main` line).
- **Git auth** is cached (Git Credential Manager) for `chunghaw` — pushes are seamless.
- **Secrets** live only in `.env` (gitignored via `.env*` + `!.env.example`). Never commit keys.
- **Custom `.claude/agents` register on a fresh session**, not mid-session — a mid-session workflow must use the default agent with roles inlined.

---

## 10. Immediate next action

Whichever the user provides first:
- **AWS values →** create `.env`, migrate + seed, smoke-test both rails, then start **Iteration 1** (daily check-in route + mobility wedge + pgvector recall, all guardrailed).
- **A design screen in `design/incoming/` →** wire it into `components/` + a route, typed from the real DB shapes.

Design and AWS proceed in parallel.
