// Simulaties: node test/sim.js [perf|strength|bid]
const KJ = require('./load.js');
const AI = KJ.AI;
const mode = process.argv[2] || 'perf';

function playDeal(levels, seed, forceSuit) {
  const g = new KJ.Game({ seed, variant: 'rotterdams' });
  g.newDeal();
  const rng = KJ.makeRng(seed + 7);
  while (g.phase === 'bidding') {
    const s = g.turn;
    let bid;
    if (forceSuit) bid = s === g.chooser && g.round === 1 ? g.proposed : g.round === 2 ? g.bidOptions(s)[0] : null;
    else bid = AI.decideBid(g, s, levels[s], rng);
    g.bid(s, bid);
  }
  while (g.phase === 'playing') {
    const s = g.turn;
    g.play(s, AI.chooseCard(g, s, levels[s], levels, rng));
  }
  return g;
}

if (mode === 'perf') {
  const g = new KJ.Game({ seed: 3 });
  g.newDeal();
  g.bid(0, g.proposed);
  const v = g.view(0);
  let t = Date.now();
  const n = 200;
  for (let i = 0; i < n; i++) AI.heuristic(v, { signals: true, count: true });
  console.log('heuristiek per zet: ' + ((Date.now() - t) / n).toFixed(3) + ' ms');
  t = Date.now();
  const rng = KJ.makeRng(5);
  let plays = 0;
  for (let i = 0; i < 50; i++) {
    const hands = AI.determinize(v, rng);
    const c = AI.cloneGame(v, hands);
    plays += 32 - c.played.length;
    AI.rollout(c, 0, ['goed', 'goed', 'goed', 'goed'], rng);
  }
  console.log('rollout (volledig spel): ' + ((Date.now() - t) / 50).toFixed(2) + ' ms, ' + ((Date.now() - t) / plays).toFixed(3) + ' ms per zet');
  t = Date.now();
  const mc = AI.monteCarlo(v, { samples: 24, rng });
  console.log('monteCarlo 8 kaarten x 24 samples: ' + (Date.now() - t) + ' ms', mc.card, mc.evals.map((e) => e.card + ':' + e.ev.toFixed(0)).join(' '));
  t = Date.now();
  playDeal(['goed', 'goed', 'goed', 'goed'], 11);
  console.log('volledig spel met 4x goed: ' + (Date.now() - t) + ' ms');
}

if (mode === 'strength') {
  const N = +process.argv[3] || 200;
  const matchups = [
    [['goed', 'slecht', 'goed', 'slecht'], 'goed vs slecht'],
    [['goed', 'gemiddeld', 'goed', 'gemiddeld'], 'goed vs gemiddeld'],
    [['gemiddeld', 'slecht', 'gemiddeld', 'slecht'], 'gemiddeld vs slecht'],
    [['goed', 'goed', 'gemiddeld', 'goed'], 'goed+gemiddelde maat vs goed'],
    [['goed', 'goed', 'slecht', 'goed'], 'goed+slechte maat vs goed'],
  ];
  for (const [levels, label] of matchups) {
    let net = 0, wins = 0, roemAgainst = 0;
    for (let i = 0; i < N; i++) {
      const g = playDeal(levels, 1000 + i);
      const r = g.lastResult;
      net += r.score[0] - r.score[1];
      if (r.score[0] > r.score[1]) wins++;
      roemAgainst += r.roem[1];
    }
    console.log(label.padEnd(32), 'netto/spel ' + (net / N).toFixed(1).padStart(7), ' winst ' + ((100 * wins) / N).toFixed(0) + '%', ' roem tegen/spel ' + (roemAgainst / N).toFixed(1));
  }
}

if (mode === 'bid') {
  // Kalibratie: kiezer speelt altijd de gedraaide kleur; relatie tussen evalSuit-score en resultaat
  const N = +process.argv[3] || 3000;
  const buckets = {};
  for (let i = 0; i < N; i++) {
    const g = new KJ.Game({ seed: 5000 + i });
    g.newDeal();
    const e = AI.evalSuit(g.hands[0], g.proposed, { seat: 0, dealer: g.dealer, turnCard: g.turnCard });
    const b = Math.floor(e.score / 10) * 10;
    const played = playDeal(['gemiddeld', 'gemiddeld', 'gemiddeld', 'gemiddeld'], 5000 + i, true);
    const r = played.lastResult;
    const k = buckets[b] = buckets[b] || { n: 0, net: 0, nat: 0 };
    k.n++; k.net += r.score[0] - r.score[1]; k.nat += r.nat ? 1 : 0;
  }
  console.log('score-bucket  n   netto/spel  nat%');
  for (const b of Object.keys(buckets).map(Number).sort((a, b) => a - b)) {
    const k = buckets[b];
    console.log(String(b).padStart(5), String(k.n).padStart(6), (k.net / k.n).toFixed(1).padStart(10), ((100 * k.nat) / k.n).toFixed(0).padStart(6) + '%');
  }
}
