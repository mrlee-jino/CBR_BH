import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

export function localTestEnv() {
  const env = parseEnv(readFileSync(".env.test.local", "utf8"));
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  const db = new URL(env.TEST_DATABASE_URL);
  if (
    url.hostname !== "127.0.0.1" ||
    url.port !== "54321" ||
    !["localhost", "127.0.0.1"].includes(db.hostname) ||
    db.port !== "54322"
  )
    throw new Error("Tests may only use the isolated local Supabase stack.");
  return env;
}
