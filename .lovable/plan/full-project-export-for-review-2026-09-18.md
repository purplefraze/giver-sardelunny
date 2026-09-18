# Full project export for review

Package an exact snapshot of the current Giver build as a single downloadable ZIP, with nothing modified, cleaned up, or refactored.

## What goes in

- Everything in the project source: all screens and routes, every component, the Living G code, styling and design tokens, navigation, state stores, profile/account logic, server functions, validation and permission code.
- All database migration files and backend/API route files.
- Project assets that live in the project (images, icons, pointers to hosted assets).
- All configuration: package.json and lockfile, TypeScript, Vite, Tailwind/CSS entry, app config, README/AGENTS notes, and the plan/snapshot notes folder.
- A short INVENTORY.md listing the folder layout so a reviewer can orient quickly (added alongside, nothing existing touched).

## What stays out

- Installed dependency folders and build output (regenerable, and they would bloat the ZIP past anything usable).
- Version-control internals.
- Real secret values. The environment file holds only the public backend address and the public key, which are safe to include; no private keys or passwords exist in the project to export. I will note this in INVENTORY.md.

## How it is delivered

The ZIP is assembled outside the project, its contents listed and checked so nothing needed is missing, then placed in your Files as `giver-full-export-<date>.zip` and attached in chat for download.

## Note

The export is read-only work: no project file is changed by it.
