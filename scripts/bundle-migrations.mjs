import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const files = readdirSync("supabase/migrations")
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const parts = files.map((file) => {
  const [version, ...name] = file.replace(/\.sql$/, "").split("_");
  const source = readFileSync(`supabase/migrations/${file}`, "utf8")
    .replace(/^begin;\s*/i, "")
    .replace(/\s*commit;\s*$/i, "");
  return `-- Source: ${file}\n${source}\ninsert into supabase_migrations.schema_migrations(version,name) values(${quote(version)},${quote(name.join("_"))});`;
});
const output = `-- Fresh-project bootstrap only. Run once with the Supabase SQL Editor operator role.\nbegin;\ncreate schema if not exists supabase_migrations;\ncreate table if not exists supabase_migrations.schema_migrations(version text primary key,statements text[],name text);\nrevoke all on supabase_migrations.schema_migrations from public,anon,authenticated;\n${parts.join("\n\n")}\ncommit;\n`;
writeFileSync("supabase/bootstrap.sql", output);
console.log(`Bundled ${files.length} versioned migrations into supabase/bootstrap.sql.`);

// Existing hosted projects apply only this incremental upgrade, never bootstrap again.
const upgradeVersion = "20261017000400";
const upgrade = parts.find((part) => part.startsWith(`-- Source: ${upgradeVersion}_`));
if (!upgrade) throw new Error("Listing workspace upgrade migration is missing.");
writeFileSync(
  "supabase/upgrade-listings.sql",
  `-- Existing PuyoHub projects with migrations 001–003 already applied. Run once.\nbegin;\n${upgrade}\ncommit;\n`,
);

const photos = parts.find((part) => part.startsWith("-- Source: 20261017000500_"));
if (!photos) throw new Error("Photo migration is missing.");
writeFileSync(
  "supabase/upgrade-photos.sql",
  `-- Existing PuyoHub projects with migrations 001–004 applied. Run once.\nbegin;\n${photos}\ncommit;\n`,
);

const requests = parts.find((part) => part.includes("_request_context.sql"));
if (!requests) throw new Error("Request context migration is missing.");
writeFileSync(
  "supabase/upgrade-requests.sql",
  `-- Existing PuyoHub projects with the core, listing, and photo migrations applied. Run once.\nbegin;\n${requests}\ncommit;\n`,
);
