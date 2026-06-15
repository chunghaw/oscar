/**
 * Drizzle typed schema — the query layer over Aurora PostgreSQL.
 *
 * db/schema.sql is the canonical DDL (it owns partitioning, HNSW indexes, and the
 * materialized views that drizzle-kit can't fully model). This file mirrors those
 * tables for type-safe queries. Apply schema.sql via scripts/migrate.ts; use this
 * for reads/writes.
 */
import { sql } from "drizzle-orm";
import {
  pgTable, pgEnum, uuid, text, integer, boolean, jsonb, numeric, date,
  timestamp, doublePrecision, primaryKey, index, vector,
} from "drizzle-orm/pg-core";

const EMBED_DIM = 1024;

// ── enums ─────────────────────────────────────────────────────────────────────
export const speciesEnum = pgEnum("species", ["dog", "cat"]);
export const scaleLicenseEnum = pgEnum("scale_license", ["embeddable", "vet_administered", "gated"]);
export const toleranceEnum = pgEnum("tolerance_rating", ["handled", "a_bit_tired", "sore", "refused"]);
export const planStatusEnum = pgEnum("plan_status", ["active", "paused", "completed"]);
export const providerCredEnum = pgEnum("provider_cred", ["CCRT", "CCRP", "DACVSMR", "rehab_vet", "primary_vet", "none"]);

// ── relational ────────────────────────────────────────────────────────────────
export const owners = pgTable("owners", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  // bcrypt hash for email+password accounts (nullable: the seeded demo owner and
  // any onboarding-only owners may have no credentials). Never the plaintext.
  passwordHash: text("password_hash"),
  // the owner's own vet clinic — the destination for the "contact your vet now"
  // escalation path. Captured (optionally) at onboarding; never used to judge.
  vetClinic: text("vet_clinic"),
  vetPhone: text("vet_phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pets = pgTable("pets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  species: speciesEnum("species").notNull(),
  breed: text("breed"),
  dateOfBirth: date("date_of_birth"),
  isSenior: boolean("is_senior").notNull().default(false),
  chronicConditions: text("chronic_conditions").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("pets_owner_idx").on(t.ownerId)]);

export const petCaregivers = pgTable("pet_caregivers", {
  petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("caregiver"),
}, (t) => [primaryKey({ columns: [t.petId, t.ownerId] })]);

export const rehabProviders = pgTable("rehab_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  credential: providerCredEnum("credential").notNull().default("none"),
  directoryUrl: text("directory_url"),
  geoLat: doublePrecision("geo_lat"),
  geoLng: doublePrecision("geo_lng"),
});

export const scaleInstruments = pgTable("scale_instruments", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  species: speciesEnum("species").array().notNull(),
  itemCount: integer("item_count"),
  license: scaleLicenseEnum("license").notNull(),
  mcid: numeric("mcid"),
  sourceUrl: text("source_url"),
});

export const exercises = pgTable("exercises", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  species: speciesEnum("species").array().notNull().default(sql`'{dog,cat}'::species[]`),
  defaultFitt: jsonb("default_fitt"),
  howtoUrl: text("howto_url"),
  isActiveExercise: boolean("is_active_exercise").notNull().default(true),
});

export const modificationTypes = pgTable("modification_types", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  rationale: text("rationale"),
});

export const exercisePlans = pgTable("exercise_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  prescriberName: text("prescriber_name"),
  prescriberCredential: providerCredEnum("prescriber_credential").notNull().default("rehab_vet"),
  status: planStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planItems = pgTable("plan_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => exercisePlans.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id").notNull().references(() => exercises.id),
  targetReps: integer("target_reps"),
  targetSets: integer("target_sets"),
  fitt: jsonb("fitt"),
});

export const protocolTemplates = pgTable("protocol_templates", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  species: speciesEnum("species").array().notNull().default(sql`'{dog}'::species[]`),
});

export const protocolPhases = pgTable("protocol_phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: text("template_id").notNull().references(() => protocolTemplates.id, { onDelete: "cascade" }),
  weekFrom: integer("week_from").notNull(),
  weekTo: integer("week_to").notNull(),
  activities: jsonb("activities").notNull(),
  milestone: text("milestone"),
});

export const protocolInstances = pgTable("protocol_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  templateId: text("template_id").notNull().references(() => protocolTemplates.id),
  onsetDate: date("onset_date").notNull(),
  status: planStatusEnum("status").notNull().default("active"),
});

export const redFlagRules = pgTable("red_flag_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: text("template_id").references(() => protocolTemplates.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  guidance: text("guidance").notNull().default("Contact your vet now."),
});

export const literatureCitations = pgTable("literature_citations", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  externalId: text("external_id"),
  title: text("title"),
  url: text("url"),
});

// ── time-series (append-only) ─────────────────────────────────────────────────
export const dailyCheckins = pgTable("daily_checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  qolScore: integer("qol_score"),
  mobilityItems: jsonb("mobility_items"),
  note: text("note"),
}, (t) => [index("daily_checkins_pet_idx").on(t.petId, t.recordedAt)]);

export const mobilityScoreEvents = pgTable("mobility_score_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  instrumentId: text("instrument_id").notNull().references(() => scaleInstruments.id),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  rawSubscores: jsonb("raw_subscores").notNull(),
  totalScore: numeric("total_score").notNull(),
  crossedMcid: boolean("crossed_mcid").notNull().default(false),
  periodNarrative: text("period_narrative"),
  embedding: vector("embedding", { dimensions: EMBED_DIM }),
}, (t) => [index("mse_pet_idx").on(t.petId, t.recordedAt)]);

export const exerciseSessionEvents = pgTable("exercise_session_events", {
  id: uuid("id").notNull().defaultRandom(),
  petId: uuid("pet_id").notNull(),
  exerciseId: text("exercise_id").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  plannedReps: integer("planned_reps"),
  completedReps: integer("completed_reps"),
  tolerance: toleranceEnum("tolerance"),
  fatigueFlags: jsonb("fatigue_flags"),
}, (t) => [primaryKey({ columns: [t.id, t.recordedAt] }), index("ese_pet_idx").on(t.petId, t.recordedAt)]);

export const medicationEvents = pgTable("medication_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  medName: text("med_name").notNull(),
  given: boolean("given").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const redFlagObservationEvents = pgTable("red_flag_observation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  ruleId: uuid("rule_id").references(() => redFlagRules.id),
  escalated: boolean("escalated").notNull().default(false),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bcsMcsEvents = pgTable("bcs_mcs_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  bcs: integer("bcs"),
  mcs: text("mcs"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── pgvector (semantic memory) ────────────────────────────────────────────────
export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  text: text("text").notNull(),
  embedding: vector("embedding", { dimensions: EMBED_DIM }),
}, (t) => [index("journal_pet_idx").on(t.petId, t.recordedAt)]);

export const literatureChunks = pgTable("literature_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  citationId: uuid("citation_id").notNull().references(() => literatureCitations.id, { onDelete: "cascade" }),
  chunk: text("chunk").notNull(),
  embedding: vector("embedding", { dimensions: EMBED_DIM }),
});

// ── companion chat (the multimodal agent; non-clinical scribe) ──────────────────
export const chatRoleEnum = pgEnum("chat_role", ["owner", "assistant"]);

export const chatThreads = pgTable("chat_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("chat_threads_pet_idx").on(t.petId)]);

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull().references(() => chatThreads.id, { onDelete: "cascade" }),
  role: chatRoleEnum("role").notNull(),
  text: text("text"),
  /** rich-card payloads (agent tool outputs) the client renders inside the bubble */
  cards: jsonb("cards"),
  /** attached media refs for owner messages */
  media: jsonb("media"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("chat_messages_thread_idx").on(t.threadId, t.createdAt)]);

// ── media library (photos/videos) — relational + pgvector visual recall ─────────
export const mediaKindEnum = pgEnum("media_kind", ["photo", "video"]);

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  kind: mediaKindEnum("kind").notNull(),
  url: text("url").notNull(),
  caption: text("caption"),
  durationSec: integer("duration_sec"),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id, { onDelete: "set null" }),
  mentionAtVet: boolean("mention_at_vet").notNull().default(false),
  embedding: vector("embedding", { dimensions: EMBED_DIM }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("media_pet_idx").on(t.petId, t.recordedAt)]);
