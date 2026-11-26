# Working together

## First setup

1. Accept the repository invitation from Eshkaro.
2. Clone `https://github.com/Eshkaro/horizon-project.git` using VS Code, GitHub Desktop or Git.
3. Open the cloned folder in VS Code and sign into the Codex extension with your own account.
4. Run `python3 -m http.server 8765 --bind 127.0.0.1` and open http://127.0.0.1:8765. Python 3 is needed for building and testing; Node.js is needed for JavaScript checks. Browsing the existing `index.html` needs no installation.

## Each change

Start from an updated main branch and create a separate branch:

```sh
git switch main
git pull --ff-only
git switch -c feature/describe-your-change
```

If you have unfinished changes, commit them on your current branch before switching. Ask Codex to make a focused change. For example:

> Read AGENTS.md and CONTRIBUTING.md. Improve the success-rate chart's mobile layout. Preserve the source data and statistical definitions, rebuild the page, run the relevant checks, and explain the changes.

The editable sources are `index.template.html`, `app.js`, `style.css`, `benchmarks.js`, and `benchmarks.css`. `benchmarks-section.html` is a reference fragment; the page builder currently reads the section from `index.template.html`. Edit that template to change section content. `index.html` is generated. After editing:

```sh
python3 scripts/build_page.py
python3 -m unittest discover -s tests
node --check app.js
node --check benchmarks.js
node tests/benchmark.test.cjs
```

For consortium matching, edit `matcher.template.html`, `matcher.css`, `matcher.js` and `matcher-engine.js`; see `MATCHING.md` for data provenance. The same builder regenerates `matcher.html`. Also run `node tests/matcher.test.cjs`.

Preview in the browser, then commit and push:

```sh
git add .
git commit -m "Describe the change"
git push -u origin HEAD
```

Open a pull request on GitHub. Explain the change, how you tested it, and include a screenshot for visible changes. Eshkaro can review the diff, leave comments and merge it. GitHub shows pushed commits and pull requests; local changes on your computer are not visible to teammates until pushed. Each person's Codex conversations are separate.

To receive merged changes, switch to main and use `git pull --ff-only`, after saving your own work on its branch.

## Data changes

Preserve original source exports and provenance. Describe the retrieval date and filters. Keep retained proposals distinct from signed grants, and participant funding distinct from consortium funding. Do not call historical programme rates an individual's probability. Optional XLSX import dependencies are listed in `requirements-import.txt`.

## Live website

The current site is hosted through Sites at https://bocconi-horizon-observatory.lacyankle4.chatgpt.site/ . Pushing or merging on GitHub does not automatically update that site. Eshkaro should publish the reviewed, merged version through the existing Sites project. Hosting configuration and credentials are deliberately excluded from this team repository. Do not create a replacement site unless requested.

## Alternative hosting: GitHub Pages

The optional “Publish GitHub Pages” workflow is manually triggered; commits do not automatically publish. After review and merge, enable **Settings → Pages → Source: GitHub Actions**, then run the workflow from **Actions** on the reviewed branch. It tests the project and publishes only `_site/`, built by `python3 scripts/build_static.py`. It does not contain hosting credentials or Sites identity. The existing Sites website is a separate deployment.
