// World leaderboard for ScripturePicture (see the app repo's
// docs/superpowers/specs/2026-06-13-world-leaderboard-design.md).
// Everyone's best is STORED; the website displays the top 100. POST always
// returns the player's exact rank. Names are re-checked here so the wordlist
// can be updated without an app release; Mark deletes strays via the D1
// console (see README "Leaderboard moderation").

const MAX_SCORE = 50000; // theoretical game max ≈ 39,450 + headroom
const MAX_FOUND = 115;
const MAX_BERRIES = 18;
const MAX_BADGES = 10;
const COOLDOWN_MS = 60_000;
const TOP_N = 100;

// Language codes (the app's Player.lang / sp_settings.lang) → English display
// names; the leaderboard page is English-only.
const LANG_NAMES = {
  EN: "English", EN_KJV: "English", FR: "French", DE: "German",
  ES: "Spanish", PT: "Portuguese", NL: "Dutch", JA: "Japanese",
  ZH_HANT: "Chinese", ZH_HANS: "Chinese", AR: "Arabic",
};

// Server-side rude-name lists (normalized matching; conservative on purpose —
// the in-app filter is the first line, this catches what ships later).
// Keep in rough sync with the app's lib/nameFilter.ts.
//
// Two tiers (the Scunthorpe problem): SUBSTRING words are unambiguous and
// matched anywhere, even with separators stripped ("F U C K"). TOKEN words
// also occur inside innocent names (Scunthorpe, reputation, amputate), so
// they only match as a whole word/token or at the start/end of the
// separator-stripped name ("Mr Cunt", "puta123") — a mid-string embed passes.
const BLOCKED_SUBSTRING = [
  // English
  "fuck", "shit", "bitch", "asshole", "dickhead", "wanker", "nigger", "faggot",
  // French / Spanish / Portuguese
  "putain", "salope", "connard", "mierda", "caralho",
  // German / Dutch
  "fotze", "hurensohn", "scheisse", "klootzak",
  // Japanese / Chinese (romanized + native)
  "ちんこ", "まんこ", "他妈的", "傻屄", "操你",
  // Arabic
  "شرموط",
];
const BLOCKED_TOKEN = [
  "cunt", "puta", "merde", "merda", "cabron", "kanker", "kuso", "manko",
  "くそ", "كس", "طيز",
];

const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i" };

// Lowercase + de-leet, separators preserved.
function normLoose(name) {
  return name.toLowerCase().replace(/[0134578@$!]/g, (c) => LEET[c] ?? c);
}
// Fully stripped of separators (catches "F U C K", "sh.i.t").
function normTight(name) {
  return normLoose(name).replace(/[\s\-_.·•']/g, "");
}

export function isNameClean(name) {
  const tight = normTight(name);
  if (BLOCKED_SUBSTRING.some((w) => tight.includes(normTight(w)))) return false;

  const tokens = normLoose(name).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const word of BLOCKED_TOKEN) {
    const w = normTight(word);
    if (tokens.includes(w)) return false; // whole word ("Mr Cunt")
    if (tight === w || tight.startsWith(w) || tight.endsWith(w)) return false; // "puta123", "xxcunt"
  }
  return true;
}

async function ensureTable(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS leaderboard (
        player_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        found INTEGER NOT NULL,
        berries INTEGER NOT NULL,
        badges INTEGER NOT NULL,
        lang TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`
    )
    .run();
}

async function rankFor(db, score) {
  const row = await db
    .prepare("SELECT COUNT(*) AS above FROM leaderboard WHERE score > ?")
    .bind(score)
    .first();
  return (row?.above ?? 0) + 1;
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export async function handleLeaderboard(request, env) {
  const db = env.DB;
  if (!db) return json({ ok: false, error: "not_configured" }, 500);
  await ensureTable(db);

  if (request.method === "GET") {
    const { results } = await db
      .prepare(
        "SELECT name, score, found, berries, badges, lang FROM leaderboard ORDER BY score DESC, updated_at ASC LIMIT ?"
      )
      .bind(TOP_N)
      .all();
    const entries = (results ?? []).map((r, i) => ({
      rank: i + 1,
      name: r.name,
      score: r.score,
      found: r.found,
      berries: r.berries,
      badges: r.badges,
      language: LANG_NAMES[r.lang] ?? "English",
    }));
    // Light client/edge caching; D1's free tier makes per-request reads fine too.
    return json({ ok: true, entries }, 200, { "Cache-Control": "public, max-age=60" });
  }

  if (request.method !== "POST") return json({ ok: false, error: "method" }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }

  const playerId = String(body.playerId ?? "").trim();
  const name = String(body.name ?? "").trim();
  const lang = String(body.lang ?? "EN").trim();
  const score = Number.parseInt(body.score, 10);
  const found = Number.parseInt(body.found, 10);
  const berries = Number.parseInt(body.berries, 10);
  const badges = Number.parseInt(body.badges, 10);

  if (!playerId || playerId.length > 40 || !name || name.length > 20) {
    return json({ ok: false, error: "invalid" }, 422);
  }
  if (!isNameClean(name)) return json({ ok: false, error: "rejected_name" }, 422);
  const within = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
  if (!within(score, MAX_SCORE) || !within(found, MAX_FOUND) || !within(berries, MAX_BERRIES) || !within(badges, MAX_BADGES)) {
    return json({ ok: false, error: "rejected_stats" }, 422);
  }

  const now = Date.now();
  const existing = await db
    .prepare("SELECT score, updated_at FROM leaderboard WHERE player_id = ?")
    .bind(playerId)
    .first();

  if (existing && now - existing.updated_at < COOLDOWN_MS) {
    return json({ ok: false, error: "cooldown" }, 429);
  }

  if (!existing) {
    await db
      .prepare(
        "INSERT INTO leaderboard (player_id, name, score, found, berries, badges, lang, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)"
      )
      .bind(playerId, name, score, found, berries, badges, lang, now, now)
      .run();
    return json({ ok: true, result: "submitted", rank: await rankFor(db, score), score });
  }

  if (score > existing.score) {
    await db
      .prepare(
        "UPDATE leaderboard SET name=?, score=?, found=?, berries=?, badges=?, lang=?, updated_at=? WHERE player_id=?"
      )
      .bind(name, score, found, berries, badges, lang, now, playerId)
      .run();
    return json({ ok: true, result: "updated", rank: await rankFor(db, score), score });
  }

  // Not beaten — but name/lang ALWAYS refresh (renames propagate to the board).
  await db
    .prepare("UPDATE leaderboard SET name=?, lang=?, updated_at=? WHERE player_id=?")
    .bind(name, lang, now, playerId)
    .run();
  return json({
    ok: true,
    result: "not_beaten",
    rank: await rankFor(db, existing.score),
    score: existing.score,
  });
}
