# Sublevel Studio

Local React/Vite host for the ThreeUI `SublevelStudioLandingPage` renderer.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` type-checks the app and produces the production bundle in `dist/`.

## Hermes Mythic Design

The upstream skill was imported from `github.com/NylasDev/hermes-mythic-design` into `.hermes/skills/hermes-mythic-design/` (SKILL.md, design tokens, engraving script, examples, LICENSE, and the packaged `.skill` bundle). All imported files match the GitHub source byte-for-byte. A project-local note in SKILL.md records the exact-source precedence rule from the earlier brief.

The skill is utilized on a new, open surface: `public/mythic.html`, served at **/mythic.html**. It applies the parchment palette, serif/mono type scale, mono eyebrows with `•`, hairline ruled grids, the printed double-rule page frame and terminal, the tall cell-divided navigation band, the paper-grain overlay, and the skill's engraved hero asset. The protected black-and-white ThreeUI plate is left untouched, per the skill's own precedence rule.

## Source and fallback

The registered `LandingPages.tsx`, `LandingPageFrame.tsx`, and `threeui.css` were copied from the linked source bundle and their SHA-256 hashes were verified. `LandingPages.tsx` is retained as the registered source reference; the active renderer imports the identical `SublevelStudioLandingPage` body from `src/shaders/landing-pages/SublevelStudioLandingPage.tsx`. The upstream `pageTypography.ts` is included because the exact frame imports its typography hooks.

The canonical `sublevel-studio.html` file with the requested SHA-256 was unavailable. At the user's direction, `public/landing-pages/sublevel-studio.html` is the page currently assembled by the ThreeUI endpoint (1,878,750 bytes; SHA-256 `a0a6c5356bc6…`). It is not the pinned canonical revision; it requires the network for its hosted media, and the exact pinned file can replace it without code changes.

The requested import specifier `designcodeio/threeui` is mapped locally by Vite to the component adapter; its `style.css` subpath maps to the registered shared stylesheet. The adapter renders the registered `SublevelStudioLandingPage` body through `LandingPageFrame`, whose complete source is included.
