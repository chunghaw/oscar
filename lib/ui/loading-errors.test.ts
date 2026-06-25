import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repo = join(__dirname, "..", "..");
const companion = readFileSync(join(repo, "components", "companion", "CompanionScreen.tsx"), "utf8");
const media = readFileSync(join(repo, "components", "media", "MediaTimelineScreen.tsx"), "utf8");
const brief = readFileSync(join(repo, "components", "vet-brief", "VetBriefScreen.tsx"), "utf8");
const loading = readFileSync(join(repo, "app", "pets", "[id]", "loading.tsx"), "utf8");

/**
 * Lock the loading / error-recovery affordances added for P4 #10 so a future
 * refactor can't silently drop them. The components run in the browser, but
 * the strings are visible at module scope — content checks are enough.
 */
describe("companion chat — loading + error recovery", () => {
  it("typing indicator is announced to screen readers", () => {
    expect(companion).toMatch(/role="status"[\s\S]*?aria-live="polite"[\s\S]*?Companion is typing/);
  });

  it("a failed send surfaces a Retry affordance with role=alert", () => {
    expect(companion).toMatch(/handleRetry/);
    expect(companion).toMatch(/role="alert"/);
    expect(companion).toMatch(/aria-label="Retry the last message"/);
    expect(companion).toMatch(/Tap Retry to try again\./);
  });
});

describe("media timeline — visual recall has explicit loading + error states", () => {
  it("recall sheet exposes a Retry button on failure", () => {
    expect(media).toMatch(/role="alert"/);
    // the source uses &rsquo; for the apostrophe — accept either form
    expect(media).toMatch(/Couldn(.{1,8})t reach the recall service/);
    expect(media).toMatch(/aria-label="Retry similar days"/);
  });

  it("loading state shows an aria-labeled spinner, not a silent skeleton", () => {
    expect(media).toMatch(/aria-label="Loading similar days"/);
    expect(media).toMatch(/Finding similar days/);
  });

  it("the mentions banner is polite-announced when the count changes", () => {
    expect(media).toMatch(/role="status"[\s\S]*?aria-live="polite"[\s\S]*?flagged for/);
  });
});

describe("vet brief — honest Share feedback (no fake confirmation toggle)", () => {
  it("copies a markdown brief to the clipboard via navigator.clipboard", () => {
    expect(brief).toMatch(/navigator\.clipboard\?.writeText/);
    expect(brief).toMatch(/buildBriefMarkdown/);
  });

  it("confirms with role=status / fails with role=alert (no silent toggle)", () => {
    expect(brief).toMatch(/role="status"[\s\S]*?Brief copied to your clipboard/);
    expect(brief).toMatch(/role="alert"/);
  });

  it("uses non-clinical, vet-routed share copy", () => {
    expect(brief).toMatch(/Copy brief for/);
    expect(brief).toMatch(/Copied — paste it to your vet/);
  });
});

describe("dashboard route — loading skeleton", () => {
  it("exports a Next.js loading.tsx with a labelled status region", () => {
    expect(loading).toMatch(/export default function/);
    expect(loading).toMatch(/role="status"[\s\S]*?aria-label="Loading dashboard"/);
  });
});
