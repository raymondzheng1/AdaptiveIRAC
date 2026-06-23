# Handoff: Pincite — landing page + verified model-answer hero

## Overview
**Pincite** is a free, no-login web app that turns a law student's own course materials into
exam practice: realistic hypotheticals, model **IRAC** answers, and feedback that cite **only**
the authorities found in the student's uploaded materials — every citation verified and pinpointed
to its exact source ("Shirt — Slides, Sem 2 s9"), or it declines rather than inventing.

This package covers the two surfaces designed in this round:
1. **Landing page** — marketing page with a live worked example.
2. **Model-answer view** — the product's *hero moment*: a verified model IRAC answer with
   click-to-source and an answer-reveal animation, inside the app workspace shell.

It also includes the **brand/design-system foundation** (mark, names, tokens, components) and the
**icon/favicon set**.

> ### ⚠️ Hard product rule — honour it in code and copy
> **Never reference "AI" anywhere customer-facing.** No "AI / GPT / powered by", no robots,
> no sparkles/✨, no neural/circuit motifs, no chat-bubble assistant, no "magic" framing.
> The value proposition is **verified grounding**, not novelty. Use words like *composing*,
> *checking*, *verifying against your materials*. (This is drift-tested in code elsewhere.)

---

## About the design files
The files in `references/` are **design references authored in HTML** — prototypes that show the
intended look, layout, copy, and behaviour. **They are not production code to copy verbatim.**

Your job: **recreate these designs in the target codebase** using its established patterns.
The intended stack (from the brief) is:

- **Next.js (App Router) + React.**
- **Plain CSS with design tokens (CSS custom properties)** — **not Tailwind**, dependencies kept lean.
- A **hardcoded-hex linter** enforces tokens-only in components, so **every colour must come from a
  `var(--token)`** defined in `app/globals.css`. Never inline a raw hex in a component.
- Components are **small composable primitives** (Button, Card, Badge, Chip, Meter, Steps,
  Scorecard, Banner, Notice). No heavy UI framework.

`globals.css` in this bundle is a **drop-in token system** in exactly that shape — start by copying it
to `app/globals.css`.

### How the reference HTML is built (so you can read it)
The `.dc.html` files are self-contained prototypes. Mentally translate them like this:
- The class `class Component extends DCLogic { renderVals() {…} }` ≈ a React component. `state`,
  `setState`, and lifecycle (`componentDidMount`, `componentWillUnmount`) behave like React class
  components. `renderVals()` returns the values the template renders.
- `{{ x }}` in markup = a value from `renderVals()`. `<sc-if value>` = conditional render.
  `<sc-for list as>` = `.map()`.
- **All styling is inline `style="…"`** in the prototype only because the prototype tool requires it.
  **In your build, lift these into token-based CSS classes / CSS Modules** — do not ship inline styles.
- The desktop and mobile layouts are authored as **two separate frames side-by-side** on a grey canvas
  (because the prototype tool can't do media queries). In your build, implement **one responsive
  component** — see *Responsive* below.

---

## Fidelity
**High-fidelity (hi-fi).** Colours, typography, spacing, radii, shadows, copy, and interactions are
final and intended to be reproduced pixel-accurately using the tokens below. The grey canvas behind
the frames and the phone bezel/notch/status-bar in the mobile frames are **presentation scaffolding —
do not build them**; build the screen contents.

---

## Design tokens
Full set lives in `globals.css` (copy it to `app/globals.css`). Summary:

### Colour
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#f5f3ee` | Page background (warm paper) |
| `--surface` | `#fdfcfa` | Cards, panels |
| `--surface-2` | `#efece3` | Insets, progress tracks, subtle fills |
| `--border` | `#e4dfd4` | Hairline borders |
| `--border-strong` | `#d8d2c4` | Input borders, chip outlines |
| `--text` | `#1b2230` | Primary ink |
| `--text-muted` | `#5c6573` | Secondary text |
| `--primary` | `#1f3a8a` | Navy — brand + primary actions |
| `--primary-deep` | `#172a63` | Navy hover/active |
| `--accent` | `#0f766e` | **Jade — the verified/grounded signal (reserved)** |
| `--accent-deep` | `#0b5a53` | Jade text on tint / hover |
| `--accent-tint` | `#e4f0ee` | Jade wash for verified surfaces |
| `--success` | `#0f766e` | Alias of `--accent` |
| `--danger` | `#b42318` | Errors |
| `--warn` | `#b45309` | Warnings, "outside corpus" |

> **Discipline rule:** `--accent` (jade) means *checked / correct / grounded* and **nothing else**.
> Every verified-citation affordance uses it; never use jade for generic decoration. That restraint is
> what makes the signal trustworthy.

### Radius / shadow
`--radius-sm 8px` (chips, inputs) · `--radius 12px` (cards) · `--radius-lg 18px` (panels).
`--shadow-sm 0 1px 2px rgba(24,33,58,.06)` · `--shadow 0 1px 3px rgba(24,33,58,.05), 0 18px 40px -22px rgba(24,33,58,.28)`.
Shadows stay low and soft — paper, not plastic.

### Spacing (4px base)
`--space-1 4` · `2 8` · `3 12` · `4 16` · `5 20` · `6 24` · `8 32` · `10 40` · `12 48` · `16 64`.

### Type
| Family | Token | Role | Weights to load |
|---|---|---|---|
| **Newsreader** (serif) | `--font-serif` | Display, headings, **IRAC answer prose** | 400, 500, 600 + italic 400, 500 |
| **Hanken Grotesk** (sans) | `--font-sans` | Body, UI, buttons, labels | 400, 500, 600, 700 |
| **IBM Plex Mono** | `--font-mono` | Citations, pinpoints, eyebrow labels | 400, 500 |

**Type scale** (size / line-height):
- Display `clamp(38px, 5.4vw, 68px)` / 1.02–1.05, weight 500, `letter-spacing:-.022em`
- H2 section `32–36px` / 1.1, weight 500
- Serif heading (card titles) `19–23px` / 1.2, weight 600
- **IRAC body prose** `17px` / **1.68** (desktop), `15px` / 1.62 (mobile), `--font-serif`
- UI body `16px` / 1.55, `--font-sans`
- Small / caption `13px` / 1.5
- **Eyebrow / IRAC limb label** `10.5–12px`, `--font-mono`, `letter-spacing:.12–.16em`, UPPERCASE, `--accent`
- **Citation / pinpoint** `11–12.5px`, `--font-mono`

---

## Iconography
Minimal, precise **line icons** (1.6–1.8px stroke, round caps/joins), drawn inline as SVG. **Avoid the
scales of justice.** The identity anchor is the **check mark = verification**, also used as the app mark.

Recurring glyphs (all in the reference files, copy the SVG paths):
- **Check** (verified): `M5 12.5l4 4 10-10.5` on `0 0 24` viewport, or `M9.4 16.5l4.3 4.4L22.7 11` on `0 0 32`.
- **Shield + tick** (privacy): shield outline with an inner check.
- **Lock** (locked answer): rounded rect body + arc shackle.
- **Replay** (reveal again): circular-arrow.

The **app mark** is the white check inside a rounded navy square (`rx 8` on a `32` grid), provided as
`assets/favicon.svg`.

---

## Component library (primitives)
Build each as a small component reading tokens. Exact specs below (translate inline → CSS classes).

### Button
- **Primary:** `bg --primary`, text `#fff`, `font-sans` 600, `padding 11px 18px` (lg: `14px 24px`),
  `radius 8–10px`. Hover → `bg --primary-deep` (`transition: background .15s`).
- **Secondary:** `bg --surface`, text `--text`, `1px solid --border-strong`, same metrics.
  Hover → `border-color --text-muted`.
- **Ghost:** transparent, text `--primary`, no border. Hover → `bg --surface-2`.
- **Disabled:** `bg --surface-2`, text `#9aa1ad`, `cursor:not-allowed`.
- Icon arrow `→` may sit inline with `gap` (use flex, not text whitespace).

### Input / Segmented control
- **Text input:** `bg --bg`, `1px solid --border-strong`, `radius 8px`, `padding 11px 13px`,
  `font-sans 14px`. Focus → `border-color --primary; box-shadow 0 0 0 3px rgba(31,58,138,.16)`.
- **Segmented control** (e.g. Foundational / Standard / Exam): pill track `bg --surface-2`,
  `1px solid --border`, `radius 9px`, `padding 3px`; active segment `bg --primary`, text `#fff`,
  `radius 7px`, `--shadow-sm`. Use for difficulty/type selectors.

### Badge (authority type)
Pill, `font-mono 11.5px` 500, `radius 999px`, `padding 4px 10px`. Variants:
- **Case** → text `--primary`, `bg rgba(31,58,138,.08)`, `border rgba(31,58,138,.2)`
- **Statute** → text `--accent-deep`, `bg --accent-tint`, `border rgba(15,118,110,.25)`
- **Notes** → text `#475569`, `bg #eef1f4`, `border #dde3ea`
- **Slides** → text `--warn`, `bg #fdf3e7`, `border #f3dcbf`
Status pills: **Verified** (jade tint, check glyph), **Outside corpus** (warn), **Draft** (muted).

### ★ Citation chip — the signature component
Two forms, both open the same source panel on click. Build as one `<CitationChip>` with a `variant` prop.

**Inline (in prose):** `<button>`, `display:inline-flex; align-items:center; gap:4px`,
`font-mono 12.5px`, text `--accent-deep`, `bg --accent-tint`, `1px solid rgba(15,118,110,.22)`,
`radius 6px`, `padding 0 7px`, `vertical-align:baseline`, **`white-space:nowrap`**. Leading 5px jade dot.
Hover → `border-color --accent`. Content = short label (e.g. `Donoghue`, `CLA s 5B`).

**Authority-list:** larger `<button>`, `bg --surface`, `1px solid --border-strong`, `radius 9px`,
`padding 8px 12px`, `gap 9px`. Contains: a **type Badge** + bold short name + `font-mono`
pinpoint (`Slides · Sem 2, s9`). Hover → `border-color --accent; bg --accent-tint`.

### ★ Source panel (click-to-source)
Opens when a chip is clicked; shows the **exact passage**.
- Header strip: `bg --accent-tint`, jade check glyph + `font-mono` uppercase "VERIFIED SOURCE", close `×`.
- Body: type **Badge** + `font-mono` pinpoint; serif name (`18px`/600); a quoted **exact passage** box
  (`bg --bg`, `1px solid --border`, `radius 10px`, serif `14.5px`/1.62, in curly quotes); a secondary
  button **"Open in your materials ↗"**.
- **Desktop:** persistent right rail, `width 320px`, `position:sticky; top:18px`, beside the answer.
- **Mobile:** inline panel directly under the authorities list.
- Default state on the model-answer view: the first authority (*Shirt*) is pre-opened so the magic is
  visible immediately.

### ★ Verified banner
`bg --accent-tint`, `1px solid rgba(15,118,110,.22)`, `radius 13px`, `padding 15px 18px`, flex row:
filled jade circle (r 11) with white check + bold `--accent-deep` headline
**"Every citation verified against your materials"** + muted subline
("4 authorities · all pinpointed to source · nothing cited from outside your corpus") + a small
`font-mono` "in memory" shield chip on the right.

### Usage meter
Column: row with `font-mono` "Free session" + `$1.20 / $5`; an 6–8px track (`bg --surface-2`,
`radius 999px`) with a jade fill (`width = used/cap`). Friendly, **non-alarming** copy
("You're in control — it's free."). At the cap, swap the CTA to **"Use my key"** (BYO-key) — never a
hard-paywall tone. The meter lives in the workspace top bar.

### Progress steps
Three steps **Upload → Authorities → Practise**. Completed = jade circle + white check; current =
navy circle with number + `box-shadow:0 0 0 4px rgba(31,58,138,.14)` halo; upcoming = `--surface`
circle, `1.5px solid --border-strong`, muted number. Connectors: `2px` line, jade when complete.

### Rubric scorecard
Header: `font-mono` "Rubric scorecard" + serif total (`37 / 50`). Five rows
(Issue / Rule / Application / Conclusion / Authority), each: label + `7px` track with jade fill
(navy fill if below threshold) + `font-mono` score `/10`. Scannable and motivating, **not punitive**.

### Notices
- **Insufficient grounding (honest state, NOT an error):** neutral slate, `bg --surface-2`,
  `border-left 3px #94a3b8`, info glyph, calm heading **"We couldn't ground this from your materials"**
  + "Rather than invent an authority, we've stopped. Add the case/section, or rephrase." Do **not**
  style it red or alarming.
- **Academic-integrity flag:** `--warn` palette; surfaced in Feedback when a student cites outside corpus.

### IRAC answer styling
Each limb = a `font-mono` uppercase jade label (Issue / Rule / Application / Conclusion) above serif
prose (`17px`/1.68), with a `2px solid --accent-tint` left rule (`padding-left 16px`). Essay variant
labels: **Contention → For → Against → Preferred view.** Inline citation chips sit within the prose.

---

## Screens / Views

### 1) Landing page (`references/Pincite - Landing.dc.html`)
Mobile-first; one column on mobile, centred max-width ~1080px on desktop.
Sections top→bottom:
1. **Nav** — mark + "Pincite" wordmark (serif) left; "Worked example / How it works / Privacy" +
   **Start practising** (primary) right. (Nav links `white-space:nowrap`.)
2. **Hero** — `font-mono` eyebrow "EXAM PRACTICE · BOUND TO YOUR MATERIALS"; display H1
   **"Model answers you can *actually cite*."** (the word *actually cite* in italic `--primary`);
   subhead (≤60ch); CTAs **Start practising — free** (primary) + **See how it works** (secondary);
   three trust pills with check glyphs ("No sign-up", "Processed in memory · never stored",
   "Australia-first").
3. **Worked example** — an app-like card: faux top bar + usage meter; **Verified banner**; two columns
   (the question + a small "Your attempt" preview | the **Model answer** IRAC with inline citation
   chips); an **Authorities used** chip row + the **Source panel** (interactive). This is a preview of
   the hero moment — keep it live.
4. **What's inside** — 4-card grid: Questions from your syllabus · Verified model IRAC ·
   Feedback & rubric · Timed exam mode.
5. **How it works** — 3 numbered steps (Upload / Confirm authorities / Practise); step 3 circle is jade.
6. **Privacy** — full-width navy band, shield-tick glyph, "Your materials never leave your session".
7. **Install** — PWA card "Install Pincite · Add to home screen".
8. **Footer** — wordmark + academic-integrity/legal disclaimer + Product/Legal link columns + copyright.
   **No fabricated testimonials anywhere.**

### 2) Model-answer view — the hero moment (`references/Pincite - Model Answer.dc.html`)
The app **workspace shell** + the model answer. This is the surface to nail.

**Workspace shell (persistent):**
- Top bar: mark + wordmark | **3-step progress** (Upload ✓, Authorities ✓, Practise current) |
  **usage meter** ($1.20 / $5) + **Use my key**.
- Below: the **question** card (subject · "Hypothetical · 10 marks" badge `white-space:nowrap` · prompt);
  **tabs** *Your answer · Model answer (active) · Feedback*.

**Three states of the answer panel** (state machine — see below):
- **Idle / locked:** blurred skeleton lines under a centred lock + serif "Your model answer is ready" +
  **Reveal model answer** primary button.
- **Composing:** centred three pulsing jade dots + serif "Composing your model answer…" +
  "Checking each authority against your materials". (~950ms.)
- **Revealed:** **Verified banner**, then the IRAC limbs, then the **Authorities used** row; on desktop a
  sticky **Source rail** (320px) sits to the right (pre-opened to *Shirt*); on mobile the source panel
  appears inline under the authorities.

The reference also has a **"Replay the reveal"** button above the frames (a demo affordance, not part of
the product UI) so you can watch the motion.

---

## Interactions & behaviour

### Click-to-source
Clicking any citation chip (inline **or** in the authorities list) sets the active authority and shows
its **Source panel** with the exact passage + pinpoint. `×` (or `closeCite`) clears it. On the
model-answer view the first authority is open by default.

### ★ Answer-reveal motion spec
Triggered by **Reveal model answer** (from idle) — and demoable via **Replay**.

| Phase | Trigger | Behaviour |
|---|---|---|
| `idle` | initial / Replay | Locked skeleton + reveal button. |
| `composing` | Reveal clicked | Pulsing dots, ~**950ms**. (Dots: `@keyframes` opacity .25→1 + translateY -3px, 1s ease-in-out, staggered .15s.) |
| `revealed` | after 950ms | Elements cascade in via a **step counter 0→6**, incrementing every **320ms**. |

**Per-element entrance** (the capture-safe, reduced-motion-friendly pattern — use it):
- Hidden state: `opacity:0; transform:translateY(12px);` (no transition).
- Shown state (when `step >= threshold`): `opacity:1; transform:translateY(0);`
  `transition: opacity .55s cubic-bezier(.2,.7,.2,1), transform .55s cubic-bezier(.2,.7,.2,1);`
- Thresholds: banner `0` (immediate) · Issue `1` · Rule `2` · Application `3` · Conclusion `4` ·
  Authorities `5` · Source rail `5`.
- **Verified "pop"** (the satisfying confirmation, fires last at threshold `6`): the banner's check
  badge animates `transform: scale(.4)→scale(1)` with
  `transition: transform .5s cubic-bezier(.34,1.56,.64,1), opacity .3s ease;` (slight overshoot).

So the sequence reads: *answer streams in limb-by-limb → the ✓ pops last.* Total ≈ 950ms + ~1.9s.
**Implementation note:** drive entrance via component state + CSS transitions (resting state genuinely
visible), **not** keyframe entrance animations with `fill-mode: both` — the latter leave the resting
DOM hidden, which breaks SSR/first-paint and screenshot tooling. Honour `prefers-reduced-motion`:
when set, skip the stagger and render `revealed` immediately (globals.css already neutralises durations).

### Other
- Buttons: `transition: background/border-color .15s`. Chips: `transition: border-color/background .15s`.
- Tabs switch the panel (Your answer / Model answer / Feedback). Only Model answer is built here.
- Usage meter is display-only here; wire it to real session cost.

---

## State management
Model-answer view (`references/Pincite - Model Answer.dc.html`):
- `phase: 'idle' | 'composing' | 'revealed'` — default `'revealed'` in the prototype so the hero is
  visible on load; in production default to `'idle'` until the student reveals (after attempting).
- `step: 0..6` — reveal cascade progress (default `6` = fully shown). `reveal()` sets `composing`,
  then after 950ms sets `revealed` + `step 0` and starts a 320ms interval incrementing `step` to 6.
  `replay()` resets to `idle`. Clear timers on unmount.
- `cite: string | null` — active authority id for the source panel (default `'shirt'` once revealed).

Authorities data shape (each):
`{ id, short, name, type: 'Case'|'Statute'|'Notes'|'Slides', where /* pinpoint */, snippet /* exact passage */ }`.

Data fetching (real app, out of scope here): corpus is processed **in memory and discarded** — nothing
persisted server-side; the student's work lives in the browser (localStorage/IndexedDB) and is
exportable. The model answer + citations come from the grounded engine; if it can't ground a point it
returns the **insufficient-grounding** state instead of fabricating.

---

## Responsive
Mobile-first. Verify at **375×812** (design built at 390 too). Suggested approach:
- Single source component; switch layout with CSS (container/media queries), not duplicate markup.
- **Model answer:** desktop = `grid-template-columns: 1fr 320px` (answer | sticky source rail);
  below ~900px collapse to one column and render the source panel inline under the authorities.
- **Landing:** multi-column grids (`what's inside` 4-up, `how it works` 3-up, worked-example 2-up)
  collapse to one column on mobile; hero type uses `clamp()`.
- Keep long legal prose readable on small screens: generous measure, `line-height ~1.62`, sticky
  question context where helpful.
- Tap targets ≥ 44px. Honour `env(safe-area-inset-*)` (already in `globals.css`).

---

## Accessibility (target WCAG 2.1 AA)
- **Contrast:** `--text` on light surfaces is ~13:1. `--text-muted #5c6573` on `--surface` ≈ 4.8:1
  (passes AA for normal text — keep it ≥14px; don't drop it lighter). `--accent #0f766e` as text on
  white ≈ 4.7:1 (AA). White on `--primary` and white on `--accent` are used for large text/icons only
  (the verified circle's check is a non-text glyph). Re-check any new colour pairing.
- **Focus:** visible focus ring is defined globally (`:focus-visible` → 3px navy halo). Keep it on all
  interactive elements; the attempt editor and all nav must be fully keyboard-operable.
- **Headings:** one `<h1>` per page (the hero), then ordered `<h2>`/`<h3>`. (In the prototype the mobile
  frame uses styled `<div>`s to avoid duplicate `<h1>`s across the two frames — in your single
  responsive build use real heading tags once.)
- **Semantics:** citation chips and the source close are real `<button>`s with `aria-label` where
  icon-only. Source panel should be announced on open (e.g. `aria-live="polite"` region or move focus).
  Verified banner conveys status, not just colour — keep the text label.
- **Motion:** `prefers-reduced-motion` respected (see motion spec).

---

## Assets
In `assets/` (and the two PNG/SVG the prototypes reference are also in `references/`):
- `favicon.svg` — the app mark (white check on rounded navy square). Use for `<link rel="icon">`.
- `icon-32.png`, `icon-180.png` (apple-touch), `icon-192.png`, `icon-512.png` — PWA / home-screen.
- `icon-512-maskable.png` — full-bleed maskable (`purpose: "maskable"` in the web manifest).
- **PWA manifest** (you create): `name "Pincite"`, `theme_color #1f3a8a`, `background_color #f5f3ee`,
  `display "standalone"`, the icon set above.
- **OG / social share** (to produce): typographic, navy field, the mark + wordmark + one line
  ("Model answers you can actually cite."). No stock courtroom/gavel photos, no abstract renders.
- **Fonts:** Newsreader, Hanken Grotesk, IBM Plex Mono (Google Fonts / self-host via `next/font`).

---

## Files in this bundle
```
design_handoff_pincite/
├── README.md                         ← this file (self-sufficient spec)
├── globals.css                       ← drop-in token system → copy to app/globals.css
├── assets/                           ← icon + favicon set (deliverables)
│   ├── favicon.svg
│   ├── icon-32.png  icon-180.png  icon-192.png  icon-512.png  icon-512-maskable.png
└── references/                       ← HTML design prototypes (open in a browser to view)
    ├── Pincite - Landing.dc.html         ← landing page (desktop + mobile frames)
    ├── Pincite - Model Answer.dc.html    ← hero moment + reveal motion + click-to-source
    ├── Pincite - Brand & System.dc.html  ← mark, name options, tokens, full component gallery
    ├── support.js                        ← runtime needed by the .dc.html files (do not port)
    └── favicon.svg, icon-180.png         ← assets the prototypes load
```
**To view a reference:** open any `.dc.html` in a modern browser (they're self-contained). On the
Model-answer page, click **Replay the reveal** to watch the motion, and click any citation to open its
source. `support.js` is the prototype runtime only — **do not** port it into the product.
