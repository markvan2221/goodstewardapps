# Good Steward — studio website

Static site for **goodstewardapps.com**, deployed on **Cloudflare (Workers static assets)**.

- `public/index.html` — studio landing
- `public/scripturepicture/privacy.html` — ScripturePicture privacy policy
- `public/scripturepicture/support.html` — support / FAQ
- `wrangler.jsonc` — Cloudflare config (serves `public/` as static assets)

Deploy: Cloudflare Workers & Pages → Create application → connect this repo →
build command blank, deploy command `npx wrangler deploy`. Pushes to `main` redeploy.

Privacy policy source of truth: `PRIVACY_POLICY.md` in the ScripturePicture repo.
