import { spawnSync } from "node:child_process";
import { chmodSync } from "node:fs";

// These public HTML templates must be readable by Kong's file-server user.
chmodSync("supabase/templates", 0o755);
for (const file of ["confirmation.html", "recovery.html"])
  chmodSync(`supabase/templates/${file}`, 0o644);

// Keep external traffic proxied; only local services bypass the outbound proxy.
const internal = [
  "127.0.0.1",
  "localhost",
  "supabase_kong_puyohub",
  "supabase_db_puyohub",
  "supabase_auth_puyohub",
  "supabase_rest_puyohub",
  "supabase_storage_puyohub",
  "supabase_inbucket_puyohub",
];
const noProxy = [process.env.NO_PROXY, process.env.no_proxy, ...internal].filter(Boolean).join(",");
const result = spawnSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "start"], {
  stdio: "inherit",
  env: { ...process.env, NO_PROXY: noProxy, no_proxy: noProxy },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
