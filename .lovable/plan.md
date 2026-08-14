# Permanently fix Profile / Community navigation

## Confirmed diagnosis

The bug is caused by multiple navigation layers that do not share one source of truth:

1. **App state and browser history diverge.** `src/routes/index.tsx` opens a world by appending to a React `stack`, then a side effect independently calls `window.history.pushState`. The visible Back arrow only removes the React stack entry; it does not consume the browser-history entry. Repeated Profile/Community visits therefore accumulate stale history entries. At Home, the `popstate` listener is removed entirely, so device/browser Back can consume those stale entries without changing the UI.
2. **Open loop panels survive world exit.** Every Profile and Community `World` remains mounted while hidden. Its local `open` panel state is therefore preserved. Leaving a world with a panel open and later returning can reveal that old full-screen panel immediately.
3. **Two back controls occupy the same position when a panel is open.** The world-level Back arrow remains mounted beneath the panel-level Back arrow. They share the same label, coordinates, and z-index. The later panel control normally paints on top, but the duplicate target is ambiguous and makes the exit hierarchy fragile.
4. **Layering is fragile but not the primary failure.** Closed screens correctly use both `invisible` and `pointer-events-none`, so they are not currently intercepting taps. However, Home remains live underneath every world and relies only on z-index coverage. This should be made defensive while navigation is corrected.
5. **Profile and Community do not route to each other.** Both are leaf worlds opened only from Home, and both call the same `pop` function. The Living G hit regions are not cross-routing them.

A runtime trace confirmed the mismatch: entering Profile increased browser history while the in-app Back behavior only changed React state. Opening a Profile panel also produced two simultaneous `Back` controls.

## Recommended implementation

### 1. Establish one navigation source of truth

Replace the custom React array plus raw `window.history.pushState` effect with TanStack Router-managed navigation state for the active world. Profile, Community, Give, Wish, Trade, and Messages can share the same typed world state without adding routes, a navigation bar, or visual UI.

- Living G/Home actions update the router-managed world state.
- World Back clears that state through the router.
- Device/browser Back and the visible Back arrow therefore operate on the same history model.
- Remove the manual `pushState`/conditional `popstate` logic completely.

### 2. Make panel depth explicit and disposable

Ensure a loop panel cannot outlive its world:

- Close the active panel before leaving its world.
- Reset panel state whenever its world becomes inactive.
- While a panel is open, render only the panel-level Back arrow; suppress the underlying world-level Back arrow so there is one unambiguous exit target.

### 3. Harden inactive screens

Keep inactive worlds non-interactive at their outer boundary, including Home while another world is active. Preserve the existing appearance, transitions, Living G geometry, hit areas, colors, and content.

### 4. Verify the complete exit hierarchy

Test on mobile viewport and browser/device Back behavior:

- Home → Profile → Home, repeatedly.
- Home → Community → Home, repeatedly.
- Profile panel → Profile → Home.
- Community panel → Community → Home.
- Alternate Profile and Community many times and verify history does not accumulate stale app entries.
- Confirm hidden worlds and Home cannot intercept taps.
- Confirm exactly one visible Back control at every navigation depth.
- Regression-check Wish and Give because they use the same shared world navigation.

## Scope guard

No redesign of Profile or Community. No new navigation bar. No Discovery destination. No changes to Living G geometry, independent swell, invisible hit areas, onboarding, copy, or canonical colors.
