# Consortium matching pilot

The matcher at `matcher.html` suggests partner **organisations** from CORDIS consortium participation records. The five Bocconi researchers are manually curated search starting points. They have not endorsed the tool. No automatic publication-author matching, contact scraping, external AI request, or personal suitability prediction is performed.

## Sources and scope

- Official CORDIS Horizon Europe CSV archive retrieved 26 November 2026; HTTP Last-Modified 10 November 2026. The archive SHA-256 and exact counts are in `data/matcher-manifest.json`.
- Include non-terminated RIA, IA, CSA and joint-undertaking equivalents with at least three listed organisations. Exclude ended participation rows. This is a corpus construction rule, not a call-eligibility test. Single-investigator ERC projects are excluded.
- Identify organisations by exact CORDIS organisation ID. Do not combine affiliates. Exclude Bocconi (999838850) from recommendations.
- Prior Bocconi connection means co-participation on a project in this same filtered corpus, not a verified direct relationship or a complete university collaboration history.
- Five official institutional profiles are summarised in `data/researcher-profiles.json`, each with URL and verification date. Profiles cover Bosetti, Profeta, Gennaioli, Percoco and Tarricone. Publication records are not merged automatically.
- The example topic HORIZON-CL2-2027-01-TRANSFO-01 concerns nature-positive urban environments and social inclusion. Dates and published outcomes were checked on EFSA's official page on 26 November 2026. Suggested expertise labels are our interpretation, not mandatory call requirements. See `data/matcher-call.json`.
- The new corpus does not refresh or overwrite the separately dated Bocconi portfolio or proposal-success benchmarks.

## Search and scoring

The algorithm is deterministic lexical retrieval, not machine learning. It supports English descriptions. The tokenizer removes accents, lowercases, retains alphabetic words of at least three characters, removes a published stop list and deduplicates terms. Search expands simple singular/plural variants. Unsupported terms remain in the coverage denominator so they cannot silently inflate match quality.

For N corpus projects and document frequency df of each idea term, its weight is `ln(1 + (N+1)/(df+1))`. Idea coverage for a project is the sum of weights of its matched idea terms divided by the sum of all idea-term weights. The full project title, objective, keywords and EuroSciVoc fields are indexed. Repeated keyword stuffing does not increase coverage.

A candidate must appear in a relevant project. Projects need at least 12% weighted idea coverage and, for queries of four or more terms, at least two matched idea terms. Researcher profile terms alone never retrieve candidates.

For each organisation, take its three most relevant retrieved projects (or fewer if fewer exist). Every scored component uses those same cited records:

- **Idea:** 60 × the strongest project's weighted idea coverage.
- **Missing expertise:** 30 × the fraction of selected roles with keyword evidence in at least one cited project. At least one selected role must match.
- **Researcher profile:** 10 × the strongest cited project's coverage of that researcher's manually curated profile tags.

When no expertise is requested, weights are 80 idea / 0 expertise / 20 profile. Round the sum to an integer and cap at 100. Ties use unrounded idea score and organisation name. The role keyword dictionary is public in `matcher-engine.js`.

Scores measure evidence overlap only. They are not calibrated probabilities, funding chances, researcher assessments or verified organisational capabilities. Shared project text does not show which participant delivered a particular work package. Current capacity, conflicts, interest, legal eligibility and the relevant human contacts require validation.

Country, type and prior-connection filters restrict organisations. The optional scheduled-date filter restricts evidence projects using today's date; it does not establish actual live activity. Selecting the example call records funding context and displays its source; the explicit example button fills a matching idea and role suggestions. The matcher does not parse or enforce full call rules.

## Shortlisting

Save up to five organisations in browser localStorage. Each saved item retains the original search context, score components, source snapshot, matched terms and project links. Storage failures fall back to an in-memory list with a warning. Export is JSON for team discussion. No messages or invitations are sent.

## Reproduce

```sh
python3 scripts/build_matcher_data.py /path/to/official-cordis-HORIZONprojects-csv.zip
python3 scripts/build_page.py
node tests/matcher.test.cjs
```

The importer is standard-library Python. For a new snapshot, update its explicit retrieval/modification metadata and verify the resulting counts. The saved archive is not committed. Parser recoveries rejoin objective semicolons only with validated trailing date and RCN anchors; repaired IDs and structurally excluded rows are recorded in the manifest.

`matcher.html` is the generated standalone page. `data/matcher-corpus.json` is its evidence source. `matcher.template.html`, `matcher.css`, `matcher-engine.js` and `matcher.js` are editable. `scripts/build_page.py` rebuilds both the portfolio and matcher. No package installation is needed to run the saved site. The page contains a complete index and is larger than the portfolio page.

## Validation and next steps

Automated checks verify organisation membership on every cited project, exact-ID exclusion, filter behaviour, date behaviour, score accounting, supported-role evidence, empty queries and deterministic ordering. These are implementation checks, not real-world relevance validation.

Before relying on the ranking, ask a funding adviser to review at least 20 researcher/idea searches, label relevant and irrelevant partners, and measure relevance among the first five results. Compare with a keyword-only baseline, inspect missed partners, refine role dictionaries and add verified work-package or publication evidence. Improve researcher coverage only with source and identity checks.

Country handling: CORDIS EL is normalised to GR. Ambiguous values (such as a multi-country field) remain in countryRaw and are unclassified for country filtering.

## Custom profiles
Choose “Enter your own profile” to supply an optional shortlist name and required English expertise (10–1,500 characters). The engine tokenises that expertise using the same stop words and matching rules as starter-profile keywords. It affects only the researcher-profile component and evidence tie-breaking; project-idea evidence is still required. Custom text is self-reported, not institutionally verified. Inputs are held in the page; saving a partner includes the profile expertise/name in its browser-local shortlist and subsequent JSON export. No server or AI service receives them. The Bocconi connection filter continues to refer to Bocconi, regardless of the custom user's affiliation.
