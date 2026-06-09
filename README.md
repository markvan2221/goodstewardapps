# Good Steward — studio website

Static site for **goodstewardapps.com**, deployed via **Cloudflare Pages**.

- `index.html` — studio landing
- `scripturepicture/privacy.html` — ScripturePicture privacy policy
- `scripturepicture/support.html` — ScripturePicture support / FAQ
- `.nojekyll` — harmless; left in case of a future move to GitHub Pages

Privacy policy source of truth: `PRIVACY_POLICY.md` in the ScripturePicture repo —
regenerate `privacy.html` if it changes.

## Deploy (Cloudflare Pages, connect-to-Git)
1. Push this repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → select this repo.
3. Build settings: Framework preset = None · Build command = (blank) · Output directory = `/`.
4. After deploy: Pages → Custom domains → add `goodstewardapps.com` (DNS auto-configured since the domain is on Cloudflare).
