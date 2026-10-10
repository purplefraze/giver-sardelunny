# My G birthday correction — preview only

## Exact changes
- MyGRing Bio type, draft construction, rendered fields and save payload no longer contain byDay, byNight or weekend. Historical stored values remain untouched; no schema or Cloud changes.
- Username and about me remain. The private birthday label uses the existing date-only value, blank when unknown, with a native date input and explicit year range. Browser/OS owns the native date interaction.
- New Zod profile-birthday schema rejects impossible dates, future dates and supplied birthdays younger than 18. The exact 18th birthday is accepted. Save is disabled on errors and validates again before the existing store patch.
- Only bio spacing changed: remove duplicate interior bio heading (active seat still names bio), compact two-line about input, shift the bio content slightly upward inside the unchanged hollow, no section scroll. Camera, geometry, track, labels, photo and other sections were not modified.

## Verification
- 19 focused tests passed, including blank/no invention, exact age boundary, underage, invalid February dates, leap day and future/non-ISO dates.
- Production-used MyGRing via isolated /dev/my-g: 320×568, 390×640, 390×844, 430×932. Underage error, birthday and 44px save/undo actions visibly inside the hollow; no full-section scroll. Reviewed 320px screenshot after correcting an initially detected rim/action overlap.
- Browser fixture entered 2000-02-29, saved via the real control, reloaded, and read the same date back. Legacy values stayed unchanged. Unknown fixture birthday initially remained blank. Underage date disabled save and displayed an accessible error on all four sizes.
- Remote requests were blocked; no remote write attempts, no runtime errors. Automatic preview build OK.

## Limits
This proves local persistence in an isolated production-used component, not signed-in main-app Cloud save/reopen or server-side validation. No real profile writes or deployment. Native iPhone date wheels/calendar, physical touch and keyboard presentation require device verification. Earlier main-entry zoom/label/photo checks remain outstanding; their existing code was preserved.