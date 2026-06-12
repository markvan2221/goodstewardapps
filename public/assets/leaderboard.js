const tbody = document.querySelector('[data-leaderboard] tbody');
const withCommas = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

async function loadBoard() {
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();
    if (!data.entries || data.entries.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="board-status">No scores yet — be the first on the board!</td></tr>';
      return;
    }
    tbody.innerHTML = data.entries
      .map((e) => {
        // Player names are arbitrary Unicode — escape so they can't inject HTML.
        const cell = (v) =>
          String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<tr><td>${e.rank}</td><td class="board-name">${cell(e.name)}</td><td>${withCommas(e.score)}</td><td>${e.found}</td><td>${e.berries}</td><td>${e.badges}</td><td>${cell(e.language)}</td></tr>`;
      })
      .join('');
  } catch {
    tbody.innerHTML =
      '<tr><td colspan="7" class="board-status">The board is having a quiet moment — try again soon.</td></tr>';
  }
}

if (tbody) loadBoard();
