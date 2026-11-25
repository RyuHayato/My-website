# Plate — a topic-agnostic static site template

A production-ready, dependency-free static site: six polished pages, a shared design system built on soft curved surfaces and ember-glow accents, progressive-enhancement interactions, and **one JSON file** that holds every topic-specific word, colour, image and address. Rebuild takes about a second and needs only Python 3.9+ (standard library).

```
site-template/
├── build.py                  # the only command you normally run
├── config/
│   ├── site.json             # ← EDIT THIS to change the subject matter
│   └── example-alt.json      # worked example: a completely different topic
├── template/render.py        # section renderers — generic, no topic content
├── src/assets/               # core CSS, JS, fonts, plate images
├── tests/test_build.py       # 16 stdlib regression tests
├── dist/                     # generated site — deploy this folder as-is
└── dist-alt/                 # generated alternate-topic example
```

## Quick start

```sh
python build.py                                  # build dist/ from config/site.json
python build.py --check                          # validate config without writing
python build.py --config config/example-alt.json --out dist-alt
python -m unittest discover -s tests -v           # verify the engine
python -m http.server 8000 --directory dist      # preview locally
```

No `npm install`, no virtualenv, no network calls at build or runtime. `dist/` is plain HTML/CSS/JS — upload it to any static host.

## Swapping in a new topic

**Everything you change lives in `config/site.json`.** Do not edit `template/render.py`, `src/assets/css/site.css` or `src/assets/js/site.js` — they contain no topic content and are safe to leave alone.

| Config key | What to change |
|---|---|
| `identity` | Site title, tagline, meta description, language, theme colour, brand text/accent, nav status line, wordmark, footer legal/location/links. Keep the `wordmark` at ~12 characters or fewer — the footer mark scales with viewport width, and longer marks would shrink below the designed size to stay on one line |
| `theme` | All 18 colour tokens. `build.py` emits `dist/assets/css/theme.css` from these; no CSS hand-editing required |
| `nav` | Page list shown in the header. Each `href` must match a `pages[].file` |
| `ui` | Every user-facing interaction string: menu labels, copy feedback, form validation, confirmation-modal copy, default email/subject |
| `plates` | Named image plates (`src`, `width`, `height`, `alt`, `caption`). Reference a plate by its key from any hero or split section |
| `pages[]` | Page filename, `<title>`, meta description, extra scripts, and an ordered `sections` array |
| `music` | **Optional.** Remove the whole block to drop the soundtrack dock. `videoId` (11-char YouTube ID), `title`, `artist`, `volume` (0–100), `label`, `onLabel`, `offLabel`, `hint`, `errorLabel`, `retryLabel`, `watchLabel` |

To add or remove a page, add/remove an object in `pages[]` and update `nav` and footer links if needed. To reorder content, reorder `sections[]`. No other edits are necessary.

### Palette contract

The core stylesheet treats these tokens as an accessibility contract (WCAG 2.1 AA, verified with the WCAG relative-luminance formula):

- **Text tokens** (`ink`, `ink-soft`, `ink-faint`, `accent`, `accent-strong`, `error`) must each reach **4.5:1** against `paper`, `paper-raised` and `field-bg`. `accent-strong` exists as the brighter hover step so accent-coloured text never needs to jump straight to `ink`.
- **Boundary tokens** (`rule-strong`) must reach **3:1** against every surface; `field-border` sits just below 3:1 at rest and escalates to `rule-strong` on hover and `accent` on focus, which is the pattern inputs use to announce themselves.
- **Inversions** — `paper` text on `ink`/`accent`/`accent-strong`/`night-ink` fills (button hover, selection, active filter) all clear 4.5:1.
- **Scrims** (drawer, sheet, modal overlays and their shadows) use `rgba(var(--night-rgb), α)`; `theme.css` derives `--night-rgb` from the `night` token, so any palette — warm or cool — gets matching scrims automatically. Keep `night` as the darkest tone in your theme.
- When you retune the palette, re-check the pairs above; the defaults in `site.css` carry a comment listing their measured ratios.

### Section types

Each entry in `pages[].sections` has a `type`. Available shapes:

- `hero` — plate background, eyebrow, `<h1>`, lede, buttons, index chips. `plate` is a key from `plates`.
- `logos` — eyebrow, visually-hidden heading and a grid of plain names.
- `cards` — section head + grid. `variant` is `link`, `card`, `detail` (adds filters and bottom-sheet triggers) or `stat`. Optional `filters[]`, `cta`.
- `steps` — section head + numbered step list.
- `split` — prose, optional steps/commands/terminal on one side, a plate image (or plain-text block) on the other. `plate_first` flips the order.
- `code_split` — prose plus a `<pre>` block of plain text.
- `motion` — canvas studies driven by `assets/js/motion-prompt-cells.js`; list `cells[]` with a registered `key` (`fpv`, `kaleidoscope`, `lineBoil`).
- `contact_band` — dark call-to-action with an email link.
- `newsletter` — dark signup band; the form composes a `mailto:` message.
- `brief_form` — dark two-column form. `fields[]` are generated; `confirm: true` adds the confirmation modal.
- `faq` — accordion from `items[]` of `{q, a}`.

`render.py` validates section types, plate keys, nav targets, theme colours and asset paths at build time and fails with a readable message rather than shipping a broken page.

### Images

Every image is shown in full: hero plates use `background-size: contain` via a `--hero-plate` custom property emitted per page; inline figures use `object-fit: contain` with natural width/height. Drop replacement WebP files into `src/assets/img/`, point `plates[].src` at them, and keep `width`/`height` accurate so layout does not shift. Any aspect ratio works — nothing is cropped.

### Design language

The interface is built from curved, glowing surfaces rather than ruled boxes: pill-shaped navigation, buttons, chips and filters; rounded cards with soft gradient fills and ember corner lights; a floating glass header; dark sections that rise into the page on a curved, slowly swaying horizon; and a breathing ember orb behind each hero plate. Radius, edge and glow tokens live in `:root` (`--radius-s/m/l/xl/pill`, `--edge`, `--card-bg`, `--glow`), so retuning the softness of the whole site is a four-line change. Images are never cropped — see *Images* below.

### Interactions and motion (core logic, no config needed)

`src/assets/js/site.js` provides the off-canvas mobile drawer, scroll reveal, copy-to-clipboard, category filters, `mailto:` forms, confirmation modal, bottom sheet with drag-to-dismiss, accordion, the in-place page router and the soundtrack controller. It reads all human-readable strings from `data-*` attributes on `<body>` emitted from `ui`, so new topics never require touching it. The pages remain fully readable with JavaScript disabled.

Motion follows one easing family — `easeOutCubic` (`--ease-out`) for entrances, hovers and presses, and `easeInOutCubic` (`--ease-in-out`) for switches — with a single set of tokens in `:root`. Ported catalog moves with timings intact: #074 scroll reveal (0.7 s / 28 px / 85% trigger), #081 card hover lift (10 px / 0.3 s), #085 press ripple (0.6 s growth, 0.3–0.8 s fade), #057 filter pill slide (0.25 s), #154 spotlight hover (radial light follows the cursor, no lag), #096 hero orb float (slow suspended bob), #165 dark-horizon sway (4.7 s phase-shifted layers) and #092 page transition (0.4 s cover / 0.45 s exit). Under `prefers-reduced-motion: reduce`, reveals are shown immediately, the veil, spotlight, float, sway, hover lift and ripple are suppressed, and switches happen instantly.

Motion Prompt elements #002, #0074/#074, #081, #085, #057, #050, #051, #052, #049, #092, #095, #096, #130, #154, #165, #035, #135 and #136 are MIT-licensed ported behaviours; attribution is kept in the source files.

### Continuous navigation (single persistent shell)

Internal links do not reload the document. A transition veil sweeps across (#092), only the contents of `<main>`, the `<title>` and the meta description are swapped, and the veil exits. The header, footer and everything fixed — including the soundtrack player — persist, so **music, scroll state and the dock survive every page change**. Browser history, back/forward, reduced-motion (instant swap, no veil) and no-JS (plain full page loads) all work; any fetch failure falls back to a normal navigation. The `file://` protocol and very old browsers simply skip the router.

### Ambient soundtrack (optional)

When `music` is present in the config, every page renders a small fixed dock (bottom-right) with a seven-bar equalizer, a waving "VIBE" label and the track name, plus a full-viewport ambient gradient that fades in only while audible playback is running. Three Motion Prompt moves are ported into the core CSS with attribution: #095 animated gradient (4.8 s, four radial blobs, drift paths carried over as vw/vh), #002 stagger (2.35 s, seven bars, `backOut(2.6)` growth sampled into `linear()` easing) and #130 wave text (4.7 s, three waves, 0.62 rad per-letter lag). Under reduced motion the equalizer, wave and gradient are static; the audio still works.

Playback streams through the official YouTube IFrame Player API into a 1×1 hidden player — **no audio is downloaded, copied or hosted by the template**. Only put a video ID here that you are entitled to embed and play on your site. Behaviour:

- **Starts on entry.** The player requests playback as soon as the API is ready. Browsers only permit audible autoplay after a first gesture, so if the start is held back, the very first click or keypress anywhere completes it — resuming from the current position, never restarting.
- **Never stops between pages.** Because navigation swaps content in place (above), the same player instance plays across the whole visit. The stream is looped via the player's own `loop` parameter with an `ENDED` fallback.
- **The dock toggle is mute/unmute, not pause.** Silencing keeps playback advancing, so unmuting continues mid-track. A visitor's mute choice is remembered in `localStorage`.

The player volume is set from `music.volume` on every start (50 in the shipped config).

If YouTube is blocked by the visitor's network or refuses the embed (error 153), the dock fails soft: it retries once without the `origin` parameter, then offers a **Retry** action and a direct "↗" link to the video on YouTube — it never dead-ends on a disabled control. The 20-second load timeout is also recoverable: if the API arrives late, the dock comes back automatically. The pages remain fully usable without JavaScript; the dock simply does not appear.

## Production notes

- Run `python build.py --check` in CI, then `python -m unittest discover -s tests`.
- Deploy the generated `dist/` directory only — source config and tests need not ship.
- Builds are deterministic and idempotent: the same config always produces byte-identical output.
- Fonts, images and motion scripts are local. The only runtime network request is optional: when `music` is configured, `site.js` loads `https://www.youtube.com/iframe_api` and streams from YouTube. With no `music` block there are no third-party runtime requests. The only external links are optional source links in `motion.cells[]`.
- Forms deliberately do not need a backend: they open the visitor's mail app. Swap in a real endpoint by replacing the `form[data-mail-form]` handler in `site.js` if desired.
