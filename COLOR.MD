# Pride Innovation Summit Color System

This document defines the color palette for the Detroit Pride Innovation Summit website.

The palette is inspired by the Women Techmakers brand and implemented as semantic Tailwind tokens under the `iwd` namespace. The site ships four switchable themes controlled via CSS custom properties and a `data-theme` attribute on `<html>`. The themes and their swatches are defined in `src/constants/ui.js`; the default is **Purple** (set in `src/components/ui/ThemeContext.jsx`).

Each `iwd.gold.*` Tailwind token maps to a `--iwd-accent-*` CSS variable, and each `iwd.black.*` token maps to a `--iwd-dark-*` variable (see `tailwind.config.js`). The tables below show the key accent (`iwd-gold-400`/`700`), darkest surface (`iwd-black-950`), and `focus-ring` values per theme.

---

## Themes

### Purple (Default)

Violet-forward palette. Bold, empowering, and aligned with the purple theme tradition.

| Token         | Hex       | RGB         |
| ------------- | --------- | ----------- |
| iwd-gold-400  | `#c084fc` | 192 132 252 |
| iwd-gold-700  | `#7e22ce` | 126 34 206  |
| iwd-black-950 | `#0d0a16` | 13 10 22    |
| focus-ring    | `#581c87` | 88 28 135   |

### Blue

Ocean-forward palette. Cool, professional, and aligned with Google/Women Techmakers blue.

| Token         | Hex       | RGB         |
| ------------- | --------- | ----------- |
| iwd-gold-400  | `#669df6` | 102 157 246 |
| iwd-gold-700  | `#1967d2` | 25 103 210  |
| iwd-black-950 | `#090e18` | 9 14 24     |
| focus-ring    | `#1a73e8` | 26 115 232  |

### Green

Emerald palette aligned with Google green.

| Token         | Hex       | RGB       |
| ------------- | --------- | --------- |
| iwd-gold-400  | `#5cb85c` | 92 184 92 |
| iwd-gold-700  | `#0b5124` | 11 81 36  |
| iwd-black-950 | `#09120e` | 9 18 14   |
| focus-ring    | `#0d652d` | 13 101 45 |

### Gold

Warm yellow/amber palette aligned with Google yellow.

| Token         | Hex       | RGB       |
| ------------- | --------- | --------- |
| iwd-gold-400  | `#fabb05` | 250 187 5 |
| iwd-gold-700  | `#b85c00` | 184 92 0  |
| iwd-black-950 | `#120e06` | 18 14 6   |
| focus-ring    | `#e27200` | 226 114 0 |

---

## Symbolism

| Color  | Meaning                       |
| ------ | ----------------------------- |
| Blue   | trust, technology & community |
| Purple | empowerment & leadership      |
| Teal   | innovation & growth           |
| Coral  | warmth & community            |

---

## How Theming Works

1. CSS variables defined in `src/index.css` under `:root` (fallback) and one `[data-theme='...']` block per theme (`blue`, `green`, `purple`, `gold`)
2. Tailwind tokens `iwd.gold.*` and `iwd.black.*` reference these via `rgb(var(--iwd-accent-*) / <alpha-value>)`
3. React context (`ThemeContext`) sets `data-theme` on `<html>` and persists to `localStorage` (defaults to `purple`)
4. A floating `ThemeSwitcher` button lets visitors pick from the swatches in `src/constants/ui.js`

**Adding a new theme:** duplicate a `[data-theme='...']` block in `index.css` and add a matching entry (`id`, `label`, `swatch`, `palette`) to `THEMES` in `src/constants/ui.js`.

---

## Static Colors (shared across themes)

### Teal (secondary accent)

| Token         | Hex       |
| ------------- | --------- |
| iwd-green-400 | `#2dd4bf` |
| iwd-green-700 | `#0f766e` |
| iwd-green-950 | `#042f2e` |

### Coral (warm accent)

| Token       | Hex       |
| ----------- | --------- |
| iwd-red-400 | `#ff7a6b` |
| iwd-red-600 | `#e13d2f` |
| iwd-red-950 | `#46120d` |

### Neutrals

| Token           | Hex       |
| --------------- | --------- |
| iwd-neutral-50  | `#f8fafc` |
| iwd-neutral-200 | `#e2e8f0` |
| iwd-neutral-700 | `#334155` |
| iwd-neutral-950 | `#020617` |

---

## Design Goals

- Align with Women Techmakers visual identity
- Ship multiple themes so the team can A/B test and decide
- Maintain WCAG 2.1 AA accessibility contrast
- Scale as a reusable design system across Compass events

---

## Prior Event Palettes

For historical reference, these are the palettes used by prior Compass Detroit events:

### BHM Innovation Summit (Pan-African)

| Role    | Token     | Hex       |
| ------- | --------- | --------- |
| Accent  | bhm-gold  | `#efb403` |
| Dark    | bhm-black | `#0b0b0b` |
| Success | bhm-green | `#006b3f` |
| Warm    | bhm-red   | `#ce1126` |

### Michigan DevFest

| Role    | Token       | Hex       |
| ------- | ----------- | --------- |
| Primary | primary-400 | `#cfae70` |
| Neutral | gray-900    | `#0f172a` |

---

## Tailwind Implementation

The themeable tokens are defined in `tailwind.config.js` using the `rgb(var(...) / <alpha-value>)` pattern for full opacity support. Static colors (teal, coral, neutrals) use fixed hex values.
