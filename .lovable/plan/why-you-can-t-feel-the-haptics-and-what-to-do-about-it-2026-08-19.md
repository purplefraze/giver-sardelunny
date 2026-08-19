# Why you can't feel the haptics — and what to do about it

## The short answer

The haptics are all in the code already. Every intended moment calls the central haptics service: toggle snap, spark pickup, spark crossing the spine, spark landing, verification, +10 sparks, reorder, delete, refused actions.

What is missing is hardware. You are testing on iPhone in Safari inside the Lovable preview, and that is the one environment that has no haptic feedback at all:

- iOS Safari has no vibration API. None. Nothing a web page calls can drive the Taptic Engine.
- The one exception is a native `switch` control tick, and it only fires on iOS 18+, only for a real user tap on a real visible switch, and it is blocked inside a cross-origin preview iframe.
- So on iPhone/Safari/preview, the correct behaviour of the current code is silence.

Android Chrome would buzz today. A native wrapper would give true Taptic feedback. Neither is what you are holding.

## What I'll build

### 1. A haptics diagnostic (so we stop guessing)

A small dev-only panel, reachable from the existing dev controls, that shows:

- which delivery channel resolved on this device (native / custom bridge / vibrate / iOS switch / none)
- whether the page is inside an iframe, and whether it is running standalone (home screen)
- one test button per intensity: selection, light, medium, heavy, success, warning, error
- a plain-language verdict line, e.g. "iPhone Safari in a preview frame — no haptics possible here. Add to Home Screen or use the native build."

This turns "I can't feel anything" into a definite answer in two taps.

### 2. The native path, wired and ready

So that real Taptic feedback works the moment the app is packaged:

- Add Capacitor core + the Haptics plugin as dependencies and configure the app id/name, so a native shell is a build step, not a rewrite.
- The haptics service already prefers Capacitor first and already speaks Capacitor's own vocabulary (impact styles, notification types, selectionChanged). It stays the single interface — nothing in the app changes its calls.
- Keep the custom-bridge fallback for a hand-rolled iOS WKWebView or Android wrapper.
- Note in the repo how to run the native build; no native project files are generated here since that step happens on your machine.

### 3. One honest improvement for iOS web

Add-to-Home-Screen (standalone) iOS is the only web context where the switch tick has a chance. I'll make the service re-resolve its channel once after hydration instead of caching a verdict from the first tick, and re-check when the app returns to the foreground, so a home-screen install isn't stuck with the "none" answer from a colder start.

## What I will not do

- No fake haptics: no visual flash, sound, or animation pretending to be a vibration.
- No change to the Living G geometry, scale, loop behaviour, colours, or copy.
- No change to which moments fire haptics or at what intensity — that hierarchy stays exactly as approved.

## Technical notes

- `src/lib/haptics.ts` stays the only haptic layer; changes are limited to lazy re-resolution and exposing the diagnostic details it already computes.
- New component: a haptics section inside `src/components/DevControls.tsx` (or a small sibling), dev-only, not part of the product surface.
- Capacitor config file at the project root; `capacitor.config.ts` plus deps only — no `ios/` or `android/` folders committed.
