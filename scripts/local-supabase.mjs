import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

// Local CLI status is captured, never printed: it includes privileged local test keys.
const output = execFileSync(
  process.execPath,
  ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
const settings = JSON.parse(output.slice(output.indexOf("{")));
const url = settings.API_URL ?? settings.api_url;
const anon = settings.ANON_KEY ?? settings.anon_key;
const service = settings.SERVICE_ROLE_KEY ?? settings.service_role_key;
const db = settings.DB_URL ?? settings.db_url;
if (!url || !anon || !service || !db)
  throw new Error("Local CLI status did not provide all required settings.");
if (new URL(url).hostname !== "127.0.0.1" || new URL(url).port !== "54321")
  throw new Error("Refusing to configure non-local test services.");
const values = {
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anon,
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  TEST_SUPABASE_SERVICE_KEY: service,
  SUPABASE_SECRET_KEY: service,
  TEST_DATABASE_URL: db,
};
writeFileSync(
  ".env.test.local",
  Object.entries(values)
    .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
console.log("Wrote ignored, local-only test configuration. No hosted settings were changed.");
