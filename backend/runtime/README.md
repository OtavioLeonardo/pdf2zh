# Bundled Runtime Layout

This directory is designed to be bundled into the Tauri app.

Expected layout:

- `bin/typst`
- `python/bin/python3`
- `fonts/`
- `typst/templates/pdf2zh-paper/`
- `typst/packages/`
- `site-packages/`

Optional:

- additional Python runtime files under `python/`
- vendored Typst third-party packages under `typst/packages/`
- transformer or sentence-model caches if you want fuller offline terminology extraction

Runtime resolution order:

1. explicit environment variables such as `PDF2ZH_PYTHON`
2. bundled runtime under `backend/runtime`
3. system PATH
