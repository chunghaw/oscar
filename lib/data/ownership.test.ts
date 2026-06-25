import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limitMock = vi.fn<() => Promise<unknown[]>>();

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({
    // chainable query builder — all methods return self; final `await limit(N)`
    // resolves via our mock so each test can drive what the DB "found".
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({ limit: limitMock }),
          limit: limitMock,
        }),
      }),
    }),
  }),
}));

import { ownerOwnsPet, mostRecentPetId } from "./ownership";

beforeEach(() => limitMock.mockReset());
afterEach(() => vi.restoreAllMocks());

describe("ownerOwnsPet — the relational ownership lookup", () => {
  it("returns true when the pet row exists for that owner", async () => {
    limitMock.mockResolvedValue([{ id: "pet-A" }]);
    expect(await ownerOwnsPet("owner-1", "pet-A")).toBe(true);
  });

  it("returns false when no row matches (another owner's pet)", async () => {
    limitMock.mockResolvedValue([]);
    expect(await ownerOwnsPet("owner-1", "someone-elses-pet")).toBe(false);
  });

  it("short-circuits on empty ownerId or petId without hitting the DB", async () => {
    expect(await ownerOwnsPet("", "pet-A")).toBe(false);
    expect(await ownerOwnsPet("owner-1", "")).toBe(false);
    expect(limitMock).not.toHaveBeenCalled();
  });
});

describe("mostRecentPetId — the owner's latest pet", () => {
  it("returns the latest pet id when the owner has one", async () => {
    limitMock.mockResolvedValue([{ id: "newest-pet" }]);
    expect(await mostRecentPetId("owner-1")).toBe("newest-pet");
  });

  it("returns null when the owner has no pets", async () => {
    limitMock.mockResolvedValue([]);
    expect(await mostRecentPetId("owner-1")).toBeNull();
  });

  it("returns null on empty ownerId without hitting the DB", async () => {
    expect(await mostRecentPetId("")).toBeNull();
    expect(limitMock).not.toHaveBeenCalled();
  });
});
