import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./passwords";

describe("password hashing", () => {
  it("produces a bcrypt hash that is not the plaintext", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).not.toBe("correct horse battery");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("s3cret-passphrase");
    expect(await verifyPassword("s3cret-passphrase", hash)).toBe(true);
    expect(await verifyPassword("wrong-passphrase", hash)).toBe(false);
  });

  it("salts: the same password hashes differently each time", async () => {
    const a = await hashPassword("same-input-123");
    const b = await hashPassword("same-input-123");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-input-123", a)).toBe(true);
    expect(await verifyPassword("same-input-123", b)).toBe(true);
  });
});
