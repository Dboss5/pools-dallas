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
