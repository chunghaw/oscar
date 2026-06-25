import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// hoisted mocks: each test resets via vi.mocked(...).mockImplementation
vi.mock("@/auth", () => ({
  auth: vi.fn<() => Promise<unknown>>(),
}));
vi.mock("@/lib/data/ownership", () => ({
  ownerOwnsPet: vi.fn<(ownerId: string, petId: string) => Promise<boolean>>(),
}));
vi.mock("@/lib/data/pets", () => ({
  DEMO_PET_ID: "demo-pet-id",
}));

import { auth } from "@/auth";
import { ownerOwnsPet } from "@/lib/data/ownership";
import { requirePetAccess } from "./access";

// auth's real type is a multi-overload NextAuth helper; the mock is a plain
// async fn returning either null or a minimal session shape. Cast through
// vi.fn so the .mock* methods are reachable without arguing with the overloads.
type SessionShape = { user?: { ownerId?: string } } | null;
const authMock = auth as unknown as ReturnType<typeof vi.fn<() => Promise<SessionShape>>>;
const ownsMock = ownerOwnsPet as unknown as ReturnType<typeof vi.fn<(o: string, p: string) => Promise<boolean>>>;

beforeEach(() => {
  authMock.mockReset();
  ownsMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("requirePetAccess — the action-level ownership gate", () => {
  it("lets the public demo pet through without a session (it's the open demo)", async () => {
    // no auth() call needed — short-circuit on the demo id
    await expect(requirePetAccess("demo-pet-id")).resolves.toBeUndefined();
    expect(auth).not.toHaveBeenCalled();
    expect(ownerOwnsPet).not.toHaveBeenCalled();
  });

  it("rejects an unsigned-in caller for any non-demo pet", async () => {
    authMock.mockResolvedValue(null);
    await expect(requirePetAccess("private-pet")).rejects.toThrow(/Not signed in/);
  });

  it("rejects a signed-in owner who does NOT own the pet", async () => {
    authMock.mockResolvedValue({ user: { ownerId: "owner-A" } });
    ownsMock.mockResolvedValue(false);
    await expect(requirePetAccess("pet-belonging-to-B")).rejects.toThrow(/don't have access/);
    expect(ownerOwnsPet).toHaveBeenCalledWith("owner-A", "pet-belonging-to-B");
  });

  it("allows a signed-in owner who DOES own the pet", async () => {
    authMock.mockResolvedValue({ user: { ownerId: "owner-A" } });
    ownsMock.mockResolvedValue(true);
    await expect(requirePetAccess("pet-belonging-to-A")).resolves.toBeUndefined();
  });

  it("never asks ownership about the demo pet (cheaper + no auth required)", async () => {
    await requirePetAccess("demo-pet-id");
    expect(ownerOwnsPet).not.toHaveBeenCalled();
  });
});
