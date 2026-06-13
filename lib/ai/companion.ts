/**
 * The Goldvale companion agent — a non-clinical scribe/vet-prep assistant.
 *
 * Bedrock Claude (Sonnet 4.6) with tool-use against Aurora: it logs observations to
 * the journal, recalls the owner's own past notes (pgvector), narrates their own
 * mobility trend, flags things for the vet, and escalates red flags. It NEVER
 * diagnoses — the final reply is run through the non-clinical guardrail before it
 * leaves this module, and each tool call surfaces a "rich card" for the UI.
 */
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { chatModel, embedText } from "@/lib/ai/bedrock";
import { checkNonClinical } from "@/lib/domain/guardrails";
import { bandFor } from "@/lib/domain/mobility";
import { getDb } from "@/lib/db/client";
import { journalEntries, mobilityScoreEvents } from "@/lib/db/schema";
import { recallSimilarJournal } from "@/lib/data/queries";

export type CompanionCard =
  | { type: "logged" }
  | { type: "vetbrief" }
  | { type: "redflag" }
  | { type: "recall"; occurrences: { date: string; weight: number; text: string }[] }
  | { type: "mobility"; series: number[]; improvement: number };

export interface ChatTurn {
  role: "owner" | "assistant";
  text: string;
}

export interface CompanionReply {
  text: string;
  cards: CompanionCard[];
}

const SYSTEM = (petName: string) => `You are Goldvale, a calm companion for the owner of a senior or chronically-ill pet named ${petName}.
You are a COMPANION, SCRIBE, and VET-PREP assistant — NOT a veterinarian. You NEVER diagnose, grade, stage, or prescribe, and you never say what a condition "is".

How to help:
- When the owner reports an observation about ${petName}, call logToJournal to save it, then reply warmly and briefly.
- When they ask whether something has happened before, or about patterns, call recallPastNotes.
- When they ask how ${petName} is doing or about the trend, call getMobilityTrend and narrate it ONLY relative to ${petName}'s own baseline. The mobility scale (GenPup-M) is HIGHER = WORSE, so a LOWER score is BETTER; use the tool's 'direction'/'betterThanBaseline' fields and never describe a lower score as worse (e.g. current 34 vs baseline 42 = "8 points better than baseline"). Never frame it as a condition.
- When something is worth raising at the next vet visit, call addVetBriefQuestion.
- If they describe a possible emergency or red flag (sudden inability to bear weight, collapse, loss of coordination, can't urinate, severe distress, bleeding), call escalateToVet and tell them to contact their vet now. Do NOT assess it.
- For a photo, say you've saved it and can't assess it; name observable things worth the vet seeing (redness/heat/discharge/swelling) and offer to flag it. Never interpret the image as a condition.

Keep replies short, warm, and plain. Always route real concern back to the vet.`;

export async function runCompanion(opts: { petId: string; petName: string; history: ChatTurn[] }): Promise<CompanionReply> {
  const { petId, petName, history } = opts;
  const db = getDb();
  const cards: CompanionCard[] = [];

  const tools = {
    logToJournal: tool({
      description: "Save an observation the owner just reported to the pet's journal record.",
      inputSchema: z.object({ text: z.string().describe("the observation, in plain words") }),
      execute: async ({ text }: { text: string }) => {
        const embedding = await embedText(text);
        await db.insert(journalEntries).values({ petId, text, embedding });
        cards.push({ type: "logged" });
        return { ok: true };
      },
    }),
    recallPastNotes: tool({
      description: "Find the owner's own past journal notes that resemble a topic, to surface a pattern.",
      inputSchema: z.object({ query: z.string().describe("what to look for, e.g. 'stiff getting up'") }),
      execute: async ({ query }: { query: string }) => {
        const hits = await recallSimilarJournal(petId, query, 3);
        cards.push({ type: "recall", occurrences: hits.map((h, i) => ({ date: h.date, weight: 16 + i * 5, text: h.text })) });
        return { found: hits.map((h) => ({ date: h.date, text: h.text })) };
      },
    }),
    getMobilityTrend: tool({
      description: "Get the pet's recent mobility scores (their OWN trend) to narrate relative to baseline.",
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await db.select().from(mobilityScoreEvents)
          .where(eq(mobilityScoreEvents.petId, petId)).orderBy(asc(mobilityScoreEvents.recordedAt));
        const series = rows.map((r) => Number(r.totalScore));
        if (!series.length) return { available: false };
        const baseline = series[0], current = series[series.length - 1];
        const improvement = baseline - current; // GenPup-M is higher = worse → positive = better
        cards.push({ type: "mobility", series, improvement });
        return {
          current, baseline, improvement,
          betterThanBaseline: improvement > 0,
          direction: improvement > 0 ? "better" : improvement < 0 ? "worse" : "steady",
          band: bandFor(current),
          scaleNote: "GenPup-M runs 0–108 where a LOWER score is BETTER. 'improvement' is baseline minus current, so a positive value means the pet is doing BETTER than its own baseline. Never describe a lower score as worse.",
        };
      },
    }),
    addVetBriefQuestion: tool({
      description: "Flag a question or item to raise at the next vet visit.",
      inputSchema: z.object({ question: z.string() }),
      execute: async ({ question }: { question: string }) => {
        const text = `For the vet: ${question}`;
        const embedding = await embedText(text);
        await db.insert(journalEntries).values({ petId, text, embedding });
        cards.push({ type: "vetbrief" });
        return { ok: true };
      },
    }),
    escalateToVet: tool({
      description: "Use when the owner describes a possible emergency or red flag. Routes them to the vet; never assess it.",
      inputSchema: z.object({ reason: z.string() }),
      execute: async () => {
        cards.push({ type: "redflag" });
        return { guidance: "Contact your vet now." };
      },
    }),
  };

  const messages = history.map((h) => ({
    role: (h.role === "owner" ? "user" : "assistant") as "user" | "assistant",
    content: h.text,
  }));

  const res = await generateText({
    model: chatModel(),
    system: SYSTEM(petName),
    messages,
    tools,
    stopWhen: stepCountIs(5),
  });

  let text = res.text?.trim() || "I've made a note of that.";
  if (!checkNonClinical(text).ok) {
    text = "I can't speak to what that might be — but I've made a note, and it's worth raising with your vet.";
  }
  return { text, cards };
}
