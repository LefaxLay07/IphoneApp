'use strict';

/* =========================================================
   Mon Empire — jeu de gestion « idle » (argent fictif)
   Les entreprises rapportent en continu, même app fermée.
   ========================================================= */

const SAVE_KEY = 'empire.v1';
const GROWTH = 1.15;             // chaque unité coûte 15 % de plus que la précédente
const MAX_OFFLINE = 24 * 3600;   // gains hors ligne plafonnés à 24 h
const INVESTOR_BONUS = 0.02;     // +2 % de revenus par investisseur

const BIZ = [
  { name: 'Stand de limonade',    emoji: '🍋', cost: 10,     inc: 1 },
  { name: 'Food truck',           emoji: '🌮', cost: 150,    inc: 6 },
  { name: 'Boulangerie',          emoji: '🥐', cost: 2e3,    inc: 50 },
  { name: 'Salle de sport',       emoji: '🏋️', cost: 25e3,   inc: 400 },
  { name: 'Agence web',           emoji: '💻', cost: 3e5,    inc: 3e3 },
  { name: 'Appli mobile',         emoji: '📱', cost: 4e6,    inc: 2.5e4 },
  { name: "Chaîne d'hôtels",      emoji: '🏨', cost: 6e7,    inc: 2.2e5 },
  { name: 'Studio de jeux vidéo', emoji: '🎮', cost: 9e8,    inc: 2e6 },
  { name: 'Compagnie aérienne',   emoji: '✈️', cost: 1.5e10, inc: 1.8e7 },
  { name: 'Banque en ligne',      emoji: '🏦', cost: 2.5e11, inc: 1.6e8 },
  { name: 'Fusées spatiales',     emoji: '🚀', cost: 5e12,   inc: 1.5e9 },
  { name: 'Colonie sur Mars',     emoji: '🪐', cost: 1e14,   inc: 1.5e10 },
];

// Paliers : chaque palier atteint double les revenus de l'entreprise
const MILESTONES = [10, 25, 50, 100, 150, 200, 300, 400, 500, 750, 1000];

const UPGRADES = [
  { id: 't1', emoji: '☕', name: 'Café bien serré', desc: 'Travailler rapporte ×2', cost: 50, type: 'tap', x: 2 },
  { id: 't2', emoji: '🤝', name: 'Sens du contact', desc: 'Travailler rapporte +2 % des revenus/s', cost: 5e3, type: 'tapPct', x: 0.02 },
  { id: 't3', emoji: '🎤', name: 'Négociateur hors pair', desc: 'Travailler rapporte +5 % des revenus/s', cost: 5e6, type: 'tapPct', x: 0.05 },
  { id: 't4', emoji: '🧠', name: 'Génie des affaires', desc: 'Travailler rapporte +10 % des revenus/s', cost: 5e10, type: 'tapPct', x: 0.1 },
  { id: 'g1', emoji: '📣', name: 'Campagne de pub', desc: 'Toutes les entreprises ×2', cost: 1e5, type: 'global', x: 2 },
  { id: 'g2', emoji: '🧾', name: 'Expert-comptable', desc: 'Toutes les entreprises ×2', cost: 1e7, type: 'global', x: 2 },
  { id: 'g3', emoji: '🤖', name: 'Intelligence artificielle', desc: 'Toutes les entreprises ×2', cost: 1e10, type: 'global', x: 2 },
  { id: 'g4', emoji: '🌍', name: 'Expansion internationale', desc: 'Toutes les entreprises ×2', cost: 1e13, type: 'global', x: 2 },
  { id: 'g5', emoji: '🛰️', name: 'Réseau interplanétaire', desc: 'Toutes les entreprises ×3', cost: 1e16, type: 'global', x: 3 },
];
BIZ.forEach((b, i) => {
  UPGRADES.push({ id: 'm' + i, emoji: b.emoji, name: `Directeur — ${b.name}`, desc: `${b.name} rapporte ×3`, cost: b.cost * 25, type: 'biz', i, x: 3, need: 10 });
  UPGRADES.push({ id: 'f' + i, emoji: b.emoji, name: `Franchise — ${b.name}`, desc: `${b.name} rapporte ×3`, cost: b.cost * 2500, type: 'biz', i, x: 3, need: 50 });
});
const UP = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/* ---------- Format des nombres ---------- */
const SUFFIXES = ['', 'k', 'M', 'Md', 'Bn', 'Bd', 'Tn', 'Td', 'Qn', 'Qd'];
const SUFFIX_NAMES = ['', 'mille', 'million', 'milliard', 'billion', 'billiard', 'trillion', 'trilliard', 'quadrillion', 'quadrilliard'];
function fmt(x) {
  if (!isFinite(x)) return '∞';
  if (x < 1000) return x < 10 && x % 1 ? x.toFixed(1).replace('.', ',') : String(Math.floor(x));
  const e = Math.floor(Math.log10(x) / 3);
  if (e >= SUFFIXES.length) return x.toExponential(2).replace('.', ',');
  const v = x / 10 ** (3 * e);
  const s = v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : String(Math.floor(v));
  return s.replace('.', ',') + ' ' + SUFFIXES[e];
}
const euro = (x) => fmt(x) + ' €';
function duration(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m) return `${m} min ${String(s).padStart(2, '0')} s`;
  return `${s} s`;
}

/* ---------- État & sauvegarde ---------- */
function fresh() {
  return {
    money: 0, runEarned: 0, totalEarned: 0,
    owned: BIZ.map(() => 0), upgrades: [],
    investors: 0, prestiges: 0, taps: 0, playTime: 0, bestRate: 0,
    buyMode: 1, lastSeen: Date.now(),
  };
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && Array.isArray(s.owned)) {
      const base = fresh();
      const merged = Object.assign(base, s);
      merged.owned = BIZ.map((_, i) => Number(s.owned[i]) || 0);
      merged.upgrades = (s.upgrades || []).filter((id) => UP[id]);
      return merged;
    }
  } catch (e) { /* sauvegarde absente ou illisible */ }
  return fresh();
}
let S = load();
function save() {
  S.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* mode privé */ }
}

/* ---------- Calculs ---------- */
let bizRate = BIZ.map(() => 0);
let rate = 0;
let tapValue = 1;

const milestoneMult = (n) => MILESTONES.reduce((m, t) => (n >= t ? m * 2 : m), 1);
const nextMilestone = (n) => MILESTONES.find((t) => t > n);
const prevMilestone = (n) => [0, ...MILESTONES].filter((t) => t <= n).pop();

function recalc() {
  let g = 1 + INVESTOR_BONUS * S.investors;
  let tapMult = 1, tapPct = 0;
  const bm = BIZ.map(() => 1);
  for (const id of S.upgrades) {
    const u = UP[id];
    if (u.type === 'global') g *= u.x;
    else if (u.type === 'biz') bm[u.i] *= u.x;
    else if (u.type === 'tap') tapMult *= u.x;
    else if (u.type === 'tapPct') tapPct += u.x;
  }
  bizRate = BIZ.map((b, i) => b.inc * S.owned[i] * milestoneMult(S.owned[i]) * bm[i] * g);
  rate = bizRate.reduce((a, b) => a + b, 0);
  tapValue = tapMult * (1 + INVESTOR_BONUS * S.investors) + tapPct * rate;
  S.bestRate = Math.max(S.bestRate, rate);
}

const unitCost = (i) => BIZ[i].cost * GROWTH ** S.owned[i];
const costOf = (i, k) => unitCost(i) * (GROWTH ** k - 1) / (GROWTH - 1);
function maxAffordable(i) {
  const k = Math.floor(Math.log((S.money * (GROWTH - 1)) / unitCost(i) + 1) / Math.log(GROWTH));
  let n = Math.max(0, k);
  while (n > 0 && costOf(i, n) > S.money) n--;
  return n;
}
function plannedQty(i) {
  if (S.buyMode === 'max') return Math.max(1, maxAffordable(i));
  return S.buyMode;
}

function earn(x) { S.money += x; S.runEarned += x; S.totalEarned += x; }

const investorsAvailable = () => Math.floor(Math.sqrt(S.runEarned / 1e8));
const visibleCount = () => Math.min(BIZ.length, S.owned.reduce((last, n, i) => (n > 0 ? i + 1 : last), 0) + 1);

/* ---------- Outils d'interface ---------- */
const $ = (s) => document.querySelector(s);
const view = $('#view');
let tab = 'biz';

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

function floatText(text, x, y) {
  const el = document.createElement('span');
  el.className = 'float';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  $('#fx').appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function showModal({ emoji, title, html, button = 'OK' }) {
  $('#modal-emoji').textContent = emoji;
  $('#modal-title').textContent = title;
  $('#modal-text').innerHTML = html;
  $('#modal-ok').textContent = button;
  $('#modal').hidden = false;
}
$('#modal-ok').addEventListener('click', () => { $('#modal').hidden = true; });

const setText = (el, txt) => { if (el && el.textContent !== txt) el.textContent = txt; };

/* ---------- Vue : Entreprises ---------- */
function renderBiz() {
  const n = visibleCount();
  let html = `
    <div class="seg" role="group" aria-label="Quantité à acheter">
      ${[1, 10, 100, 'max'].map((m) => `<button data-mode="${m}" aria-pressed="${S.buyMode === m}">${m === 'max' ? 'Max' : '×' + m}</button>`).join('')}
    </div>
    <ul class="list">`;
  for (let i = 0; i < n; i++) {
    const b = BIZ[i];
    html += `
      <li class="biz" data-i="${i}">
        <div class="biz-icon">${b.emoji}<span class="count" data-f="count"></span></div>
        <div class="biz-body">
          <span class="biz-name">${b.name}</span>
          <span class="biz-inc" data-f="inc"></span>
          <div class="ms"><i data-f="ms"></i></div>
          <span class="ms-label" data-f="msl"></span>
        </div>
        <button class="buy" data-buy="${i}"><small data-f="qty"></small><b data-f="cost"></b></button>
      </li>`;
  }
  if (n < BIZ.length) {
    html += `
      <li class="biz locked">
        <div class="biz-icon">🔒</div>
        <div class="biz-body">
          <span class="biz-name">Entreprise secrète</span>
          <span class="ms-label">Possédez « ${BIZ[n - 1].name} » pour la découvrir</span>
        </div>
      </li>`;
  }
  view.innerHTML = html + '</ul>';
  updateBiz();
}

function updateBiz() {
  view.querySelectorAll('.biz[data-i]').forEach((card) => {
    const i = +card.dataset.i;
    const owned = S.owned[i];
    const q = plannedQty(i);
    const c = costOf(i, q);
    const f = (k) => card.querySelector(`[data-f="${k}"]`);
    setText(f('count'), String(owned));
    setText(f('inc'), owned ? `+${euro(bizRate[i])} / s` : `Rapporte ${euro(BIZ[i].inc)} / s par unité`);
    const next = nextMilestone(owned);
    const prev = prevMilestone(owned);
    const pct = next ? ((owned - prev) / (next - prev)) * 100 : 100;
    const bar = f('ms');
    const w = pct.toFixed(1) + '%';
    if (bar.style.width !== w) bar.style.width = w;
    setText(f('msl'), next ? `Bonus ×2 à ${next} unités` : 'Tous les bonus débloqués 🏆');
    setText(f('qty'), `Acheter ×${q}`);
    setText(f('cost'), euro(c));
    card.querySelector('.buy').classList.toggle('poor', c > S.money);
  });
}

function buy(i) {
  let q = plannedQty(i);
  const c = costOf(i, q);
  if (c > S.money) return;
  const before = S.owned[i];
  S.money -= c;
  S.owned[i] += q;
  recalc();
  const crossed = MILESTONES.filter((t) => before < t && S.owned[i] >= t).length;
  if (before === 0) toast(`${BIZ[i].emoji} Nouvelle entreprise\u00a0: ${BIZ[i].name}\u00a0!`);
  else if (crossed) toast(`${BIZ[i].emoji} Palier atteint\u00a0: revenus ×${2 ** crossed}\u00a0!`);
  if (before === 0 && tab === 'biz') renderBiz(); else updateLive();
}

/* ---------- Vue : Améliorations ---------- */
const upgradeAvailable = (u) =>
  !S.upgrades.includes(u.id) &&
  (u.type === 'biz' ? S.owned[u.i] >= u.need : S.runEarned >= u.cost / 10 || S.money >= u.cost / 10);

let upSignature = '';
function renderUp() {
  const avail = UPGRADES.filter(upgradeAvailable).sort((a, b) => a.cost - b.cost);
  upSignature = avail.map((u) => u.id).join();
  const owned = S.upgrades.map((id) => UP[id]);
  view.innerHTML = `
    <p class="section-title">Disponibles</p>
    ${avail.length ? `<ul class="list">${avail.map((u) => `
      <li class="biz up" data-up="${u.id}">
        <div class="biz-icon">${u.emoji}</div>
        <div class="biz-body"><span class="biz-name">${u.name}</span><span class="up-desc">${u.desc}</span></div>
        <button class="buy" data-buyup="${u.id}"><small>Acheter</small><b>${euro(u.cost)}</b></button>
      </li>`).join('')}</ul>`
      : `<div class="empty"><div class="big">🔍</div>Développez vos entreprises pour débloquer de nouvelles améliorations.<br><small>Un directeur se débloque à 10 unités, une franchise à 50.</small></div>`}
    ${owned.length ? `<p class="section-title">Déjà achetées (${owned.length})</p>
      <div class="owned-ups">${owned.map((u) => `<span title="${u.name}">${u.emoji}</span>`).join('')}</div>` : ''}`;
  updateUp();
}
function updateUp() {
  view.querySelectorAll('[data-buyup]').forEach((b) => b.classList.toggle('poor', UP[b.dataset.buyup].cost > S.money));
}
function buyUpgrade(id) {
  const u = UP[id];
  if (!u || S.upgrades.includes(id) || u.cost > S.money) return;
  S.money -= u.cost;
  S.upgrades.push(id);
  recalc();
  toast(`${u.emoji} ${u.name}\u00a0: activé\u00a0!`);
  renderUp();
}

/* ---------- Vue : Empire ---------- */
function renderEmpire() {
  view.innerHTML = `
    <section class="hero">
      <h2>👔 Investisseurs</h2>
      <p>Revendez votre empire pour attirer des investisseurs. Chacun augmente <b>tous</b> vos revenus de 2 %, pour toujours.</p>
      <div class="big-num" data-f="inv"></div>
      <p data-f="invbonus"></p>
      <button class="primary" data-action="prestige" data-f="prestige"></button>
    </section>

    <p class="section-title">Statistiques</p>
    <div class="group">
      <div class="row"><span>Revenus actuels</span><b data-f="rate"></b></div>
      <div class="row"><span>Meilleurs revenus</span><b data-f="best"></b></div>
      <div class="row"><span>Gagné cette partie</span><b data-f="run"></b></div>
      <div class="row"><span>Gagné au total</span><b data-f="total"></b></div>
      <div class="row"><span>Entreprises possédées</span><b data-f="units"></b></div>
      <div class="row"><span>Fois où vous avez travaillé</span><b data-f="taps"></b></div>
      <div class="row"><span>Temps de jeu</span><b data-f="time"></b></div>
      <div class="row"><span>Empires revendus</span><b data-f="prestiges"></b></div>
    </div>

    <p class="section-title">Zone de test ⏩</p>
    <div class="group">
      <button class="row accent" data-action="skip" data-sec="3600"><span>Avancer le temps de 1 heure</span><span>⏩</span></button>
      <button class="row accent" data-action="skip" data-sec="86400"><span>Avancer le temps de 24 heures</span><span>⏩⏩</span></button>
    </div>

    <p class="section-title">Lire les grands nombres</p>
    <div class="group"><div class="legend">
      ${SUFFIXES.slice(1).map((s, i) => `<span><b>${s}</b> ${SUFFIX_NAMES[i + 1]}</span>`).join('')}
    </div></div>

    <p class="section-title">Partie</p>
    <div class="group">
      <button class="row danger" data-action="reset"><span>Recommencer à zéro</span></button>
    </div>
    <p class="footnote">Argent 100 % fictif. Vos entreprises continuent de rapporter (jusqu'à 24 h) quand l'app est fermée.</p>`;
  updateEmpire();
}
function updateEmpire() {
  const f = (k) => view.querySelector(`[data-f="${k}"]`);
  const avail = investorsAvailable();
  setText(f('inv'), fmt(S.investors));
  setText(f('invbonus'), `Bonus actuel : +${fmt(S.investors * INVESTOR_BONUS * 100)} % de revenus`);
  const btn = f('prestige');
  btn.disabled = avail < 1;
  setText(btn, avail < 1
    ? `Gagnez ${euro(1e8)} dans cette partie pour revendre`
    : `Revendre l'empire : +${fmt(avail)} investisseur${avail > 1 ? 's' : ''}`);
  setText(f('rate'), euro(rate) + ' / s');
  setText(f('best'), euro(S.bestRate) + ' / s');
  setText(f('run'), euro(S.runEarned));
  setText(f('total'), euro(S.totalEarned));
  setText(f('units'), fmt(S.owned.reduce((a, b) => a + b, 0)));
  setText(f('taps'), fmt(S.taps));
  setText(f('time'), duration(S.playTime));
  setText(f('prestiges'), String(S.prestiges));
}

function prestige() {
  const gain = investorsAvailable();
  if (gain < 1) return;
  if (!confirm(`Revendre votre empire ?\n\nVous repartez de zéro (argent, entreprises, améliorations), mais vous gagnez ${fmt(gain)} investisseur(s) : +${fmt(gain * INVESTOR_BONUS * 100)} % de revenus pour toujours.`)) return;
  const keep = { totalEarned: S.totalEarned, taps: S.taps, playTime: S.playTime, bestRate: S.bestRate, buyMode: S.buyMode };
  S = Object.assign(fresh(), keep, { investors: S.investors + gain, prestiges: S.prestiges + 1 });
  recalc(); save();
  tab = 'biz'; render();
  toast(`👔 ${fmt(gain)} nouvel(s) investisseur(s) rejoignent l'aventure !`);
}

/* ---------- Hors ligne ---------- */
function offlineGains(seconds, label) {
  const sec = Math.min(seconds, MAX_OFFLINE);
  const gain = rate * sec;
  if (gain <= 0) return;
  earn(gain);
  S.playTime += sec;
  showModal({
    emoji: '💰',
    title: label || 'Bon retour, patron !',
    html: `Pendant ${duration(sec)}, vos entreprises ont rapporté<b>+${euro(gain)}</b>`,
    button: 'Encaisser',
  });
  updateLive();
}

/* ---------- Rendu général ---------- */
function render() {
  if (tab === 'biz') renderBiz();
  else if (tab === 'up') renderUp();
  else renderEmpire();
  document.querySelectorAll('.tab').forEach((t) => {
    if (t.dataset.tab === tab) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  updateLive();
}

function updateLive() {
  setText($('#money'), euro(S.money));
  setText($('#rate'), `${euro(rate)} / s`);
  setText($('#tapval'), '+' + euro(tapValue));
  const affordable = UPGRADES.filter((u) => upgradeAvailable(u) && u.cost <= S.money).length;
  const badge = $('#badge-up');
  badge.hidden = affordable === 0;
  setText(badge, String(affordable));
  if (tab === 'biz') {
    if (view.querySelectorAll('.biz[data-i]').length !== visibleCount()) renderBiz(); else updateBiz();
  } else if (tab === 'up') {
    const sig = UPGRADES.filter(upgradeAvailable).sort((a, b) => a.cost - b.cost).map((u) => u.id).join();
    if (sig !== upSignature) renderUp(); else updateUp();
  } else updateEmpire();
}

/* ---------- Interactions ---------- */
$('#work').addEventListener('click', (e) => {
  earn(tapValue);
  S.taps++;
  const r = e.currentTarget.getBoundingClientRect();
  const x = e.clientX || r.left + r.width / 2;
  const y = e.clientY || r.top + r.height / 2;
  floatText('+' + euro(tapValue), x + (Math.random() * 30 - 15), y - 20);
  updateLive();
});

view.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.mode) {
    S.buyMode = t.dataset.mode === 'max' ? 'max' : +t.dataset.mode;
    view.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', b === t));
    updateBiz();
  } else if (t.dataset.buy) buy(+t.dataset.buy);
  else if (t.dataset.buyup) buyUpgrade(t.dataset.buyup);
  else if (t.dataset.action === 'prestige') prestige();
  else if (t.dataset.action === 'skip') offlineGains(+t.dataset.sec, 'Voyage dans le temps ⏩');
  else if (t.dataset.action === 'reset') {
    if (confirm('Tout effacer et recommencer à zéro ? Les investisseurs et statistiques seront aussi perdus.')) {
      S = fresh(); recalc(); save(); tab = 'biz'; render();
    }
  }
});

document.querySelector('.tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b || b.dataset.tab === tab) return;
  tab = b.dataset.tab;
  render();
  window.scrollTo({ top: 0 });
});

/* ---------- Boucle de jeu ---------- */
let last = Date.now();
function tick() {
  const now = Date.now();
  const dt = (now - last) / 1000;
  last = now;
  if (dt > 15) {
    offlineGains(dt);     // l'app était en arrière-plan
  } else if (dt > 0) {
    earn(rate * dt);
    S.playTime += dt;
    updateLive();
  }
}

recalc();
render();
const away = (Date.now() - (S.lastSeen || Date.now())) / 1000;
if (away > 15) offlineGains(away);

setInterval(tick, 100);
setInterval(save, 3000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save(); else tick();
});
window.addEventListener('pagehide', save);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
