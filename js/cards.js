/* Klaverjas trainer – kaartdefinities en hulpfuncties
 * Een kaart is een string van 2 tekens: kleur + rang, bijv. 'HJ' = harten boer, 'ST' = schoppen 10.
 */
(function () {
  const KJ = (globalThis.KJ = globalThis.KJ || {});

  KJ.SUITS = ['K', 'R', 'H', 'S'];
  KJ.SUIT_SYMBOL = { K: '♣', R: '♦', H: '♥', S: '♠' };
  KJ.SUIT_NAME = { K: 'klaveren', R: 'ruiten', H: 'harten', S: 'schoppen' };
  KJ.SUIT_RED = { K: false, R: true, H: true, S: false };

  // Natuurlijke volgorde (voor roem/reeksen)
  KJ.RANKS = ['7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  KJ.RANK_LABEL = { 7: '7', 8: '8', 9: '9', T: '10', J: 'B', Q: 'V', K: 'H', A: 'A' };
  KJ.RANK_NAME = { 7: 'zeven', 8: 'acht', 9: 'negen', T: 'tien', J: 'boer', Q: 'vrouw', K: 'heer', A: 'aas' };

  // Sterkte: hoger = wint
  KJ.ORDER_PLAIN = { 7: 0, 8: 1, 9: 2, J: 3, Q: 4, K: 5, T: 6, A: 7 };
  KJ.ORDER_TRUMP = { 7: 0, 8: 1, Q: 2, K: 3, T: 4, A: 5, 9: 6, J: 7 };

  KJ.VALUE_PLAIN = { 7: 0, 8: 0, 9: 0, J: 2, Q: 3, K: 4, T: 10, A: 11 };
  KJ.VALUE_TRUMP = { 7: 0, 8: 0, Q: 3, K: 4, T: 10, A: 11, 9: 14, J: 20 };

  KJ.DECK = [];
  for (const s of KJ.SUITS) for (const r of KJ.RANKS) KJ.DECK.push(s + r);

  KJ.suit = (c) => c[0];
  KJ.rank = (c) => c[1];
  KJ.isTrump = (c, trump) => c[0] === trump;
  KJ.value = (c, trump) => (c[0] === trump ? KJ.VALUE_TRUMP : KJ.VALUE_PLAIN)[c[1]];
  KJ.strength = (c, trump) => (c[0] === trump ? KJ.ORDER_TRUMP : KJ.ORDER_PLAIN)[c[1]];
  KJ.natural = (c) => KJ.RANKS.indexOf(c[1]);

  KJ.label = (c) => KJ.SUIT_SYMBOL[c[0]] + KJ.RANK_LABEL[c[1]];
  KJ.name = (c) => KJ.SUIT_NAME[c[0]] + ' ' + KJ.RANK_NAME[c[1]];

  // Sorteer een hand voor weergave: per kleur (troef eerst), aflopend in sterkte
  KJ.sortHand = function (hand, trump) {
    const suitOrder = (s) => (s === trump ? -1 : KJ.SUITS.indexOf(s));
    return hand.slice().sort((a, b) => {
      const d = suitOrder(a[0]) - suitOrder(b[0]);
      if (d !== 0) return d;
      return KJ.strength(b, trump) - KJ.strength(a, trump);
    });
  };

  // Deterministische RNG (mulberry32) zodat scenario's herhaalbaar zijn
  KJ.makeRng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  KJ.shuffle = function (arr, rng) {
    rng = rng || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  KJ.deal = function (rng) {
    const d = KJ.shuffle(KJ.DECK, rng);
    return [d.slice(0, 8), d.slice(8, 16), d.slice(16, 24), d.slice(24, 32)];
  };

  KJ.partner = (seat) => (seat + 2) % 4;
  KJ.team = (seat) => seat % 2;
  KJ.next = (seat) => (seat + 1) % 4;
  KJ.SEAT_NAME = ['Zuid', 'West', 'Noord', 'Oost'];
})();
