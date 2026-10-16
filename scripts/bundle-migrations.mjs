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
