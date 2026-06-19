# WCAG 2.2 Contrast Notes for the CTAButton Component

## Overview

This document describes the color/contrast approach used by the `CTAButton`
component (`src/components/ui/CTAButton.jsx`) and how to verify it against WCAG 2.2.

> **Important:** `CTAButton` no longer uses fixed `sky-*`/`primary-*` colors. It now
> styles itself with **theme-aware, translucent** tokens (`iwd-gold-*` for the primary
> variant; black/white opacity layers for the secondary variant). Because the
> backgrounds are semi-transparent and change with the active theme (Purple, Blue,
> Green, Gold) and mode (light/dark), there is no single fixed contrast ratio — it
> must be verified against the **rendered** background for each theme/mode.

## WCAG 2.2 Requirements

- **Normal Text** (< 18pt or < 14pt bold): Minimum 4.5:1 contrast ratio (Level AA)
- **Large Text** (≥ 18pt or ≥ 14pt bold): Minimum 3:1 contrast ratio (Level AA)
- **Non-text / focus indicators** (1.4.11): Minimum 3:1 against adjacent colors
- **Enhanced (Level AAA)**: 7:1 for normal text, 4.5:1 for large text

## Current CTAButton styling

From `src/components/ui/CTAButton.jsx`:

### Primary variant

- **Text**: `text-iwd-gold-300` (theme accent, light tint)
- **Background**: `bg-iwd-gold-400/10` (theme accent at 10% opacity over the section
  background) with a `border-iwd-gold-400/30` border
- **Hover**: background goes to `iwd-gold-400/20`; a light-mode hover treatment is
  applied via the `GOLD_PRIMARY_LIGHT_HOVER` constant
- Font: `font-semibold`, `text-sm`, `uppercase`, `tracking-widest`

### Secondary variant

- **Text**: `text-gray-600` (light) / `dark:text-gray-200` (dark), darkening to
  `text-black` / `dark:text-white` on hover
- **Background**: `bg-black/[0.04]` (light) / `dark:bg-white/[0.04]` (dark) with a
  matching translucent border

### Focus indicator (shared `baseStyles`)

- `focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:ring-offset-black`
- Uses the per-theme `focus-ring` token (see `COLOR.MD`), satisfying WCAG 2.4.7
  (Focus Visible) and 1.4.11 (Non-text Contrast) when the ring contrasts ≥ 3:1 with
  adjacent colors.

## How to verify contrast

Because the button text sits on a translucent accent over a section background, check
the **effective** (flattened) colors:

1. Run the site (`npm run dev`) and open the button in the browser.
2. For each theme (Purple/Blue/Green/Gold) and mode (light/dark), use Chrome DevTools
   → Elements → inspect the button text. The color picker shows the computed contrast
   ratio against the rendered background, including AA/AAA pass indicators.
3. Alternatively, sample the rendered text and background pixels and enter them into
   the [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/).
4. Confirm normal text ≥ 4.5:1 (or ≥ 3:1 if the rendered size qualifies as large) and
   the focus ring ≥ 3:1 against adjacent colors.

The `iwd-gold-300` accent tints are intentionally light so the text stays bright
against dark section backgrounds; spot-check the lighter themes (Gold) most carefully,
since light accent text on a light background is the highest-risk combination.

## Tooling

- **Chrome DevTools** color picker (live contrast ratio + AA/AAA badges)
- **axe DevTools** browser extension and the CI axe-core check (`npm run a11y:check`)
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/

## References

- [WCAG 2.2 Contrast (Minimum) 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG 2.2 Non-text Contrast 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Project color system: [`COLOR.MD`](COLOR.MD)

---

**Last reviewed**: June 2026 (updated for the theme-aware `iwd` token system)
