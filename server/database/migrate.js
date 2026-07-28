import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL no está configurada.");
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  const exists = await client.query(
    "SELECT to_regclass('public.users') AS users_table",
  );
  if (!exists.rows[0].users_table) {
    const schema = await readFile(
      join(import.meta.dirname, "schema.sql"),
      "utf8",
    );
    await client.query(schema);
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const directory = join(import.meta.dirname, "migrations");
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const applied = await client.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [file],
    );
    if (applied.rowCount) continue;
    const sql = await readFile(join(directory, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        [file],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.log("Migraciones de PostgreSQL aplicadas correctamente.");
} finally {
  await client.end();
}
