import { describe, it, expect } from "vitest";
import { normalizeEmail, isValidEmail, validateSignup, MIN_PASSWORD_LENGTH } from "./credentials";

describe("credential validation (pure)", () => {
  it("normalises email to trimmed lowercase", () => {
    expect(normalizeEmail("  Sam@Example.COM ")).toBe("sam@example.com");
  });

  it("accepts plausible addresses and rejects malformed ones", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("  A@B.CO ")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("no@domain")).toBe(false);
    expect(isValidEmail("no spaces@x.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("validateSignup flags a bad email first", () => {
    const issue = validateSignup("nope", "longenough");
    expect(issue?.field).toBe("email");
  });

  it("validateSignup flags a short password", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    const issue = validateSignup("sam@example.com", short);
    expect(issue?.field).toBe("password");
  });

  it("validateSignup passes a clean pair", () => {
    expect(validateSignup("sam@example.com", "a".repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });
});
