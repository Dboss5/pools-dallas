# Frisco Pool Services

Static pool-service website with service guides, city pages, and an on-device pool photo checker.

Contact: **945-777-3345**. Service request links call this number; no external booking portal is connected.

The original Frisco wave-and-sun SVG wordmark is in `assets/frisco-pool-logo.svg`. Photos are served locally from `assets/pool-photos/`; selected photos with visible previous branding have been replaced. Editorial links stay within this website.

## Preview and validation

Serve the repository as a static website. For the managed preview, copy site files into `dist/` and use the existing preview configuration.

Run `node --test tests/pool-checker.test.mjs` for the photo checker checks.

Set the actual production origin with `python scripts/configure_seo.py --origin https://YOUR-DOMAIN` before publishing to generate absolute canonicals and a sitemap. No production domain has been assigned here.

## Photo checker

Photo screening and colour observations run on the visitor’s device. Accepted photos remain in tab memory; reports contain text only. The CPU face detector rejects detected faces and fails closed when screening fails. Detection is imperfect. Water-colour observations and symptom guidance are preliminary and cannot locate hidden leaks, determine chemistry, or certify swimming safety. Third-party detector licenses remain in `assets/vendor/`.

## Frisco local guides

The Frisco city guide links to `/frisco-neighborhoods/`, two guides for Frisco’s Collin and Denton County portions, and eight neighborhood guides. Local setting is grounded in linked community, developer, city, or visitor references; service priorities are planning guidance, not claims of neighborhood-wide defects or an HOA affiliation. Coverage is confirmed per address.

Edit `assets/frisco-local-content.json` and run `python scripts/build_frisco_local.py` to rebuild the ten local pages and searchable directory. The citywide guide retains its separate content and city map. Shared navigation links to the directory. SEO generation includes all 53 pool routes.

## Full pool service catalogue

`/services/` presents 21 primary services with search and category filters, plus five additional cleaning guides. Fourteen dedicated service pages extend the earlier service coverage. All calls and texts use 945-777-3345 and all content is branded Frisco Pool Services. Photos are local, with no prior-company logos or hotlinks.

Edit `assets/pool-expanded-services.json` and run `python scripts/build_pool_service_catalog.py` to rebuild the expanded service pages and directory. `assets/pool-service-catalog.json` records the 21 entries and their correct local destinations. Warranty eligibility, authorized-service arrangements, and required qualifications are confirmed for the actual request; no unsupported authorization or certification is advertised.

## Website search

Every pool header and mobile menu links to `/search/`. Search indexes the 53 public pool pages, ranks title and heading matches, and supports service, location, and tools filters. Results are rendered locally from `assets/site-search-index.json`; query URLs can be shared. The search page is noindex and is excluded from search results and the sitemap. Legacy lighting pages are excluded.

After page content changes, run `python scripts/build_site_search.py` to refresh the index.
