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

## Navigation Hidden

The `HiddenNav` component is commented out in `App.tsx`. Screens are now navigated via URL only. The component is preserved and can be re-enabled by uncommenting.

**Files changed:**
- `web/src/App.tsx`
  - `HiddenNav` import commented out
  - `<HiddenNav />` JSX commented out
  - `pt-8` top padding removed from `<main>` (was reserving space for nav bar)
