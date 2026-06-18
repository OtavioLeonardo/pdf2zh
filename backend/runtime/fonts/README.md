# Bundled Fonts

Place redistributable runtime fonts for offline Typst PDF generation here.

Recommended families:

- `Noto Serif`
- `Noto Sans`
- `Noto Sans Mono`
- `Source Han Serif SC`
- `Source Han Sans SC`
- `STIX Two Math`

This directory is intentionally checked in without font binaries.
Use `PDF2ZH_BUNDLE_FONTS_DIR` with `npm run runtime:prepare` to copy a prepared font directory into the bundled runtime.
