/* Klaverjas trainer – spelregels: verplichte kaarten, slagwinnaar, roem, telling
 *
 * Aannames (instelbaar via variant):
 *  - Rotterdams: niet kunnen bekennen => troeven verplicht, ook als je maat de slag heeft.
 *    Overtroeven verplicht als het kan, anders ondertroeven verplicht.
 *    Troef uitgekomen => hogere troef spelen verplicht als het kan.
 *  - Amsterdams: niet kunnen bekennen en je maat heeft de slag => vrij (alles mag).
 *    Tegenpartij heeft de slag => troeven verplicht; overtroeven als het kan; kan dat niet, dan alles.
 *    Troef uitgekomen => hogere troef verplicht, behalve als je maat de slag heeft.
 */
(function () {
  const KJ = globalThis.KJ;

  // trick: [{seat, card}] in speelvolgorde
  KJ.currentWinner = function (trick, trump) {
    if (!trick.length) return null;
    const led = trick[0].card[0];
    let best = trick[0];
    for (let i = 1; i < trick.length; i++) {
      const t = trick[i];
      if (KJ.beats(t.card, best.card, led, trump)) best = t;
    }
    return best;
  };

  // Wint kaart a van kaart b, gegeven gevraagde kleur en troef?
  KJ.beats = function (a, b, led, trump) {
    const aT = a[0] === trump, bT = b[0] === trump;
    if (aT && !bT) return true;
    if (!aT && bT) return false;
    if (aT && bT) return KJ.ORDER_TRUMP[a[1]] > KJ.ORDER_TRUMP[b[1]];
    if (a[0] !== b[0]) return a[0] === led; // alleen gevraagde kleur telt
    return KJ.ORDER_PLAIN[a[1]] > KJ.ORDER_PLAIN[b[1]];
  };

  KJ.legalMoves = function (hand, trick, trump, variant, seat) {
    if (!trick.length) return hand.slice();
    const led = trick[0].card[0];
    const winner = KJ.currentWinner(trick, trump);
    const partnerWinning = winner.seat === KJ.partner(seat);
    const inSuit = hand.filter((c) => c[0] === led);
    const trumps = hand.filter((c) => c[0] === trump);
    const trumpsOnTable = trick.filter((t) => t.card[0] === trump).map((t) => t.card);
    const highestTrump = trumpsOnTable.length
      ? trumpsOnTable.reduce((m, c) => (KJ.ORDER_TRUMP[c[1]] > KJ.ORDER_TRUMP[m[1]] ? c : m))
      : null;
    const higherTrumps = highestTrump
      ? trumps.filter((c) => KJ.ORDER_TRUMP[c[1]] > KJ.ORDER_TRUMP[highestTrump[1]])
      : trumps;

    if (led === trump) {
      if (!trumps.length) return hand.slice();
      if (variant === 'amsterdams' && partnerWinning) return trumps;
      return higherTrumps.length ? higherTrumps : trumps;
    }
    if (inSuit.length) return inSuit;
    if (!trumps.length) return hand.slice();

    if (variant === 'rotterdams') {
      return higherTrumps.length ? higherTrumps : trumps;
    }
    // amsterdams
    if (partnerWinning) return hand.slice();
    if (higherTrumps.length) return higherTrumps;
    return hand.slice();
  };

  // Roem in één slag (4 kaarten)
  KJ.trickRoem = function (cards, trump) {
    let roem = 0;
    const parts = [];
    // reeksen per kleur
    const bySuit = {};
    for (const c of cards) (bySuit[c[0]] = bySuit[c[0]] || []).push(KJ.natural(c));
    for (const s in bySuit) {
      const idx = bySuit[s].sort((a, b) => a - b);
      let run = 1, best = 1;
      for (let i = 1; i < idx.length; i++) {
        if (idx[i] === idx[i - 1] + 1) { run++; best = Math.max(best, run); } else run = 1;
      }
      if (best === 3) { roem += 20; parts.push('driekaart ' + KJ.SUIT_SYMBOL[s] + ' (20)'); }
      if (best === 4) { roem += 50; parts.push('vierkaart ' + KJ.SUIT_SYMBOL[s] + ' (50)'); }
    }
    // vier gelijke
    if (cards.length === 4 && cards.every((c) => c[1] === cards[0][1])) {
      const r = cards[0][1];
      if (r === 'J') { roem += 200; parts.push('vier boeren (200)'); }
      else if ('TQKA'.includes(r)) { roem += 100; parts.push('vier ' + KJ.RANK_NAME[r] + 's (100)'); }
    }
    // stuk
    if (cards.includes(trump + 'K') && cards.includes(trump + 'Q')) {
      roem += 20; parts.push('stuk (20)');
    }
    return { roem, parts };
  };

  KJ.trickPoints = function (cards, trump) {
    return cards.reduce((s, c) => s + KJ.value(c, trump), 0);
  };

  /* Eindtelling van een spel.
   * tricks: [{winner, cards, points, roem}] (8 stuks), playerSeat: wie speelde.
   * Retour: {score:[team0, team1], nat, pit, detail}
   */
  KJ.scoreDeal = function (tricks, playerSeat) {
    const pts = [0, 0], roem = [0, 0], won = [0, 0];
    tricks.forEach((t, i) => {
      const team = KJ.team(t.winner);
      pts[team] += t.points + (i === 7 ? 10 : 0);
      roem[team] += t.roem;
      won[team]++;
    });
    const pTeam = KJ.team(playerSeat), oTeam = 1 - pTeam;
    const score = [0, 0];
    let nat = false, pit = -1;
    if (won[0] === 8) pit = 0; else if (won[1] === 8) pit = 1;
    const totalRoem = roem[0] + roem[1];
    if (pts[pTeam] + roem[pTeam] > pts[oTeam] + roem[oTeam]) {
      score[pTeam] = pts[pTeam] + roem[pTeam];
      score[oTeam] = pts[oTeam] + roem[oTeam];
    } else {
      nat = true;
      score[oTeam] = 162 + totalRoem;
      score[pTeam] = 0;
    }
    if (pit >= 0) score[pit] += 100;
    return { score, nat, pit, pts, roem, won };
  };
})();
