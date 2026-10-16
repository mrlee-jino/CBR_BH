import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { format } from "prettier";

const source = execFileSync(
  process.execPath,
  [
    "node_modules/supabase/dist/supabase.js",
    "gen",
    "types",
    "typescript",
    "--local",
    "--schema",
    "public",
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
if (!source.includes("export type Database"))
  throw new Error("Database type generation failed; existing file was preserved.");
writeFileSync(
  "src/lib/supabase/database.types.ts",
  await format(source, { parser: "typescript", printWidth: 100 }),
);
console.log("Generated types from the local migrated database.");
