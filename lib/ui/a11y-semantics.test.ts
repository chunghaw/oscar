import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repo = join(__dirname, "..", "..");
const checkin = readFileSync(join(repo, "components", "checkin", "CheckinScreen.tsx"), "utf8");
const onboarding = readFileSync(join(repo, "components", "onboarding", "OnboardingScreen.tsx"), "utf8");
const dashboard = readFileSync(join(repo, "components", "dashboard", "DashboardScreen.tsx"), "utf8");

describe("a11y semantics — field-associated validation + radio + list", () => {
  it("CheckinScreen — QoL faces are a role='radio' group with aria-checked", () => {
    expect(checkin).toMatch(/role="radiogroup"/);
    expect(checkin).toMatch(/role="radio"/);
    expect(checkin).toMatch(/aria-checked=\{on\}/);
  });

  it("CheckinScreen — save error speaks as role='alert'", () => {
    // grep the error block specifically
    expect(checkin).toMatch(/error &&\s*\(\s*<div[^>]*role="alert"/);
  });

  it("OnboardingScreen — finish-setup error speaks as role='alert'", () => {
    expect(onboarding).toMatch(/error &&\s*<div[^>]*role="alert"/);
  });

  it("DashboardScreen — recovery timeline is an ordered list with aria-current='step' on the now phase", () => {
    // ol replaces the wrapping div; li replaces the inner div; aria-current on now
    expect(dashboard).toMatch(/<ol\s+aria-label/);
    expect(dashboard).toMatch(/<\/ol>/);
    expect(dashboard).toMatch(/aria-current=\{now \? "step" : undefined\}/);
  });
});
