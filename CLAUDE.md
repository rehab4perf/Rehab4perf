# CLAUDE.md — Rehab4Perf

AI assistant guidance for the Rehab4Perf codebase.

## Project Overview

**Rehab4Perf** is a clinical assessment and rehabilitation tool for physical therapists and athletic trainers (created by Antoine PERONNAUD at Athletik Lamarck). It is a fully static, client-side web application written in pure HTML5, CSS3, and vanilla JavaScript — no build process, no backend, no external dependencies.

All UI text is in **French** (the domain language used throughout).

---

## Repository Structure

```
Rehab4perf/
├── Index.html    # Top-level shell: navigation bar + iframe container
├── Bilan.html    # Clinical assessment module (~3270 lines)
├── Outils.html   # Rehabilitation tools & calculators (~1000 lines)
└── README.md     # Placeholder GitHub profile README (not project docs)
```

There are no subdirectories, no `src/`, no `dist/`, no `node_modules`. All code lives directly in three HTML files.

---

## Architecture

### Navigation Shell (`Index.html`)
A minimal 68-line file that renders a top navigation bar and two `<iframe>` elements. Switching tabs hides/shows iframes — each page loads once and stays alive. No routing library is used.

```
top nav (48px fixed) → tabs: "Bilan clinique" | "Outils"
frame-wrap (fills remaining height) → <iframe src="bilan.html"> | <iframe src="outils.html">
```

### Clinical Assessment (`Bilan.html`)
The main module. Contains:
- A fixed left **sidebar** (260px) with section navigation and patient info
- A scrollable **main content** area divided into named sections
- All CSS and JS inlined in the same file

**Section navigation** (sidebar `nav-item` buttons call `showPage(id)`):
- Patient info
- Rachis (spine assessment)
- Membre supérieur (upper limb)
- Membre inférieur (lower limb) — SEBT, UQYBT, LSI, pliometrics
- Musculaire (muscular testing)
- Compte Rendu / CR (clinical report generation)

**Data persistence**: `saveToStorage()` / `loadFromStorage()` use `localStorage` key `'athletik-bilan'`, serialized as JSON. Auto-save fires on every `input` and `change` event.

### Rehabilitation Tools (`Outils.html`)
A sub-tabbed panel layout with four tools:
- **1RM** — six 1-rep max formulas (Brzycki, Epley, Lander, Lombardi, O'Conner, Mayhew)
- **HSR** — Heavy Slow Resistance 12-week progression table
- **Cardio** — heart rate zones, VO₂max estimate, pace calculator
- **CAP** — return-to-running protocol (Reprise à la Course à Pied)

The Cardio and CAP tools can import data from Bilan.html via `localStorage` (keys written by Bilan, read by Outils).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 with custom properties (CSS variables) |
| Logic | Vanilla ES5+ JavaScript (no transpilation) |
| Persistence | Browser `localStorage` |
| Fonts | System fonts (`-apple-system`, `Helvetica Neue`, `Georgia`) |
| Dependencies | None (no CDN, no npm) |
| Build | None — open HTML files directly in browser |
| Backend | None |
| Testing | None |

---

## CSS Design System

Both `Bilan.html` and `Outils.html` share the same CSS variable palette defined in `:root`:

```css
--bg:        #F7F6F3   /* page background */
--surface:   #FFFFFF   /* card/panel */
--surface2:  #F1F0ED   /* secondary surface */
--border:    #E8E6E1
--text:      #1A1917
--text2:     #6B6860   /* secondary text */
--accent:    #2B5FA6   /* primary blue */
--accent2:   #1A3A5C   /* dark navy */
--green:     #2D6A4F   /* good/normal result */
--red:       #C0392B   /* bad/abnormal result */
--orange:    #D4600A   /* warning/borderline */
--yellow:    #F0C040   /* caution */
--radius:    8px
--radius-sm: 5px
```

Color-coded feedback is central to the UX: green = normal, orange = borderline, red = abnormal. This applies to LSI values, test thresholds, and clinical flags.

---

## Key JavaScript Functions

### Bilan.html

| Function | Purpose |
|---|---|
| `init()` | Bootstrap: loads from storage, sets up event listeners, updates badges |
| `showPage(id)` | Activates a sidebar section, hides others |
| `saveToStorage()` | Serializes all form fields to `localStorage['athletik-bilan']` |
| `loadFromStorage()` | Populates form from stored JSON |
| `updateAll()` | Recomputes all calculations after any change |
| `updateBadges()` | Updates sidebar notification badges (incomplete/abnormal counts) |
| `calcLSI(key)` | Computes Limb Symmetry Index for a given measurement key |
| `lsiClass(v, higher)` | Returns CSS class (`green`/`orange`/`red`) based on LSI threshold |
| `setLSI(lsiEl, statEl, lsi, seuil, higher)` | Renders LSI value + status badge into DOM elements |
| `buildCR()` | Generates the full clinical report (Compte Rendu) as HTML |
| `buildCRTF()` | Generates clinical report for upper limb (Membre Supérieur) |
| `calcSEBT()` | Star Excursion Balance Test calculations |
| `calcUQYBT()` | Upper Quarter Y-Balance Test calculations |
| `calcRec()` | Rectilinear jump calculations |
| `calcPlioq()` / `calcPlioq2()` | Plyometric test calculations |
| `calcHR()` | Heart rate calculations |
| `calcLunge()` | Lunge test calculations |
| `calcDJ()` | Drop Jump calculations |
| `calcMusc()` | Muscular assessment calculations |
| `calcPSET()` | Posterior shoulder endurance test |
| `calcCKC()` | Closed kinetic chain test |
| `calcSHRT()` | Seated horizontal row test |
| `calcULRT()` | Upper limb rotation test |
| `calcRachisStat()` | Spine static assessment |
| `calcLNF()` | Lower limb neurological function |
| `calcSorensen()` | Sorensen test |
| `calcPDSLRT()` | PDSLRT calculations |
| `openReset()` / `doReset()` | Patient data reset modal |
| `showToast(msg)` | Brief notification overlay |
| `highlightNormRow(age)` | Highlights age-appropriate normative row in reference tables |
| `onTestChange(sel, tableId, idx)` | Handles dynamic test type selection changes |

### Outils.html

| Function | Purpose |
|---|---|
| `showTab(id)` | Switches active sub-tab panel |
| `calcRM()` | 1RM computation using all six formulas |
| `calcHSR()` | HSR protocol table generation |
| `calcCardio()` | Cardio zone + VO₂max calculations |
| `cardioLoadBilan()` | Imports patient data from Bilan localStorage |
| `buildCAP()` | Generates return-to-run protocol table |
| `capGetAllure()` | Computes running pace from stored bilan data |
| `capLoadBilan()` | Imports pace/HR data from Bilan localStorage |
| `brzycki/epley/lander/lombardi/oconner/mayhew` | 1RM formula implementations |

---

## Naming Conventions

**HTML IDs** use hyphenated lowercase, often abbreviated medical terminology:
- `sebt-ant-ca` — SEBT anterior measurement, côté atteint (affected side)
- `uqybt-med-d` — UQYBT medial, droite (right)
- `rf-flx-cerv` — rachis flexion cervicale
- `bilan-patient-name` — patient name field

**CSS classes** are descriptive English or French words:
- `.block`, `.test-table`, `.measure-input`, `.nav-item.active`, `.sub-tab.active`

**JavaScript** uses camelCase for functions and variables.

---

## Development Workflow

### Running the Application
No build step required. Open `Index.html` directly in a browser:
```bash
# From the project root
open Index.html         # macOS
xdg-open Index.html     # Linux
start Index.html        # Windows
```
Or serve via any static file server:
```bash
python3 -m http.server 8080
# then open http://localhost:8080/Index.html
```

### Making Changes
Edit HTML files directly. Structure of each file is:
1. `<style>` block — all CSS
2. HTML markup
3. `<script>` block — all JavaScript

Since all CSS, HTML, and JS are in the same file, use browser DevTools for live debugging.

### No Build, No Lint, No Tests
There is no:
- npm/yarn/pnpm
- Webpack, Vite, Rollup, or any bundler
- ESLint, Prettier, Stylelint
- Jest, Mocha, Playwright, or any test framework
- CI/CD pipeline

### Data Reset During Development
In browser console: `localStorage.removeItem('athletik-bilan')` then reload.

---

## Key Conventions to Follow

1. **Keep everything inline** — no external JS or CSS files; all code stays inside each HTML file.

2. **French terminology** — all user-facing strings, labels, section names, and clinical terminology must remain in French.

3. **Preserve the CSS variable system** — never use hardcoded color hex values in new code; always reference `var(--accent)`, `var(--green)`, etc.

4. **Color-coded feedback pattern** — clinical results must use the green/orange/red system consistently. Use `lsiClass()` pattern for any new LSI or threshold-based value.

5. **Auto-save on input** — any new form inputs must fire `saveToStorage()` (or call `updateAll()` which does so) on `input` and `change` events.

6. **No external dependencies** — do not introduce CDN links, npm packages, or any remote resources. The app must work fully offline.

7. **localStorage key** — patient bilan data is stored under `'athletik-bilan'`. Do not rename or introduce conflicting keys without updating both `saveToStorage()` and `loadFromStorage()`.

8. **Print layout** — `Bilan.html` has `@media print` CSS rules for clinical report output. Changes to report HTML must be tested with print preview.

9. **Iframe communication** — `Outils.html` reads from localStorage to import Bilan data. When adding new cross-module data, write to localStorage in Bilan and read in Outils — do not use `postMessage` or other mechanisms.

10. **ES5-compatible JS** — avoid ES6+ features that may not work in all target browsers (arrow functions, template literals, `const`/`let` are acceptable, but avoid modules, async/await, optional chaining in new code unless already used in the file).

---

## Git Branch

Active development branch: `claude/add-claude-documentation-8DRuB`
Main branch: `main`
