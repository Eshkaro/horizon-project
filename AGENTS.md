# Horizon Observatory project instructions

Read README.md and CONTRIBUTING.md before changing the project.

- This is a buildless HTML/CSS/JavaScript dashboard with Python data extraction scripts.
- Edit index.template.html, app.js, style.css, benchmarks.js and benchmarks.css. Rebuild index.html with `python3 scripts/build_page.py`; commit the generated page with its sources.
- Consortium matching sources are matcher.template.html, matcher.css, matcher.js, matcher-engine.js and data/matcher-*.json. Rebuild through the same page builder; run `node tests/matcher.test.cjs` for matcher changes. See MATCHING.md for data scope and scoring.
- Preserve provenance and definitions. CORDIS contains funded projects. Proposal benchmark records come from the Commission's separate R&I Proposals dashboard.
- Retained proposals / eligible proposals is a historical benchmark, not an individual's probability. Retained proposals are not the same as signed grants.
- Preserve zero funding and distinguish participant net EU contribution from the consortium grant.
- Do not silently refresh, invent, or reclassify source data. Keep snapshot dates visible.
- For relevant edits run Python integrity tests, `node --check app.js`, `node --check benchmarks.js`, and `node tests/benchmark.test.cjs`. Preview visible changes in a browser when available.
- Work on a feature branch and prepare a pull request. Explain implementation and validation. Never force push or overwrite teammates' changes.
- Do not deploy or change site access unless asked. GitHub changes do not auto-publish to the current Sites website.
- Never commit credentials, .env files, .openai hosting state, local caches or downloaded bulk archives.
