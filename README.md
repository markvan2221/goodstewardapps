# Good Steward — studio website

Static site for **goodstewardapps.com**, deployed on **Cloudflare (Workers static assets)**.

- `public/index.html` — studio landing
- `public/scripturepicture/privacy.html` — ScripturePicture privacy policy
- `public/scripturepicture/support.html` — support / FAQ
- `wrangler.jsonc` — Cloudflare config (serves `public/` as static assets)

Deploy: Cloudflare Workers & Pages → Create application → connect this repo →
build command blank, deploy command `npx wrangler deploy`. Pushes to `main` redeploy.

Privacy policy source of truth: `PRIVACY_POLICY.md` in the ScripturePicture repo.

## Leaderboard moderation

The ScripturePicture world leaderboard lives in Cloudflare **D1**
(`goodstewardapps-leaderboard`, bound as `DB` in `wrangler.jsonc`; API in
`src/leaderboard.js`).

To remove a bad entry: Cloudflare dashboard → **Storage & Databases → D1 →
goodstewardapps-leaderboard → Console**, then run:

```sql
DELETE FROM leaderboard WHERE name = 'TheBadName';
-- or, more precisely:
DELETE FROM leaderboard WHERE player_id = 'the-player-id';
-- to look around first:
SELECT * FROM leaderboard ORDER BY score DESC LIMIT 20;
```

The server-side rude-name wordlist is `BLOCKED_SUBSTRING` / `BLOCKED_TOKEN` in
`src/leaderboard.js` — edit and push to update it (no app release needed).
Keep it in rough sync with the app's `lib/nameFilter.ts`.
