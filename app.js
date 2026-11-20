'use strict';

/* =========================================================
   Habitudes — suivi d'habitudes quotidiennes (PWA)
   Toutes les données restent sur l'appareil (localStorage).
   ========================================================= */

const STORE_KEY = 'habitudes.v1';
const COLORS = ['#FF6B6B', '#FF9F43', '#F7B731', '#20BF6B', '#0FB9B1', '#45AAF2', '#4B7BEC', '#A55EEA', '#FC5C9C', '#778CA3'];
const EMOJIS = ['💧', '🏃', '📚', '🧘', '🥗', '😴', '💪', '🚶', '✍️', '🎸', '🧹', '💊', '🌱', '📵', '☀️', '🙏', '🦷', '🍎', '🚴', '🎨', '🧠', '💰', '🗣️', '🐶'];
const SUGGESTIONS = [
  { name: "Boire 2 L d'eau", emoji: '💧', color: '#45AAF2' },
  { name: 'Lire 20 minutes', emoji: '📚', color: '#FF9F43' },
  { name: 'Méditer', emoji: '🧘', color: '#A55EEA' },
  { name: 'Marcher 30 min', emoji: '🚶', color: '#20BF6B' },
  { name: 'Se coucher avant 23 h', emoji: '😴', color: '#4B7BEC' },
  { name: 'Pas d’écran au réveil', emoji: '📵', color: '#FC5C9C' },
];
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // indexé par getDay()

const fmtDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

/* ---------- Dates ---------- */
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysBetween = (a, b) => Math.round((b - a) / 86400000);

/* ---------- Stockage ---------- */
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.habits)) return s;
  } catch (e) { /* stockage indisponible ou corrompu */ }
  return { habits: [] };
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* mode privé */ }
}

let state = load();
let tab = 'today';

/* ---------- Calculs ---------- */
const isDone = (h, d) => !!h.log[dayKey(d)];

function currentStreak(h) {
  let d = today();
  if (!isDone(h, d)) d = addDays(d, -1); // la série reste valable tant qu'aujourd'hui n'est pas fini
  let n = 0;
  while (isDone(h, d)) { n++; d = addDays(d, -1); }
  return n;
}

function bestStreak(h) {
  const keys = Object.keys(h.log).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = parseKey(k);
  }
  return best;
}

function rate(h, days) {
  const t = today();
  const since = h.createdAt ? daysBetween(parseKey(h.createdAt), t) + 1 : days;
  const span = Math.max(1, Math.min(days, since));
  let c = 0;
  for (let i = 0; i < span; i++) if (isDone(h, addDays(t, -i))) c++;
  return Math.round((c / span) * 100);
}

const total = (h) => Object.keys(h.log).length;

/* ---------- Utilitaires ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const $ = (sel) => document.querySelector(sel);
const app = $('#app');

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PLUS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

/* ---------- Rendu : Aujourd'hui ---------- */
function renderToday() {
  const t = today();
  const habits = state.habits;
  const done = habits.filter((h) => isDone(h, t)).length;
  const C = 2 * Math.PI * 22;
  const pct = habits.length ? done / habits.length : 0;

  const header = `
    <header class="top">
      <div>
        <p class="date">${esc(fmtDate.format(t))}</p>
        <h1>Aujourd'hui</h1>
      </div>
      <div class="top-actions">
        ${habits.length ? `
        <div class="ring" aria-label="${done} sur ${habits.length} faites">
          <svg viewBox="0 0 52 52"><circle class="track" cx="26" cy="26" r="22" fill="none" stroke-width="5"/>
          <circle class="bar" cx="26" cy="26" r="22" fill="none" stroke-width="5" stroke-linecap="round"
            stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
          <span>${done}/${habits.length}</span>
        </div>` : ''}
        <button class="add-btn" data-action="new" aria-label="Ajouter une habitude">${PLUS_SVG}</button>
      </div>
    </header>`;

  if (!habits.length) {
    app.innerHTML = header + `
      <section class="empty">
        <div class="big">🌱</div>
        <h2>Créez votre première habitude</h2>
        <p>Choisissez une suggestion ou créez la vôtre. Cochez-la chaque jour pour construire une série.</p>
        <div class="chips">
          ${SUGGESTIONS.map((s, i) => `<button class="chip" data-action="suggest" data-i="${i}">${s.emoji} ${esc(s.name)}</button>`).join('')}
        </div>
        <button class="primary" data-action="new">Créer une habitude</button>
      </section>`;
    return;
  }

  const week = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));

  app.innerHTML = header + `
    <ul class="list">
      ${habits.map((h, idx) => {
        const s = currentStreak(h);
        const doneToday = isDone(h, t);
        return `
        <li class="card" style="--c:${h.color};animation-delay:${idx * 30}ms" data-id="${h.id}">
          <button class="card-main" data-action="edit" aria-label="Modifier ${esc(h.name)}">
            <span class="emoji">${h.emoji}</span>
            <span class="info">
              <span class="name">${esc(h.name)}</span>
              <span class="streak ${s ? 'hot' : ''}">${s ? `🔥 ${s} jour${s > 1 ? 's' : ''} d’affilée` : 'Aucune série en cours'}</span>
            </span>
          </button>
          <button class="check" data-action="toggle" data-day="${dayKey(t)}" aria-pressed="${doneToday}" aria-label="Marquer ${esc(h.name)} comme fait aujourd'hui">${CHECK_SVG}</button>
          <div class="week">
            ${week.map((d) => `
              <button class="day ${d.getTime() === t.getTime() ? 'is-today' : ''}" data-action="toggle" data-day="${dayKey(d)}"
                aria-pressed="${isDone(h, d)}" aria-label="${esc(fmtDate.format(d))}">
                <small>${DAY_LETTERS[d.getDay()]}</small><i></i>
              </button>`).join('')}
          </div>
        </li>`;
      }).join('')}
    </ul>
    <p class="hint">Touchez une pastille pour corriger un jour passé, ou le nom pour modifier.</p>`;
}

/* ---------- Rendu : Statistiques ---------- */
function renderStats() {
  const habits = state.habits;
  const t = today();
  const WEEKS = 16;
  // Début : lundi de la semaine courante, moins (WEEKS-1) semaines
  const mondayOffset = (t.getDay() + 6) % 7;
  const start = addDays(t, -mondayOffset - (WEEKS - 1) * 7);

  const totalAll = habits.reduce((a, h) => a + total(h), 0);
  const bestAll = habits.reduce((a, h) => Math.max(a, bestStreak(h)), 0);
  const avgRate = habits.length ? Math.round(habits.reduce((a, h) => a + rate(h, 30), 0) / habits.length) : 0;

  const cards = habits.map((h) => {
    let cells = '';
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = addDays(start, i);
      const cls = d > t ? 'future' : isDone(h, d) ? 'on' : '';
      cells += `<i class="${cls}" title="${esc(fmtDate.format(d))}"></i>`;
    }
    return `
      <li class="stat-card" style="--c:${h.color}">
        <div class="stat-head">
          <span class="emoji">${h.emoji}</span>
          <span class="name">${esc(h.name)}</span>
          <div class="stat-nums">
            <div><b>${currentStreak(h)}</b><span>Série</span></div>
            <div><b>${bestStreak(h)}</b><span>Record</span></div>
            <div><b>${rate(h, 30)} %</b><span>30 j</span></div>
          </div>
        </div>
        <div class="heat" aria-hidden="true">${cells}</div>
        <div class="heat-legend"><span>${esc(fmtMonth.format(start))}</span><span>Aujourd'hui</span></div>
      </li>`;
  }).join('');

  app.innerHTML = `
    <header class="top"><div><p class="date">${habits.length} habitude${habits.length > 1 ? 's' : ''}</p><h1>Statistiques</h1></div></header>
    <section class="summary">
      <div class="tile"><b>${totalAll}</b><span>Jours cochés</span></div>
      <div class="tile"><b>${bestAll}</b><span>Meilleure série</span></div>
      <div class="tile"><b>${avgRate} %</b><span>Réussite 30 j</span></div>
    </section>
    ${habits.length ? `<ul class="list">${cards}</ul>` : '<p class="hint">Ajoutez une habitude pour voir vos statistiques.</p>'}

    <h3 class="group-title">Données</h3>
    <div class="group">
      <button class="row" data-action="export"><span>Exporter une sauvegarde</span><span class="accent">↗︎</span></button>
      <button class="row" data-action="import"><span>Importer une sauvegarde</span><span class="accent">↘︎</span></button>
      ${habits.length ? '<button class="row danger-row" data-action="reset"><span>Tout effacer</span></button>' : ''}
    </div>
    <p class="footnote">Vos données restent sur cet appareil. Fonctionne hors ligne.</p>`;
}

function render() {
  if (tab === 'today') renderToday(); else renderStats();
  document.querySelectorAll('.tab').forEach((b) => {
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
}

/* ---------- Feuille d'édition ---------- */
const sheet = $('#sheet');
const nameInput = $('#f-name');
let editingId = null;
let draft = null;

function paintSheet() {
  const form = $('#sheet-form');
  form.style.setProperty('--c', draft.color);
  $('#preview-emoji').textContent = draft.emoji;
  $('#f-emojis').innerHTML = EMOJIS.map((e) =>
    `<button type="button" data-emoji="${e}" aria-pressed="${e === draft.emoji}">${e}</button>`).join('');
  $('#f-colors').innerHTML = COLORS.map((c) =>
    `<button type="button" data-color="${c}" style="--sw:${c}" aria-pressed="${c === draft.color}" aria-label="Couleur ${c}"></button>`).join('');
}

function openSheet(habit, preset) {
  editingId = habit ? habit.id : null;
  const base = habit || preset || {};
  draft = {
    name: base.name || '',
    emoji: base.emoji || EMOJIS[state.habits.length % EMOJIS.length],
    color: base.color || COLORS[(state.habits.length * 3) % COLORS.length],
  };
  $('#sheet-title').textContent = habit ? "Modifier l'habitude" : 'Nouvelle habitude';
  $('#f-delete').hidden = !habit;
  nameInput.value = draft.name;
  paintSheet();
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  if (!habit) nameInput.focus({ preventScroll: true });
}

function closeSheet() {
  nameInput.blur();
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
}

$('#sheet-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); toast('Donnez un nom à votre habitude'); return; }
  if (editingId) {
    const h = state.habits.find((x) => x.id === editingId);
    Object.assign(h, { name, emoji: draft.emoji, color: draft.color });
  } else {
    state.habits.push({ id: uid(), name, emoji: draft.emoji, color: draft.color, createdAt: dayKey(today()), log: {} });
  }
  save();
  closeSheet();
  render();
});

sheet.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) return closeSheet();
  const em = e.target.closest('[data-emoji]');
  if (em) { draft.emoji = em.dataset.emoji; paintSheet(); return; }
  const co = e.target.closest('[data-color]');
  if (co) { draft.color = co.dataset.color; paintSheet(); return; }
  if (e.target.closest('#f-delete')) {
    const h = state.habits.find((x) => x.id === editingId);
    if (h && confirm(`Supprimer « ${h.name} » et tout son historique ?`)) {
      state.habits = state.habits.filter((x) => x.id !== editingId);
      save(); closeSheet(); render();
    }
  }
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet.classList.contains('open')) closeSheet(); });

/* ---------- Sauvegarde / restauration ---------- */
async function exportData() {
  const json = JSON.stringify(state, null, 2);
  const filename = `habitudes-${dayKey(today())}.json`;
  const file = new File([json], filename, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Sauvegarde Habitudes' });
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('#import-file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!data || !Array.isArray(data.habits)) throw new Error('format');
    const clean = data.habits
      .filter((h) => h && typeof h.name === 'string')
      .map((h) => ({
        id: String(h.id || uid()),
        name: h.name.slice(0, 40),
        emoji: typeof h.emoji === 'string' ? h.emoji.slice(0, 8) : '✅',
        color: /^#[0-9a-f]{6}$/i.test(h.color) ? h.color : COLORS[0],
        createdAt: /^\d{4}-\d{2}-\d{2}$/.test(h.createdAt) ? h.createdAt : dayKey(today()),
        log: Object.fromEntries(Object.keys(h.log || {}).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).map((k) => [k, true])),
      }));
    if (!confirm(`Remplacer vos données par cette sauvegarde (${clean.length} habitude${clean.length > 1 ? 's' : ''}) ?`)) return;
    state = { habits: clean };
    save(); render();
    toast('Sauvegarde importée ✅');
  } catch (err) {
    toast('Fichier de sauvegarde invalide');
  }
});

/* ---------- Interactions ---------- */
app.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const card = btn.closest('[data-id]');
  const habit = card && state.habits.find((h) => h.id === card.dataset.id);

  switch (btn.dataset.action) {
    case 'new': openSheet(null); break;
    case 'suggest': openSheet(null, SUGGESTIONS[+btn.dataset.i]); break;
    case 'edit': if (habit) openSheet(habit); break;
    case 'toggle': {
      if (!habit) break;
      const k = btn.dataset.day;
      const before = state.habits.every((h) => isDone(h, today()));
      if (habit.log[k]) delete habit.log[k]; else habit.log[k] = true;
      save();
      render();
      const after = state.habits.every((h) => isDone(h, today()));
      if (!before && after) toast('Bravo, tout est fait aujourd’hui ! 🎉');
      else if (habit.log[k] && k === dayKey(today())) {
        const s = currentStreak(habit);
        if (s > 1 && (s % 7 === 0 || s === 3)) toast(`🔥 ${s} jours d’affilée !`);
      }
      break;
    }
    case 'export': exportData(); break;
    case 'import': $('#import-file').click(); break;
    case 'reset':
      if (confirm('Effacer toutes les habitudes et leur historique ? Cette action est définitive.')) {
        state = { habits: [] }; save(); render();
      }
      break;
  }
});

document.querySelector('.tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b || b.dataset.tab === tab) return;
  tab = b.dataset.tab;
  render();
  window.scrollTo({ top: 0 });
});

// Rafraîchir à minuit / au retour dans l'app pour que « aujourd'hui » reste juste
let lastDay = dayKey(today());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && dayKey(today()) !== lastDay) { lastDay = dayKey(today()); render(); }
});
setInterval(() => { if (dayKey(today()) !== lastDay) { lastDay = dayKey(today()); render(); } }, 60000);

render();

/* ---------- Hors ligne ---------- */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
