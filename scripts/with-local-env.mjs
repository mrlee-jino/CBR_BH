import { spawnSync } from "node:child_process";
import { localTestEnv } from "./test-env.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error("A command is required.");
const result = spawnSync(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    ...localTestEnv(),
    NO_PROXY: [process.env.NO_PROXY, "127.0.0.1", "localhost"].filter(Boolean).join(","),
    no_proxy: [process.env.no_proxy, "127.0.0.1", "localhost"].filter(Boolean).join(","),
  },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
