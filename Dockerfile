FROM node:20-alpine

WORKDIR /app

# Copy only package.json (no lockfile in monorepo API)
COPY vibecode/apps/api/package.json ./

# Install dependencies fresh
RUN npm install --legacy-peer-deps

# Copy API source code
COPY vibecode/apps/api/src ./src

# Create standalone tsconfig for Docker build
RUN echo '{"compilerOptions":{"target":"ES2022","module":"NodeNext","moduleResolution":"NodeNext","outDir":"./dist","rootDir":"./src","strict":true,"esModuleInterop":true,"skipLibCheck":true,"resolveJsonModule":true},"include":["src/**/*"],"exclude":["node_modules","dist"]}' > tsconfig.json

# Build TypeScript
RUN npm run build

# Copy migrations folder to dist
RUN mkdir -p dist/db && cp -r src/db/migrations dist/db/

# Expose port
EXPOSE 4000

# Create migration runner that uses DATABASE_URL
COPY <<-"MIGRATEJS" /app/run-migrations.mjs
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function migrate() {
  console.log("Running migrations...");
  try {
    await pool.query("CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE, applied_at TIMESTAMPTZ DEFAULT NOW())");
    const applied = (await pool.query("SELECT name FROM migrations")).rows.map(r => r.name);
    const migrationsDir = path.join(__dirname, "dist/db/migrations");
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
    for (const file of files) {
      if (!applied.includes(file)) {
        console.log("Applying:", file);
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
        await pool.query("BEGIN");
        await pool.query(sql);
        await pool.query("INSERT INTO migrations (name) VALUES (\$1)", [file]);
        await pool.query("COMMIT");
      }
    }
    console.log("Migrations complete");
  } catch (e) { console.error("Migration error:", e.message); }
  finally { await pool.end(); }
}
migrate();
MIGRATEJS

# Startup script runs migrations then server
COPY <<-"STARTSH" /app/start.sh
#!/bin/sh
node /app/run-migrations.mjs
exec node dist/server.js
STARTSH
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
