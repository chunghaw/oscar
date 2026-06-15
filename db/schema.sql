-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Goldvale — Aurora PostgreSQL schema (v0.1)                                 ║
-- ║ Senior/chronic-care + home-rehab companion. H0 hackathon.                  ║
-- ║                                                                            ║
-- ║ ONE Aurora instance, four load-bearing layers (the judge-facing story):    ║
-- ║   RELATIONAL  — pets, owners, vets, plans, protocols                       ║
-- ║   TIME-SERIES — append-only event tables (the trend spine; partitioned)    ║
-- ║   PGVECTOR    — semantic recall (journal, mobility periods, literature RAG) ║
-- ║   ANALYTICS   — materialized views (baselines, MCID flags, adherence)      ║
-- ║                                                                            ║
-- ║ NON-CLINICAL: scores are computed by deterministic code, never the LLM.    ║
-- ║ Target: Aurora PostgreSQL 15/16 + pgvector >= 0.7. Embeddings = Bedrock    ║
-- ║ Titan Text v2 (1024-dim) or Cohere Embed (1024-dim).                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;          -- gen_random_uuid()

-- ── enums ────────────────────────────────────────────────────────────────────
CREATE TYPE species          AS ENUM ('dog','cat');
CREATE TYPE scale_license    AS ENUM ('embeddable','vet_administered','gated');     -- GenPup-M=embeddable; LOAD/CBPI/FMPI=gated
CREATE TYPE tolerance_rating AS ENUM ('handled','a_bit_tired','sore','refused');
CREATE TYPE plan_status      AS ENUM ('active','paused','completed');
CREATE TYPE provider_cred    AS ENUM ('CCRT','CCRP','DACVSMR','rehab_vet','primary_vet','none');

-- ╔═════════════════════════ RELATIONAL ═══════════════════════════════════════╗
CREATE TABLE owners (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL,
  display_name text,
  password_hash text,                                -- bcrypt hash for email+password accounts (nullable)
  vet_clinic  text,                                  -- owner's vet (escalation destination)
  vet_phone   text,                                  -- tel: target for "contact your vet now"
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name        text NOT NULL,
  species     species NOT NULL,
  breed       text,
  date_of_birth date,
  is_senior   boolean NOT NULL DEFAULT false,
  chronic_conditions text[] NOT NULL DEFAULT '{}',     -- e.g. {osteoarthritis,ivdd}
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON pets (owner_id);

-- co-caregiver sharing (spouse / adult child / remote rehab vet view access)
CREATE TABLE pet_caregivers (
  pet_id      uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'caregiver',       -- caregiver | viewer | vet
  PRIMARY KEY (pet_id, owner_id)
);

CREATE TABLE rehab_providers (              -- referral surface (AARV/CCRP/ACVSMR)
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  credential  provider_cred NOT NULL DEFAULT 'none',
  directory_url text,
  geo_lat     double precision,
  geo_lng     double precision
);

-- validated scales (GenPup-M embeddable; LOAD/CBPI/FMPI gated → store result only)
CREATE TABLE scale_instruments (
  id          text PRIMARY KEY,            -- 'genpup_m','hcpi','load','cbpi','fmpi','bcs','mcs'
  display_name text NOT NULL,
  species     species[] NOT NULL,
  item_count  int,
  license     scale_license NOT NULL,
  mcid        numeric,                     -- minimal clinically important difference (e.g. LOAD 4)
  source_url  text
);

-- controlled exercise vocabulary (each with an open-reference how-to card)
CREATE TABLE exercises (
  id          text PRIMARY KEY,            -- 'sit_to_stand','cavaletti','weight_shift',...
  display_name text NOT NULL,
  species     species[] NOT NULL DEFAULT '{dog,cat}',
  default_fitt jsonb,                      -- {freq,intensity,time,type}
  howto_url   text,                        -- AKC/CARE open reference
  is_active_exercise boolean NOT NULL DEFAULT true     -- active preferred over passive
);

CREATE TABLE modification_types (          -- pyramid base: environmental mods
  id          text PRIMARY KEY,            -- 'non_slip_mat','ramp','raised_bowl','ortho_bed'
  display_name text NOT NULL,
  rationale   text
);

-- vet-attributed home exercise plan (gates the exercise track)
CREATE TABLE exercise_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  prescriber_name text,
  prescriber_credential provider_cred NOT NULL DEFAULT 'rehab_vet',
  status      plan_status NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE plan_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES exercise_plans(id) ON DELETE CASCADE,
  exercise_id text NOT NULL REFERENCES exercises(id),
  target_reps int, target_sets int, fitt jsonb
);

-- condition recovery templates (post-op TPLO, IVDD/neuro) + red flags
CREATE TABLE protocol_templates (
  id          text PRIMARY KEY,            -- 'tplo_post_op','ivdd_conservative'
  display_name text NOT NULL,
  species     species[] NOT NULL DEFAULT '{dog}'
);
CREATE TABLE protocol_phases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL REFERENCES protocol_templates(id) ON DELETE CASCADE,
  week_from   int NOT NULL, week_to int NOT NULL,
  activities  jsonb NOT NULL,              -- scheduled exercises/modalities for the phase
  milestone   text                         -- e.g. '8-week radiograph gates off-leash'
);
CREATE TABLE protocol_instances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  template_id text NOT NULL REFERENCES protocol_templates(id),
  onset_date  date NOT NULL,
  status      plan_status NOT NULL DEFAULT 'active'
);
CREATE TABLE red_flag_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text REFERENCES protocol_templates(id) ON DELETE CASCADE,
  label       text NOT NULL,               -- 'new/complete loss of deep pain'
  guidance    text NOT NULL DEFAULT 'Contact your vet now.'
);

CREATE TABLE literature_citations (        -- cited in the vet-prep brief
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text NOT NULL,               -- 'OpenAlex' | 'PubMed' | 'WSAVA' | 'AAHA'
  external_id text, title text, url text
);

-- ╔═════════════════════════ TIME-SERIES ══════════════════════════════════════╗
-- the trend spine; append-only. Showcase declarative range-partitioning on the
-- two highest-volume tables. (Use pg_partman to auto-roll monthly partitions.)

-- daily 20-second check-in (Villalobos HHHHHMM + rotating mobility items)
CREATE TABLE daily_checkins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  qol_score   int,                         -- HHHHHMM total
  mobility_items jsonb,                     -- {limping:true, stairs_reluctant:true, ...}
  note        text
);
CREATE INDEX ON daily_checkins (pet_id, recorded_at DESC);

-- full validated-scale administration (deterministic score; embeddable for recall)
CREATE TABLE mobility_score_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  instrument_id text NOT NULL REFERENCES scale_instruments(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  raw_subscores jsonb NOT NULL,
  total_score numeric NOT NULL,
  crossed_mcid boolean NOT NULL DEFAULT false,           -- computed by code, not the LLM
  period_narrative text,                                 -- short Claude-written period summary
  embedding   vector(1024)                               -- item-response + narrative vector
);
CREATE INDEX ON mobility_score_events (pet_id, recorded_at DESC);
CREATE INDEX ON mobility_score_events USING hnsw (embedding vector_cosine_ops);

-- exercise sessions (planned vs completed + tolerance) — PARTITIONED by month
CREATE TABLE exercise_session_events (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id      uuid NOT NULL,
  exercise_id text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  planned_reps int, completed_reps int,
  tolerance   tolerance_rating,
  fatigue_flags jsonb,                      -- {panting,lagging,limping,tremors}
  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);
CREATE TABLE exercise_session_events_2026_06 PARTITION OF exercise_session_events
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE exercise_session_events_2026_07 PARTITION OF exercise_session_events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE exercise_session_events_default PARTITION OF exercise_session_events DEFAULT;
CREATE INDEX ON exercise_session_events (pet_id, recorded_at DESC);

-- environmental-mod adherence + slip/fall incidents
CREATE TABLE modification_adherence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  modification_id text NOT NULL REFERENCES modification_types(id),
  status text NOT NULL,                     -- done | declined | reminded
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE fall_slip_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  zone text, recorded_at timestamptz NOT NULL DEFAULT now()
);

-- medication adherence (existing engine, now shared with exercises)
CREATE TABLE medication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  med_name text NOT NULL, given boolean NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- protocol progress + red-flag observations (escalate-to-vet)
CREATE TABLE red_flag_observation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES red_flag_rules(id),
  escalated boolean NOT NULL DEFAULT false,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- slow monthly trends: body + muscle condition (sarcopenia)
CREATE TABLE bcs_mcs_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  bcs int, mcs text, recorded_at timestamptz NOT NULL DEFAULT now()
);

-- pose / form-coaching consistency (NON-clinical: self-similarity only)
CREATE TABLE pose_consistency_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  exercise_id text REFERENCES exercises(id),
  self_similarity numeric, completeness numeric, cadence_variance numeric,
  embedding vector(1024),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON pose_consistency_events USING hnsw (embedding vector_cosine_ops);

-- ╔═════════════════════════ PGVECTOR (semantic memory) ═══════════════════════╗
-- symptom journal (the "this resembles 5 weeks ago" recall)
CREATE TABLE journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  text text NOT NULL,
  embedding vector(1024)
);
CREATE INDEX ON journal_entries (pet_id, recorded_at DESC);
CREATE INDEX ON journal_entries USING hnsw (embedding vector_cosine_ops);

-- open rehab/OA literature corpus for the cited vet-prep brief (RAG)
CREATE TABLE literature_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citation_id uuid NOT NULL REFERENCES literature_citations(id) ON DELETE CASCADE,
  chunk text NOT NULL,
  embedding vector(1024)
);
CREATE INDEX ON literature_chunks USING hnsw (embedding vector_cosine_ops);

-- ╔═════════════════════════ COMPANION CHAT + MEDIA ═══════════════════════════╗
-- multimodal AI companion (non-clinical scribe) + media library (photos/videos).
CREATE TYPE chat_role  AS ENUM ('owner','assistant');
CREATE TYPE media_kind AS ENUM ('photo','video');

CREATE TABLE chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON chat_threads (pet_id);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role chat_role NOT NULL,
  text text,
  cards jsonb,                 -- agent tool outputs the client renders as rich cards
  media jsonb,                 -- attached media refs for owner messages
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON chat_messages (thread_id, created_at);

-- photos/videos: relational record + pgvector visual recall ("similar days")
CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  kind media_kind NOT NULL,
  url text NOT NULL,                                  -- S3 object url/key
  caption text,
  duration_sec int,
  journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL,
  mention_at_vet boolean NOT NULL DEFAULT false,
  embedding vector(1024),                            -- Titan multimodal (image+text)
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON media_assets (pet_id, recorded_at DESC);
CREATE INDEX ON media_assets USING hnsw (embedding vector_cosine_ops);

-- ╔═════════════════════════ ANALYTICS (materialized views) ═══════════════════╗
-- per-pet rolling baseline of each mobility scale + MCID-crossing flag
CREATE MATERIALIZED VIEW rolling_baseline_mv AS
SELECT pet_id, instrument_id,
       avg(total_score)                        AS mean_score,
       stddev_pop(total_score)                 AS sd_score,
       count(*)                                AS n,
       max(recorded_at)                        AS last_at,
       bool_or(crossed_mcid)                   AS ever_crossed_mcid
FROM mobility_score_events
GROUP BY pet_id, instrument_id;
CREATE UNIQUE INDEX ON rolling_baseline_mv (pet_id, instrument_id);

-- weekly exercise adherence % per pet (drives the FITT progression nudge)
CREATE MATERIALIZED VIEW adherence_rollup_mv AS
SELECT pet_id,
       date_trunc('week', recorded_at)         AS week,
       count(*)                                AS sessions,
       avg( (completed_reps::numeric / NULLIF(planned_reps,0)) ) AS adherence_ratio,
       count(*) FILTER (WHERE tolerance IN ('sore','refused')) AS poor_tolerance_n
FROM exercise_session_events
GROUP BY pet_id, date_trunc('week', recorded_at);
CREATE UNIQUE INDEX ON adherence_rollup_mv (pet_id, week);

-- Refresh both after writes:  REFRESH MATERIALIZED VIEW CONCURRENTLY <name>;

-- ╔═════════════════════════ NOTES ════════════════════════════════════════════╗
-- • The vet-prep brief is a parameterised aggregation across the time-series
--   tables + a pgvector kNN over journal_entries (pet's own analogues) and
--   literature_chunks (cited evidence), narrated by Bedrock Claude.
-- • Clinical scores (GenPup-M etc.) are computed in app code, stored here; the
--   LLM only narrates trends + poses "questions for your vet" — never diagnoses.
-- • Embedding dim 1024 assumes Bedrock Titan Text v2 / Cohere Embed; change every
--   vector(1024) + HNSW index together if you switch models.
