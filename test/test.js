// Regeltests: node test/test.js
const KJ = require('./load.js');
let fails = 0;
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) { fails++; console.log('FAIL', msg, '\n  verwacht', e, '\n  kreeg   ', a); }
  else console.log('ok  ', msg);
}
function same(actual, expected, msg) { eq(actual.slice().sort(), expected.slice().sort(), msg); }

// --- roem
eq(KJ.trickRoem(['H7', 'H8', 'H9', 'SA'], 'K').roem, 20, 'driekaart 20');
eq(KJ.trickRoem(['H7', 'H8', 'H9', 'HT'], 'K').roem, 50, 'vierkaart 50');
eq(KJ.trickRoem(['HK', 'HQ', 'S7', 'R8'], 'H').roem, 20, 'stuk 20');
eq(KJ.trickRoem(['HK', 'HQ', 'HJ', 'R8'], 'H').roem, 40, 'driekaart + stuk 40');
eq(KJ.trickRoem(['HK', 'HQ', 'HJ', 'HT'], 'H').roem, 70, 'vierkaart + stuk 70');
eq(KJ.trickRoem(['HJ', 'SJ', 'RJ', 'KJ'], 'H').roem, 200, 'vier boeren 200');
eq(KJ.trickRoem(['HA', 'SA', 'RA', 'KA'], 'H').roem, 100, 'vier azen 100');
eq(KJ.trickRoem(['H9', 'S9', 'R9', 'K9'], 'H').roem, 0, 'vier negens 0');
eq(KJ.trickRoem(['H7', 'H9', 'HT', 'HJ'], 'K').roem, 20, 'reeks 9-10-B (natuurlijke volgorde) 20');
eq(KJ.trickRoem(['HA', 'HK', 'HQ', 'S7'], 'S').roem, 20, 'V-H-A reeks 20');

// --- slagwinnaar
eq(KJ.currentWinner([{ seat: 0, card: 'HA' }, { seat: 1, card: 'H7' }, { seat: 2, card: 'S7' }, { seat: 3, card: 'HT' }], 'K').seat, 0, 'aas wint van 10');
eq(KJ.currentWinner([{ seat: 0, card: 'HA' }, { seat: 1, card: 'K7' }], 'K').seat, 1, 'troef 7 wint van aas');
eq(KJ.currentWinner([{ seat: 0, card: 'K9' }, { seat: 1, card: 'KA' }, { seat: 2, card: 'KJ' }], 'K').seat, 2, 'boer > nel > aas in troef');
eq(KJ.currentWinner([{ seat: 0, card: 'H8' }, { seat: 1, card: 'SA' }], 'K').seat, 0, 'niet-gevraagde kleur wint nooit');

// --- verplichte kaarten Rotterdams
const R = 'rotterdams', A = 'amsterdams';
same(KJ.legalMoves(['HA', 'H7', 'S8'], [{ seat: 1, card: 'HT' }], 'K', R, 2), ['HA', 'H7'], 'bekennen verplicht');
same(KJ.legalMoves(['K7', 'S8', 'S9'], [{ seat: 3, card: 'HT' }], 'K', R, 0), ['K7'], 'R: troeven verplicht');
same(KJ.legalMoves(['K7', 'KJ', 'S8'], [{ seat: 3, card: 'HT' }, { seat: 0, card: 'K9' }], 'K', R, 1), ['KJ'], 'R: overtroeven verplicht');
same(KJ.legalMoves(['K7', 'K8', 'S8'], [{ seat: 3, card: 'HT' }, { seat: 0, card: 'K9' }], 'K', R, 1), ['K7', 'K8'], 'R: ondertroeven verplicht');
same(KJ.legalMoves(['K7', 'S8'], [{ seat: 2, card: 'HA' }, { seat: 3, card: 'H7' }], 'K', R, 0), ['K7'], 'R: troeven ook op slag van maat');
same(KJ.legalMoves(['K7', 'KJ', 'S8'], [{ seat: 3, card: 'K9' }], 'K', R, 0), ['KJ'], 'R: troef uitgekomen => verhogen');
same(KJ.legalMoves(['K7', 'K8', 'S8'], [{ seat: 3, card: 'K9' }], 'K', R, 0), ['K7', 'K8'], 'R: kan niet verhogen => lagere troef');
// --- Amsterdams
same(KJ.legalMoves(['K7', 'S8'], [{ seat: 2, card: 'HA' }, { seat: 3, card: 'H7' }], 'K', A, 0), ['K7', 'S8'], 'A: maat wint => vrij');
same(KJ.legalMoves(['K7', 'S8', 'S9'], [{ seat: 3, card: 'HT' }], 'K', A, 0), ['K7'], 'A: tegenpartij wint => troeven');
same(KJ.legalMoves(['K7', 'K8', 'S8'], [{ seat: 3, card: 'HT' }, { seat: 0, card: 'K9' }], 'K', A, 1), ['K7', 'K8', 'S8'], 'A: kan niet overtroeven => alles');
same(KJ.legalMoves(['K7', 'KJ', 'S8'], [{ seat: 2, card: 'K9' }, { seat: 3, card: 'K8' }], 'K', A, 0), ['K7', 'KJ'], 'A: maat wint met troef => niet verhogen');

// --- telling
function mk(winners, ptsList, roemList) {
  return winners.map((w, i) => ({ winner: w, points: ptsList[i], roem: roemList ? roemList[i] : 0, cards: [] }));
}
let r = KJ.scoreDeal(mk([0, 0, 0, 0, 1, 1, 1, 1], [20, 20, 20, 20, 20, 20, 20, 12]), 0);
eq([r.score, r.nat], [[0, 162], true], '80 tegen 82 (laatste slag +10) -> nat');
r = KJ.scoreDeal(mk([0, 0, 0, 0, 1, 1, 1, 1], [21, 20, 20, 20, 20, 20, 20, 11]), 0);
eq([r.score, r.nat], [[0, 162], true], '81 tegen 81 -> nat (speler moet méér hebben)');
r = KJ.scoreDeal(mk([0, 0, 0, 0, 1, 1, 1, 1], [22, 20, 20, 20, 20, 20, 20, 10]), 0);
eq([r.score, r.nat], [[82, 80], false], '82 tegen 80 -> gehaald');
r = KJ.scoreDeal(mk([0, 0, 0, 0, 0, 0, 0, 0], [20, 20, 20, 20, 20, 20, 20, 12]), 0);
eq([r.score, r.pit], [[262, 0], 0], 'pit +100');
r = KJ.scoreDeal(mk([0, 0, 0, 0, 1, 1, 1, 1], [20, 20, 20, 20, 20, 20, 20, 12], [0, 0, 0, 0, 20, 0, 0, 0]), 1);
eq([r.score, r.nat], [[80, 102], false], 'roem telt mee');
r = KJ.scoreDeal(mk([0, 0, 0, 0, 1, 1, 1, 1], [20, 20, 20, 20, 20, 20, 20, 12], [50, 0, 0, 0, 0, 0, 0, 0]), 1);
eq([r.score, r.nat], [[212, 0], true], 'nat: 162 + alle roem naar tegenpartij');

// --- spelverloop
const g = new KJ.Game({ seed: 1, variant: R });
g.newDeal();
eq(g.chooser, 0, 'Oost deelt, Zuid kiest');
eq(g.turnCard, g.hands[3][7], 'laatste kaart deler is gedraaid');
eq(g.bidOptions(0), [g.proposed, null], 'ronde 1: spelen of passen');
g.bid(0, null); g.bid(1, null); g.bid(2, null);
const res = g.bid(3, null);
eq([res.forced, g.round, g.turn], [true, 2, 0], 'iedereen past => kiezer verplicht');
same(g.bidOptions(0), KJ.SUITS.filter((s) => s !== g.proposed), 'verplicht: drie andere kleuren');
g.bid(0, g.bidOptions(0)[0]);
eq([g.phase, g.turn, g.playerSeat], ['playing', 0, 0], 'spel begint bij kiezer');
// speel uit met AI
while (g.phase === 'playing') {
  const s = g.turn;
  g.play(s, KJ.AI.policyMove(g.view(s), 'gemiddeld'));
}
eq(g.tricks.length, 8, '8 slagen');
eq(g.tricks.reduce((s, t) => s + t.points, 0), 152, 'kaartpunten tellen op tot 152');
eq(g.scores[0] + g.scores[1] >= 162, true, 'score >= 162');

console.log(fails ? `\n${fails} test(s) mislukt` : '\nalle tests geslaagd');
process.exit(fails ? 1 : 0);
