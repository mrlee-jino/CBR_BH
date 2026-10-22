import base from "../playwright.config";
import { defineConfig } from "@playwright/test";

// Enable Google only on the isolated local Auth service, with dummy credentials.
export default defineConfig({ ...base, testDir: "./google-enabled" });
