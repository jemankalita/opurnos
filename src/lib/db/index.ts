import path from "node:path";
import { mkdirSync } from "node:fs";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { env } from "../env";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzlePglite<typeof schema>>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function connect(): Promise<Db> {
  if (env.DATABASE_URL) {
    const { default: postgres } = await import("postgres");
    const client = postgres(env.DATABASE_URL, { max: 5, prepare: false });
    const db = drizzlePostgres(client, { schema });
    await migratePostgres(db, { migrationsFolder: MIGRATIONS });
    // Both drivers expose the same pg-core query builder; the type is shared.
    return db as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.resolve(env.DATA_DIR, "pg");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  return db;
}

// One connection per process, survives Next.js hot reloads in development.
const globalForDb = globalThis as unknown as { __opurnosDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__opurnosDb) {
    globalForDb.__opurnosDb = connect().catch((err) => {
      globalForDb.__opurnosDb = undefined;
      throw err;
    });
  }
  return globalForDb.__opurnosDb;
}

export { schema };
