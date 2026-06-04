# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deployment

Deployment is fully automatic: `git push origin main` triggers a Netlify build. There is no build step — this is a static site served as-is. Never use `netlify deploy` manually unless Netlify CI is broken.

## JS syntax check

After editing any JS file, run:
```bash
node --check js/bilan.js
node --check js/prog-data.js
node --check js/prog-main.js
```

For changes to `bilan.html` (inline script), extract the script block first:
```bash
# Lines vary — identify the <script src="js/bilan.js"> predecessor block
sed -n '<start>,<end>p' bilan.html > /tmp/check.js && node --check /tmp/check.js
```

## Validate bilan.html after changes

Run this Python snippet to catch duplicate IDs and `TESTS{}` entries missing a `<tbody>`:

```python
import re
from collections import Counter
with open('bilan.html', encoding='utf-8') as f:
    content = f.read()
all_ids = re.findall(r'id=["\']([^"\']+)["\']', content)
dups = {k:v for k,v in Counter(all_ids).items() if v > 1}
print('Dups:', dups or 'Aucun ✓')
tests = re.findall(r"'(tb-[\w-]+)'\s*:\s*\{type:", content)
tbodies = set(re.findall(r'<tbody\s+id=["\']([^"\']+)["\']', content))
missing = [t for t in tests if t not in tbodies]
print('TESTS sans tbody:', missing or 'Aucun ✓')
```

## Pre-deploy checklist

See `TESTS_AVANT_DEPLOY.md` — mandatory before any push. If a test fails, do not push. On regression: `git revert HEAD`, fix, re-test, push fix.

---

## Architecture

**Static site** — no build toolchain, no bundler, no framework. Vanilla JS + Supabase SDK loaded from CDN.

### Shell + iframes

`index.html` is the application shell. It renders a top nav with tab buttons and four persistent `<iframe>` elements. Only the active iframe is `display:block`; the others stay loaded.

| iframe id | src | purpose |
|---|---|---|
| `frame-bilan` | `bilan.html` | Clinical assessment (bilan clinique) |
| `frame-outils` | `outils.html` | PRO tools + CR médecin config |
| `frame-prescription` | `programme.html` | Exercise programme builder |
| `frame-account` | `account.html` | User profile |

`auth.html` is a standalone page (not an iframe) for login/signup/reset.

### Authentication

Supabase Auth (email/password). `index.html` holds the session, guards the app, and **broadcasts the auth token to all iframes** via `postMessage` on session init and `TOKEN_REFRESHED` events. Iframes recreate their own Supabase client with the received token.

### Cross-iframe messaging

All messages use `postMessage` with `window.location.origin` as target. `index.html` acts as a relay hub. Message types are prefixed `r4p-`:

| type | direction | meaning |
|---|---|---|
| `r4p-patient-selected` | parent → iframes | Patient switched in topnav |
| `r4p-cancel-patient-switch` | bilan → parent | Bilan has unsaved data, roll back |
| `r4p-profile` | parent → bilan/outils | Practitioner profile propagated |
| `r4p-profile-updated` | account → parent | Profile saved, re-broadcast |
| `r4p-outils-save` | outils → parent → bilan | Score saved, update bilan live |
| `r4p-patient-reset` | bilan → parent | Deselect patient in topnav |
| `r4p-logout-done` | account → parent | Trigger full logout |
| `r4p-token-refreshed` | parent → iframes | Fresh access token |

### localStorage

Both `bilan.js` and `prog-data.js` each define a local `R4P_KEYS` constant — the single source of truth for all storage key strings within their respective module. Never hardcode key strings directly.

---

## bilan.html / bilan.js

The largest module. `bilan.html` contains only HTML+CSS (3 500 lines); all JS is in `js/bilan.js` (5 400 lines), loaded at the bottom.

**Page structure** — each clinical section is a `<div class="page" id="page-xxx">`. Active page toggled via nav clicks. Current pages:
- `page-infos` — patient info
- `page-epaule`, `page-rachis`, `page-hanche`, `page-genou`, `page-pied`, `page-lma` — body region assessments
- `page-fonctionnels`, `page-fonctionnelsMS`, `page-fonctionnelsRachis` — functional tests
- `page-cr-tf` — CR Tests (generated report)
- `page-cr` — CR Complet (generated report)

**Test tables** — each `<tbody id="tb-xx">` inside a page has a corresponding entry in `TESTS{}` in bilan.js. When adding a new `<tbody>`:
1. Add `<tbody id="tb-xx">` in the right `<div class="page-content">`
2. Add `'tb-xx': { type: 'ortho'|'fonc', items: [...] }` to `TESTS` in bilan.js
3. Reference it in both `buildCR()` (line ~4145) and `buildCRTF()` (line ~4745)

**Absolute rules for bilan.html:**
- New content always goes inside `<div class="page-content">` of an existing page — never outside `<main>`
- Never touch anything after `</main>` (modal + toast zone only)
- Never alter the open/close structure of `.page` divs

**Network**: `_sbRetry()` wraps all Supabase SDK calls with exponential backoff (max 2 retries) on 5xx/429.

---

## programme.html / prog-data.js / prog-main.js

Exercise programme builder. HTML+CSS in `programme.html` (2 846 lines). JS split into:
- `js/prog-data.js` (3 953 lines) — `R4P_KEYS`, `LIBRARY` (exercise catalogue), `_fetchRetry()`, data helpers, calendar/cycles
- `js/prog-main.js` (6 937 lines) — UI logic: builder, sidebar, templates, protocols, sessions

**Network**: `_fetchRetry()` wraps raw `fetch()` calls with backoff. POST on 5xx is NOT retried (non-idempotent).

---

## outils.html

All-in-one file (7 125 lines, no external JS). Contains PRO questionnaires, functional scoring tools, and the **CR médecin configurator** — a UI to edit `config/cr-config.json`-equivalent data that is stored in Supabase `templates` table. Changes made in outils.html's CR config editor are synced to Supabase and relayed to `bilan.html` on save.

---

## config/cr-config.json

Defines pathologies (`pathoConfig`), articulations with their ROM measurements (`ampConfig`), and clinical signs (`signConfig`) used to populate the CR médecin dropdowns in `bilan.html`. The bilan reads this config to render its forms; outils.html provides the editor UI.
