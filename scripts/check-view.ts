/** Verify the live PetView assembles correctly from Aurora. Throwaway dev check. */
import { getPetViewFromDb } from "../lib/data/queries";
import { OSCAR_PET_ID } from "../lib/data/ids";

async function main() {
  const v = await getPetViewFromDb(OSCAR_PET_ID);
  if (!v) throw new Error("Oscar not found — run seed-demo-pet.ts");
  const { header, dashboard: d, checkin, brief } = v;
  console.log("HEADER     :", header.signalment, "·", header.phaseLabel, "· streak", header.streakDays, "· vet", header.vetName, "· next", header.nextVisit);
  console.log("MOBILITY   :", `${d.mobility.current}/108`, d.mobility.band, "| baseline", d.mobility.baseline, "| +" + d.mobility.improvement, "| crossedMCID", d.mobility.crossedMcid, "| dir", d.mobility.direction);
  console.log("MOBILITY pts:", d.mobility.series.map((s) => `${s.label}:${s.value}`).join(" "));
  console.log("QOL week   :", d.qol.values.join(","), "dow", d.qol.dow.join(""));
  console.log("PROGRESSION:", "fires", d.progression.fires, "|", d.progression.cleanSessions, "clean /", d.progression.spanDays, "days");
  console.log("PATTERN    :", d.pattern.lead, d.pattern.emphasis, "—", d.pattern.occurrences.map((o) => o.date).join(", "));
  console.log("RECOVERY   :", d.recovery.map((p) => `${p.week}(${p.state})`).join(" "));
  console.log("BRIEF snap :", brief.snapshot.map((s) => `${s.value}${s.unit} ${s.label}`).join(" | "));
  console.log("BRIEF meds :", brief.meds.map((m) => `${m.name} ${m.adherence}`).join(" | "));
  console.log("CHECKIN ex :", checkin.exercises.map((e) => `${e.name} ${e.dose}`).join(" | "));
  console.log("CHECKIN dt :", checkin.dateLabel, "· #" + checkin.checkinNumber);
  const et = v.exerciseTrack;
  console.log("EXERCISE   :", "gated", et.gated, "|", et.exercises.map((e) => `${e.name} ${e.fitt}`).join(", "));
  console.log("EX progress:", `${et.adherencePct}% ${et.adherenceDays}`, "| dots", et.cleanDots.map((d) => (d ? "●" : "○")).join(""), "| nudge fires", et.nudge.fires);
  console.log("EX flags   :", et.redFlags.map((f) => f.label).join(" · "));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
