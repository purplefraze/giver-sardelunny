import type { CapacitorConfig } from "@capacitor/cli";

/**
 * NATIVE SHELL — the only place giver gets real Taptic feedback.
 *
 * The web app is unchanged: haptics.ts already prefers Capacitor's Haptics
 * plugin above every web fallback, so packaging is a build step, not a rewrite.
 *
 *   bun run build
 *   bunx cap add ios       # or: bunx cap add android
 *   bunx cap sync
 *   bunx cap open ios
 */
const config: CapacitorConfig = {
  appId: "app.lovable.giver",
  appName: "giver",
  webDir: ".output/public",
  ios: { contentInset: "always" },
};

export default config;
