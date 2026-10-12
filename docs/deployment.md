# Deployment & Maintenance

The website is a fully static site (HTML/CSS/JS, no backend, no build step in
production). It is deployed to GitHub Pages by a GitHub Actions workflow.

## Architecture

```
push to main (web/public/**)
        │
        ▼
┌─────────────────────────────┐
│ .github/workflows/          │
│   deploy-pages.yml          │
│                             │
│  build job                  │
│   • copy web/public → _site │
│   • verify required files   │
│   • verify no broken links  │
│   • upload-pages-artifact   │
│                             │
│  deploy job                 │
│   • deploy-pages@v4         │
└─────────────────────────────┘
        │
        ▼
https://adhamhaithameid.github.io/aes-comparison-lab/
```

## Why GitHub Pages

- The site has no server component, so a static host is sufficient and free.
- Deployment is triggered by the same push that changes the content, so the
  published site cannot drift from the repository.
- HTTPS is provided and enforced by GitHub.
- The project-site URL path (`/aes-comparison-lab/`) is handled automatically
  because every asset reference in the HTML is **relative** (`js/main.js`,
  `css/style.css`). No base-path rewriting is performed at deploy time.

## Permissions

The workflow uses the least privilege that still allows deployment:

| Permission   | Value     | Why                                   |
|--------------|-----------|---------------------------------------|
| `contents`   | `read`    | Checkout the repository               |
| `pages`      | `write`   | Publish to the Pages environment      |
| `id-token`   | `write`   | OIDC token for the Pages deploy API   |

No secrets are stored or used. The deploy job runs in the `github-pages`
environment, which is where branch protection and required-review rules apply.

## Concurrency

```yaml
concurrency:
  group: pages
  cancel-in-progress: false
```

Two pushes in quick succession will deploy in order rather than racing, so a
deploy can never be overwritten by a half-finished build.

## Build-time verification

The build job fails the deployment if:

1. **A required file is missing** — every page, stylesheet, and script the site
   needs is listed explicitly. Adding a page without updating the list will
   fail the build rather than publish a broken site.
2. **A local link is broken** — every `src`/`href` that is not external
   (`https:`, `data:`, `#`, `mailto:`) must resolve to a file in `_site`.

This runs before upload, so a broken build never reaches production.

## Data integrity

`web/public/js/benchmark-data.js` is a **generated** file. It is produced from
the CSVs under `results/` by:

```bash
python3 scripts/generate_web_data.py          # regenerate
python3 scripts/generate_web_data.py --check  # verify in sync
```

The generator:

- validates schema, duplicate series, and internal consistency (min ≤ median ≤
  max, non-negative stdev, throughput arithmetic);
- refuses to generate site data from a test log that reports failures;
- embeds provenance (source SHA-256 digests, row counts, generating commit) in
  the file itself.

**If you change anything under `results/`, regenerate and commit the data
file.** A CI check (`generate_web_data.py --check`) fails the build if the
committed file is stale.

## Maintenance tasks

### Adding a page

1. Create `web/public/<name>.html` using the existing design system
   (`css/style.css`, `js/main.js`).
2. Add it to the navigation in every page.
3. Add it to the `required` list in `.github/workflows/deploy-pages.yml`.
4. Add it to the case-study page's learning table in `js/case-study.js`.

### Updating benchmark data

1. Re-run the benchmark suite to regenerate `results/*.csv`.
2. Run `python3 scripts/generate_web_data.py`.
3. Commit both the CSVs and the regenerated `benchmark-data.js`.

### Updating the case study

The case study renders its figures from `benchmark-data.js`; it contains no
hand-written metrics. If you change the page's prose or structure, re-run the
E2E suite:

```bash
cd web && npx playwright test
```

### Rolling back

Every deploy is tied to a commit. `git revert` the offending commit and push —
the workflow redeploys the previous state.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| 404 on a page | File not in `required` list, or not committed | Add to list / commit |
| Broken styling | `css/style.css` missing from `_site` | Check the copy step in the workflow |
| Stale numbers | `benchmark-data.js` not regenerated after a CSV change | Run `generate_web_data.py` |
| Deploy never fires | Workflow path filter excludes the changed files | Check `paths:` in the workflow trigger |
| Chart missing | Chart.js CDN unreachable | The page falls back to the data tables automatically |
