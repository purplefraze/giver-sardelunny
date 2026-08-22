/**
 * HAPTICS — THE ONE PLACE TOUCH BECOMES FEEL.
 *
 * The whole app speaks in intentions, never in device APIs:
 *
 *   haptics.light()     a control resolved   (toggle snap, pickup, reorder, delete)
 *   haptics.medium()    a threshold crossed  (spark entering a new loop)
 *   haptics.success()   a state truly changed (spark landed, verified, sparks earned)
 *
 * This layer alone decides HOW that is delivered, in strict order of fidelity:
 *
 *   1. Capacitor Haptics — real Taptic Engine / Android VibrationEffect when the
 *      app is packaged as a native shell. This is the only path that gives true
 *      native haptics, and it is used automatically the moment it exists.
 *   2. A custom native bridge (iOS WKWebView message handler, Android JS
 *      interface, or a React Native WebView) — for a wrapper that exposes its
 *      own haptic channel instead of Capacitor's.
 *   3. navigator.vibrate — Android Chrome / Samsung Internet only. This is a
 *      motor buzz, NOT native haptics, and is deliberately the third choice.
 *   4. iOS Safari's switch-control tap: the only genuine Taptic feedback a plain
 *      mobile web page can ask for. Still real hardware feedback — never a
 *      visual imitation of one.
 *
 * Where none of those exist the call does nothing at all: no throw, no delay,
 * no interaction ever blocked or altered. Haptics are the seasoning, never the
 * meal.
 */

export type HapticLevel =
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "success"
  | "warning"
  | "error"
  /** Going INSIDE a Living G: a short rising pair, felt as the G swallowing. */
  | "enter"
  /** The G folding shut again: the same pair, falling. */
  | "exit";

/**
 * Web vibration approximations, used only when no native engine is present.
 * ANDROID TASTE RULE: nothing here is longer than a tick. The motor is asked
 * for short pulses with air between them — never a buzz a thumb has to wait out.
 */
const WEB_PATTERN: Record<HapticLevel, number | number[]> = {
  selection: 8,
  light: 12,
  medium: 20,
  heavy: 32,
  success: [12, 55, 22],
  warning: [16, 70, 16],
  error: [24, 60, 24, 60, 24],
  enter: [9, 42, 16],
  exit: [16, 38, 8],
};

/** Capacitor's own vocabulary, so a native build feels native. */
const CAP_IMPACT: Partial<Record<HapticLevel, "LIGHT" | "MEDIUM" | "HEAVY">> = {
  light: "LIGHT",
  medium: "MEDIUM",
  heavy: "HEAVY",
  enter: "MEDIUM",
  exit: "LIGHT",
};


const CAP_NOTIFY: Partial<Record<HapticLevel, "SUCCESS" | "WARNING" | "ERROR">> = {
  success: "SUCCESS",
  warning: "WARNING",
  error: "ERROR",
};

type Bridge = "capacitor" | "custom" | "vibrate" | "ios-switch" | "none";

type Loose = Record<string, any>;

const win = () => (typeof window === "undefined" ? undefined : (window as unknown as Loose));

function capacitorHaptics(): Loose | undefined {
  const w = win();
  const cap = w?.["Capacitor"] as Loose | undefined;
  if (!cap) return undefined;
  // Only a real native shell counts: on the web Capacitor reports "web".
  const platform = typeof cap["getPlatform"] === "function" ? cap["getPlatform"]() : cap["platform"];
  if (platform !== "ios" && platform !== "android") return undefined;
  const plugin = (cap["Plugins"] as Loose | undefined)?.["Haptics"] as Loose | undefined;
  return typeof plugin?.["impact"] === "function" ? plugin : undefined;
}

/** A wrapper that exposes its own channel. Any ONE of these is enough. */
function customBridge():
  | { send: (level: HapticLevel) => void }
  | undefined {
  const w = win();
  if (!w) return undefined;

  // window.GiverHaptics.trigger("light") — Android JS interface or injected shim.
  const direct = w["GiverHaptics"] as Loose | undefined;
  if (typeof direct?.["trigger"] === "function") {
    return { send: (level) => direct["trigger"](level) };
  }

  // iOS WKWebView: webkit.messageHandlers.haptics.postMessage("light")
  const handlers = (w["webkit"] as Loose | undefined)?.["messageHandlers"] as Loose | undefined;
  const ios = (handlers?.["haptics"] ?? handlers?.["giverHaptics"]) as Loose | undefined;
  if (typeof ios?.["postMessage"] === "function") {
    return { send: (level) => ios["postMessage"](level) };
  }

  // React Native WebView shell.
  const rn = w["ReactNativeWebView"] as Loose | undefined;
  if (typeof rn?.["postMessage"] === "function") {
    return { send: (level) => rn["postMessage"](JSON.stringify({ type: "haptic", level })) };
  }

  return undefined;
}

function canVibrate() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS reports as a Mac, but a Mac has no touch points.
    (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1)
  );
}

/**
 * iOS SAFARI'S ONE REAL HAPTIC. Tapping a `switch` control makes iOS 17.4+ play
 * a genuine Taptic tick. The control is off-screen, inert, aria-hidden and never
 * focusable, so the page is unchanged — only the hardware answers.
 */
let switchEl: HTMLLabelElement | null = null;

function iosSwitchTick() {
  if (typeof document === "undefined") return false;
  try {
    if (!switchEl) {
      const label = document.createElement("label");
      label.setAttribute("aria-hidden", "true");
      label.style.cssText =
        "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      input.tabIndex = -1;
      label.appendChild(input);
      document.body.appendChild(label);
      switchEl = label;
    }
    switchEl.click();
    return true;
  } catch {
    return false;
  }
}

/** Which route is available, resolved lazily and remembered. */
let bridge: Bridge | null = null;

/**
 * A VERDICT IS NEVER FINAL. The first resolve can happen before a native shell
 * has injected its bridge, or before an iOS page is running standalone from the
 * home screen. So a "none"/web answer is re-asked on the next call and whenever
 * the app returns to the foreground; only a real engine is remembered for good.
 */
function detect(): Bridge {
  if (capacitorHaptics()) return "capacitor";
  if (customBridge()) return "custom";
  if (canVibrate()) return "vibrate";
  if (isIOS()) return "ios-switch";
  return "none";
}

function resolve(): Bridge {
  if (bridge === "capacitor" || bridge === "custom") return bridge;
  bridge = detect();
  return bridge;
}

/** Forget a web-only verdict so the next call looks again. */
export function refreshHapticBridge() {
  if (bridge !== "capacitor" && bridge !== "custom") bridge = null;
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshHapticBridge();
  });
}

/** Is the page inside a frame? A cross-origin frame blocks the iOS switch tick. */
function inFrame() {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Running from the home screen, the only iOS web context with any chance. */
function isStandalone() {
  if (typeof window === "undefined") return false;
  const nav = navigator as unknown as Loose;
  return (
    nav["standalone"] === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
}

/** Everything the diagnostic needs, in one honest read. */
export function hapticsReport() {
  const route = resolve();
  const frame = inFrame();
  const standalone = isStandalone();
  const ios = isIOS();

  let verdict: string;
  if (route === "capacitor") verdict = "native taptic engine — full haptics";
  else if (route === "custom") verdict = "native wrapper bridge — full haptics";
  else if (route === "vibrate") verdict = "android motor buzz — you should feel every event";
  else if (route === "ios-switch" && frame)
    verdict = "iphone safari inside a preview frame — no haptics possible here. add to home screen, or use the native build";
  else if (route === "ios-switch" && !standalone)
    verdict = "iphone safari — ios gives web pages no vibration api. only ios 18+ may answer the switch tick; the native build is the real fix";
  else if (route === "ios-switch")
    verdict = "iphone, home screen — trying the ios switch tick. faint or silent is expected; the native build is the real fix";
  else verdict = "no haptic hardware on this device — nothing to feel";

  return { route, frame, standalone, ios, verdict };
}


/**
 * NEVER TWICE FOR ONE MOMENT. A single state change often surfaces in more than
 * one place (a store notifies, a screen reacts); the same intention inside this
 * window is felt once, so nothing ever turns into a stutter or a spam of buzzes.
 */
const COALESCE_MS = 70;
let lastAt = 0;
let lastLevel: HapticLevel | null = null;

function fire(level: HapticLevel) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (level === lastLevel && now - lastAt < COALESCE_MS) return;
  lastAt = now;
  lastLevel = level;

  try {
    switch (resolve()) {
      case "capacitor": {
        const plugin = capacitorHaptics();
        if (!plugin) break;
        const notify = CAP_NOTIFY[level];
        if (notify) {
          void plugin["notification"]?.({ type: notify });
          break;
        }
        if (level === "selection") {
          if (typeof plugin["selectionChanged"] === "function") {
            void plugin["selectionChanged"]();
            break;
          }
        }
        void plugin["impact"]({ style: CAP_IMPACT[level] ?? "LIGHT" });
        break;
      }
      case "custom":
        customBridge()?.send(level);
        break;
      case "vibrate":
        navigator.vibrate(WEB_PATTERN[level]);
        break;
      case "ios-switch":
        // One tick per event; a success reads as a quick double.
        iosSwitchTick();
        if (level === "success" || level === "error") {
          window.setTimeout(iosSwitchTick, 90);
        }
        break;
      default:
        break;
    }
  } catch {
    /* A device that cannot answer simply stays quiet. Never a thrown error. */
  }
}

export const haptics = {
  /** A control resolved: toggle snap, spark pickup, reorder, delete. */
  light: () => fire("light"),
  /** A threshold crossed mid-gesture: a spark entering a new loop. */
  medium: () => fire("medium"),
  /** Rare, physical weight. Reserved. */
  heavy: () => fire("heavy"),
  /** The quietest possible acknowledgement: moving through options, peeking. */
  selection: () => fire("selection"),
  /** A state truly changed: sparks landed, verified completion, sparks earned. */
  success: () => fire("success"),
  /** Something could not be done. */
  warning: () => fire("warning"),
  error: () => fire("error"),
  /** Which route is in use — for diagnostics only. */
  bridge: () => resolve(),
  /** True native haptics, as opposed to a web motor buzz or a Safari tick. */
  isNative: () => resolve() === "capacitor" || resolve() === "custom",
};

/**
 * COMPATIBILITY. Older call sites ask for a millisecond pattern; that intent is
 * mapped onto the shared vocabulary so there is still exactly ONE haptic layer.
 */
export function buzz(pattern: number | number[] = 12) {
  if (Array.isArray(pattern)) {
    fire("success");
    return;
  }
  if (pattern <= 8) fire("selection");
  else if (pattern <= 16) fire("light");
  else if (pattern <= 24) fire("medium");
  else fire("heavy");
}
