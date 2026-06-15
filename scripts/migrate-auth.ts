/**
 * Incremental migration: owners.password_hash — the bcrypt hash behind email+password
 * accounts. Idempotent (ADD COLUMN IF NOT EXISTS), so safe to re-run on a migrated
 * Aurora. Nullable: the seeded demo owner stays credential-less and publicly browsable.
 *   npx tsx --env-file=.env scripts/migrate-auth.ts
 */
import postgres from "postgres";

const DDL = `
ALTER TABLE owners ADD COLUMN IF NOT EXISTS password_hash text;
`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = postgres(url, { prepare: false });
  console.log("Adding owners.password_hash …");
  await sql.unsafe(DDL);
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from information_schema.columns
    where table_name = 'owners' and column_name = 'password_hash'`;
  console.log(`✓ Done — owners.password_hash present: ${n === 1 ? "yes" : "no"}.`);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
