import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted so the vi.mock factory below can reach into the same state the
// `beforeEach` resets. Each `await` against the fake DB consumes one slot.
const state = vi.hoisted(() => ({ responses: [] as unknown[][], i: 0 }));

vi.mock("@/lib/db/client", () => ({
  getDb: () => {
    const next = () => state.responses[state.i++] ?? [];
    // Thenable proxy: every chained query-builder method returns the same
    // proxy; `await`ing it resolves to the next queued response.
    const chain: unknown = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => resolve(next());
        }
        if (typeof prop !== "string") return undefined;
        return () => chain;
      },
    });
    return {
      select: () => chain,
      execute: () => Promise.resolve(next()),
    };
  },
}));

// embedText is referenced from a top-level import but never executed for a
// pet with no journal lookup. Stub it harmlessly.
vi.mock("@/lib/ai/bedrock", () => ({
  embedText: vi.fn(async () => new Array(1024).fill(0)),
  chatModel: () => ({}),
}));

import { getPetViewFromDb } from "./queries";

const PET_ID = "empty-pet-uuid";
const NOW = new Date("2026-06-09T09:00:00Z");

beforeEach(() => {
  state.i = 0;
  // Named slots, in the exact order getPetViewFromDb awaits them for an
  // empty pet. A query reorder in queries.ts will misalign these — using
  // named keys means the failure points at the right thing.
  const EMPTY_RESPONSES = {
    pet: [{
      id: PET_ID,
      ownerId: "owner-1",
      name: "Luna",
      species: "cat",
      breed: null,
      dateOfBirth: null,
      isSenior: false,
      chronicConditions: [],
      createdAt: new Date("2026-06-01T00:00:00Z"),
    }],
    exercisePlans: [],
    protocolInstances: [],
    modificationTypes: [],
    mobilityScoreEvents: [],
    dailyCheckins: [],
    exerciseSessionEvents: [],
    medicationEvents: [],
    baselineMv: [],
    adherenceMv: [],
  };
  state.responses = Object.values(EMPTY_RESPONSES);
});

describe("getPetViewFromDb — empty pet (zero check-ins / exercises / scores)", () => {
  it("renders a clean PetView with band 'none', empty series, and no NaN", async () => {
    const v = await getPetViewFromDb(PET_ID, NOW);
    expect(v).not.toBeNull();
    if (!v) return;

    // header — the signalment falls back to just the pet name (no age, no breed)
    expect(v.header.id).toBe(PET_ID);
    expect(v.header.name).toBe("Luna");
    expect(v.header.signalment).toBe("Luna");
    expect(v.header.phaseLabel).toBe(""); // no protocol → no phase
    expect(v.header.nextVisit).toBeNull(); // no protocol → no next visit
    expect(v.header.streakDays).toBe(0);

    // mobility trend — empty series, current/baseline 0, band "none"
    const m = v.dashboard.mobility;
    expect(m.series).toEqual([]);
    expect(m.baseline).toBe(0);
    expect(m.current).toBe(0);
    expect(m.band).toBe("none");
    expect(m.improvement).toBe(0);
    expect(m.crossedMcid).toBe(false);
    expect(m.direction).toBe("stable");

    // QoL week — empty arrays + no narrative line (we only show one when there's data)
    expect(v.dashboard.qol.values).toEqual([]);
    expect(v.dashboard.qol.dow).toEqual([]);
    expect(v.dashboard.qol.note).toBe("");

    // pattern memory — no occurrences
    expect(v.dashboard.pattern.occurrences).toEqual([]);
    expect(v.dashboard.pattern.emphasis).toBe("in recent check-ins");

    // recovery + protocol label — empty (no protocol)
    expect(v.dashboard.recovery).toEqual([]);
    expect(v.dashboard.protocolLabel).toBe("");

    // brief snapshot — every figure should render the "—" placeholder, not NaN
    for (const s of v.brief.snapshot) {
      expect(s.value).not.toMatch(/NaN/);
      expect(s.unit).not.toMatch(/NaN/);
    }
    expect(v.brief.mentions).toEqual([]); // nothing to surface yet
    expect(v.brief.meds).toEqual([]);

    // exercise track — gated since there's no plan
    expect(v.exerciseTrack.gated).toBe(true);
    expect(v.exerciseTrack.exercises).toEqual([]);
    expect(v.exerciseTrack.adherencePct).toBe(0);
    expect(v.exerciseTrack.history).toHaveLength(14);
    expect(v.exerciseTrack.history.every((n) => n === 0)).toBe(true);
  });

  it("survives a stringified pass — no value anywhere is NaN", async () => {
    const v = await getPetViewFromDb(PET_ID, NOW);
    const json = JSON.stringify(v);
    expect(json).not.toMatch(/NaN/i);
  });

  it("returns null when the pet doesn't exist", async () => {
    state.responses = [[]]; // pet lookup returns empty
    const v = await getPetViewFromDb("ghost", NOW);
    expect(v).toBeNull();
  });
});
