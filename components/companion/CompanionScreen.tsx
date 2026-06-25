"use client";

/**
 * Oscar companion chat (mobile) — a non-clinical scribe/vet-prep agent. Renders
 * the live thread from Aurora; sending calls the Bedrock agent (server action),
 * which logs/recalls/flags via tools and returns "rich cards" rendered in the
 * reply. Every reply is guardrail-checked server-side. (Photo/video attach lands in
 * the media update; the button is parked until then.)
 */
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Ico } from "@/components/ui/icons";
import { C } from "@/components/ui/tokens";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/ui/BackButton";
import { sendCompanionMessage } from "@/lib/actions/companion";
import type { CompanionCard } from "@/lib/ai/companion";
import type { ChatMessageView } from "@/lib/data/chat";

const SUGGESTIONS = ["How's {name}'s week?", "Log a symptom", "Has this happened before?", "Help me prep for the vet"];

function AgentMark({ s = 28 }: { s?: number }) {
  return (
    <div style={{ width: s, height: s, borderRadius: 999, flexShrink: 0, background: "linear-gradient(150deg, #4f8a7d, #50708a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(63,123,109,0.3)" }}>
      {Ico.sparkles({ s: s * 0.54, c: "#fff", w: 1.9 })}
    </div>
  );
}

function LoggedChip({ name }: { name: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--sage-soft)", border: `1px solid ${C.sage}44`, borderRadius: 999, padding: "6px 12px", marginTop: 10 }}>
      <span style={{ width: 17, height: 17, borderRadius: 999, background: C.sage, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Ico.check({ s: 11, c: "#fff", w: 3 })}</span>
      <span style={{ fontSize: 12.5, fontWeight: 650, color: "var(--sage-ink)" }}>Logged to {name}&rsquo;s journal</span>
    </div>
  );
}

function VetBriefChip() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--clay-soft)", boxShadow: "inset 0 0 0 1px rgba(179,101,74,0.32)", borderRadius: 999, padding: "6px 12px", marginTop: 8 }}>
      <span style={{ color: "#97492f", display: "flex", flexShrink: 0 }}>{Ico.plus({ s: 14, c: "#97492f", w: 2.4 })}</span>
      <span style={{ fontSize: 12.5, fontWeight: 650, color: "#97492f" }}>Added to vet brief</span>
    </div>
  );
}

function RecallCard({ occurrences }: { occurrences: { date: string; weight: number; text: string }[] }) {
  if (!occurrences.length) return null;
  return (
    <div style={{ marginTop: 11, background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 14, padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        {Ico.sparkles({ s: 13, c: C.sage })}
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: C.sage }}>Pattern memory</span>
      </div>
      <div style={{ fontSize: 13.5, fontFamily: "var(--serif)", fontWeight: 500, lineHeight: 1.35, color: C.charcoal }}>
        {occurrences.length} similar {occurrences.length === 1 ? "day" : "days"} in your notes.
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 11 }}>
        {occurrences.map((x) => (
          <div key={x.date} style={{ flex: 1, background: "#fff", border: `1px solid ${C.hairSoft}`, borderRadius: 10, padding: "7px 6px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "flex-end", height: 24 }}>
              <div style={{ width: 6, height: x.weight, borderRadius: 3, background: C.sage, opacity: 0.5 }} />
            </div>
            <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{x.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobilityMiniCard({ series, improvement }: { series: number[]; improvement: number }) {
  if (series.length < 2) return null;
  const W = 232, H = 50;
  const lo = Math.min(...series) - 2, hi = Math.max(...series) + 2;
  const x = (i: number) => 4 + (i * (W - 8)) / (series.length - 1);
  // inverted: GenPup-M lower = better, so a lower score plots higher (improvement rises)
  const y = (v: number) => 6 + ((v - lo) / (hi - lo)) * (H - 12);
  const line = series.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <div style={{ marginTop: 11, background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 14, padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {Ico.trendUp({ s: 13, c: C.sage })}
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: C.sage }}>Mobility · your trend</span>
        </div>
        {improvement > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-ink)", background: "var(--sage-soft)", padding: "2px 8px", borderRadius: 999 }}>{improvement} better</span>}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <path d={line} fill="none" stroke={C.sage} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {series.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === series.length - 1 ? 3.4 : 2} fill={i === series.length - 1 ? C.sage : "#fff"} stroke={C.sage} strokeWidth="1.5" />)}
      </svg>
    </div>
  );
}

function VetAlertCard({ petId }: { petId: string }) {
  return (
    <div style={{ marginTop: 11, background: "linear-gradient(168deg, #fff, #fdf1ee)", border: `1px solid ${C.danger}44`, borderRadius: 14, padding: 15, boxShadow: "0 6px 18px rgba(192,73,43,0.12)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: "var(--danger-soft)", color: C.danger, display: "flex", alignItems: "center", justifyContent: "center" }}>{Ico.alert({ s: 17, c: C.danger })}</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 15.5, fontWeight: 600, color: C.danger, letterSpacing: -0.2 }}>This needs your vet</div>
      </div>
      <div style={{ fontSize: 12.5, color: "#6a4a44", lineHeight: 1.5 }}>
        I can&rsquo;t assess what&rsquo;s happening — but what you&rsquo;re describing is the kind of thing a vet should see promptly.
      </div>
      <a href={`/pets/${petId}/vet-contact`} className="gv-press" style={{ width: "100%", marginTop: 13, padding: "12px", borderRadius: 12, cursor: "pointer", background: C.danger, color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none", boxSizing: "border-box" }}>
        {Ico.phone({ s: 16, c: "#fff" })} <span>Contact your vet now</span>
      </a>
    </div>
  );
}

function Cards({ cards, name, petId }: { cards: CompanionCard[]; name: string; petId: string }) {
  return (
    <>
      {cards.map((card, i) => {
        switch (card.type) {
          case "logged": return <LoggedChip key={i} name={name} />;
          case "vetbrief": return <VetBriefChip key={i} />;
          case "recall": return <RecallCard key={i} occurrences={card.occurrences} />;
          case "mobility": return <MobilityMiniCard key={i} series={card.series} improvement={card.improvement} />;
          case "redflag": return <VetAlertCard key={i} petId={petId} />;
          default: return null;
        }
      })}
    </>
  );
}

function OwnerBubble({ m }: { m: ChatMessageView }) {
  const photo = m.media.find((x) => x.kind === "photo");
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", paddingLeft: 44 }}>
      <div style={{ maxWidth: "100%", background: "linear-gradient(165deg, #54948a, #437a6d)", color: "#fff", borderRadius: 20, borderBottomRightRadius: 7, padding: photo ? 6 : "11px 14px", boxShadow: "0 4px 12px rgba(63,123,109,0.22)" }}>
        {photo && (
          <div style={{ borderRadius: 15, overflow: "hidden", marginBottom: m.text ? 8 : 0, lineHeight: 0 }}>
            <Image src={photo.url} alt={photo.caption ?? "sent"} width={210} height={150} style={{ width: "100%", maxWidth: 210, height: "auto", display: "block", objectFit: "cover" }} />
          </div>
        )}
        {m.text && <div style={{ fontSize: 14.5, lineHeight: 1.42, padding: photo ? "0 8px 6px" : 0 }}>{m.text}</div>}
      </div>
    </div>
  );
}

function AgentBubble({ m, name, petId }: { m: ChatMessageView; name: string; petId: string }) {
  return (
    <div style={{ display: "flex", gap: 9, paddingRight: 24 }}>
      <AgentMark s={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ background: "#fff", border: `1px solid ${C.hair}`, borderRadius: 20, borderBottomLeftRadius: 7, padding: "12px 14px", boxShadow: "0 4px 14px rgba(32,38,42,0.05)" }}>
          {m.text && <div style={{ fontSize: 14.5, lineHeight: 1.5, color: C.charcoal }}>{m.text}</div>}
          <Cards cards={m.cards} name={name} petId={petId} />
        </div>
      </div>
    </div>
  );
}

function Typing() {
  // role="status" + aria-live="polite" so a screen reader announces "typing"
  // without grabbing focus — the typing dots are otherwise invisible to AT.
  return (
    <div style={{ display: "flex", gap: 9 }} role="status" aria-live="polite" aria-label="Companion is typing">
      <AgentMark s={28} />
      <div style={{ background: "#fff", border: `1px solid ${C.hair}`, borderRadius: 20, borderBottomLeftRadius: 7, padding: "14px 16px", boxShadow: "0 4px 14px rgba(32,38,42,0.05)", display: "flex", gap: 5, alignItems: "center" }} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: 999, background: C.sage, display: "block", animation: `gv-dot 1.2s ${i * 0.18}s infinite ease-in-out` }} />
        ))}
      </div>
    </div>
  );
}

export function CompanionScreen({
  petId, petName, petPhoto, initialMessages,
}: {
  petId: string; petName: string; petPhoto: string | null; initialMessages: ChatMessageView[];
}) {
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [text, setText] = useState("");
  const [attached, setAttached] = useState<string | null>(null); // local data URL preview
  const [sending, setSending] = useState(false);
  // last send that failed — drives the inline Retry affordance
  const [lastFailed, setLastFailed] = useState<{ text: string; image: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttached(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function send(payload: { text: string; image: string | null }) {
    const optimistic: ChatMessageView = {
      id: `tmp-${Date.now()}`, role: "owner", text: payload.text, cards: [],
      media: payload.image ? [{ url: payload.image, kind: "photo" }] : [],
    };
    setMessages((m) => [...m, optimistic]);
    setSending(true);
    try {
      const { assistant } = await sendCompanionMessage({
        petId, text: payload.text, imageDataUrl: payload.image ?? undefined,
      });
      setMessages((m) => [...m, assistant]);
      setLastFailed(null);
    } catch {
      setMessages((m) => [...m, {
        id: `err-${Date.now()}`, role: "assistant", cards: [], media: [],
        text: "Sorry — I couldn't reach my notes just now. Tap Retry to try again.",
      }]);
      setLastFailed(payload);
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    const t = text.trim();
    const img = attached;
    if ((!t && !img) || sending) return;
    setText("");
    setAttached(null);
    await send({ text: t, image: img });
  }

  async function handleRetry() {
    if (!lastFailed || sending) return;
    // pop the prior error bubble so we don't end up with two of them stacked
    setMessages((m) => (m.length && String(m[m.length - 1].id).startsWith("err-") ? m.slice(0, -1) : m));
    const payload = lastFailed;
    setLastFailed(null);
    await send(payload);
  }

  const canSend = (text.trim().length > 0 || attached !== null) && !sending;

  const empty = messages.length === 0;

  return (
    <main style={{ width: "100%", maxWidth: 440, margin: "0 auto", height: "100dvh", maxHeight: "100%", display: "flex", flexDirection: "column", background: C.cream }}>
      {/* header */}
      <div style={{ flexShrink: 0, position: "relative", overflow: "hidden", background: "linear-gradient(120deg, #4f8a7d 0%, #4a8076 45%, #54748f 100%)", padding: "24px 16px 14px" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
          <BackButton href={`/pets/${petId}`} label={`Back to ${petName}'s dashboard`} light />
          <div style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, padding: 2, background: "rgba(255,255,255,0.22)" }}>
            <Avatar src={petPhoto} name={petName} size={30} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 17.5, fontWeight: 500, color: "#fff", letterSpacing: -0.2, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Your companion</div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.82)", fontWeight: 500, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Here for {petName} · always remembers</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#fff", fontWeight: 650, background: "rgba(255,255,255,0.18)", padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.24)", flexShrink: 0 }}>
            {Ico.shield({ s: 11, c: "#fff" })} <span>Non-clinical</span>
          </div>
        </div>
      </div>

      {/* thread */}
      <div ref={scrollRef} className="gv-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px" }}>
        {empty ? (
          <div style={{ padding: "8px 2px" }}>
            <AgentBubble name={petName} petId={petId} m={{ id: "intro", role: "assistant", cards: [], media: [], text: `Hello — I'm so glad you're here. I'm here to help you keep track of ${petName} and get ready for the vet. I can't diagnose — but I remember everything, so you don't have to.` }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, paddingLeft: 37 }}>
              {SUGGESTIONS.map((s, i) => {
                const label = s.replace("{name}", petName);
                const accents = ["var(--sage-soft)", "var(--slate-soft)", "var(--teal-soft)", "var(--gold-soft)"];
                const inks = ["#3a6b60", "#46617d", "#2f6a62", "#8a6410"];
                return (
                  <button key={i} className="gv-press" onClick={() => setText(label)} style={{ padding: "9px 14px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${C.hair}`, background: accents[i], color: inks[i] }}>{label}</button>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "6px 2px" }}>
            {messages.map((m) => m.role === "owner" ? <OwnerBubble key={m.id} m={m} /> : <AgentBubble key={m.id} m={m} name={petName} petId={petId} />)}
            {sending && <Typing />}
            {lastFailed && !sending && (
              <div role="alert" style={{ display: "flex", justifyContent: "center", paddingLeft: 37, marginTop: -8 }}>
                <button
                  className="gv-press"
                  onClick={handleRetry}
                  aria-label="Retry the last message"
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 999, cursor: "pointer", border: `1px solid ${C.sage}`, background: "var(--sage-soft)", color: "var(--sage-ink)", fontSize: 12.5, fontWeight: 700 }}
                >
                  {Ico.rotate({ s: 13, c: "var(--sage-ink)" })}
                  <span>Retry</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* input */}
      <div style={{ flexShrink: 0, position: "relative", background: "rgba(238,241,239,0.92)", backdropFilter: "blur(8px)", borderTop: `1px solid ${C.hairSoft}`, padding: "10px 12px 12px" }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />

        {attached && (
          <div className="gv-rise" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#fff", border: `1px solid ${C.hair}`, borderRadius: 13, padding: 6, marginBottom: 9, boxShadow: "0 2px 8px rgba(32,38,42,0.06)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL preview */}
            <img src={attached} alt="attached" style={{ width: 40, height: 40, borderRadius: 9, objectFit: "cover", display: "block" }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: C.charcoal, paddingRight: 2 }}>Photo ready</span>
            <button className="gv-press" onClick={() => setAttached(null)} aria-label="Remove" style={{ width: 24, height: 24, borderRadius: 999, border: "none", background: C.field, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Ico.close({ s: 13, c: C.muted })}</button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-end", gap: 9 }}>
          <button className="gv-press" onClick={() => fileRef.current?.click()} disabled={sending} aria-label="Attach a photo" style={{ width: 42, height: 42, borderRadius: 999, flexShrink: 0, cursor: sending ? "not-allowed" : "pointer", border: `1px solid ${C.hair}`, background: "#fff", color: C.sage, display: "flex", alignItems: "center", justifyContent: "center" }}>{Ico.plus({ s: 20, c: C.sage })}</button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", background: "#fff", border: `1px solid ${C.hair}`, borderRadius: 22, padding: "4px 6px 4px 15px", minHeight: 42 }}>
            <input
              value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder={`Tell us about ${petName}…`}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14.5, fontFamily: "inherit", color: C.charcoal, padding: "7px 0" }}
            />
            <button className="gv-press" onClick={handleSend} disabled={!canSend} aria-label="Send" style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, cursor: canSend ? "pointer" : "not-allowed", border: "none", background: canSend ? "linear-gradient(165deg, #54948a, #437a6d)" : "#dbe3df", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: canSend ? "0 3px 9px rgba(63,123,109,0.3)" : "none" }}>{Ico.send({ s: 16, c: canSend ? "#fff" : "#9aa49e" })}</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 9 }}>
          {Ico.shield({ s: 12, c: C.mutedSoft })}
          <span style={{ fontSize: 10.5, color: C.muted, fontWeight: 500, textAlign: "center", lineHeight: 1.3 }}>Here to remember and prepare — it doesn&rsquo;t diagnose. Your vet decides.</span>
        </div>
      </div>
    </main>
  );
}
