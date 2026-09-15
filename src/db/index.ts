import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { SUPABASE_ROOT_CA } from "./supabase-ca";

/**
 * The client is created on first use rather than at import time. A build
 * (or a lint pass) that merely imports this module should not fail for want
 * of a connection string — only an actual query should.
 *
 * `prepare: false` is required behind Supabase's Supavisor pooler in
 * transaction mode, which does not support prepared statements.
 */
const globalForDb = globalThis as unknown as {
  gradmireDb?: postgres.Sql;
  gradmireDrizzle?: ReturnType<typeof drizzle<typeof schema>>;
};

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * TLS for the database connection (DPDP s.8 — data in transit).
 *
 * This has to be set in code, and it has to be set to a CA, because
 * postgres-js gets every default here wrong for our purposes:
 *
 *   - With no `ssl` option and no `sslmode` in the URL the default is
 *     `ssl: false`, and the driver never even sends an SSLRequest. The
 *     connection to Supabase was plaintext.
 *   - `?sslmode=require` in the URL is *not* the fix. postgres-js maps
 *     `require`, `allow` and `prefer` to `rejectUnauthorized = false`
 *     (src/connection.js), so traffic is encrypted and the server's
 *     certificate is never checked — which stops passive sniffing and does
 *     nothing whatsoever about an active machine-in-the-middle.
 *   - `verify-full` against the system CA store cannot work either. Supabase's
 *     pooler presents `CN=*.pooler.supabase.com` issued by `Supabase
 *     Intermediate 2021 CA` under a self-signed `Supabase Root 2021 CA` — a
 *     private root that is not in anyone's system trust store, so Node
 *     rejects the chain with SELF_SIGNED_CERT_IN_CHAIN.
 *
 * So the root is pinned. Passing `{ ca }` as an object takes the
 * `typeof ssl === 'object'` branch, which merges over postgres-js's defaults
 * and therefore keeps `servername` (SNI, and the hostname check against the
 * SAN) while leaving `rejectUnauthorized` at Node's default of true.
 *
 * Pinning a private root is stronger than public verify-full, not weaker:
 * only Supabase's own CA can vouch for the host, so a certificate
 * mis-issued by any public CA is useless to an attacker.
 *
 * Set here rather than in the URL deliberately — an option in `o` beats the
 * connection string (src/index.js, parseOptions), so no amount of editing
 * DATABASE_URL in a hosting dashboard can quietly downgrade the connection.
 */
type SslConfig = { ca: string } | "require" | false;

function databaseSsl(): SslConfig {
  const override = process.env.DATABASE_SSL_MODE;

  // Escape hatch for a rotated root or a non-Supabase host. Encrypted but
  // unauthenticated — meant to be loud, and to belong in a ticket.
  if (override === "require") {
    console.warn(
      "[db] DATABASE_SSL_MODE=require — traffic is encrypted but the server certificate is NOT verified. This is a temporary workaround, not a configuration.",
    );
    return "require";
  }

  // Only ever for a local Postgres on a loopback socket. Refused outright in
  // production, where a typo in an env var must not be able to turn
  // encryption off for everyone's personal data.
  if (override === "disable") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "DATABASE_SSL_MODE=disable is not permitted in production: personal data must not cross the network unencrypted.",
      );
    }
    console.warn("[db] TLS disabled — local development only.");
    return false;
  }

  return { ca: SUPABASE_ROOT_CA };
}

/**
 * Prints every statement Drizzle emits, with a running count, when
 * `DB_QUERY_LOG=1`.
 *
 * Exists to make N+1 answerable rather than arguable. Drizzle's relational
 * `with` compiles to a single statement with lateral subqueries, but that is
 * a property of the query builder rather than a guarantee of the API, and
 * "it probably does one query" is not something to take on trust about a
 * list that grows with the caseload. Turn it on, load the page, read the
 * count.
 *
 * Off unless explicitly enabled: the statements contain query parameters,
 * which for these tables means personal data, and that has no business in
 * production logs.
 */
function queryLogger() {
  if (process.env.DB_QUERY_LOG !== "1") return undefined;
  let count = 0;
  return {
    logQuery(query: string, params: unknown[]) {
      count++;
      console.log(`\n[db ${count}] ${query}`);
      if (params.length) console.log(`        params: ${JSON.stringify(params)}`);
    },
  };
}

function getDb() {
  if (globalForDb.gradmireDrizzle) return globalForDb.gradmireDrizzle;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in the Supabase connection string.",
    );
  }

  const client =
    globalForDb.gradmireDb ??
    postgres(connectionString, {
      prepare: false,
      // Serverless functions each hold their own pool, so keep it small and
      // let Supavisor do the real pooling. Override for other runtimes.
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: databaseSsl(),
    });

  const instance = drizzle(client, { schema, logger: queryLogger() });

  // Memoized in every environment, production included. Caching only in dev
  // meant each property access on the proxy below built a fresh pool — a new
  // TLS handshake to Supabase per query, and sockets that were never closed.
  globalForDb.gradmireDb = client;
  globalForDb.gradmireDrizzle = instance;

  return instance;
}

/** Proxied so `db.query…` resolves the real client only when touched. */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export { schema };
