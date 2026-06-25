/**
 * Media reads — the timeline (date-grouped, presigned urls) and the pgvector
 * "similar days" visual recall (kNN over Titan image embeddings). Recall surfaces
 * the owner's OWN media side by side; it never interprets it.
 */
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mediaAssets } from "@/lib/db/schema";
import { presignGet } from "@/lib/storage/s3";

const DAY = 24 * 60 * 60 * 1000;
const fmtShort = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtMonth = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });

export interface MediaItemView {
  id: string;
  kind: "photo" | "video";
  url: string;
  caption: string | null;
  durationSec: number | null;
  mentionAtVet: boolean;
  dateLabel: string;
  group: string;
  /** photos with an embedding can run "similar days" recall */
  recallable: boolean;
}

export interface MediaTimelineView {
  items: MediaItemView[];
  photoCount: number;
  videoCount: number;
  flaggedCount: number;
}

export interface MediaAnalogue {
  id: string;
  url: string;
  caption: string | null;
  dateLabel: string;
  similarity: number;
}

function groupFor(recordedAt: Date, now: Date): string {
  const days = Math.floor((now.getTime() - recordedAt.getTime()) / DAY);
  if (days <= 0) return "Today";
  if (days < 7) return "This week";
  if (days < 14) return "Last week";
  return fmtMonth.format(recordedAt);
}

/**
 * `now` is the wall-clock used for grouping ("Today" / "This week" / …). The
 * demo pet keeps a frozen clock so its seeded library lines up with the rest
 * of the demo; real-user pets get `new Date()` so their timeline groups by
 * actual time.
 */
export async function getMediaTimeline(petId: string, now: Date): Promise<MediaTimelineView> {
  const db = getDb();
  const rows = await db.select().from(mediaAssets)
    .where(eq(mediaAssets.petId, petId)).orderBy(desc(mediaAssets.recordedAt));

  const items: MediaItemView[] = await Promise.all(rows.map(async (r) => ({
    id: r.id,
    kind: r.kind,
    url: await presignGet(r.url),
    caption: r.caption,
    durationSec: r.durationSec,
    mentionAtVet: r.mentionAtVet,
    dateLabel: fmtShort.format(r.recordedAt),
    group: groupFor(r.recordedAt, now),
    recallable: r.kind === "photo" && r.embedding != null,
  })));

  return {
    items,
    photoCount: rows.filter((r) => r.kind === "photo").length,
    videoCount: rows.filter((r) => r.kind === "video").length,
    flaggedCount: rows.filter((r) => r.mentionAtVet).length,
  };
}

/**
 * "Similar days" — kNN over the pet's photo embeddings, ordered for display
 * by date. The reference-embedding subqueries are scoped to the same petId
 * (not just the outer kNN) so a cross-pet mediaId can never seed the query —
 * defense-in-depth on top of the action-layer requirePetAccess guard.
 */
export async function getSimilarMedia(petId: string, mediaId: string, limit = 6): Promise<MediaAnalogue[]> {
  const db = getDb();
  const rows = await db.execute<{ id: string; url: string; caption: string | null; recorded_at: Date; sim: number }>(
    sql`select id, url, caption, recorded_at,
               1 - (embedding <=> (select embedding from media_assets where id = ${mediaId} and pet_id = ${petId})) as sim
        from media_assets
        where pet_id = ${petId} and kind = 'photo' and embedding is not null
        order by embedding <=> (select embedding from media_assets where id = ${mediaId} and pet_id = ${petId})
        limit ${limit}`,
  );
  // kNN gives most-similar first; re-order oldest → newest for the "over time" series
  const sorted = [...rows].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  return Promise.all(sorted.map(async (r) => ({
    id: r.id,
    url: await presignGet(r.url),
    caption: r.caption,
    dateLabel: fmtShort.format(new Date(r.recorded_at)),
    similarity: Number(r.sim),
  })));
}
