# Wish preview access repair — November 8, 2026

## Change
`/review/wish` independently mounts the saved World, EarSelector, VoiceEnclosure and WishJourney. No app sign-in/onboarding, recorder, Share, Sparks or hosted content. Root cloud startup is skipped only on this exact route. `/dev/wish`, `/auth` and admin restrictions remain unchanged. No navigation/sitemap links were added; metadata is noindex/nofollow/noarchive.

Production access uses only `new URL(getRequest().url).hostname` on SSR and `window.location.hostname` on the browser, normalized to lowercase. Only the exact existing main preview hostname is allowed, or DEV=true. No forwarded-host bypass, suffix wildcard, numbered draft or published-domain exception.

## Evidence
- 23 focused tests pass, 52 assertions: review allowlist, unchanged dev guards, Wish item/food sequences and local draft retention.
- Automatic build: build OK at 2026-11-08T04:32:52Z after application edits. No manual project build or publication.
- Browser hostname simulation uses actual preview/published browser origins with the served guard modules' DEV flags forced false. This is production-branch simulation, **not a locally served production bundle**.
- Preview-origin screenshots at actual320×568,390×844,430×932 show the new `what are you wishing for?` entry and all seven choices. Item and food Continue/Back preserve entered answers; reload restores local state. Zero cloud requests and zero page errors in those checks.
- Actual review beforeLoad on simulated published origin throws `{isNotFound:true}` with DEV=false. Existing dev guard also covered by production-denial tests. A whole denied-page simulation was inconclusive because SSR came from the development server; do not claim a full production SSR HTTP404 was observed.
- Real external URL was reached but redirected to Lovable platform login in the signed-out sandbox. The hosted app render could not be inspected without platform access. This is distinct from Giver account sign-in; no auth policy was changed.

## Paths
Review: https://id-preview--c68cfc0b-5cbf-4de6-baaf-5193d583eaba.lovable.app/review/wish

Screenshots/scripts/results: `/tmp/browser/wish-access/`, particularly `production-branch-entry-{320,390,430}.png` and `production-branch-{item,food}-{320,390,430}.png`. These filenames refer to simulated DEV=false guards, not production-bundle captures. External platform barrier: `external.png`.

Remaining verification boundary: authenticated external preview render and production SSR response. No database writes, migrations, policy changes or publishing were performed.