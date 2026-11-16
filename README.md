# Horizon Observatory

[Live platform](https://bocconi-horizon-observatory.lacyankle4.chatgpt.site/) · [Team contribution guide](CONTRIBUTING.md)

Clone this repository with:

```sh
git clone https://github.com/Eshkaro/horizon-project.git
cd horizon-project
```

A local, reproducible portfolio baseline for the HEC Horizon Europe capstone. The interface contains real CORDIS records, not example projects. No API key, account or third-party JavaScript packages are required. There is no LLM or automated call recommendation feature yet.

## Open it

Double-click `index.html` to use the self-contained dashboard in Safari or Chrome. If the Codex embedded browser restricts local files, use the local server below. To develop in VS Code, select **File → Open Folder** and open the cloned `horizon-project` folder.

Alternatively, run this in the VS Code terminal from this folder:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765 and press Ctrl+C in the terminal to stop serving it.

## Included

- Searchable project explorer with role and scheme filters, reference-date controls and CSV export.
- Bocconi net EU contribution, coordination roles, project dates and a twelve-month ending window.
- Funding-scheme mix, EuroSciVoc field counts and recurring co-participants.
- `data/portfolio.json`: dashboard data, objectives and source links.
- `data/bocconi_participations.csv`: original Bocconi participation rows.
- `data/projects.csv`, `data/collaborators.csv`, `data/topics.csv`: selected original source rows.
- `data/source-manifest.json`: archive hash, retrieval time, HTTP modification timestamp and identity checks.
- `scripts/build_data.py`: standard-library Python extraction pipeline.

## Source & matching rules

Official source: https://cordis.europa.eu/data/cordis-HORIZONprojects-csv.zip

Dataset catalogue: https://data.europa.eu/data/datasets/cordis-eu-research-projects-under-horizon-europe-2021-2027

Retrieved 29 October 2026. The server reported a last modification of 8 October 2026; the project CSV inside the ZIP is dated 5 October 2026. These timestamps describe the extract, not universal freshness of every record. CORDIS rebuilds datasets monthly; the live website may differ.

Match `organization.csv.organisationID == "999838850"` exactly. The name scan for BOCCONI found this one ID and the legal name UNIVERSITA COMMERCIALE LUIGI BOCCONI. All 68 participation rows match distinct projects in `project.csv`. No affiliates, historical framework programmes, unsuccessful applications or unfunded proposals are added. An independent legal-entity and affiliate scope review with the university remains desirable.

The source CSV contains unescaped semicolons inside RESOLVE's objective (project 101136502). The pipeline rejoins that field only after validating the trailing timestamp, RCN and DOI. This repair is recorded in the manifest; exported project rows preserve the recovered objective. Other unexpected column-width errors stop processing. The participant money for Sagittarius was independently checked against its official CORDIS factsheet: €381,937.75, compared with €5,999,764.58 for the consortium.

## Indicator definitions

1. **Funding:** sum `organization.csv.netEcContribution` for Bocconi. Retain zeros; never replace missing values with project-wide grants. Gross participant amounts and consortium grants are stored separately. These are full-grant amounts, not annual income or remaining funds. Currency parsing accepts decimal comma and decimal point.
2. **Project count:** distinct grant IDs with a Bocconi participation row. Associated partners remain in counts, even if their funding is zero.
3. **Coordinator:** role exactly `coordinator`.
4. **Within project dates:** start ≤ selected reference date ≤ end; exclude source statuses containing TERMINAT/CANCEL and ended Bocconi participations. This is a timing classification, not independent verification of live activity.
5. **Ending window:** within project dates and end ≤ reference date plus one calendar year, inclusive. Full-grant amounts in that window do not measure money lost, unspent funding or a demonstrated gap.
6. **Research fields:** unique top-level EuroSciVoc paths per project. A project with multiple fields counts once in each; counts are non-additive. Project classifications do not establish Bocconi’s specific contribution.
7. **Collaborators:** other organisation IDs sharing one or more funded projects with Bocconi. Deduplicate organisation/project pairs. Include historical and associated participants; co-participation does not prove direct collaboration or imply a partner recommendation.

Search, role and scheme filters apply to all charts. Reference date affects only timing and end-date indicators. Portfolio totals include future, ended and terminated awards, and are not current funding or actual payments received. Missing net contributions are counted visibly, even though the sum uses only known amounts. No Bocconi-specific application success rate, causal claim or annualised spending is calculated.

## Edit the interface

Edit `app.js`, `style.css` or `index.template.html`, then run `python3 scripts/build_page.py` to regenerate the self-contained `index.html`. Data refresh also rebuilds the page. Search matches all entered words across project IDs, acronyms, titles, topics, objectives and EuroSciVoc fields.

## Refresh the official data

```sh
python3 scripts/build_data.py
```

This downloads the current public ZIP (about 36 MB) into `data/` and regenerates the extract plus `portfolio-data.js`. Keep the original archive if you need to reproduce a specific snapshot. To use a retained archive:

```sh
python3 scripts/build_data.py --archive /path/to/cordis-HORIZONprojects-csv.zip --retrieved ORIGINAL_UTC_TIMESTAMP --last-modified ORIGINAL_HTTP_LAST_MODIFIED
```

## Validate

```sh
python3 -m unittest discover -s tests
node --check app.js
node --check benchmarks.js
node tests/benchmark.test.cjs
```

## Next milestones

- Validate organisation scope and indicator usefulness with a Bocconi funding adviser.
- Add Funding & Tenders Portal open/upcoming calls with retrieval dates, deadlines and eligibility evidence.
- Define transparent theme/partner matching rules and validate a small shortlist by hand.
- Add an assistant that retrieves project/call evidence and invokes deterministic calculations. Keep model credentials server-side.
- Add HEC as a second institution only after its legal-entity mapping is reviewed.

Before the December board, agree with your supervisor on what constitutes “funding exposure” and how you will evaluate recommendation usefulness. Grant end dates alone do not establish a funding shortfall.

## Historical proposal success benchmarks

New section: `#success-rates`. Source: the European Commission R&I Proposals Qlik dashboard linked in `data/proposal-benchmarks.json`, retrieved 16 November 2026. The programme-level view showed 184,441 eligible Horizon Europe proposals and 26,072 retained. Its thematic export reconciles exactly across 14 funding areas. Rates are computed from full counts; source percentages are retained for verification. The original exported workbook is included as `data/horizon-proposals-source.xlsx`.

Only Programme = HORIZON EUROPE was selected. No year or country selections were applied. The export supplies no underlying data cutoff, so this is labelled by retrieval date and must not be presented as a November-only evaluation cohort or a live feed. This snapshot is separate from the October Bocconi portfolio extract.

Retained means final evaluation status MAIN/mainlisted for funding, not a signed grant or payment. Eligible proposals exclude ineligible, inadmissible, duplicate, withdrawn and missing-evaluation records. Organisation applications are not the success-rate denominator. EIC includes resubmissions; EIT data availability is limited and its denominator is 43. Broad funding areas mix schemes and cannot establish individual eligibility or personalised probabilities.

To re-import an official thematic chart export, install the optional import dependency with `python3 -m pip install -r requirements-import.txt`, then use: `python3 scripts/import_benchmarks.py /path/to/export.xlsx`, updating the retrieval date and asserted source totals in that script for the new snapshot, then `python3 scripts/build_page.py`. The script deliberately stops if expected headers, source rates or totals fail validation.

Validation: `node tests/benchmark.test.cjs` verifies source-rate agreement, additive counts, framework-level reconciliation, sorting and weighted aggregation. Browser checks cover area selection, chart interactions and original portfolio search.
