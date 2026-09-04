// Valideer scenario's: node test/scenarios.js
const KJ = require('./load.js');
const vm = require('vm'), fs = require('fs'), path = require('path');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'quiz.js'), 'utf8'));
const rng = KJ.makeRng(42);
let bad = 0;
for (const sc of KJ.Quiz.SCENARIOS) {
  if (sc.type === 'bid') {
    const g = new KJ.Game({ dealer: sc.dealer, turnMode: 'dealer' });
    g.newDeal([[], [], [], []].map((_, i) => (i === 0 ? sc.hand : KJ.DECK.filter((c) => !sc.hand.includes(c)).slice(0, 8))), sc.proposed);
    g.hands[0] = sc.hand.slice();
    g.turnCard = sc.turnCard;
    g.chooser = sc.chooser; g.turn = 0;
    const adv = KJ.Coach.bidAdvice(g, 0);
    const ok = (adv.advice === 'spelen') === (sc.answer != null);
    if (!ok) bad++;
    console.log((ok ? 'ok  ' : 'FAIL') + ' ' + sc.id.padEnd(16) + ' advies=' + adv.advice + ' score=' + adv.evals[0].score + ' drempel=' + adv.threshold);
    continue;
  }
  const v = KJ.Quiz.buildView(sc);
  const legal = KJ.legalMoves(v.hand, v.trick, v.trump, v.variant, 0);
  const missing = sc.hand.filter((c) => v.played.includes(c));
  if (missing.length) { bad++; console.log('  !! kaart in hand en gespeeld:', missing); }
  if (v.hand.length !== v.handSizes[0]) { bad++; console.log('  !! handgrootte klopt niet:', sc.id, v.hand.length, 'moet', v.handSizes[0]); continue; }
  const an = KJ.Coach.analyzeMove(v, ['goed', 'goed', 'goed', 'goed'], +process.argv[2] || 60);
  const best = an.best.card;
  const ok = sc.answers.includes(best);
  const ansEv = Math.max(...sc.answers.filter((c) => legal.includes(c)).map((c) => an.evals.find((e) => e.card === c).ev));
  const near = an.best.ev - ansEv < 5;
  if (!ok && !near) bad++;
  console.log((ok ? 'ok  ' : near ? 'bijna' : 'FAIL') + ' ' + sc.id.padEnd(16) + ' MC: ' + an.evals.map((e) => e.card + ':' + e.ev.toFixed(0)).join(' ') + ' | antwoord ' + sc.answers.join('/') + ' | legaal ' + legal.join(' '));
}
console.log(bad ? bad + ' scenario(s) wijken af' : 'alle scenario\'s consistent');
