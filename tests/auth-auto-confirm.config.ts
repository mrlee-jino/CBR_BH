import base from "../playwright.config";
import { defineConfig } from "@playwright/test";

// Run separately with Confirm email disabled on the isolated local Auth service.
export default defineConfig({ ...base, testDir: "./auth-auto-confirm" });
