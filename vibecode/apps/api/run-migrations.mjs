import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log("Running migrations...");
  try {
    await pool.query("CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE, applied_at TIMESTAMPTZ DEFAULT NOW())");
    const applied = (await pool.query("SELECT name FROM migrations")).rows.map(r => r.name);
    const migrationsDir = "/app/dist/db/migrations";
    if (!fs.existsSync(migrationsDir)) {
      console.log("No migrations directory found, skipping");
      return;
    }
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
    for (const file of files) {
      if (!applied.includes(file)) {
        console.log("Applying:", file);
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
        await pool.query("BEGIN");
        await pool.query(sql);
        await pool.query("INSERT INTO migrations (name) VALUES ($1)", [file]);
        await pool.query("COMMIT");
        console.log("Applied:", file);
      }
    }
    console.log("Migrations complete");
  } catch (e) {
    console.error("Migration error:", e.message);
  } finally {
    await pool.end();
  }
}

migrate();
