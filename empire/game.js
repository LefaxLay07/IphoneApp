'use strict';

/* =========================================================
   Mon Empire — jeu de gestion « idle » (argent 100 % fictif)
   Entreprises, niveaux, missions, trophées, événements,
   cadeau du jour, roue de la fortune et boutique à diamants.
   ========================================================= */

const SAVE_KEY = 'empire.v2';
const GROWTH = 1.15;              // chaque unité coûte 15 % de plus que la précédente
const MAX_OFFLINE = 24 * 3600;    // gains hors ligne plafonnés à 24 h
const LEVEL_BONUS = 0.02;         // +2 % de revenus par niveau
const ACH_BONUS = 0.01;           // +1 % de revenus par trophée
const INVESTOR_BONUS = 0.02;      // +2 % de revenus par investisseur
const SPIN_COST = 5;              // prix d'un tour de roue supplémentaire (💎)

/* ---------- Entreprises ---------- */
const BIZ = [
  { name: 'Stand de limonade',    emoji: '🍋', cost: 10,     inc: 1,      lvl: 1 },
  { name: 'Food truck',           emoji: '🌮', cost: 120,    inc: 5,      lvl: 1 },
  { name: 'Boulangerie',          emoji: '🥐', cost: 1.5e3,  inc: 35,     lvl: 2 },
  { name: 'Pizzeria',             emoji: '🍕', cost: 1.8e4,  inc: 220,    lvl: 3 },
  { name: 'Salle de sport',       emoji: '🏋️', cost: 2.2e5,  inc: 1.4e3,  lvl: 4 },
  { name: 'Agence web',           emoji: '💻', cost: 2.8e6,  inc: 9e3,    lvl: 6 },
  { name: 'Supermarché',          emoji: '🛒', cost: 3.5e7,  inc: 6e4,    lvl: 8 },
  { name: 'Appli mobile',         emoji: '📱', cost: 4.5e8,  inc: 4e5,    lvl: 10 },
  { name: 'Cinéma',               emoji: '🎬', cost: 6e9,    inc: 2.6e6,  lvl: 12 },
  { name: "Chaîne d'hôtels",      emoji: '🏨', cost: 8e10,   inc: 1.7e7,  lvl: 14 },
  { name: 'Studio de jeux vidéo', emoji: '🎮', cost: 1.1e12, inc: 1.1e8,  lvl: 17 },
  { name: 'Club de foot',         emoji: '⚽', cost: 1.5e13, inc: 7e8,    lvl: 20 },
  { name: 'Compagnie aérienne',   emoji: '✈️', cost: 2e14,   inc: 4.5e9,  lvl: 23 },
  { name: 'Chaîne de télé',       emoji: '📺', cost: 2.8e15, inc: 3e10,   lvl: 26 },
  { name: 'Banque en ligne',      emoji: '🏦', cost: 4e16,   inc: 2e11,   lvl: 30 },
  { name: "Parc d'attractions",   emoji: '🎢', cost: 5.5e17, inc: 1.3e12, lvl: 34 },
  { name: 'Voitures électriques', emoji: '🚗', cost: 8e18,   inc: 8.5e12, lvl: 38 },
  { name: 'Fusées spatiales',     emoji: '🚀', cost: 1.2e20, inc: 5.5e13, lvl: 43 },
  { name: 'Colonie sur Mars',     emoji: '🪐', cost: 1.8e21, inc: 3.6e14, lvl: 48 },
  { name: 'Empire galactique',    emoji: '🌌', cost: 2.7e22, inc: 2.4e15, lvl: 55 },
];

// Paliers : chaque palier atteint double les revenus de l'entreprise
const MILESTONES = [10, 25, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1250, 1500, 2000];

/* ---------- Niveaux du joueur ---------- */
const TITLES = [
  [1, 'Vendeur de rue'], [3, 'Petit commerçant'], [5, 'Entrepreneur'], [8, 'Patron de PME'],
  [11, "Chef d'entreprise"], [14, 'Directeur régional'], [17, 'PDG'], [20, 'Investisseur avisé'],
  [24, 'Magnat'], [28, 'Millionnaire en série'], [32, 'Tycoon'], [36, "Baron de l'industrie"],
  [40, 'Milliardaire'], [45, 'Titan de la finance'], [50, 'Légende des affaires'], [60, 'Maître du monde'],
  [70, 'Empereur galactique'], [85, 'Divinité du business'], [100, 'Au-delà de l’infini'],
];
const titleFor = (lvl) => TITLES.filter(([l]) => lvl >= l).pop()[1];
const xpNeed = (lvl) => Math.floor(8 * lvl ** 1.5) + 10;

/* ---------- Améliorations ---------- */
const UPGRADES = [
  { id: 't1', emoji: '☕', name: 'Café bien serré', desc: 'Travailler rapporte ×2', cost: 50, type: 'tap', x: 2 },
  { id: 't2', emoji: '🥐', name: 'Petit-déj de champion', desc: 'Travailler rapporte ×3', cost: 2e3, type: 'tap', x: 3 },
  { id: 't3', emoji: '🤝', name: 'Sens du contact', desc: 'Travailler rapporte +2 % des revenus/s', cost: 5e4, type: 'tapPct', x: 0.02 },
  { id: 't4', emoji: '🎤', name: 'Négociateur hors pair', desc: 'Travailler rapporte +5 % des revenus/s', cost: 5e7, type: 'tapPct', x: 0.05 },
  { id: 't5', emoji: '🧠', name: 'Génie des affaires', desc: 'Travailler rapporte +10 % des revenus/s', cost: 5e11, type: 'tapPct', x: 0.1 },
  { id: 't6', emoji: '👑', name: 'Touche de Midas', desc: 'Travailler rapporte +25 % des revenus/s', cost: 5e16, type: 'tapPct', x: 0.25 },
  { id: 'g1', emoji: '📣', name: 'Campagne de pub', desc: 'Toutes les entreprises ×2', cost: 1e5, type: 'global', x: 2 },
  { id: 'g2', emoji: '🧾', name: 'Expert-comptable', desc: 'Toutes les entreprises ×2', cost: 1e7, type: 'global', x: 2 },
  { id: 'g3', emoji: '📊', name: 'Big data', desc: 'Toutes les entreprises ×2', cost: 1e9, type: 'global', x: 2 },
  { id: 'g4', emoji: '🤖', name: 'Intelligence artificielle', desc: 'Toutes les entreprises ×2', cost: 1e11, type: 'global', x: 2 },
  { id: 'g5', emoji: '🌍', name: 'Expansion internationale', desc: 'Toutes les entreprises ×2', cost: 1e13, type: 'global', x: 2 },
  { id: 'g6', emoji: '🏛️', name: 'Entrée en Bourse', desc: 'Toutes les entreprises ×2', cost: 1e15, type: 'global', x: 2 },
  { id: 'g7', emoji: '📡', name: 'Réseau de satellites', desc: 'Toutes les entreprises ×3', cost: 1e17, type: 'global', x: 3 },
  { id: 'g8', emoji: '🧬', name: 'Biotechnologies', desc: 'Toutes les entreprises ×3', cost: 1e19, type: 'global', x: 3 },
  { id: 'g9', emoji: '⚛️', name: 'Fusion nucléaire', desc: 'Toutes les entreprises ×3', cost: 1e21, type: 'global', x: 3 },
  { id: 'g10', emoji: '🌠', name: 'Réseau interstellaire', desc: 'Toutes les entreprises ×5', cost: 1e23, type: 'global', x: 5 },
];
const TIERS = [
  { key: 'm', title: 'Directeur', need: 10, costX: 25, x: 3 },
  { key: 'f', title: 'Franchise', need: 50, costX: 2500, x: 3 },
  { key: 'e', title: 'Multinationale', need: 150, costX: 1e9, x: 5 },
  { key: 'l', title: 'Légende', need: 400, costX: 1e24, x: 10 },
];
BIZ.forEach((b, i) => TIERS.forEach((t) => UPGRADES.push({
  id: t.key + i, emoji: b.emoji, name: `${t.title} — ${b.name}`,
  desc: `${b.name} rapporte ×${t.x} (dès ${t.need} unités)`,
  cost: b.cost * t.costX, type: 'biz', i, x: t.x, need: t.need,
})));
const UP = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/* ---------- Format des nombres ---------- */
const SUFFIXES = ['', 'k', 'M', 'Md', 'Bn', 'Bd', 'Tn', 'Td', 'Qn', 'Qd', 'Qi', 'Qid', 'Sx', 'Sxd'];
const SUFFIX_NAMES = ['', 'mille', 'million', 'milliard', 'billion', 'billiard', 'trillion', 'trilliard',
  'quadrillion', 'quadrilliard', 'quintillion', 'quintilliard', 'sextillion', 'sextilliard'];
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
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m) return `${m} min ${String(s).padStart(2, '0')} s`;
  return `${s} s`;
}
const clock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/* ---------- Hasard & dates ---------- */
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickWeighted = (arr) => {
  let r = Math.random() * arr.reduce((s, x) => s + x.w, 0);
  for (const x of arr) { r -= x.w; if (r < 0) return x; }
  return arr[arr.length - 1];
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
const secondsToMidnight = () => { const d = new Date(); const m = new Date(d); m.setHours(24, 0, 0, 0); return (m - d) / 1000; };
function niceRound(x) {
  if (x < 10) return Math.ceil(x);
  const p = 10 ** Math.floor(Math.log10(x));
  const m = x / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/* ---------- État & sauvegarde ---------- */
function fresh() {
  return {
    money: 0, runEarned: 0, totalEarned: 0,
    owned: BIZ.map(() => 0), upgrades: [],
    investors: 0, prestiges: 0, eternal: 0,
    level: 1, xp: 0, gems: 0, ach: [],
    missions: [], missionsDone: 0,
    taps: 0, upgradesBought: 0, unitsBought: 0, eventsCaught: 0, spins: 0,
    playTime: 0, bestRate: 0, buyMode: 1, boosts: [],
    daily: { last: null, streak: 0, best: 0 }, freeSpin: null, wheelRot: 0,
    lastSeen: Date.now(),
  };
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && Array.isArray(s.owned)) {
      const m = Object.assign(fresh(), s);
      m.owned = BIZ.map((_, i) => Number(s.owned[i]) || 0);
      m.upgrades = (s.upgrades || []).filter((id) => UP[id]);
      m.daily = Object.assign(fresh().daily, s.daily);
      return m;
    }
  } catch (e) { /* sauvegarde absente ou illisible */ }
  return fresh();
}
let S = load();
function save() {
  S.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* mode privé */ }
}

/* ---------- Revenus ---------- */
let bizRate = BIZ.map(() => 0);
let baseRate = 0;
let tapMult = 1, tapPct = 0;

const milestoneMult = (n) => MILESTONES.reduce((m, t) => (n >= t ? m * 2 : m), 1);
const nextMilestone = (n) => MILESTONES.find((t) => t > n);
const prevMilestone = (n) => [0, ...MILESTONES].filter((t) => t <= n).pop();
const levelMult = () => 1 + LEVEL_BONUS * (S.level - 1);
const achMult = () => 1 + ACH_BONUS * S.ach.length;
const investorMult = () => 1 + INVESTOR_BONUS * S.investors;
const eternalMult = () => 1.5 ** S.eternal;
const permMult = () => levelMult() * achMult() * investorMult() * eternalMult();

function boostMult(kind) {
  const now = Date.now();
  return S.boosts.reduce((m, b) => (b.kind === kind && b.until > now ? m * b.x : m), 1);
}
const effRate = () => baseRate * boostMult('rate');
const tapValue = () => (tapMult * levelMult() + tapPct * effRate()) * boostMult('tap');

function recalc() {
  let g = permMult();
  tapMult = 1; tapPct = 0;
  const bm = BIZ.map(() => 1);
  for (const id of S.upgrades) {
    const u = UP[id];
    if (u.type === 'global') g *= u.x;
    else if (u.type === 'biz') bm[u.i] *= u.x;
    else if (u.type === 'tap') tapMult *= u.x;
    else if (u.type === 'tapPct') tapPct += u.x;
  }
  bizRate = BIZ.map((b, i) => b.inc * S.owned[i] * milestoneMult(S.owned[i]) * bm[i] * g);
  baseRate = bizRate.reduce((a, b) => a + b, 0);
  S.bestRate = Math.max(S.bestRate, effRate());
}

function addBoost(kind, x, seconds) {
  const now = Date.now();
  S.boosts = S.boosts.filter((b) => b.until > now);
  const same = S.boosts.find((b) => b.kind === kind && b.x === x);
  if (same) same.until += seconds * 1000;
  else S.boosts.push({ kind, x, until: now + seconds * 1000 });
}

const unitCost = (i) => BIZ[i].cost * GROWTH ** S.owned[i];
const costOf = (i, k) => unitCost(i) * (GROWTH ** k - 1) / (GROWTH - 1);
function maxAffordable(i) {
  const k = Math.floor(Math.log((S.money * (GROWTH - 1)) / unitCost(i) + 1) / Math.log(GROWTH));
  let n = Math.max(0, k);
  while (n > 0 && costOf(i, n) > S.money) n--;
  return n;
}
const plannedQty = (i) => (S.buyMode === 'max' ? Math.max(1, maxAffordable(i)) : S.buyMode);
const totalUnits = () => S.owned.reduce((a, b) => a + b, 0);
const visibleCount = () => Math.min(BIZ.length, S.owned.reduce((last, n, i) => (n > 0 ? i + 1 : last), 0) + 1);
const investorsAvailable = () => Math.floor(Math.sqrt(S.runEarned / 1e8));

function earn(x) { S.money += x; S.runEarned += x; S.totalEarned += x; }
function addGems(n) { S.gems += n; }

/* ---------- XP & niveaux ---------- */
function addXp(x) {
  S.xp += Math.round(x);
  const start = S.level;
  while (S.xp >= xpNeed(S.level)) { S.xp -= xpNeed(S.level); S.level++; }
  if (S.level === start) return;
  let gems = 0;
  for (let l = start + 1; l <= S.level; l++) gems += l % 10 === 0 ? 15 : l % 5 === 0 ? 6 : 2;
  addGems(gems);
  recalc();
  const cash = Math.max(100, baseRate * 120);
  earn(cash);
  const unlocked = BIZ.filter((b) => b.lvl > start && b.lvl <= S.level);
  const newTitle = titleFor(S.level) !== titleFor(start);
  // Affiché juste après la fenêtre de l'action en cours (roue, cadeau…)
  setTimeout(() => showModal({
    emoji: newTitle ? '🎖️' : '⭐',
    title: `Niveau ${S.level} !`,
    html: `${newTitle ? `Nouveau titre : <strong>${titleFor(S.level)}</strong><br>` : ''}
      Récompenses : 💎 ${gems} et ${euro(cash)}<br>Revenus : +${fmt(LEVEL_BONUS * 100 * (S.level - start))} % pour toujours
      ${unlocked.length ? `<br><br>Débloqué : ${unlocked.map((b) => `${b.emoji} ${b.name}`).join(', ')}` : ''}`,
    button: 'Super !',
  }), 0);
}
const missionXp = () => 15 + 6 * S.level;

/* ---------- Missions ---------- */
const OWN_STEPS = [1, 5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500, 2000, 2500, 3000];

function genMission() {
  const avail = BIZ.map((_, i) => i).filter((i) => i < visibleCount() && S.level >= BIZ[i].lvl);
  const types = ['earn', 'earn', 'taps', 'units', 'upgrades', 'events'];
  if (avail.length) types.push('own', 'own', 'own');
  for (let attempt = 0; attempt < 12; attempt++) {
    const m = { id: uid(), type: pick(types), xp: missionXp(), gems: randInt(1, 3) };
    if (m.type === 'own') {
      m.i = pick(avail);
      m.target = OWN_STEPS.find((s) => s > S.owned[m.i]) || S.owned[m.i] + 500;
    } else if (m.type === 'earn') {
      m.target = niceRound(Math.max(100, effRate() * randInt(90, 300)));
      m.base = S.runEarned;
    } else if (m.type === 'taps') {
      m.target = pick([20, 30, 50, 75, 100]); m.base = S.taps; m.gems = 1;
    } else if (m.type === 'units') {
      m.target = totalUnits() + pick([5, 10, 15, 25, 40]);
    } else if (m.type === 'upgrades') {
      if (!UPGRADES.some(upgradeAvailable)) continue;
      m.target = 1; m.base = S.upgradesBought;
    } else if (m.type === 'events') {
      m.target = pick([1, 1, 2]); m.base = S.eventsCaught; m.gems = randInt(2, 4);
    }
    if (S.missions.some((o) => o.type === m.type && o.i === m.i)) continue;
    return m;
  }
  return { id: uid(), type: 'taps', target: 25, base: S.taps, xp: missionXp(), gems: 1 };
}
function missionValue(m) {
  switch (m.type) {
    case 'own': return S.owned[m.i];
    case 'earn': return S.runEarned - m.base;
    case 'taps': return S.taps - m.base;
    case 'units': return totalUnits();
    case 'upgrades': return S.upgradesBought - m.base;
    case 'events': return S.eventsCaught - m.base;
  }
  return 0;
}
function missionInfo(m) {
  switch (m.type) {
    case 'own': return { emoji: BIZ[m.i].emoji, text: `Possède ${m.target} × ${BIZ[m.i].name}` };
    case 'earn': return { emoji: '💰', text: `Gagne ${euro(m.target)}` };
    case 'taps': return { emoji: '💼', text: `Travaille ${m.target} fois` };
    case 'units': return { emoji: '🏢', text: `Possède ${m.target} entreprises au total` };
    case 'upgrades': return { emoji: '⚡', text: `Achète ${m.target} amélioration${m.target > 1 ? 's' : ''}` };
    case 'events': return { emoji: '🎈', text: `Attrape ${m.target} surprise${m.target > 1 ? 's' : ''} qui traverse${m.target > 1 ? 'nt' : ''} l'écran` };
  }
  return { emoji: '🎯', text: 'Mission' };
}
const missionDone = (m) => missionValue(m) >= m.target;
function ensureMissions() { while (S.missions.length < 3) S.missions.push(genMission()); }

function claimMission(id) {
  const m = S.missions.find((x) => x.id === id);
  if (!m || !missionDone(m)) return;
  S.missions = S.missions.filter((x) => x.id !== id);
  S.missionsDone++;
  const cash = Math.max(50, baseRate * 60);
  earn(cash);
  addGems(m.gems);
  toast(`🎯 Mission réussie : +${m.xp} XP, +${m.gems} 💎, +${euro(cash)}`);
  addXp(m.xp);
  ensureMissions();
  render();
}

/* ---------- Trophées ---------- */
const ACH = [];
BIZ.forEach((b, i) => [1, 10, 25, 50, 100, 200, 300, 500, 1000].forEach((t) => ACH.push({
  id: `b${i}_${t}`, emoji: b.emoji, name: t === 1 ? `Premier ${b.name.toLowerCase()}` : `${t} × ${b.name}`,
  desc: `Posséder ${t} × ${b.name}`, val: () => S.owned[i], t,
})));
const achSeries = (prefix, emoji, list, val, name) =>
  list.forEach((t, k) => ACH.push({ id: `${prefix}${k}`, emoji, name: name(t), desc: name(t), val, t }));
achSeries('e', '💰', [1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24, 1e27, 1e30, 1e33], () => S.totalEarned, (t) => `Gagner ${euro(t)} au total`);
achSeries('r', '📈', [10, 1e3, 1e5, 1e7, 1e9, 1e11, 1e13, 1e15, 1e17, 1e19, 1e21, 1e23], () => S.bestRate, (t) => `Atteindre ${euro(t)} / s`);
achSeries('tp', '💼', [100, 500, 1000, 2500, 5000, 10000, 25000], () => S.taps, (t) => `Travailler ${fmt(t)} fois`);
achSeries('u', '⚡', [1, 5, 10, 25, 50, 75, 100], () => S.upgradesBought, (t) => `Acheter ${t} amélioration${t > 1 ? 's' : ''}`);
achSeries('mi', '🎯', [1, 5, 10, 25, 50, 100, 250, 500], () => S.missionsDone, (t) => `Réussir ${t} mission${t > 1 ? 's' : ''}`);
achSeries('ev', '🎈', [1, 10, 25, 50, 100, 250], () => S.eventsCaught, (t) => `Attraper ${t} surprise${t > 1 ? 's' : ''}`);
achSeries('lv', '⭐', [5, 10, 15, 20, 30, 40, 50, 75, 100], () => S.level, (t) => `Atteindre le niveau ${t}`);
achSeries('pr', '👔', [1, 2, 5, 10, 25], () => S.prestiges, (t) => `Revendre ${t} empire${t > 1 ? 's' : ''}`);
achSeries('in', '🤝', [10, 100, 1000, 10000], () => S.investors, (t) => `Avoir ${fmt(t)} investisseurs`);
achSeries('sp', '🎡', [1, 10, 25, 100], () => S.spins, (t) => `Tourner la roue ${t} fois`);
achSeries('dy', '📅', [3, 7, 14, 30], () => S.daily.best, (t) => `Série de ${t} cadeaux du jour`);
achSeries('un', '🏙️', [100, 500, 1000, 2500, 5000, 10000], () => totalUnits(), (t) => `Posséder ${fmt(t)} entreprises`);

let achSet = new Set(S.ach);
function checkAchievements() {
  const got = [];
  for (const a of ACH) if (!achSet.has(a.id) && a.val() >= a.t) { achSet.add(a.id); S.ach.push(a.id); got.push(a); }
  if (!got.length) return;
  addGems(got.length);
  recalc();
  toast(got.length === 1 ? `🏆 Trophée : ${got[0].name} (+1 💎)` : `🏆 ${got.length} nouveaux trophées ! (+${got.length} 💎)`);
  addXp(10 * got.length);
}

/* ---------- Événements surprises ---------- */
const EVENTS = [
  { id: 'vip', emoji: '🤵', w: 30, run: () => { const g = Math.max(50, effRate() * randInt(60, 180)); earn(g); return `🤵 Client VIP : +${euro(g)}`; } },
  { id: 'buzz', emoji: '📈', w: 18, run: () => { addBoost('rate', 3, 60); return '📈 Buzz viral : revenus ×3 pendant 1 min'; } },
  { id: 'rush', emoji: '⚡', w: 15, run: () => { addBoost('tap', 10, 30); return '⚡ Coup de rush : travailler ×10 pendant 30 s'; } },
  { id: 'gem', emoji: '💎', w: 15, run: () => { const n = randInt(1, 3); addGems(n); return `💎 Diamant trouvé : +${n} 💎`; } },
  { id: 'box', emoji: '🎁', w: 22, run: () => { const x = missionXp(); addXp(x); return `🎁 Colis mystère : +${x} XP`; } },
];
let nextEventAt = Date.now() + 20000;
let eventTimer;

/* ---------- Cadeau du jour ---------- */
const DAILY_GEMS = [2, 3, 4, 5, 6, 8, 15];
const DAILY_MIN = [5, 10, 15, 20, 30, 45, 60];
function dailyInfo() {
  const claimable = S.daily.last !== dayKey();
  const streak = claimable ? (S.daily.last === yesterdayKey() ? S.daily.streak + 1 : 1) : S.daily.streak;
  return { claimable, streak, day: ((streak - 1) % 7) + 1 };
}
function claimDaily() {
  const { claimable, streak, day } = dailyInfo();
  if (!claimable) return;
  S.daily = { last: dayKey(), streak, best: Math.max(S.daily.best, streak) };
  const gems = DAILY_GEMS[day - 1];
  const cash = Math.max(100 * day, baseRate * 60 * DAILY_MIN[day - 1]);
  addGems(gems);
  earn(cash);
  showModal({ emoji: '🎁', title: `Cadeau du jour ${day}/7`, html: `Série : ${streak} jour${streak > 1 ? 's' : ''}<b>+${euro(cash)}</b>💎 +${gems}`, button: 'Merci !' });
  render();
}

/* ---------- Roue de la fortune ---------- */
const WHEEL_COLORS = ['#F2B705', '#22C06B', '#7B4DFF', '#45AAF2', '#FC5C9C', '#FF9F43', '#0FB9B1', '#E5484D'];
const WHEEL = [
  { emoji: '💰', w: 22, run: () => { const g = Math.max(200, baseRate * 300); earn(g); return `5 minutes de revenus<b>+${euro(g)}</b>`; } },
  { emoji: '💎', w: 18, run: () => { addGems(3); return 'Quelques diamants<b>+3 💎</b>'; } },
  { emoji: '📈', w: 14, run: () => { addBoost('rate', 2, 600); return 'Boost de revenus<b>×2 pendant 10 min</b>'; } },
  { emoji: '🤑', w: 11, run: () => { const g = Math.max(1000, baseRate * 1800); earn(g); return `30 minutes de revenus<b>+${euro(g)}</b>`; } },
  { emoji: '⭐', w: 14, run: () => { const x = missionXp() * 2; addXp(x); return `Expérience bonus<b>+${x} XP</b>`; } },
  { emoji: '💠', w: 9, run: () => { addGems(8); return 'Pluie de diamants<b>+8 💎</b>'; } },
  { emoji: '⚡', w: 9, run: () => { addBoost('tap', 10, 60); return 'Doigts en or<b>Travailler ×10 pendant 1 min</b>'; } },
  { emoji: '🎰', w: 3, run: () => { const g = Math.max(1e4, baseRate * 7200); earn(g); addGems(25); return `JACKPOT !<b>+25 💎 et +${euro(g)}</b>`; } },
];
const freeSpin = () => S.freeSpin !== dayKey();
let spinning = false;
function spin() {
  if (spinning) return;
  if (freeSpin()) S.freeSpin = dayKey();
  else if (S.gems >= SPIN_COST) S.gems -= SPIN_COST;
  else { toast(`Il faut ${SPIN_COST} 💎 pour tourner à nouveau`); return; }
  spinning = true;
  const idx = WHEEL.indexOf(pickWeighted(WHEEL));
  const center = idx * 45 + 22.5 + rand(-15, 15);
  const cur = S.wheelRot;
  S.wheelRot = cur - (cur % 360) + 360 * 6 + ((360 - center) % 360);
  const wheel = document.getElementById('wheel');
  if (wheel) {
    wheel.style.transition = 'transform 4.2s cubic-bezier(.12, .7, .1, 1)';
    wheel.style.transform = `rotate(${S.wheelRot}deg)`;
  }
  updateLive();
  setTimeout(() => {
    spinning = false;
    S.spins++;
    const html = WHEEL[idx].run();
    showModal({ emoji: WHEEL[idx].emoji, title: 'Roue de la fortune', html, button: 'Génial !' });
    if (tab === 'shop') renderShop();
    updateLive();
  }, 4300);
}

/* ---------- Boutique ---------- */
const SHOP = [
  { id: 'x2', emoji: '📈', name: 'Boost ×2', desc: 'Revenus ×2 pendant 15 min', cost: 5, run: () => addBoost('rate', 2, 900) },
  { id: 'x5', emoji: '🚀', name: 'Fusée ×5', desc: 'Revenus ×5 pendant 5 min', cost: 12, run: () => addBoost('rate', 5, 300) },
  { id: 'tap', emoji: '👆', name: 'Doigts de fée', desc: 'Travailler ×25 pendant 2 min', cost: 3, run: () => addBoost('tap', 25, 120) },
  { id: 'h1', emoji: '⏩', name: 'Bond de 1 heure', desc: 'Encaissez tout de suite 1 h de revenus', cost: 8, run: () => timeGains(3600, 'Bond dans le temps ⏩') },
  { id: 'h8', emoji: '⏭️', name: 'Bond de 8 heures', desc: 'Encaissez tout de suite 8 h de revenus', cost: 45, run: () => timeGains(8 * 3600, 'Bond dans le temps ⏭️') },
  { id: 'lvl', emoji: '🎓', name: 'Formation express', desc: 'Passez immédiatement au niveau suivant', cost: 30, run: () => addXp(xpNeed(S.level) - S.xp) },
];
const eternalCost = () => 25 * 2 ** S.eternal;
function buyShop(id) {
  if (id === 'eternal') {
    const c = eternalCost();
    if (S.gems < c) return toast(`Il faut ${c} 💎`);
    S.gems -= c; S.eternal++; recalc();
    toast(`♾️ Investissement éternel niveau ${S.eternal} : revenus ×${fmt(eternalMult())} !`);
  } else {
    const item = SHOP.find((x) => x.id === id);
    if (!item) return;
    if (S.gems < item.cost) return toast(`Il faut ${item.cost} 💎`);
    S.gems -= item.cost;
    item.run();
    toast(`${item.emoji} ${item.name} activé !`);
  }
  renderShop();
  updateLive();
}

/* ---------- Gains hors ligne / bonds dans le temps ---------- */
function timeGains(seconds, title) {
  const sec = Math.min(seconds, MAX_OFFLINE);
  const gain = baseRate * sec;
  if (gain <= 0) { if (title) toast('Achetez d’abord une entreprise !'); return; }
  earn(gain);
  S.playTime += sec;
  showModal({
    emoji: '💰',
    title: title || 'Bon retour, patron !',
    html: `Pendant ${duration(sec)}, vos entreprises ont rapporté<b>+${euro(gain)}</b>`,
    button: 'Encaisser',
  });
  updateLive();
}

/* ---------- Outils d'interface ---------- */
const $ = (s) => document.querySelector(s);
const view = $('#view');
let tab = 'biz';
const setText = (el, txt) => { if (el && el.textContent !== txt) el.textContent = txt; };
const setWidth = (el, pct) => { const w = Math.max(0, Math.min(100, pct)).toFixed(1) + '%'; if (el && el.style.width !== w) el.style.width = w; };

// Notifications en file d'attente : elles s'affichent l'une après l'autre
const toastQueue = [];
let toastBusy = false;
function toast(msg) {
  toastQueue.push(msg);
  while (toastQueue.length > 4) toastQueue.shift();
  if (!toastBusy) nextToast();
}
function nextToast() {
  const t = $('#toast');
  const msg = toastQueue.shift();
  if (!msg) { toastBusy = false; t.classList.remove('show'); return; }
  toastBusy = true;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(nextToast, toastQueue.length ? 1600 : 2400);
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

const modalQueue = [];
function showModal(m) {
  modalQueue.push(m);
  if ($('#modal').hidden) nextModal();
}
function nextModal() {
  const m = modalQueue.shift();
  if (!m) { $('#modal').hidden = true; return; }
  $('#modal-emoji').textContent = m.emoji;
  $('#modal-title').textContent = m.title;
  $('#modal-text').innerHTML = m.html;
  $('#modal-ok').textContent = m.button || 'OK';
  $('#modal').hidden = false;
}
$('#modal-ok').addEventListener('click', nextModal);

/* ---------- Vue : Entreprises ---------- */
let bizSignature = '';
const bizSig = () => visibleCount() + '|' + BIZ.map((b) => (S.level >= b.lvl ? 1 : 0)).join('');

function renderBiz() {
  const n = visibleCount();
  bizSignature = bizSig();
  let html = `
    <div class="seg" role="group" aria-label="Quantité à acheter">
      ${[1, 10, 100, 'max'].map((m) => `<button data-mode="${m}" aria-pressed="${S.buyMode === m}">${m === 'max' ? 'Max' : '×' + m}</button>`).join('')}
    </div>
    <ul class="list">`;
  for (let i = 0; i < n; i++) {
    const b = BIZ[i];
    const locked = S.level < b.lvl;
    html += `
      <li class="biz" data-i="${i}">
        <div class="biz-icon">${b.emoji}<span class="count" data-f="count"></span></div>
        <div class="biz-body">
          <span class="biz-name">${b.name}</span>
          <span class="biz-inc" data-f="inc"></span>
          <div class="ms"><i data-f="ms"></i></div>
          <span class="ms-label" data-f="msl"></span>
        </div>
        ${locked
          ? `<div class="lockbtn">🔒<small>Niveau ${b.lvl}</small></div>`
          : `<button class="buy" data-buy="${i}"><small data-f="qty"></small><b data-f="cost"></b></button>`}
      </li>`;
  }
  if (n < BIZ.length) {
    html += `
      <li class="biz locked">
        <div class="biz-icon">🔒</div>
        <div class="biz-body">
          <span class="biz-name">Entreprise secrète</span>
          <span class="ms-label">Possédez « ${BIZ[n - 1].name} » pour la découvrir · encore ${BIZ.length - n} à trouver</span>
        </div>
      </li>`;
  }
  view.innerHTML = html + '</ul>';
  updateBiz();
}

function updateBiz() {
  const boost = boostMult('rate');
  view.querySelectorAll('.biz[data-i]').forEach((card) => {
    const i = +card.dataset.i;
    const owned = S.owned[i];
    const f = (k) => card.querySelector(`[data-f="${k}"]`);
    setText(f('count'), String(owned));
    setText(f('inc'), owned ? `+${euro(bizRate[i] * boost)} / s` : `Rapporte ${euro(BIZ[i].inc)} / s par unité`);
    const next = nextMilestone(owned);
    const prev = prevMilestone(owned);
    setWidth(f('ms'), next ? ((owned - prev) / (next - prev)) * 100 : 100);
    setText(f('msl'), next ? `Bonus ×2 à ${next} unités` : 'Tous les paliers atteints 🏆');
    const btn = card.querySelector('.buy');
    if (!btn) return;
    const q = plannedQty(i);
    const c = costOf(i, q);
    setText(f('qty'), `Acheter ×${q}`);
    setText(f('cost'), euro(c));
    btn.classList.toggle('poor', c > S.money);
  });
}

function buy(i) {
  if (S.level < BIZ[i].lvl) return;
  const q = plannedQty(i);
  const c = costOf(i, q);
  if (c > S.money) return;
  const before = S.owned[i];
  S.money -= c;
  S.owned[i] += q;
  S.unitsBought += q;
  recalc();
  const crossed = MILESTONES.filter((t) => before < t && S.owned[i] >= t).length;
  if (before === 0) toast(`${BIZ[i].emoji} Nouvelle entreprise : ${BIZ[i].name} !`);
  else if (crossed) toast(`${BIZ[i].emoji} Palier atteint : revenus ×${2 ** crossed} !`);
  addXp(q);
  updateLive();
}

/* ---------- Vue : Améliorations ---------- */
function upgradeAvailable(u) {
  if (S.upgrades.includes(u.id)) return false;
  if (u.type === 'biz') return S.owned[u.i] >= u.need;
  return S.runEarned >= u.cost / 10 || S.money >= u.cost / 10;
}
let upSignature = '';
const upSig = () => UPGRADES.filter(upgradeAvailable).map((u) => u.id).join();
function renderUp() {
  const avail = UPGRADES.filter(upgradeAvailable).sort((a, b) => a.cost - b.cost);
  upSignature = upSig();
  const owned = S.upgrades.map((id) => UP[id]);
  view.innerHTML = `
    <p class="section-title">Disponibles (${avail.length})</p>
    ${avail.length ? `<ul class="list">${avail.map((u) => `
      <li class="biz up">
        <div class="biz-icon">${u.emoji}</div>
        <div class="biz-body"><span class="biz-name">${u.name}</span><span class="up-desc">${u.desc}</span></div>
        <button class="buy" data-buyup="${u.id}"><small>Acheter</small><b>${euro(u.cost)}</b></button>
      </li>`).join('')}</ul>`
      : `<div class="empty"><div class="big">🔍</div>Développez vos entreprises pour débloquer de nouvelles améliorations.<br><small>Directeur à 10 unités, franchise à 50, multinationale à 150, légende à 400.</small></div>`}
    <p class="section-title">Collection : ${owned.length} / ${UPGRADES.length}</p>
    <div class="owned-ups">${owned.length ? owned.map((u) => `<span title="${u.name}">${u.emoji}</span>`).join('') : '<small class="muted">Aucune pour l’instant</small>'}</div>`;
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
  S.upgradesBought++;
  recalc();
  toast(`${u.emoji} ${u.name} : activé !`);
  addXp(5 + S.level);
  renderUp();
  updateLive();
}

/* ---------- Vue : Missions & trophées ---------- */
let missionSignature = '';
const missionSig = () => S.missions.map((m) => m.id).join() + '|' + S.ach.length + '|' + dailyInfo().claimable;

function renderMissions() {
  missionSignature = missionSig();
  const d = dailyInfo();
  const locked = ACH.filter((a) => !achSet.has(a.id))
    .map((a) => ({ a, p: Math.min(1, a.val() / a.t) }))
    .sort((x, y) => y.p - x.p).slice(0, 6);
  view.innerHTML = `
    <section class="daily">
      <div class="daily-head"><span class="e">🎁</span><div><b>Cadeau du jour</b><small>Revenez chaque jour : les cadeaux grossissent !</small></div></div>
      <div class="days">${DAILY_GEMS.map((g, k) => {
        const dd = k + 1;
        const cls = dd < d.day || (dd === d.day && !d.claimable) ? 'done' : dd === d.day ? 'now' : '';
        return `<span class="${cls}">J${dd}<br>💎${g}</span>`;
      }).join('')}</div>
      <button class="primary" data-action="daily" data-f="daily"></button>
    </section>

    <p class="section-title">Missions · ${S.missionsDone} réussie${S.missionsDone > 1 ? 's' : ''}</p>
    <ul class="list">${S.missions.map((m) => {
      const info = missionInfo(m);
      return `
      <li class="biz mission" data-m="${m.id}">
        <div class="biz-icon">${info.emoji}</div>
        <div class="biz-body">
          <span class="biz-name wrap">${info.text}</span>
          <div class="ms"><i data-f="mp"></i></div>
          <span class="ms-label" data-f="ml"></span>
          <span class="rewards">⭐ ${m.xp} XP · 💎 ${m.gems} · 💰 1 min</span>
        </div>
        <button class="buy" data-claim="${m.id}"><small>Mission</small><b>Réclamer</b></button>
      </li>`;
    }).join('')}</ul>

    <p class="section-title">Trophées · ${S.ach.length} / ${ACH.length}</p>
    <div class="group">
      <div class="row"><span>Bonus des trophées</span><b>+${S.ach.length} % de revenus</b></div>
    </div>
    <p class="section-title">Presque débloqués</p>
    <ul class="list">${locked.map(({ a, p }) => `
      <li class="biz up">
        <div class="biz-icon">${a.emoji}</div>
        <div class="biz-body">
          <span class="biz-name wrap">${a.name}</span>
          <div class="ms"><i style="width:${(p * 100).toFixed(1)}%"></i></div>
          <span class="ms-label">${fmt(Math.min(a.val(), a.t))} / ${fmt(a.t)}</span>
        </div>
      </li>`).join('')}</ul>
    <p class="section-title">Collection (touchez un trophée)</p>
    <div class="ach-grid">${ACH.map((a) => `<button class="${achSet.has(a.id) ? 'on' : ''}" data-ach="${a.id}" aria-label="${a.name}">${a.emoji}</button>`).join('')}</div>`;
  updateMissions();
}
function updateMissions() {
  const d = dailyInfo();
  const db = view.querySelector('[data-f="daily"]');
  if (db) {
    db.disabled = !d.claimable;
    setText(db, d.claimable ? `Récupérer le cadeau du jour ${d.day}` : `Prochain cadeau dans ${duration(secondsToMidnight())}`);
  }
  view.querySelectorAll('.mission').forEach((card) => {
    const m = S.missions.find((x) => x.id === card.dataset.m);
    if (!m) return;
    const v = Math.min(missionValue(m), m.target);
    setWidth(card.querySelector('[data-f="mp"]'), (v / m.target) * 100);
    setText(card.querySelector('[data-f="ml"]'), m.type === 'earn' ? `${euro(Math.max(0, v))} / ${euro(m.target)}` : `${fmt(Math.max(0, v))} / ${fmt(m.target)}`);
    card.querySelector('[data-claim]').classList.toggle('poor', !missionDone(m));
  });
}

/* ---------- Vue : Boutique ---------- */
function renderShop() {
  view.innerHTML = `
    <section class="wheel-card">
      <h2>🎡 Roue de la fortune</h2>
      <p class="muted">Un tour gratuit chaque jour. Tours bonus : ${SPIN_COST} 💎</p>
      <div class="wheel-wrap">
        <div class="pointer" aria-hidden="true"></div>
        <div class="wheel" id="wheel" style="transform:rotate(${S.wheelRot}deg);background:conic-gradient(${WHEEL_COLORS.map((c, k) => `${c} ${k * 45}deg ${(k + 1) * 45}deg`).join(',')})">
          ${WHEEL.map((w, k) => `<span style="--a:${k * 45 + 22.5}deg">${w.emoji}</span>`).join('')}
        </div>
        <div class="hub" aria-hidden="true">💰</div>
      </div>
      <button class="primary" data-action="spin" data-f="spin"></button>
    </section>

    <p class="section-title">Boutique à diamants</p>
    <ul class="list">
      <li class="biz up eternal">
        <div class="biz-icon">♾️</div>
        <div class="biz-body"><span class="biz-name wrap">Investissement éternel (niv. ${S.eternal})</span>
          <span class="up-desc">Revenus ×1,5 pour toujours, même après avoir revendu l’empire. Actuel : ×${fmt(eternalMult())}</span></div>
        <button class="buy gem" data-shop="eternal" data-cost="${eternalCost()}"><small>Acheter</small><b>💎 ${eternalCost()}</b></button>
      </li>
      ${SHOP.map((s) => `
      <li class="biz up">
        <div class="biz-icon">${s.emoji}</div>
        <div class="biz-body"><span class="biz-name">${s.name}</span><span class="up-desc">${s.desc}</span></div>
        <button class="buy gem" data-shop="${s.id}" data-cost="${s.cost}"><small>Acheter</small><b>💎 ${s.cost}</b></button>
      </li>`).join('')}
    </ul>
    <p class="footnote">💎 Gagnez des diamants avec les niveaux, missions, trophées, surprises, la roue et le cadeau du jour.</p>`;
  updateShop();
}
function updateShop() {
  const sb = view.querySelector('[data-f="spin"]');
  if (sb) {
    sb.disabled = spinning;
    setText(sb, spinning ? 'La roue tourne…' : freeSpin() ? 'Tourner gratuitement 🎉' : `Tourner encore · ${SPIN_COST} 💎`);
  }
  view.querySelectorAll('[data-shop]').forEach((b) => b.classList.toggle('poor', S.gems < +b.dataset.cost));
}

/* ---------- Vue : Empire ---------- */
function renderEmpire() {
  view.innerHTML = `
    <section class="hero">
      <h2>👔 Investisseurs</h2>
      <p>Revendez votre empire pour attirer des investisseurs. Chacun augmente <b>tous</b> vos revenus de 2 %, pour toujours. Votre niveau, vos diamants et vos trophées sont conservés.</p>
      <div class="big-num" data-f="inv"></div>
      <p data-f="invbonus"></p>
      <button class="primary" data-action="prestige" data-f="prestige"></button>
    </section>

    <p class="section-title">Multiplicateurs permanents</p>
    <div class="group">
      <div class="row"><span>⭐ Niveau ${S.level}</span><b>×${fmt(levelMult())}</b></div>
      <div class="row"><span>🏆 ${S.ach.length} trophées</span><b>×${fmt(achMult())}</b></div>
      <div class="row"><span>👔 ${fmt(S.investors)} investisseurs</span><b>×${fmt(investorMult())}</b></div>
      <div class="row"><span>♾️ Investissement éternel</span><b>×${fmt(eternalMult())}</b></div>
      <div class="row"><span>Total</span><b>×${fmt(permMult())}</b></div>
    </div>

    <p class="section-title">Statistiques</p>
    <div class="group">
      <div class="row"><span>Revenus actuels</span><b data-f="rate"></b></div>
      <div class="row"><span>Meilleurs revenus</span><b data-f="best"></b></div>
      <div class="row"><span>Gagné cette partie</span><b data-f="run"></b></div>
      <div class="row"><span>Gagné au total</span><b data-f="total"></b></div>
      <div class="row"><span>Entreprises possédées</span><b data-f="units"></b></div>
      <div class="row"><span>Missions réussies</span><b>${fmt(S.missionsDone)}</b></div>
      <div class="row"><span>Surprises attrapées</span><b>${fmt(S.eventsCaught)}</b></div>
      <div class="row"><span>Fois où vous avez travaillé</span><b data-f="taps"></b></div>
      <div class="row"><span>Temps de jeu</span><b data-f="time"></b></div>
      <div class="row"><span>Empires revendus</span><b>${S.prestiges}</b></div>
    </div>

    <p class="section-title">Zone de test ⏩</p>
    <div class="group">
      <button class="row accent" data-action="skip" data-sec="3600"><span>Avancer le temps de 1 heure</span><span>⏩</span></button>
      <button class="row accent" data-action="skip" data-sec="86400"><span>Avancer le temps de 24 heures</span><span>⏩⏩</span></button>
      <button class="row accent" data-action="test-gems"><span>Recevoir 50 diamants</span><span>💎</span></button>
      <button class="row accent" data-action="test-level"><span>Gagner un niveau</span><span>⭐</span></button>
      <button class="row accent" data-action="test-event"><span>Faire apparaître une surprise</span><span>🎈</span></button>
    </div>

    <p class="section-title">Lire les grands nombres</p>
    <div class="group"><div class="legend">
      ${SUFFIXES.slice(1).map((s, i) => `<span><b>${s}</b> ${SUFFIX_NAMES[i + 1]}</span>`).join('')}
    </div></div>

    <p class="section-title">Partie</p>
    <div class="group">
      <button class="row danger" data-action="reset"><span>Tout effacer et recommencer</span></button>
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
  setText(f('rate'), euro(effRate()) + ' / s');
  setText(f('best'), euro(S.bestRate) + ' / s');
  setText(f('run'), euro(S.runEarned));
  setText(f('total'), euro(S.totalEarned));
  setText(f('units'), fmt(totalUnits()));
  setText(f('taps'), fmt(S.taps));
  setText(f('time'), duration(S.playTime));
}

function prestige() {
  const gain = investorsAvailable();
  if (gain < 1) return;
  if (!confirm(`Revendre votre empire ?\n\nVous repartez de zéro (argent, entreprises, améliorations), mais vous gagnez ${fmt(gain)} investisseur(s) : +${fmt(gain * INVESTOR_BONUS * 100)} % de revenus pour toujours.\n\nNiveau, diamants et trophées sont conservés.`)) return;
  Object.assign(S, {
    money: 0, runEarned: 0, owned: BIZ.map(() => 0), upgrades: [], missions: [],
    investors: S.investors + gain, prestiges: S.prestiges + 1,
  });
  recalc(); ensureMissions(); save();
  tab = 'biz'; render();
  toast(`👔 ${fmt(gain)} investisseur(s) rejoignent l'aventure !`);
}

/* ---------- Surprises qui traversent l'écran ---------- */
const eventEl = $('#event');
function spawnEvent() {
  const e = pickWeighted(EVENTS);
  eventEl.dataset.ev = e.id;
  $('#event-emoji').textContent = e.emoji;
  eventEl.style.top = randInt(30, 68) + '%';
  eventEl.classList.remove('go');
  eventEl.hidden = false;
  void eventEl.offsetWidth; // relance l'animation
  eventEl.classList.add('go');
  clearTimeout(eventTimer);
  eventTimer = setTimeout(() => { eventEl.hidden = true; }, 11000);
}
function maybeSpawnEvent() {
  if (document.hidden || !$('#modal').hidden || !eventEl.hidden) return;
  if (Date.now() < nextEventAt) return;
  nextEventAt = Date.now() + randInt(35, 80) * 1000;
  spawnEvent();
}
eventEl.addEventListener('click', (e) => {
  const ev = EVENTS.find((x) => x.id === eventEl.dataset.ev);
  eventEl.hidden = true;
  clearTimeout(eventTimer);
  if (!ev) return;
  S.eventsCaught++;
  const msg = ev.run();
  toast(msg);
  floatText(ev.emoji, e.clientX || innerWidth / 2, e.clientY || innerHeight / 2);
  updateLive();
});

/* ---------- Rendu général ---------- */
function render() {
  if (tab === 'biz') renderBiz();
  else if (tab === 'up') renderUp();
  else if (tab === 'missions') renderMissions();
  else if (tab === 'shop') renderShop();
  else renderEmpire();
  document.querySelectorAll('.tab').forEach((t) => {
    if (t.dataset.tab === tab) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  updateLive();
}

let boostSig = '';
function updateHud() {
  const boosted = boostMult('rate');
  setText($('#money'), euro(S.money));
  setText($('#rate'), `${euro(effRate())} / s${boosted > 1 ? ` (×${fmt(boosted)})` : ''}`);
  setText($('#tapval'), '+' + euro(tapValue()));
  setText($('#lvl-num'), String(S.level));
  setText($('#lvl-title'), `${titleFor(S.level)} · ${fmt(S.xp)} / ${fmt(xpNeed(S.level))} XP`);
  setWidth($('#xp-bar'), (S.xp / xpNeed(S.level)) * 100);
  setText($('#gems'), `💎 ${fmt(S.gems)}`);

  const now = Date.now();
  S.boosts = S.boosts.filter((b) => b.until > now);
  const chips = S.boosts.map((b) => `<span class="chip">${b.kind === 'rate' ? '📈 Revenus' : '👆 Travail'} ×${b.x} · ${clock((b.until - now) / 1000)}</span>`).join('');
  if (chips !== boostSig) { boostSig = chips; $('#boosts').innerHTML = chips; }

  const setBadge = (id, n) => { const el = $(id); el.hidden = !n; setText(el, String(n)); };
  setBadge('#badge-up', UPGRADES.filter((u) => upgradeAvailable(u) && u.cost <= S.money).length);
  setBadge('#badge-missions', S.missions.filter(missionDone).length + (dailyInfo().claimable ? 1 : 0));
  setBadge('#badge-shop', freeSpin() && !spinning ? 1 : 0);
}

function updateLive() {
  updateHud();
  if (tab === 'biz') { if (bizSig() !== bizSignature) renderBiz(); else updateBiz(); }
  else if (tab === 'up') { if (upSig() !== upSignature) renderUp(); else updateUp(); }
  else if (tab === 'missions') { if (missionSig() !== missionSignature) renderMissions(); else updateMissions(); }
  else if (tab === 'shop') updateShop();
  else updateEmpire();
}

/* ---------- Interactions ---------- */
$('#work').addEventListener('click', (e) => {
  const v = tapValue();
  earn(v);
  S.taps++;
  const r = e.currentTarget.getBoundingClientRect();
  floatText('+' + euro(v), (e.clientX || r.left + r.width / 2) + rand(-15, 15), (e.clientY || r.top + r.height / 2) - 20);
  updateLive();
});

$('#lvl').addEventListener('click', () => {
  toast(`⭐ Niveau ${S.level} : ${titleFor(S.level)}. Encore ${fmt(xpNeed(S.level) - S.xp)} XP pour le niveau ${S.level + 1}.`);
});

view.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  const d = t.dataset;
  if (d.mode) {
    S.buyMode = d.mode === 'max' ? 'max' : +d.mode;
    view.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', b === t));
    updateBiz();
  } else if (d.buy) buy(+d.buy);
  else if (d.buyup) buyUpgrade(d.buyup);
  else if (d.claim) claimMission(d.claim);
  else if (d.shop) buyShop(d.shop);
  else if (d.ach) {
    const a = ACH.find((x) => x.id === d.ach);
    toast(achSet.has(a.id) ? `${a.emoji} ${a.name} ✅` : `${a.emoji} ${a.desc} · ${fmt(Math.min(a.val(), a.t))} / ${fmt(a.t)}`);
  } else if (d.action === 'daily') claimDaily();
  else if (d.action === 'spin') spin();
  else if (d.action === 'prestige') prestige();
  else if (d.action === 'skip') timeGains(+d.sec, 'Voyage dans le temps ⏩');
  else if (d.action === 'test-gems') { addGems(50); toast('💎 +50 diamants (test)'); updateLive(); }
  else if (d.action === 'test-level') { addXp(xpNeed(S.level) - S.xp); render(); }
  else if (d.action === 'test-event') { eventEl.hidden = true; spawnEvent(); }
  else if (d.action === 'reset') {
    if (confirm('Tout effacer et recommencer à zéro ? Niveau, diamants, trophées et investisseurs seront perdus.')) {
      S = fresh(); achSet = new Set(); recalc(); ensureMissions(); save(); tab = 'biz'; render();
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
let slowTick = 0;
function tick() {
  const now = Date.now();
  const dt = (now - last) / 1000;
  last = now;
  if (dt > 15) {
    timeGains(dt);          // l'app était en arrière-plan
  } else if (dt > 0) {
    earn(effRate() * dt);
    S.playTime += dt;
  }
  if (++slowTick >= 10) {   // une fois par seconde
    slowTick = 0;
    checkAchievements();
    maybeSpawnEvent();
    S.bestRate = Math.max(S.bestRate, effRate());
  }
  updateLive();
}

recalc();
ensureMissions();
render();
const away = (Date.now() - (S.lastSeen || Date.now())) / 1000;
if (away > 15) timeGains(away);

setInterval(tick, 100);
setInterval(save, 3000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save(); else tick();
});
window.addEventListener('pagehide', save);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
