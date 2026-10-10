# My G profile loop — preview verification

## Scope
MyGRing uses communi-g's existing pure normalized input, signed-angle, bounded lens and release-settling helpers against the unchanged upper toggle ring. Camera follows that ring; only the active seat and adjacent names are displayed, with bounded readable screen-space text. Photo frames the entire circular image, keeps the existing picker/reposition flow and removes the translucent rectangular background rule. No full Living G, lower-loop engine, profile store or cloud changes.

## Checks
- Production MyGRing at `/dev/my-g`: 320×568, 390×640, 390×844 and 430×932; all eight seats, three visible labels each within viewport bounds.
- Browser-only synthetic photo: circular clip, transparent control container, change-photo opens file chooser; cancel without upload or save.
- Real component pointer handlers: movement immediately changes angle, unchanged coordinates freeze angle/camera, reverse responds immediately, release settles and stays still; background drag does not navigate.
- Reduced-motion navigation settles immediately after hydration. Browser runtime errors: none. Intercepted remote write attempts: none.
- Existing regression suite: 625 pass, 0 fail. Automatic preview build: OK.

## Limits
No real account edits, posts, uploads or deployment. This verifies the production-used component in its isolated review entry, not signed-in main-app entry/exit. Native iPhone touch, microphone and physical haptics remain unproven. Existing long Bio section scrolling is outside this focused camera/photo repair.