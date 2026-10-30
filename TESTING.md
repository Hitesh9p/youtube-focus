# Verification record and pre-release checklist

## Verified in the supplied environment

- `npm run check`: both JavaScript files parse.
- `npm test`: 14/14 pass. Minimal-permission manifest; no runtime network/eval calls; local settings and defaults; task text (no HTML insertion); SPA route and history changes; default 45-second reminder throttle; custom 10–3,600-second intervals; live changes; invalid-value fallback; independent reminder toggle; popup validation and saved settings; dismiss/timeout; editable/player exclusions; hidden Shorts pause behavior.
- These tests use a small mocked DOM and storage. They are logic checks, not evidence of CSS correctness on the real website.

## Blocked, not passed

`npm run test:browser` uses Chromium with local fixtures and mocked storage. The first attempt was named `npm test` before separating browser and unit suites. Chromium launch failed before any assertions: `socket() failed: Operation not permitted`. A permitted elevated retry failed before test execution: `bwrap: Can't create file at /home/agent/.codex/sessions: Read-only file system`. No attempt was made to read that restricted path. Re-run the provided browser suite on a machine that permits a temporary Chromium process.

## Live manual checklist (not yet run)

Use a clean test Chrome profile; install `extension/` unpacked. No personal browsing profile is required.

- Home feed hidden; search field usable; own subscriptions and channel pages remain available.
- Search deliberately, play a result; video, captions, seek, volume, fullscreen, and theatre mode still work.
- Sidebar related videos and end-screen video cards hidden; ending playback does not leave clickable recommendation tiles visible. Autoplay remains controlled by YouTube.
- Shorts shelves and navigation hidden; direct Shorts URL is covered and silent.
- Navigate home → results → watch → Shorts → Back/Forward without reloading. Verify page protection and focus notice match the new route.
- Trigger reminders by wheel, touch and PageDown; no focus theft or scroll blocking; no reminders from playback, layout shifts, player keyboard controls or typing search.
- Dismiss via Got it and Escape; repeat scrolls inside 45 seconds do not produce new reminders; a later scroll does.
- Set a task including `<`, `>`, emoji and 160 characters. Confirm safe plain text, sensible wrapping, saved settings after browser restart, and sync across open YouTube tabs.
- Toggle hiding off/on repeatedly: layout restores. Toggle reminders off/on independently: reminders disappear while off but hiding stays enabled. Reopen popup and verify persistence.
- Review at narrow/wide widths, light/dark YouTube, screen-reader polite announcement, keyboard navigation and 200% zoom.
- Repeat logged-out/logged-in and common YouTube UI experiments. Verify no unexpected network calls from the extension.

Known limits: desktop www.youtube.com only; current selectors may need maintenance as YouTube changes; custom scroll cooldown only; no autoplay control, countdown sessions, password lock, or universal removal of all recommendation/promotion surfaces.

## Version 0.2.0 additional manual checks (not yet run)

- Enter 120 seconds and Save; verify a first scroll can remind, repeat scrolling waits at least two minutes, and no timed alert fires without scrolling.
- Disable reminders while keeping hiding on, then hide off with reminders on.
- Test blank, 9, 10, fractional, 3,600 and 3,601 inputs; reopen popup, open a second tab, and verify persistent local settings.
- Reload an existing v0.1.0 installation in place and verify its task/hiding preference is retained.
- The browser launch blocked for v0.1.0 was not retried for v0.2.0; UI and live YouTube verification remain unperformed.

## Version 0.3.0

Syntax and all 14 unit tests pass. Added checks for comment defaults/migration, live toggles, focus-off restoration, popup persistence, and PNG signatures/dimensions/manifest references. Original SVG owl was rasterized with Sharp; the 128px PNG was visually inspected successfully. No further browser launch was attempted.

Manual checks still required: confirm comments hide on watch pages and comments engagement panels, toggle them back on, verify search/player/description and normal page scrolling remain usable, test across existing tabs and SPA navigation. Test upgrade with existing task, timer and reminder preferences. Verify toolbar icon and popup at normal/zoomed sizes in a real Chrome extension installation.
