# Aetherum Marketing Site

## Repo and machines
- Aetherum marketing site. Vercel auto-deploys on push to `origin/main` (see `vercel.json`), live in ~60 seconds.
- Two machines: iMac (trafalgar17), MacBook Pro (trafalgar15). Always resolve as `~/aetherum/aetherum-site` — never hardcode a `/Users/` path.
- Always `git status` and `git pull` (or `git fetch` + rebase) before starting. Posts land from the other machine mid-session and cause rebase conflicts. This has happened repeatedly.

## Working style
- Approvals are expensive. Batch verification into as few commands as possible.
- Treating the newest existing post as ground truth is a reasonable starting point, but it has burned us: the two most recent posts at last audit (`audit-native-debt-instruments`, `circle-national-trust-bank`) had already dropped the footer patent badge that every older post carries. "Newest" and "canonical" are not always the same file — spot-check two or three recent posts, not just the latest one.
- Commits carry no Co-Authored-By line.
- Standard deploy: `git add -A && git commit -m "<message>" && git push origin main`

## Blog publishing
- Posts at `blog/<slug>/index.html`. Registry is `posts.json` at root. Blog index and homepage both read `posts.json` — never inject cards into `index.html`.
- `posts.json` fields exactly: `slug`, `title`, `excerpt`, `date`, `readTime`, `icon`, `isNew`, `featured`.
- The description field is `excerpt`. Never `summary` or `description` — the wrong name renders "undefined" on the card. This has broken more than once.
- `slug` must include the `/blog/` prefix. Omitting it 404s.
- Exactly one entry may have `isNew: true`. Set all others `false` in the same commit.
- New entries are prepended, not appended.
- Sandbox content arrives via `~/Downloads`. `/mnt/` paths are unreadable from this machine.

## Brand
- Background `#162848`. Never `#03060F` — three older SEO landing pages (`crypto-backed-loans-credit-unions/`, `crypto-compliance-financial-institutions/`, `digital-asset-infrastructure-credit-unions/`) shipped with `#03060F` and had to be corrected; check root-level pages too, not just `blog/`.
- Orange accent `#F7931A`. Bebas Neue headlines, Fraunces body, DM Mono labels.
- Nav logo is the text wordmark `AETHER<span>UM</span>`, not an image.
- Byline exactly "Founder, Aetherum" — no name, no "& CEO".
- Model new posts on the most recent existing post, but verify its brand markers against two or three others first — see Working style above.
- Core site chrome (`index.html`, `investor.html`, `partners/index.html`, `help.html`, `disclaimers.html`, `privacy.html`, `terms.html`) uses a real logo image in the nav, not the text wordmark. That's a deliberate difference from blog posts, not drift — don't silently convert it without asking.

## Template drift
Posts are cloned from whatever came before, so global values drift silently. The patent count, background hex, and nav wordmark split have each drifted at least once — a full-site audit found `#0B1A2E`/`#0b1a2f`/`#070D1A`/`#03060F` all still in use as "the" background, patent counts as stale as 5 (should've been 21), and nav wordmarks split three different ways (`AETHERUM`, `AETHERUM<span>.</span>AI`, `AETHE<span>RUM</span>`) across ~40 files. Before publishing, diff the new post against two or three recent posts, not just the newest one, on all four brand markers.

Known remaining exceptions after the last audit (not bugs, just noted so they aren't "fixed" again):
- `who-owns-the-rails`, `rest-of-finance-2026-execution`, `global-adoption-cu-bridge`: nav has no logo element at all (back-to-blog link only). Not fabricated — flag for a design decision rather than inventing markup.
- `blog/index.html`, `blog/crypto-as-collateral/index.html`: nav embeds a real logo image tied to a broader avatar/name design, left as-is.
- `blog/institutional-rails-tokenization/index.html`: footer says "DACS™ Patent Pending" (no count) rather than "N Patents Pending" — a different wording pattern, not a stale number.
- `blog/global-adoption-cu-bridge/index.html`: footer lists 6 named patents next to the count; the count was bumped to 21 for consistency but the name list still only has 6 entries. Needs a content pass, not just a number swap.

## Public-content restrictions
- Never name BitGo, Sardine, or Reap/Payward publicly. StraitsX, Mesh, Plaid, Circle are fine.
- When Circle is named, never reference grants, cohorts, program names, or dollar figures.
- Never publish patent application numbers, confirmation numbers, or filing dates. Count only; currently 21 as of July 14, 2026. When a new provisional is filed the count must be updated across every page carrying a footer badge — grep for `Patents Pending` site-wide, not just in `blog/`.
- DACS is always a "risk assessment model", never "credit scoring" (Plaid compliance requirement).
- Do not describe roadmap capabilities as shipped. Investor and partner diligence reads this site.

## Assets
- LinkedIn native images are 1200x627. Sources in `assets/social/`.
- All PDF and PNG rendering via Playwright only — never Puppeteer, never browser print. Applies to `deck/index.html` too. Note: `package.json` still lists `puppeteer` as a dependency — it appears unused; don't add new code that depends on it.
- For crisp social-card renders: render at `deviceScaleFactor: 2` with `waitUntil: 'networkidle'` and `await page.evaluate(() => document.fonts.ready)` before screenshotting (self-hosted Google Fonts links silently fall back to system fonts if you don't wait), then downsize the 2x capture to the exact target pixel dimensions (e.g. `sips -z 627 1200`) rather than screenshotting at 1x.

## Pre-publish checklist
1. slug carries `/blog/` prefix
2. field is `excerpt`
3. exactly one `isNew` true
4. byline "Founder, Aetherum"
5. bg `#162848`
6. nav wordmark is `AETHER<span>UM</span>`
7. footer patent count matches current global value (21)
8. no patent numbers or filing dates
9. no restricted vendor names
10. no roadmap capability described as shipped
