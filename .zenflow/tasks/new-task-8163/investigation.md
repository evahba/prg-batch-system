# Chrome 105 Compatibility Investigation

## Bug Summary

The frontend deployed at `134.199.223.99:8080` is broken on an old iPad running **Chrome 105.0.5195.100**. The app is built with React 19, Vite 7, and **Tailwind CSS v4** — all of which use modern CSS features that Chrome 105 does not support.

---

## Root Cause Analysis

### 1. `oklch()` Color Function — CRITICAL

**Chrome 105 does NOT support `oklch()`** (added in Chrome 111).

The entire color theme in `web/src/index.css` uses `oklch()` for all CSS custom properties:
- 60 `oklch()` occurrences in `index.css` alone (`:root` and `.dark` blocks)
- All design tokens: `--background`, `--foreground`, `--primary`, `--card`, `--sidebar-*`, `--chart-*`, etc.

**Effect**: Every component that uses these CSS variables will render with no color — transparent backgrounds, invisible text, broken buttons. The app is essentially invisible/unusable.

### 2. Tailwind CSS v4 Default Color Palette — CRITICAL

This project uses `@tailwindcss/vite` v4.1.18. **Tailwind v4's entire built-in color system uses `oklch()` internally.** Any utility class like `bg-blue-500`, `text-red-500`, `border-gray-200`, etc. will also emit `oklch()` values in the generated CSS.

The `@import "tailwindcss"` in `index.css` (Tailwind v4 syntax) will produce a CSS output full of `oklch()` color utilities — all of which Chrome 105 ignores.

### 3. CSS Nesting — SECONDARY

Native CSS nesting was added in **Chrome 112**. Tailwind v4 may generate nested CSS rules in its output. Chrome 105 would silently ignore nested rules.

### 4. No PostCSS Configuration / No Browser Target

- No `postcss.config.js` exists — no autoprefixer, no CSS transforms at build time
- No `browserslist` configuration — Vite doesn't know to target Chrome 105
- No `@vitejs/plugin-legacy` — no polyfills or fallback builds
- Vite defaults to `modules` target (ES2015+ modules) which Chrome 105 handles fine for JS, but CSS is untransformed

---

## Affected Components

All components that rely on the Tailwind color utilities or the CSS custom properties are affected. Given the entire color scheme is `oklch()`-based, this means **every component** in the app:

- `web/src/index.css` — all 60 `oklch()` color variable definitions
- Every component using Tailwind color utilities (`bg-*`, `text-*`, `border-*`, etc.)
- `web/src/components/ui/table.tsx` — also uses oklch-related patterns

---

## Proposed Solution

### Option A — PostCSS `oklch` Transform (Recommended)

Add a PostCSS plugin that converts `oklch()` to `rgb()` at build time. This is transparent and handles both the manually-written `index.css` values and any `oklch()` values Tailwind v4 generates.

**Steps:**
1. Add `postcss.config.js` with `@csstools/postcss-oklab-function` plugin
2. Install: `npm install -D @csstools/postcss-oklab-function`
3. Set `vite.config.ts` `css.postcss` config to use this plugin
4. Optionally set `build.target: 'chrome105'` in Vite config

**Pros:** No manual color conversion needed, Tailwind v4 color utilities are also fixed  
**Cons:** Slightly larger CSS output (fallback values)

### Option B — Manual `oklch()` → `hsl()` Conversion

Convert all 60 `oklch()` values in `index.css` to their `hsl()` equivalents. This only fixes the CSS variables, not Tailwind's built-in utility colors.

**Pros:** Simple, no new dependencies  
**Cons:** Only fixes `index.css` — Tailwind v4 utility classes still emit `oklch()`. This is NOT sufficient on its own.

### Option C — Downgrade to Tailwind CSS v3

Replace `@tailwindcss/vite` v4 with `tailwindcss` v3 + `postcss` + `autoprefixer`. Tailwind v3 uses `hsl()` colors which Chrome 105 supports.

**Pros:** Fully compatible, proven approach  
**Cons:** Breaking change — v3 and v4 have different configuration formats; would require significant refactoring of `index.css` (removing `@import "tailwindcss"`, `@theme`, `@plugin`, `@custom-variant`)

---

## Recommended Approach

**Option A** (PostCSS transform) is the cleanest fix:
- Minimal code change
- Fixes `oklch()` everywhere — both in `index.css` variables AND in Tailwind v4 generated utilities
- No Tailwind version downgrade needed
- No manual color math needed

**Implementation plan:**
1. Install `@csstools/postcss-oklab-function`
2. Create `web/postcss.config.js`
3. Update `web/vite.config.ts` to wire in PostCSS config and set `build.target: 'chrome105'`
4. Rebuild and redeploy

---

## Additional Notes

- **React 19** is JS-only and Chrome 105 handles it fine (supports ESM, async/await, class fields)
- **Radix UI** components are JS/React — no browser compatibility issues
- **Socket.io-client v4** — works in Chrome 105
- The **viewport meta tag** (`width=1194, height=834`) is already set correctly for iPad display
- The app structure and layout logic are fine — **only the CSS color system is broken**
