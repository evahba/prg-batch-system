# Changelog — Kitchen Display System

## CSS / Browser Compatibility (Chrome 105 / iOS 14.7.1 Safari)

**Problem:** App was invisible on old iPad — Chrome 105 and old Safari do not support `oklch()` colors used by Tailwind CSS v4.

**Fix:** Added PostCSS plugin `@csstools/postcss-oklab-function` to convert all `oklch()` values to `rgb()` fallbacks at build time. Also set Vite build target to `chrome105` and added `-webkit-fill-available` viewport fix for iOS Safari.

**Files changed:**
- `web/postcss.config.js` — new PostCSS config with oklab plugin
- `web/vite.config.ts` — added `build.target: 'chrome105'`
- `web/src/index.css` — `-webkit-fill-available` height fix

---

## Screen Layout — 1280×800 Fit

All BOH screens (Stir Fry+Grill, Fryer, Sides+Grill) were refactored to fit within a 1280×800 resolution without horizontal overflow. Column widths were reduced and card padding tightened.

---

## Screen 3 — Stir Fry + Grill

Grill station was merged into screen 3 alongside Stir Fry. Previously grill was only on screen 5.

**Files changed:**
- `web/src/hooks/useSocket.ts` — screen 3 rooms: `['stirfry', 'grill']`
- `web/src/components/ScreenNav.tsx` — label updated to "Stir fry+Grill"

---

## Screen 5 — Sides + Grill (column layout)

In-Progress and Waiting columns were made slimmer to fit horizontally on the tablet.

---

## FOH Cards — "Waiting to start" → "In queue"

Renamed the status label on FOH cards from "Waiting to start" to "In queue".

**Files changed:**
- `web/src/components/ScreenFOH.tsx`

---

## BOH Alarm — Timer Complete Sound

When a BOH timer reaches zero, an alarm beep plays every **1.5 seconds** until the cook clicks **Done**. The alarm stops automatically on completion.

**Safari/WebKit fix:** A singleton `AudioContext` is used (instead of creating a new one per beep) and it is unlocked on first touch/click to comply with Safari's autoplay policy.

**Files changed:**
- `web/src/components/ScreenBOH.tsx`
  - `playAlarmBeep()` — 3-note square-wave beep sequence
  - `getAudioContext()` — singleton with `webkitAudioContext` fallback
  - `unlockAudio()` — silent buffer played on first user interaction
  - `BatchRow` `useEffect` — `setInterval(playAlarmBeep, 1500)` while `isQualityCheck`, clears on Done

---

## C4 Cook Time Fix

Grilled Teriyaki Chicken (C4) cook time corrected from **7:00** to **3:45** (225 seconds) for all batch sizes.

**Changed via DB:**
```sql
UPDATE menu_items
SET cook_times = '{"1": 225, "2": 225, "3": 225}'
WHERE code = 'C4';
```

---

## Fryer Screen — 6-Item Limit

Screen 4 (Fryer) now displays a maximum of **6 in-progress tickets** at once. If more than 6 are running, an orange warning banner shows the overflow count.

**Files changed:**
- `web/src/components/ScreenBOH.tsx`
  - `FRYER_LIMIT = 6` constant
  - `isFryer = screen === 4` guard
  - `inProgress` sliced to 6 for fryer screen
  - Orange overflow banner rendered when `allInProgress.length > FRYER_LIMIT`

---

## "B2" → "Batch 2" Label

Batch size labels on BOH batch rows were renamed from `B2` to `Batch 2` for clarity.

**Files changed:**
- `web/src/components/ScreenBOH.tsx` — `BatchRow` span text

---

## URL-Based Screen Navigation

Each screen is now accessible by a direct URL. Navigating between screens updates the browser URL, and the back button works.

| URL | Screen |
|-----|--------|
| `/sc1` | FOH |
| `/sc2` | Drive Thru |
| `/sc3` | Stir Fry + Grill |
| `/sc4` | Fryer |
| `/sc5` | Sides + Grill |
| `/menu` | Menu |

Implementation uses the native `history.pushState` API — no router library needed. Deep links work because nginx already uses `try_files $uri /index.html`.

**Files changed:**
- `web/src/App.tsx`
  - `PATH_TO_SCREEN` / `SCREEN_TO_PATH` maps
  - `getScreenFromPath()` — reads `window.location.pathname` on load
  - `useEffect` — syncs screen state → URL
  - `popstate` listener — handles back/forward navigation

---

## Drive Thru — Item Layout Rearranged

Drive Thru screen (screen 2) item layout was updated to match the requested order.

**Section 1:**
- Row 1 (3 cards): Honey Sesame Chicken Breast (CB3), Kung Pao Chicken (C3), Super Greens (V1)
- Row 2 (2 wide cards): Chow Mein (M1), Fried Rice (R1)

**Section 2:**
- Row 1 (3 cards): Beijing Beef (B5), Orange Chicken (C1), Mushroom Chicken (C2)
- Row 2 (3 cards): Honey Walnut Shrimp (F4), Broccoli Beef (B1), Grilled Teriyaki Chicken (C4)

Row order in Section 1 was also swapped (3-card row moved above wide row).

**Files changed:**
- `web/src/hooks/useMenu.ts` — `groupMenuByDriveThruSections()` updated with new item codes per row
- `web/src/components/ScreenDriveThru.tsx` — Section 1 rows swapped (`row2` rendered first, `row1` second)

---

## Navigation Hidden

The `HiddenNav` component is commented out in `App.tsx`. Screens are now navigated via URL only. The component is preserved and can be re-enabled by uncommenting.

**Files changed:**
- `web/src/App.tsx`
  - `HiddenNav` import commented out
  - `<HiddenNav />` JSX commented out
  - `pt-8` top padding removed from `<main>` (was reserving space for nav bar)

---

## Source Badge on BOH — Drive Thru vs FOH

Every BOH ticket row now shows a badge indicating whether the order came from **Drive Thru** or **FOH**.

- Drive Thru: blue badge with car icon, label "DT"
- FOH: grey badge, label "FOH"
- Source is determined by `ticket.source === 'drive_thru'`

**Files changed:**
- `web/src/components/ScreenBOH.tsx` — `SourceBadge` component added, rendered in `BatchRow`

---

## New Menu Item — C13 Dynamite Sweet & Sour Chicken

Added new fryer item to the menu.

| Field | Value |
|-------|-------|
| Code | C13 |
| Title | Dynamite Sweet & Sour Chicken |
| Station | fryer |
| Batch sizes | 1, 2, 3 |
| Cook time | 5 min (300s) all batch sizes |
| Hold time | 10 min (600s) |
| Recommended batch | 1 (all dayparts) |

Image `c13.png` committed to `api/public/uploads/` and copied into the Docker uploads volume on production.

**Files changed:**
- `api/database/seeders/01_menu_seeder.ts` — C13 entry added
- `api/public/uploads/c13.png` — image file committed

---

## FOH (sc1) Layout Rearranged

FOH screen switched from a flat 4-column grid to an explicit row-based layout with span support.

**Section 1:**
- Row 1: C13, C3, B3, F4
- Row 2: M1, V1, R1, R2

**Section 2:**
- Row 1: B1, C1 (span-2), CB5
- Row 2: C2, CB3, CB1, B5

**Section 3:** unchanged (C4, E1, E2, E3)

Added `compact` prop to `CallFoodItem` so the wide-span C1 uses a shorter image height instead of the default tall aspect ratio.

**Files changed:**
- `web/src/hooks/useMenu.ts` — `groupMenuByFohSections()` rewritten with row/span structure
- `web/src/components/ScreenFOH.tsx` — `SimpleRow`, `SpannedRow` layout components added
- `web/src/components/CallFoodItem.tsx` — `compact` prop support added

---

## Fix: c13.png 404 — Uploads Served via fs.createReadStream

**Problem:** `response.download()` from AdonisJS was returning `File not found` even though the file existed at `/app/public/uploads/c13.png`. Root cause: `response.download()` from `@adonisjs/core` has a known bug in certain build/volume configurations where it cannot resolve the file path correctly despite `existsSync` returning true.

**Fix:** Replaced the `/uploads/*` route handler to serve files directly using Node.js `fs.createReadStream()` instead of `response.download()`. The handler manually resolves the absolute path via `process.cwd()`, checks existence with `existsSync`, sets the correct `Content-Type` and `Content-Length` headers, and streams the file.

**Files changed:**
- `api/start/routes.ts`
  - Removed `import app from '@adonisjs/core/services/app'`
  - Added `import { createReadStream, existsSync, statSync } from 'node:fs'` and `import { join } from 'node:path'`
  - `/uploads/*` handler now uses `response.stream(createReadStream(absPath))`

**Deployment note:** The droplet's old `docker-compose` (v1.29.2) has a `ContainerConfig` KeyError bug with newer Docker versions. The API container was recreated manually using `docker run` with the exact same environment variables, volume mount (`prg-batch-system_uploads_data:/app/public/uploads`), and network (`prg-batch-system_default`) as the original compose-managed container.
