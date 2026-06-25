/**
 * Dashboard (mobile) — the longitudinal mobility story. Server-rendered from the
 * domain-computed view; only the mobility chart's mount animation is a client
 * island. Trends are always relative to the pet's OWN baseline and banded, never
 * interpreted as a condition; the progression card stays a question and only
 * appears when lib/domain says the nudge fires.
 */
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";
import { Face } from "@/components/ui/Face";
import { VetLine } from "@/components/ui/VetLine";
import { Hero, HeroStats } from "@/components/ui/Hero";
import { Ico } from "@/components/ui/icons";
import { A, C } from "@/components/ui/tokens";
import { MobilityChart } from "./MobilityChart";
import { SignOutButton } from "./SignOutButton";
import { bandLabel } from "@/lib/data/pets";
import type { DashboardView, PetHeader, ProgressionNudge, PatternMemory, RecoveryPhase, QolWeek } from "@/lib/data/view";

function QolWeekCard({ qol }: { qol: QolWeek }) {
  return (
    <Card>
      <SectionHead icon={Ico.heart({ s: 18, c: A.slate.c })} accent={A.slate} title="The week in mood" hint="last 7 days" />
      {qol.values.length === 0 ? (
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, padding: "4px 2px 2px" }}>
          No check-ins yet this week — your first one starts the picture.
        </div>
      ) : (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
        {qol.values.map((lv, i) => {
          const today = i === qol.values.length - 1;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: today ? A.slate.soft : C.field,
                  boxShadow: today ? `0 0 0 2px ${A.slate.c}` : "none",
                }}
              >
                <Face level={lv} size={26} stroke={today ? C.charcoal : "#9aa39d"} sw={1.7} />
              </div>
              <div style={{ fontSize: 10, color: today ? C.charcoal : C.muted, fontWeight: today ? 700 : 600 }}>
                {qol.dow[i]}
              </div>
            </div>
          );
        })}
      </div>
      )}
      {qol.note && <div style={{ fontSize: 12, color: C.muted, marginTop: 13, lineHeight: 1.45 }}>{qol.note}</div>}
    </Card>
  );
}

function ProgressionCard({ nudge, briefHref }: { nudge: ProgressionNudge; briefHref: string }) {
  return (
    <Card style={{ background: "linear-gradient(165deg, #ffffff, #f4f9f7)", borderColor: "rgba(63,143,134,0.28)" }}>
      <SectionHead icon={Ico.activity({ s: 18, c: A.teal.c })} accent={A.teal} title="A gentle milestone" />
      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, letterSpacing: -0.1 }}>{nudge.headline}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 13 }}>
        {Array.from({ length: nudge.cleanSessions }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 7,
              borderRadius: 999,
              background: A.teal.c,
              opacity: 0.4 + (i / nudge.cleanSessions) * 0.55,
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: "#4a544f", lineHeight: 1.45, marginTop: 13 }}>{nudge.question}</div>
      <Link
        href={briefHref}
        className="gv-press"
        style={{
          width: "100%",
          marginTop: 14,
          padding: "12px",
          borderRadius: 13,
          cursor: "pointer",
          border: `1px solid ${A.teal.c}`,
          background: "var(--teal-soft)",
          color: "#2f6a62",
          fontSize: 14,
          fontWeight: 650,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          textDecoration: "none",
        }}
      >
        Add to vet brief {Ico.chevR({ s: 16, c: "#2f6a62" })}
      </Link>
    </Card>
  );
}

function PatternCard({ pattern, href }: { pattern: PatternMemory; href: string }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
        <span style={{ display: "flex", color: C.sage }}>{Ico.sparkles({ s: 15, c: C.sage })}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: C.sage }}>
          {pattern.eyebrow}
        </span>
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 17.5, fontWeight: 500, lineHeight: 1.36, letterSpacing: -0.1 }}>
        {pattern.lead} <span style={{ fontStyle: "italic", fontWeight: 600 }}>{pattern.emphasis}</span>.
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 14 }}>
        {pattern.occurrences.map((x) => (
          <div
            key={x.date}
            style={{
              flex: 1,
              background: C.field,
              border: `1px solid ${C.hairSoft}`,
              borderRadius: 12,
              padding: "9px 8px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 7,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-end", height: 28 }}>
              <div style={{ width: 7, height: x.weight, borderRadius: 3, background: C.sage, opacity: 0.55 }} />
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {x.date}
            </div>
          </div>
        ))}
      </div>
      <Link
        href={href}
        className="gv-press"
        style={{
          width: "100%",
          marginTop: 14,
          padding: "11px",
          borderRadius: 12,
          cursor: "pointer",
          border: `1px solid ${C.hair}`,
          background: "#fff",
          color: C.charcoal,
          fontSize: 13.5,
          fontWeight: 650,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          textDecoration: "none",
        }}
      >
        See how those days went {Ico.chevR({ s: 15, c: C.charcoal })}
      </Link>
    </Card>
  );
}

function RecoveryCard({ phases, protocolLabel, exercisesHref }: { phases: RecoveryPhase[]; protocolLabel: string; exercisesHref: string }) {
  return (
    <Card>
      <SectionHead icon={Ico.cal({ s: 17, c: A.plum.c })} accent={A.plum} title="Recovery timeline" hint={protocolLabel} />
      <ol
        aria-label={`${protocolLabel || "Recovery"} phases`}
        style={{ position: "relative", paddingLeft: 6, margin: 0, listStyle: "none" }}
      >
        {phases.map((p, i) => {
          const isLast = i === phases.length - 1;
          const done = p.state === "done";
          const now = p.state === "now";
          const milestone = p.state === "milestone";
          const dot = now || done ? A.plum.c : milestone ? C.gold : C.hair;
          return (
            <li
              key={i}
              aria-current={now ? "step" : undefined}
              style={{ display: "flex", gap: 13, position: "relative", paddingBottom: isLast ? 0 : 16 }}
            >
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    left: 7,
                    top: 16,
                    bottom: 0,
                    width: 2,
                    background: done ? A.plum.c : C.hair,
                    opacity: done ? 0.4 : 1,
                  }}
                />
              )}
              <div
                style={{
                  flexShrink: 0,
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  marginTop: 1,
                  background: done || now ? dot : "#fff",
                  border: `2px solid ${dot}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: now ? "0 0 0 4px var(--plum-soft)" : "none",
                }}
              >
                {done && Ico.check({ s: 10, c: "#fff", w: 3 })}
                {milestone && <span style={{ width: 5, height: 5, borderRadius: 999, background: C.gold }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: now ? A.plum.c : C.charcoal, fontVariantNumeric: "tabular-nums" }}>
                    Week {p.week}
                  </span>
                  {now && (
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        textTransform: "uppercase",
                        color: A.plum.c,
                        background: "var(--plum-soft)",
                        padding: "2px 7px",
                        borderRadius: 999,
                      }}
                    >
                      You are here
                    </span>
                  )}
                  {milestone && (
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        textTransform: "uppercase",
                        color: C.gold,
                        background: "var(--gold-soft)",
                        padding: "2px 7px",
                        borderRadius: 999,
                      }}
                    >
                      Milestone
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: done ? C.muted : "#4a544f", marginTop: 2, lineHeight: 1.35 }}>{p.label}</div>
              </div>
            </li>
          );
        })}
      </ol>
      <Link
        href={exercisesHref}
        className="gv-press"
        style={{
          width: "100%",
          marginTop: 14,
          padding: "11px",
          borderRadius: 12,
          cursor: "pointer",
          border: `1px solid ${A.plum.c}`,
          background: "var(--plum-soft)",
          color: "#5a4d70",
          fontSize: 13.5,
          fontWeight: 650,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          textDecoration: "none",
        }}
      >
        Log today&rsquo;s rehab {Ico.chevR({ s: 15, c: "#5a4d70" })}
      </Link>
    </Card>
  );
}

function CompanionCard({ name, href }: { name: string; href: string }) {
  return (
    <Link
      href={href}
      className="gv-press"
      style={{
        width: "100%", textAlign: "left", cursor: "pointer",
        background: "linear-gradient(135deg, #4f8a7d, #50708a)", border: "none",
        borderRadius: "var(--radius)", padding: 16, color: "#fff",
        boxShadow: "0 10px 24px rgba(63,123,109,0.26)",
        display: "flex", alignItems: "center", gap: 13, textDecoration: "none",
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {Ico.sparkles({ s: 20, c: "#fff" })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500 }}>Talk to your companion</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 1 }}>Chat, log a note, ask what {name} did last week</div>
      </div>
      {Ico.chevR({ s: 18, c: "#fff" })}
    </Link>
  );
}

function VetBriefCard({ header, briefCount, href }: { header: PetHeader; briefCount: number; href: string }) {
  return (
    <Link
      href={href}
      className="gv-press"
      style={{
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        background: "linear-gradient(150deg, #b3654a, #9c5238)",
        border: "none",
        borderRadius: "var(--radius)",
        padding: 16,
        color: "#fff",
        boxShadow: "0 10px 24px rgba(156,82,56,0.26)",
        display: "flex",
        alignItems: "center",
        gap: 13,
        textDecoration: "none",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          flexShrink: 0,
          background: "rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {Ico.file({ s: 20, c: "#fff" })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500 }}>Prepare a vet brief</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 1 }}>
          {header.nextVisit ? `For ${header.name}’s visit on ${header.nextVisit} · ` : ""}
          {briefCount > 0 ? `${briefCount} things to mention` : "A cited summary for your vet"}
        </div>
      </div>
      {Ico.chevR({ s: 18, c: "#fff" })}
    </Link>
  );
}

export function DashboardScreen({ header, view, isDemo = false }: { header: PetHeader; view: DashboardView; isDemo?: boolean }) {
  const briefHref = `/pets/${header.id}/brief`;
  const recallHref = `/pets/${header.id}/recall`;
  return (
    <main className="gv-scroll" style={{ width: "100%", maxWidth: 440, margin: "0 auto", padding: "24px 16px 32px" }}>
      <Hero
        avatarSrc={header.photoUrl}
        avatarAlt={header.name}
        eyebrow={header.signalment}
        title={`How ${header.name}’s doing`}
        badge={header.phaseLabel}
      >
        <HeroStats
          stats={[
            header.streakDays > 0
              ? { k: `${header.streakDays}-day`, l: "check-in streak" }
              : { k: "New", l: "let’s begin" },
            { k: view.mobility.series.length ? bandLabel(view.mobility.band) : "—", l: "mobility band" },
            { k: header.nextVisit ?? "—", l: "next vet visit" },
          ]}
        />
      </Hero>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <MobilityChart trend={view.mobility} bandLabel={bandLabel(view.mobility.band)} />
        <QolWeekCard qol={view.qol} />
        {view.progression.fires && <ProgressionCard nudge={view.progression} briefHref={briefHref} />}
        <div style={{ display: "flex", gap: 14 }}>
          <CompanionCard name={header.name} href={`/pets/${header.id}/companion`} />
          <Link
            href={`/pets/${header.id}/media`}
            className="gv-press"
            style={{
              flexShrink: 0, width: 132, cursor: "pointer", textDecoration: "none",
              background: "#fff", border: `1px solid ${C.hair}`, borderRadius: "var(--radius)",
              padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10,
              boxShadow: "0 1px 2px rgba(32,38,42,0.04), 0 10px 26px rgba(32,38,42,0.05)",
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 11, background: A.clay.soft, color: A.clay.c, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {Ico.library({ s: 19, c: A.clay.c })}
            </div>
            <div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 15.5, fontWeight: 500, color: C.charcoal }}>Photos &amp; clips</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>+ similar days</div>
            </div>
          </Link>
        </div>
        {view.pattern.occurrences.length > 0 && <PatternCard pattern={view.pattern} href={recallHref} />}
        {view.recovery.length > 0 && <RecoveryCard phases={view.recovery} protocolLabel={view.protocolLabel} exercisesHref={`/pets/${header.id}/exercises`} />}
        <VetBriefCard header={header} briefCount={view.briefCount} href={briefHref} />
        <VetLine petId={header.id} />
        {isDemo ? (
          <div style={{ textAlign: "center", padding: "8px 0 2px", fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
            You&rsquo;re exploring the demo ·{" "}
            <Link href="/signup" style={{ color: C.sage, fontWeight: 700, textDecoration: "none" }}>Set up your own pet</Link>
          </div>
        ) : (
          <SignOutButton />
        )}
        <div style={{ height: 6 }} />
      </div>
    </main>
  );
}
