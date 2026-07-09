// Crypto Survivors — $SURV emisyon simülasyonu (dinamik bütçe + clamp)
// Çalıştır:  node scripts/tokenomics-sim.mjs
// Tüm parametreler CONFIG'te; değiştir ve tekrar çalıştır. Bağımlılık yok.

const CONFIG = {
  emissionPool: 200_000_000, // 40% of 500M
  decay: 0.65, // yıllık azalma (B_max ve r_target birlikte azalır -> clamp eşiği sabit)
  years: 5,
  weeksPerYear: 52,
  rTargetYear1: 300, // oyuncu başına hedef haftalık ödül (Yıl 1)
  topK: 10, // sayılan en iyi run sayısı (grind'i sınırlar)
  alpha: 0.8, // whale sıkıştırma: effScore = raw^alpha
  sMin: 50, // beceri tabanı: altı = 0 ödül
  botShare: 0.15, // popülasyonun bot oranı (senaryo A)
  seed: 12345,
};

// --- seeded RNG (mulberry32) + lognormal ---
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(CONFIG.seed);
const rand = () => rng();
function randn() {
  let u = 0,
    v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const lognormal = (mu, sigma) => Math.exp(mu + sigma * randn());

// --- emisyon programı ---
const annualBudget = y =>
  (CONFIG.emissionPool * (1 - CONFIG.decay) * Math.pow(CONFIG.decay, y - 1)) /
  (1 - Math.pow(CONFIG.decay, CONFIG.years));
const bMaxWeek = y => annualBudget(y) / CONFIG.weeksPerYear;
const rTarget = y => CONFIG.rTargetYear1 * Math.pow(CONFIG.decay, y - 1);

// --- bir oyuncunun haftalık effScore'u ---
// runScore = skill * 10 * noise ; top-K toplanır ; taban çıkarılır ; ^alpha
function playerEffScore(skill, runs) {
  const scores = [];
  for (let i = 0; i < runs; i++) scores.push(skill * 10 * (0.5 + rand()));
  scores.sort((a, b) => b - a);
  const raw = scores.slice(0, CONFIG.topK).reduce((s, x) => s + x, 0);
  return Math.pow(Math.max(0, raw - CONFIG.sMin), CONFIG.alpha);
}

function genPopulation(nLegit, nBots) {
  const pop = [];
  for (let i = 0; i < nLegit; i++) {
    const skill = lognormal(0.0, 0.7); // medyan ~1.0, sağa çarpık
    const runs = 5 + Math.floor(rand() * 40); // 5..45
    pop.push({ type: 'legit', eff: playerEffScore(skill, runs) });
  }
  for (let i = 0; i < nBots; i++) {
    const skill = 0.35 + 0.15 * rand(); // 0.35..0.50 (kısa survival)
    const runs = 100 + Math.floor(rand() * 200); // 100..300 grind
    pop.push({ type: 'bot', eff: playerEffScore(skill, runs) });
  }
  return pop;
}

// --- haftalık emisyon (dinamik bütçe + clamp) ---
function weeklyEmission(pop, y) {
  const qualified = pop.filter(p => p.eff > 0);
  const sumEff = qualified.reduce((s, p) => s + p.eff, 0);
  const bMax = bMaxWeek(y);
  const rt = rTarget(y);
  const bWeek = Math.min(bMax, rt * qualified.length); // <-- senin clamp fikrin
  const clampActive = rt * qualified.length >= bMax;
  const rewards = pop.map(p =>
    p.eff > 0 && sumEff > 0 ? (bWeek * p.eff) / sumEff : 0
  );
  return { bWeek, bMax, clampActive, qualifiedCount: qualified.length, rewards };
}

// helpers
const fmt = n =>
  n >= 1e6
    ? (n / 1e6).toFixed(3) + 'M'
    : n >= 1e3
      ? (n / 1e3).toFixed(1) + 'k'
      : n.toFixed(1);
const pad = (s, w) => String(s).padStart(w);
function pct(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) * p)] : 0;
}
const median = arr => pct(arr, 0.5);

// === SENARYO A: Yıl 1, değişken oyuncu sayısı -> kişi başı ödül ===
console.log('\n=== SENARYO A — Yıl 1: oyuncu sayisi degisince kisi basi odul ===');
console.log(
  `B_max(hafta)=${fmt(bMaxWeek(1))}  r_target=${rTarget(1).toFixed(0)}  clamp esigi ~${Math.round(bMaxWeek(1) / rTarget(1))} oyuncu  (bot orani %${CONFIG.botShare * 100})\n`
);
console.log(
  [
    pad('oyuncu', 7),
    pad('bWeek', 9),
    pad('clamp', 6),
    pad('ort/oyuncu', 11),
    pad('medyan(L)', 10),
    pad('top1%(L)', 9),
    pad('medyan(bot)', 12),
    pad('bot/legit', 10),
  ].join(' |')
);
for (const n of [500, 1500, 5000, 20000]) {
  rng = mulberry32(CONFIG.seed);
  const bots = Math.round(n * CONFIG.botShare);
  const pop = genPopulation(n, bots);
  const res = weeklyEmission(pop, 1);
  const legitR = res.rewards.filter((_, i) => pop[i].type === 'legit');
  const botR = res.rewards.filter((_, i) => pop[i].type === 'bot');
  const avg = res.bWeek / res.qualifiedCount;
  const mL = median(legitR),
    mB = median(botR);
  console.log(
    [
      pad(n, 7),
      pad(fmt(res.bWeek), 9),
      pad(res.clampActive ? 'EVET' : 'hayir', 6),
      pad(avg.toFixed(0), 11),
      pad(mL.toFixed(0), 10),
      pad(pct(legitR, 0.99).toFixed(0), 9),
      pad(mB.toFixed(1), 12),
      pad((mL ? (mB / mL) * 100 : 0).toFixed(1) + '%', 10),
    ].join(' |')
  );
}

// === SENARYO B: 5 yillik havuz tuketimi (ornek oyuncu trajesi) ===
console.log('\n=== SENARYO B — 5 yillik havuz tuketimi ===');
const trajectory = [2000, 8000, 15000, 12000, 9000]; // ortalama aktif/yil
console.log(
  [
    pad('yil', 3),
    pad('oyuncu', 7),
    pad('r_target', 8),
    pad('B_max/hf', 9),
    pad('gercek/hf', 9),
    pad('clamp', 6),
    pad('yillik', 9),
    pad('kumulatif', 10),
  ].join(' |')
);
let cumulative = 0;
for (let y = 1; y <= CONFIG.years; y++) {
  const players = trajectory[y - 1];
  const rt = rTarget(y),
    bMax = bMaxWeek(y);
  const bWeek = Math.min(bMax, rt * players);
  const annual = bWeek * CONFIG.weeksPerYear;
  cumulative += annual;
  console.log(
    [
      pad(y, 3),
      pad(players, 7),
      pad(rt.toFixed(0), 8),
      pad(fmt(bMax), 9),
      pad(fmt(bWeek), 9),
      pad(rt * players >= bMax ? 'EVET' : 'hayir', 6),
      pad(fmt(annual), 9),
      pad(fmt(cumulative), 10),
    ].join(' |')
  );
}
console.log(
  `Havuz=${fmt(CONFIG.emissionPool)} | 5y kumulatif=${fmt(cumulative)} | kalan=${fmt(CONFIG.emissionPool - cumulative)} | havuz omru: ${cumulative <= CONFIG.emissionPool ? '>= 5 yil' : '< 5 yil (clamp surekli aktif)'}`
);

// === SENARYO C: sink/faucet dengesi (olgun faz) ===
console.log('\n=== SENARYO C — sink/faucet dengesi (olgun faz, haftalik) ===');
const weeklyEmit = bMaxWeek(1);
console.log(`Haftalik emisyon ~${fmt(weeklyEmit)} varsayiliyor (clamp'te).`);
console.log(
  [
    pad('harcama', 8),
    pad('yakim payi', 11),
    pad('hf yakim', 9),
    pad('net enflasyon', 14),
    pad('sink/faucet', 11),
  ].join(' |')
);
for (const spendRate of [0.3, 0.5, 0.8, 1.2]) {
  const burnShare = 0.7;
  const weeklyBurn = weeklyEmit * spendRate * burnShare;
  const net = weeklyEmit - weeklyBurn;
  console.log(
    [
      pad(spendRate * 100 + '%', 8),
      pad(burnShare * 100 + '%', 11),
      pad(fmt(weeklyBurn), 9),
      pad(fmt(net), 14),
      pad((weeklyBurn / weeklyEmit).toFixed(2), 11),
    ].join(' |')
  );
}
console.log(
  'Not: sink/faucet>=1 icin harcama x yakim_payi >= 1. Saf kozmetik (%70 yakim) tek basina yetmez;'
);
console.log(
  "     itibar/prestij sink'i (%100 yakim) ile kapatilir -> bu yuzden status sink'i kritik."
);
