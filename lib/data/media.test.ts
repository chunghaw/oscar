import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SQL } from "drizzle-orm";

// capture every SQL fragment getSimilarMedia hands to db.execute
const executeMock = vi.fn<(q: SQL) => Promise<unknown[]>>();

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({
    execute: (q: SQL) => executeMock(q),
  }),
}));

vi.mock("@/lib/storage/s3", () => ({
  presignGet: async (key: string) => `https://signed/${key}`,
}));

import { getSimilarMedia } from "./media";

beforeEach(() => {
  executeMock.mockReset();
  executeMock.mockResolvedValue([]);
});

describe("getSimilarMedia — reference-embedding subqueries are pet-scoped (defense in depth)", () => {
  it("constrains both reference-embedding subqueries to the same petId", async () => {
    await getSimilarMedia("pet-A", "media-1", 5);
    expect(executeMock).toHaveBeenCalledTimes(1);

    // Drizzle SQL exposes its literal chunks via JSON; we look at the literal
    // text so the test breaks if someone removes the per-pet filter again.
    const sqlText = JSON.stringify(executeMock.mock.calls[0][0]);
    // outer where + two subqueries (sim numerator + order-by) = three pet_id constraints
    const petIdCount = (sqlText.match(/pet_id/g) ?? []).length;
    expect(petIdCount).toBeGreaterThanOrEqual(3);
    // each subquery must filter by BOTH id AND pet_id
    expect(sqlText).toMatch(/where id =.*and pet_id =/);
  });

  it("passes the caller's petId and mediaId through to the parameterised query", async () => {
    await getSimilarMedia("pet-A", "media-X", 7);
    const sqlObj = executeMock.mock.calls[0][0] as unknown as { queryChunks?: unknown[] };
    const chunks = JSON.stringify(sqlObj.queryChunks ?? sqlObj);
    expect(chunks).toContain("pet-A");
    expect(chunks).toContain("media-X");
  });
});
