"use client";

/* eslint-disable @next/next/no-img-element -- media are presigned S3 urls (auth in query); next/image optimization can't cache them */

/**
 * Media timeline / visual recall (mobile). Date-grouped grid of the owner's photos +
 * clips; "Similar days" opens a pgvector visual-recall series (the same subject over
 * time). Non-clinical: keeps and surfaces the owner's own media, never interprets it.
 */
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/ui/BackButton";
import { Ico } from "@/components/ui/icons";
import { C } from "@/components/ui/tokens";
import { loadSimilar, toggleMention } from "@/lib/actions/media";
import type { MediaAnalogue, MediaItemView, MediaTimelineView } from "@/lib/data/media";

function dur(sec: number | null): string {
  if (!sec) return "";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function Tile({ it, petName, mentioned, onMention, onRecall, onPlay }: {
  it: MediaItemView; petName: string; mentioned: boolean; onMention: () => void; onRecall: () => void; onPlay: () => void;
}) {
  const isVideo = it.kind === "video";
  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: C.field, border: `1px solid ${C.hairSoft}` }}>
      <div style={{ position: "relative", aspectRatio: "1 / 1", overflow: "hidden" }}>
        {isVideo ? (
          // poster frame (no separate poster image): seek a touch past the start
          <video src={`${it.url}#t=0.5`} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <img src={it.url} alt={it.caption ?? `${petName} media`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
        {isVideo && (
          <>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.28))" }} />
            <button className="gv-press" onClick={onPlay} aria-label={`Play ${it.caption ?? `${petName} clip`}`} style={{ position: "absolute", inset: 0, border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 34, height: 34, borderRadius: 999, background: "rgba(0,0,0,0.42)", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ico.play({ s: 16, c: "#fff" })}</span>
            </button>
            {it.durationSec ? <div style={{ position: "absolute", bottom: 7, right: 7, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, fontVariantNumeric: "tabular-nums", pointerEvents: "none" }}>{dur(it.durationSec)}</div> : null}
          </>
        )}
        <button className="gv-press" onClick={onMention} aria-label="Mention at vet" style={{ position: "absolute", top: 7, right: 7, width: 28, height: 28, borderRadius: 999, border: "none", cursor: "pointer", background: mentioned ? C.gold : "rgba(0,0,0,0.38)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: mentioned ? "0 2px 6px rgba(214,152,30,0.5)" : "none" }}>{Ico.flag({ s: 14, c: "#fff" })}</button>
        {it.recallable && (
          <button className="gv-press" onClick={onRecall} style={{ position: "absolute", bottom: 7, left: 7, display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.92)", border: "none", borderRadius: 999, padding: "4px 9px", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>{Ico.layers({ s: 12, c: C.sage })}<span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--sage-ink)" }}>Similar days</span></button>
        )}
      </div>
      {it.caption && <div style={{ padding: "8px 9px 9px" }}><div style={{ fontSize: 11.5, color: "#3c453f", fontWeight: 550, lineHeight: 1.3 }}>{it.caption}</div></div>}
    </div>
  );
}

type RecallState =
  | { kind: "loading" }
  | { kind: "loaded"; analogues: MediaAnalogue[] }
  | { kind: "error" };

function RecallSheet({ caption, state, onClose, onRetry }: {
  caption: string; state: RecallState; onClose: () => void; onRetry: () => void;
}) {
  const subtitle =
    state.kind === "loaded" ? `${state.analogues.length} photos · same spot, by meaning`
    : state.kind === "error" ? "Couldn't load similar days right now."
    : "Finding similar days…";
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(32,38,42,0.4)" }} />
      <div style={{ position: "relative", background: "#fff", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: "12px 0 24px", boxShadow: "0 -12px 40px rgba(0,0,0,0.18)" }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: "#dde3df", margin: "0 auto 14px" }} />
        <div style={{ padding: "0 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>{Ico.sparkles({ s: 14, c: C.sage })}<span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: C.sage }}>Visual recall</span></div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 500, letterSpacing: -0.3 }}>{caption}, over time</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }} role="status" aria-live="polite">{subtitle}</div>
          </div>
          <button className="gv-press" onClick={onClose} aria-label="Close" style={{ width: 30, height: 30, borderRadius: 999, border: `1px solid ${C.hair}`, background: "#fff", color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Ico.close({ s: 15, c: C.muted })}</button>
        </div>

        {state.kind === "loading" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 60px" }} aria-label="Loading similar days">
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 7, height: 7, margin: "0 4px", borderRadius: 999, background: C.sage, display: "block", animation: `gv-dot 1.2s ${i * 0.18}s infinite ease-in-out` }} />
            ))}
          </div>
        )}

        {state.kind === "error" && (
          <div role="alert" style={{ margin: "16px 18px 0", padding: "14px 14px", borderRadius: 13, border: `1px solid ${C.danger}33`, background: "var(--danger-soft)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.danger }}>
              {Ico.alert({ s: 15, c: C.danger })}
              <span style={{ fontSize: 13, fontWeight: 700 }}>Couldn&rsquo;t reach the recall service</span>
            </div>
            <div style={{ fontSize: 12, color: "#6a4a44", lineHeight: 1.4 }}>The pgvector lookup didn&rsquo;t come back — it&rsquo;s usually a transient hiccup.</div>
            <button
              className="gv-press"
              onClick={onRetry}
              aria-label="Retry similar days"
              style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999, border: `1px solid ${C.sage}`, background: "#fff", color: "var(--sage-ink)", cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}
            >
              {Ico.rotate({ s: 13, c: "var(--sage-ink)" })} <span>Retry</span>
            </button>
          </div>
        )}

        {state.kind === "loaded" && (
          <div className="gv-scroll" style={{ display: "flex", gap: 11, overflowX: "auto", padding: "16px 18px 8px" }}>
            {state.analogues.map((r, i) => {
              const latest = i === state.analogues.length - 1;
              return (
                <div key={r.id} style={{ flexShrink: 0, width: 116 }}>
                  <div style={{ position: "relative", borderRadius: 13, overflow: "hidden", border: latest ? `2px solid ${C.sage}` : `1px solid ${C.hairSoft}` }}>
                    <img src={r.url} alt={r.dateLabel} style={{ width: "100%", height: 116, objectFit: "cover", display: "block" }} />
                    {latest && <div style={{ position: "absolute", top: 6, left: 6, background: C.sage, color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>Latest</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 6, padding: "0 2px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.sage, fontVariantNumeric: "tabular-nums" }}>{Math.round(r.similarity * 100)}%</span>
                    <span style={{ fontSize: 10.5, color: C.muted, fontVariantNumeric: "tabular-nums" }}>{r.dateLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ margin: "8px 18px 0", display: "flex", gap: 9, alignItems: "flex-start", background: C.field, border: `1px solid ${C.hairSoft}`, borderRadius: 13, padding: "11px 13px" }}>
          <span style={{ color: C.sage, flexShrink: 0, marginTop: 1 }}>{Ico.shield({ s: 15, c: C.sage })}</span>
          <div style={{ fontSize: 11.5, color: "#42504b", lineHeight: 1.5 }}>Side by side, so you can see the change yourself. We keep the record — it doesn&rsquo;t diagnose. Your vet reads the full picture.</div>
        </div>
      </div>
    </div>
  );
}

function VideoLightbox({ item, onClose }: { item: MediaItemView; onClose: () => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 18px" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(14,18,20,0.86)" }} />
      <button className="gv-press" onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 16, right: 16, zIndex: 1, width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,0.28)", background: "rgba(0,0,0,0.4)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ico.close({ s: 17, c: "#fff" })}</button>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "100%" }}>
        <video src={item.url} controls autoPlay playsInline style={{ maxWidth: "100%", maxHeight: "72vh", borderRadius: 14, background: "#000", display: "block" }} />
        <div style={{ marginTop: 14, textAlign: "center", maxWidth: 320 }}>
          {item.caption && <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500, color: "#fff", letterSpacing: -0.2, lineHeight: 1.25 }}>{item.caption}</div>}
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.66)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{item.dateLabel}</div>
        </div>
      </div>
    </div>
  );
}

export function MediaTimelineScreen({ petId, petName, petPhoto, view }: {
  petId: string; petName: string; petPhoto: string | null; view: MediaTimelineView;
}) {
  const [mentions, setMentions] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(view.items.map((i) => [i.id, i.mentionAtVet])),
  );
  const [recall, setRecall] = useState<{ caption: string; mediaId: string; state: RecallState } | null>(null);
  const [activeVideo, setActiveVideo] = useState<MediaItemView | null>(null);

  const groups = useMemo(() => {
    const out: { label: string; items: MediaItemView[] }[] = [];
    for (const it of view.items) {
      const last = out[out.length - 1];
      if (last && last.label === it.group) last.items.push(it);
      else out.push({ label: it.group, items: [it] });
    }
    return out;
  }, [view.items]);

  const mentionCount = Object.values(mentions).filter(Boolean).length;

  async function onMention(it: MediaItemView) {
    const value = !mentions[it.id];
    setMentions((m) => ({ ...m, [it.id]: value }));
    try { await toggleMention({ mediaId: it.id, petId, value }); } catch { setMentions((m) => ({ ...m, [it.id]: !value })); }
  }

  function captionFor(it: { caption?: string | null }): string {
    return (it.caption ?? "This").replace(/\s*\(.*\)\s*$/, "");
  }

  async function fetchRecall(caption: string, mediaId: string) {
    setRecall({ caption, mediaId, state: { kind: "loading" } });
    try {
      const analogues = await loadSimilar({ petId, mediaId });
      setRecall({ caption, mediaId, state: { kind: "loaded", analogues } });
    } catch {
      setRecall({ caption, mediaId, state: { kind: "error" } });
    }
  }

  async function onRecall(it: MediaItemView) {
    await fetchRecall(captionFor(it), it.id);
  }

  return (
    <main style={{ width: "100%", maxWidth: 440, margin: "0 auto", height: "100dvh", maxHeight: "100%", display: "flex", flexDirection: "column", background: C.cream, position: "relative" }}>
      <div style={{ flexShrink: 0, position: "relative", overflow: "hidden", background: "linear-gradient(120deg, #4f8a7d 0%, #4a8076 45%, #54748f 100%)", padding: "24px 16px 16px" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
          <BackButton href={`/pets/${petId}`} label={`Back to ${petName}'s dashboard`} light />
          <div style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, padding: 2, background: "rgba(255,255,255,0.22)" }}>
            <Avatar src={petPhoto} name={petName} size={30} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 17.5, fontWeight: 500, color: "#fff", letterSpacing: -0.2, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{petName}&rsquo;s photos &amp; clips</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.82)", fontWeight: 500, marginTop: 1, fontVariantNumeric: "tabular-nums" }}>{view.photoCount} photos · {view.videoCount} clips</div>
          </div>
        </div>
      </div>

      <div className="gv-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px" }}>
        {mentionCount > 0 && (
          <div
            role="status"
            aria-live="polite"
            style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--gold-soft)", border: "1px solid rgba(214,152,30,0.32)", borderRadius: 14, padding: "10px 13px", marginBottom: 14 }}
          >
            <span style={{ color: "#8a6410", flexShrink: 0 }}>{Ico.flag({ s: 15, c: "#8a6410" })}</span>
            <span style={{ flex: 1, fontSize: 12.5, color: "#6a5520", fontWeight: 600 }}>{mentionCount} flagged for {petName}&rsquo;s next vet visit</span>
            {Ico.chevR({ s: 15, c: "#8a6410" })}
          </div>
        )}

        {view.items.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 24px", color: C.muted }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px", background: C.field, display: "flex", alignItems: "center", justifyContent: "center" }}>{Ico.library({ s: 24, c: C.mutedSoft })}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.charcoal }}>No photos or clips yet</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 6, maxWidth: 240, marginLeft: "auto", marginRight: "auto" }}>Add one from the companion chat — a photo of how {petName} looks today, saved to the record.</div>
          </div>
        )}

        {groups.map((g) => (
          <div key={g.label} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 0.2, marginBottom: 10, paddingLeft: 2 }}>{g.label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {g.items.map((it) => (
                <Tile key={it.id} it={it} petName={petName} mentioned={!!mentions[it.id]} onMention={() => onMention(it)} onRecall={() => onRecall(it)} onPlay={() => setActiveVideo(it)} />
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "6px 14px 14px", textAlign: "center" }}>
          {Ico.shield({ s: 13, c: C.mutedSoft })}
          <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>We keep the record — it doesn&rsquo;t diagnose. Your vet reads the full picture.</span>
        </div>
      </div>

      {recall && (
        <RecallSheet
          caption={recall.caption}
          state={recall.state}
          onClose={() => setRecall(null)}
          onRetry={() => fetchRecall(recall.caption, recall.mediaId)}
        />
      )}
      {activeVideo && <VideoLightbox item={activeVideo} onClose={() => setActiveVideo(null)} />}
    </main>
  );
}
