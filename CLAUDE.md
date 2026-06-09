# CLAUDE.md — Goldvale

> **New session?** Read **`AGENT_HANDOFF.md`** for the current state, decision history, and the exact next step — then this file, `docs/BUILD_PLAN.md`, and `HANDOFF.md`.

Goldvale is a calm daily companion + home-rehab tracker for owners of **senior or chronically-ill dogs and cats**. Built for the **H0 hackathon** ("Hack the Zero Stack with Vercel v0 + AWS Databases"), **Monetizable B2C** track. Submission deadline **2026-06-29 17:00 PDT**.

## North-star

A 20-second daily check-in (QoL + mobility) that trends a **validated mobility score**, logs the vet-prescribed rehab plan, surfaces "this flare resembles 5 weeks ago" via **vector search**, and packages a cited, vet-ready brief. It **supports the vet's plan — it never diagnoses.**

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind; screens designed in **claude.ai/design** |
| Hosting | **Vercel** |
| Database | **AWS Aurora PostgreSQL + pgvector** — the one backend; exercise all 4 layers |
| ORM | Drizzle |
| AI | Vercel AI SDK + **Amazon Bedrock (Claude)**; Titan/Cohere embeddings |
| Auth / pay | Auth.js + Stripe (later iterations) |

## Critical rules

1. **NON-CLINICAL — the cardinal rule.** Goldvale tracks, remembers, prepares; it never diagnoses, grades, stages, or prescribes. **Clinical scores are computed by deterministic code (`lib/domain`), never the LLM.** The LLM only narrates trends and poses "questions for your vet." Run every model output through `assertNonClinical()`. Red flags route to "contact your vet now," never a judgment.
2. **Aurora is the one backend.** Genuinely exercise **relational + time-series + pgvector + analytics** — that's what the AWS-database judges score. No second datastore.
3. **Scale licensing.** Only embed **CC-BY GenPup-M** + freely-available **HCPI**. LOAD / CBPI / FMPI / COAST are **vet-administered** — store the vet-supplied result, never reproduce the form.
4. **Real data in the demo path.** Validated scales + real open literature; no mock data in anything a judge sees.
5. **Public repo, MIT, no secrets.** `.env` is gitignored; never commit keys.
6. **Demo-ready on `main`.** Every PR leaves `main` showable.

## Repo conventions

```
app/                  # Next.js routes + API (route handlers / server actions)
components/            # UI (graft claude.ai/design output here)
lib/
  domain/             # PURE logic: scoring, guardrails, progression (unit-tested, no I/O)
  db/                 # Drizzle schema + Aurora client
  ai/                 # Bedrock adapters (chat + embeddings) via Vercel AI SDK
db/                   # schema.sql (SQL source of truth) + migrations
scripts/              # seed (GenPup-M items, exercise library), migrate
```

- **Pure core, thin edges.** Scoring / guardrails / progression are pure functions in `lib/domain` with tests. Anything touching Aurora or Bedrock is an adapter around the pure core.
- **Schema → domain logic → adapters → API → UI.** Validate logic with tests before wiring I/O.

## How to work

1. Build the smallest end-to-end loop first: daily check-in → mobility trend → pgvector recall → narrated card.
2. Test pure logic before adapters; validate a query before it becomes a tool.
3. Every iteration passes the 6-point **Definition of Done**: works on real data · data-model integrity · non-clinical guardrails · AWS features exercised · green (tests/types/lint) · demo-ready (Bramble flow on the preview URL).

## Working with the user (Edmund)

Pragmatic data engineer (SQL / dbt / Fabric). Values working software, local-first, honest reporting, and **no mock data in the demo path**. Frontend is designed in claude.ai/design (he provides screens; we wire them).
