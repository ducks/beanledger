# BeanLedger appearance lab

The team is broadly comfortable with the current workflow. This exploration is
about visual identity: typography, colors, and UI styling. It replaces the
alternate-flow gallery with one current-layout sample.

## Review

Build with `node scripts/build-design-preview.js`, then test with
`node scripts/test-design-preview.js`. No database, authentication, or app server
is needed. The test starts a temporary server on port 5181 and saves screenshots
under ignored `artifacts/appearance/`.

To keep a local preview running after the tests:

```sh
python3 -m http.server 5182 --bind 127.0.0.1 --directory artifacts/preview-site
```

Open http://127.0.0.1:5182/beanledger/design-system/.
The existing manual **Publish design explorations** workflow can publish this to
https://ducks.github.io/beanledger/design-system/ once merged. It only replaces
that directory on gh-pages, preserving the screenshot gallery. Nothing is
published by building or testing locally.

## Three starting directions

- **Service station:** burgundy, porcelain cream, turquoise; playful Bricolage Grotesque.
- **Modernist office:** cool gray, ink blue, signal yellow; geometric Space Grotesk.
- **Soft vintage:** cocoa, butter, coral; soft Fraunces.

Presets are conversation starters, not final identities. The preview pairs the wordmark with a generated coffee-bean bookkeeper mascot.
The transparent PNG is stored in `src/lib/design-system/assets/bean-bookkeeper.png`
and shown at specimen and header sizes. It is concept artwork, not a vector master.
Typography specimens are typeset in the named fonts, not custom-designed fonts.
The user references are Ocsquid by alpercakici and Rolla by HipFonts; neither
commercial font is included or replicated.

## Controls and sharing

Change palette, light/dark mode, wordmark font, interface font, heading-font use,
mascot, and corner shape independently. Presets change palette, wordmark,
and corners, while preserving interface font and light/dark choice.
Appearance choices are encoded in the URL; use **Copy appearance link** to share.
Reload restores appearance choices but resets synthetic planner state.

The local font picker accepts TTF, OTF, WOFF, or WOFF2 up to 8 MB. It loads the
font from an ArrayBuffer into the browser FontFace API: no upload, persistence,
API call, or external font CDN. Local font selections fall back to System sans
in shared URLs; recipients must load their own font file. Reload removes it.
Only one local font is loaded at a time and replaced fonts are released.

## Scope and fidelity

`CurrentFlowPreview.svelte` is a presentation-only recreation of the existing
`RoastPlanner.svelte` hierarchy: account header, planner toolbar, CSV import,
import history, manual-product/sort controls, and roast-group cards. Catalog,
reports, packaging, and settings remain dialogs rather than new destinations.
The preview reuses the application's `calcGroup` and `formatWeight` functions.

This is not the production application or a full workflow test. Prepared sample
orders replace uploads; catalog and packaging tables are read-only; account and
destructive actions explain that they are unavailable. Quantity/leftover/batch
edits and completion affect only the synthetic sample. This avoids database
writes and keeps branding review separate from domain changes. Review the final
chosen style on real application components before adopting it.

Production components and routes are unchanged. The former concept URLs now
lead to the lab. Earlier demo components remain in source history/the checkout
but are no longer published as alternative workflows.

## Fonts

Self-hosted variable TTFs from the official Google Fonts repository, downloaded
2026-11-21. Every family includes its SIL Open Font License under
`src/lib/design-system/fonts/`:

- Bricolage Grotesque: https://github.com/google/fonts/tree/main/ofl/bricolagegrotesque
- Fraunces: https://github.com/google/fonts/tree/main/ofl/fraunces
- Space Grotesk: https://github.com/google/fonts/tree/main/ofl/spacegrotesk

No new runtime dependencies. Fonts are bundled by Vite with content hashes.

## Validation

Automated browser checks cover presets, independent selections, preservation of
sample edits, URL round trips, malformed query parameters, valid/invalid local
font files, dialog dismissal and returned focus, mobile/tablet overflow, light
and dark themes, old preview links, and absence of API/third-party requests.
These checks do not certify accessibility or typography across all combinations.

The Mascot selector switches both preview sizes between the coffee bean and
clipboard characters. Shared URLs preserve this choice; older links default to
the coffee bean. Both generated transparent PNG concepts live under
`src/lib/design-system/assets/`.
