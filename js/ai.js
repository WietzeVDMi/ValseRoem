/* Klaverjas trainer – AI-spelers en analyse
 *
 * Niveaus:
 *  goed      : telt kaarten, seint en leest seinen, kiest zetten via Monte-Carlo-simulatie (determinisatie)
 *  gemiddeld : speelt op heuristiek, telt geen kaarten, seint niet, maakt af en toe een slordigheid
 *  slecht    : speelt half willekeurig, neemt te vaak/te weinig aan
 */
(function () {
  const KJ = globalThis.KJ;
  const AI = (KJ.AI = {});

  AI.LEVELS = {
    goed: { label: 'Goed', mc: true, samples: 24, signals: true, count: true, noise: 0 },
    gemiddeld: { label: 'Gemiddeld', mc: false, signals: false, count: false, noise: 0.15 },
    slecht: { label: 'Slecht', random: 0.55, signals: false, count: false, noise: 0 },
    // alleen voor tests: volledige heuristiek zonder Monte-Carlo
    heuristiek: { label: 'Heuristiek', hidden: true, mc: false, signals: true, count: true, noise: 0 },
  };

  /* ---------------- Analyse van de openbare situatie ---------------- */

  AI.analyze = function (v, opts) {
    opts = opts || {};
    const me = v.seat, partner = KJ.partner(me), trump = v.trump, myTeam = KJ.team(me);
    const playedSet = new Set(v.played);
    const handSet = new Set(v.hand);
    const unseen = [];
    for (const c of KJ.DECK) if (!playedSet.has(c) && !handSet.has(c)) unseen.push(c);
    const unseenBySuit = { K: [], R: [], H: [], S: [] };
    for (const c of unseen) unseenBySuit[c[0]].push(c);
    const handBySuit = { K: [], R: [], H: [], S: [] };
    for (const c of v.hand) handBySuit[c[0]].push(c);
    const count = opts.count !== false;

    // Is deze kaart (nu) de hoogste die nog in het spel is in zijn kleur?
    const isVrij = (c) => {
      if (!count) return c[0] === trump ? c[1] === 'J' : c[1] === 'A';
      const st = KJ.strength(c, trump);
      return !unseenBySuit[c[0]].some((u) => KJ.strength(u, trump) > st);
    };
    const higherUnseen = (c) => {
      if (!count) return c[0] === trump ? (c[1] === 'J' ? 0 : 2) : c[1] === 'A' ? 0 : 2;
      const st = KJ.strength(c, trump);
      return unseenBySuit[c[0]].filter((u) => KJ.strength(u, trump) > st).length;
    };

    const trick = v.trick;
    const led = trick.length ? trick[0].card[0] : null;
    const winner = trick.length ? KJ.currentWinner(trick, trump) : null;
    const partnerWinning = !!winner && winner.seat === partner;
    const after = [];
    for (let s = KJ.next(me); after.length < 3 - trick.length; s = KJ.next(s)) after.push(s);
    const oppsAfter = after.filter((s) => KJ.team(s) !== myTeam);
    const partnerAfter = after.includes(partner);
    const unseenTrumps = count ? unseenBySuit[trump].length : 8 - handBySuit[trump].length - (v.played.filter((c) => c[0] === trump).length);
    const myTeamPlaying = v.playerSeat != null && KJ.team(v.playerSeat) === myTeam;
    const partnerIsPlayer = v.playerSeat === partner;

    // seinen van de maat lezen
    const partnerLikes = new Set(), partnerDislikes = new Set();
    if (opts.signals) {
      for (const d of v.discards[partner] || []) {
        if (d[0] === trump) continue;
        if (KJ.natural(d) >= 2) partnerLikes.add(d[0]); else partnerDislikes.add(d[0]);
      }
    }

    const knownVoid = (seat, suit) => v.voids[seat].has(suit);
    // Kans dat een zetel geen kaart van deze kleur (meer) heeft
    const pVoid = (seat, suit) => {
      if (knownVoid(seat, suit)) return 1;
      if (!count) return 0.2;
      const gone = 8 - unseenBySuit[suit].length; // in mijn hand of gespeeld
      return Math.min(0.6, 0.05 + gone * 0.07);
    };

    // Kans dat een tegenstander die nog moet spelen, kaart c (die nu wint) verslaat
    const threat = (c, ledSuit) => {
      let pKeep = 1;
      for (const o of oppsAfter) {
        let p = 0;
        if (c[0] === trump) {
          const h = higherUnseen(c);
          p = h === 0 || knownVoid(o, trump) ? 0 : Math.min(0.9, 0.35 * h + (v.playerSeat === o ? 0.2 : 0));
        } else {
          const h = higherUnseen(c);
          const pHigher = knownVoid(o, ledSuit) || h === 0 ? 0 : Math.min(0.85, 0.35 * h);
          const pTrump = unseenTrumps > 0 && !knownVoid(o, trump) ? pVoid(o, ledSuit) * 0.85 : 0;
          p = Math.max(pHigher, pTrump);
        }
        pKeep *= 1 - p;
      }
      return 1 - pKeep;
    };

    return {
      me, partner, trump, myTeam, unseen, unseenBySuit, handBySuit, isVrij, higherUnseen, trick, led, winner,
      partnerWinning, after, oppsAfter, partnerAfter, unseenTrumps, myTeamPlaying, partnerIsPlayer,
      partnerLikes, partnerDislikes, knownVoid, pVoid, threat, lastToPlay: trick.length === 3, count,
      tricksLeft: 8 - v.tricks.length, holdsA: (s) => handSet.has(s + 'A'), holdsT: (s) => handSet.has(s + 'T'),
      hand: v.hand,
    };
  };

  /* ---------------- Heuristische kaartkeuze ---------------- */

  // Retour: {card, reason, scored:[{card, score, reason}]}
  AI.heuristic = function (v, opts) {
    opts = opts || {};
    const legal = KJ.legalMoves(v.hand, v.trick, v.trump, v.variant, v.seat);
    if (legal.length === 1) return { card: legal[0], reason: 'enige', scored: [{ card: legal[0], score: 0, reason: 'enige' }] };
    const a = AI.analyze(v, opts);
    const scored = v.trick.length ? legal.map((c) => AI.scoreFollow(c, a, v, opts)) : legal.map((c) => AI.scoreLead(c, a, v, opts));
    scored.sort((x, y) => y.score - x.score);
    return { card: scored[0].card, reason: scored[0].reason, scored };
  };

  AI.scoreLead = function (c, a, v, opts) {
    const trump = a.trump, suit = c[0], val = KJ.value(c, trump);
    const vrij = a.isVrij(c);
    let score = 0, reason = 'laag-uitkomen';
    if (suit === trump) {
      if (a.myTeamPlaying) {
        if (a.unseenTrumps === 0) { score = vrij ? 6 + val * 0.3 : -2; reason = 'troef-op'; }
        else if (vrij) { score = 30 + val * 0.2; reason = 'troef-trekken-hoog'; }
        else if (a.partnerIsPlayer) { score = 22 - val * 0.5; reason = 'troef-naar-maat'; }
        else if (a.hand.includes(trump + '9') && a.unseen.includes(trump + 'J') && val === 0) { score = 15; reason = 'boer-lokken'; }
        else if (a.handBySuit[trump].length >= 3) { score = 10 - val * 0.5; reason = 'troef-trekken-laag'; }
        else { score = -4 - val * 0.5; reason = 'troef-zwak'; }
      } else {
        score = vrij ? 10 + val * 0.4 : -10 - val * 0.3;
        reason = vrij ? 'vrije-troef' : 'geen-troef-tegen';
      }
      return { card: c, score, reason };
    }
    // bijkleur
    const oppVoidRisk = Math.max(...a.oppsAfter.map((o) => (a.unseenTrumps > 0 && !a.knownVoid(o, trump) ? a.pVoid(o, suit) : 0)), 0);
    if (vrij) {
      score = 16 + val * 0.6 - oppVoidRisk * 16;
      reason = 'vrije-kaart';
      if (!a.myTeamPlaying && a.unseenTrumps > 0) score += 3; // azen eerst tegen de speler
    } else if (val === 0) {
      score = 6;
      reason = 'laag-uitkomen';
      if (!a.myTeamPlaying) score += 2;
      if (a.higherUnseen(c) <= 1 && a.handBySuit[suit].length <= 2) score += 1;
    } else {
      score = -val * 0.7 - 2;
      reason = 'punten-weggeven';
    }
    if (a.partnerLikes.has(suit)) { score += 9; if (!vrij) reason = 'sein-maat'; }
    if (a.partnerDislikes.has(suit)) score -= 4;
    // maat kan troeven
    if (!a.myTeamPlaying && a.knownVoid(a.partner, suit) && !a.knownVoid(a.partner, trump) && a.unseenTrumps > 0 && !vrij) {
      score += 8; reason = 'maat-laten-troeven';
    }
    // tegenpartij (speler) troeft zeker
    if (a.oppsAfter.some((o) => a.knownVoid(o, suit) && !a.knownVoid(o, trump)) && a.unseenTrumps > 0) score -= 10;
    // kleur waar ik zelf nog de aas van heb maar lage kaart speel: houd de aas vrij
    return { card: c, score, reason };
  };

  AI.scoreFollow = function (c, a, v, opts) {
    const trump = a.trump, led = a.led;
    const val = KJ.value(c, trump);
    const newTrick = a.trick.concat([{ seat: a.me, card: c }]);
    const cards = newTrick.map((t) => t.card);
    const w = KJ.currentWinner(newTrick, trump);
    const ptsTable = KJ.trickPoints(cards, trump) + (a.tricksLeft === 1 ? 10 : 0);
    const roemNow = KJ.trickRoem(cards, trump).roem;
    const mine = KJ.team(w.seat) === a.myTeam;
    const iWin = w.seat === a.me;
    const vrij = a.isVrij(c);
    let score = 0, reason;

    if (mine) {
      const th = a.lastToPlay ? 0 : a.threat(w.card, led);
      const gain = ptsTable + roemNow;
      score = (1 - th) * gain - th * gain;
      if (iWin) {
        if (a.partnerWinning) {
          // maat had de slag al: overnemen alleen als nodig
          const thPartner = a.lastToPlay ? 0 : a.threat(a.winner.card, led);
          if (thPartner < 0.25) { score -= 12 + val * 0.5; reason = 'maat-overnemen-onnodig'; }
          else { score += 2; reason = 'overnemen'; }
        } else {
          reason = th < 0.3 ? 'winnen' : 'winnen-riskant';
          // goedkoop winnen: hoge kaart onnodig gebruiken kost later
          if (vrij && c[1] !== 'A' && c[0] !== trump) score -= 1;
          if (c[0] === trump && led !== trump) { score -= val * 0.4 + 2; reason = th < 0.3 ? 'introeven' : 'introeven-riskant'; }
          if (!a.lastToPlay && a.partnerAfter && th > 0.4) score -= 3;
        }
        if (vrij && th < 0.2) score += 1; // zekere slag
        // 'lead' pakken heeft waarde als ik nog troef kan trekken / vrije kaarten heb
        if (a.myTeamPlaying && a.handBySuit[trump].length > 1 && a.unseenTrumps > 0) score += 2;
      } else {
        // maat wint: smeren of laag bijgooien
        if (th < 0.3) {
          score += val * 0.9; // punten voor ons
          reason = val >= 10 ? 'smeren' : val > 0 ? 'punten-meegeven' : 'laag-bijgooien';
          if (vrij && c[0] !== trump && c[1] === 'A') score -= 9; // aas liever zelf later winnen
          if (c[0] === trump) score -= val * 0.9 + 3; // troef niet weggooien
        } else {
          score -= val * 0.8; // onzeker: geen punten weggeven
          reason = 'laag-bijgooien';
        }
      }
    } else {
      // tegenpartij wint nu
      let rescue = 0;
      if (a.partnerAfter) {
        // kan de maat de slag nog pakken?
        const h = a.higherUnseen(w.card);
        rescue = w.card[0] === trump ? (h > 0 ? 0.25 : 0) : Math.min(0.5, h * 0.15 + (a.knownVoid(a.partner, led) && a.unseenTrumps > 0 ? 0.4 : 0));
      }
      score = -val * (1 - rescue) * 0.9 - roemNow * 0.8;
      reason = 'laag-bijgooien';
      if (vrij && c[0] !== trump) score -= 8;
      if (c[0] === trump) score -= 2; // troef niet verspillen
      // seinen bij vrij afgooien
      if (c[0] !== led && opts.signals) {
        const hi = KJ.natural(c) >= 2;
        const strong = a.holdsA(c[0]) || (a.holdsT(c[0]) && a.isVrij(c[0] + 'T'));
        if (hi && strong) { score += 3; reason = 'seinen-hoog'; }
        if (hi && !strong) score -= 3;
        if (!hi && !strong) { score += 1.5; reason = 'seinen-laag'; }
        if (!hi && strong) score -= 2;
      }
      // Rotterdams: verplicht troeven op slag van maat is al in legal verwerkt
    }
    // roem: alleen tellen als de slag (waarschijnlijk) van ons wordt
    if (roemNow && mine && reason !== 'maat-overnemen-onnodig') reason = 'roem';
    return { card: c, score, reason };
  };

  /* ---------------- Simulatie (determinisatie) ---------------- */

  // Verdeel de onbekende kaarten over de andere spelers, consistent met bekende renonces
  AI.determinize = function (v, rng, policies) {
    const me = v.seat;
    const others = [0, 1, 2, 3].filter((s) => s !== me);
    const playedSet = new Set(v.played), handSet = new Set(v.hand);
    let unseen = KJ.DECK.filter((c) => !playedSet.has(c) && !handSet.has(c));
    const fixed = {};
    if (v.turnCard && v.dealer !== me && unseen.includes(v.turnCard)) fixed[v.turnCard] = v.dealer;
    const passers = new Set(v.bids.filter((b) => !b.suit && b.round === 1).map((b) => b.seat));
    // seinen: een goede speler die hoog afgooit in een kleur heeft daar waarschijnlijk de aas
    const signalAce = {};
    for (const s of others) {
      if (policies && policies[s] !== 'goed') continue;
      for (const d of v.discards[s] || []) if (d[0] !== v.trump && KJ.natural(d) >= 2) signalAce[d[0] + 'A'] = s;
    }
    for (let attempt = 0; attempt < 40; attempt++) {
      const room = {};
      for (const s of others) room[s] = v.handSizes[s];
      const hands = { [me]: v.hand.slice() };
      for (const s of others) hands[s] = [];
      let ok = true;
      const order = KJ.shuffle(unseen, rng);
      // eerst vaste kaarten, dan kaarten met de minste opties
      order.sort((x, y) => (fixed[x] ? -1 : 0) - (fixed[y] ? -1 : 0));
      for (const c of order) {
        let cand;
        if (fixed[c] != null) cand = room[fixed[c]] > 0 ? [fixed[c]] : [];
        else cand = others.filter((s) => room[s] > 0 && !v.voids[s].has(c[0]));
        if (!cand.length) { ok = false; break; }
        const weights = cand.map((s) => {
          let w = room[s];
          if (c[0] === v.trump && v.playerSeat === s) w *= 2.5;
          if (c[0] === v.proposed && passers.has(s) && (c[1] === 'J' || c[1] === '9')) w *= 0.5;
          if (signalAce[c] === s) w *= 6;
          return w;
        });
        const tot = weights.reduce((x, y) => x + y, 0);
        let r = rng() * tot, pick = cand[cand.length - 1];
        for (let i = 0; i < cand.length; i++) { r -= weights[i]; if (r <= 0) { pick = cand[i]; break; } }
        hands[pick].push(c);
        room[pick]--;
      }
      if (ok) return [0, 1, 2, 3].map((s) => hands[s]);
    }
    // fallback: negeer renonces
    const hands = { [me]: v.hand.slice() };
    let i = 0;
    for (const s of others) { hands[s] = unseen.slice(i, i + v.handSizes[s]); i += v.handSizes[s]; }
    return [0, 1, 2, 3].map((s) => hands[s]);
  };

  // Maak een speelbare kopie van de situatie met opgegeven handen
  AI.cloneGame = function (v, hands) {
    const g = Object.create(KJ.Game.prototype);
    g.variant = v.variant; g.turnMode = 'los'; g.totalDeals = 1;
    g.scores = [0, 0]; g.dealNo = 1; g.dealer = v.dealer; g.results = [];
    g.hands = hands.map((h) => h.slice());
    g.trump = v.trump; g.playerSeat = v.playerSeat; g.round = v.forced ? 2 : 1; g.bids = v.bids;
    g.phase = 'playing'; g.chooser = v.chooser; g.leader = v.leader;
    g.trick = v.trick.slice(); g.tricks = v.tricks.slice(); g.played = v.played.slice();
    g.voids = v.voids.map((s) => new Set(s)); g.discards = v.discards.map((d) => d.slice());
    g.turn = v.seat; g.trickNo = v.tricks.length; g.proposed = v.proposed; g.turnCard = null;
    return g;
  };

  // Snelle view zonder kopieën (alleen lezen!)
  AI.fastView = function (g, seat) {
    return {
      seat, hand: g.hands[seat], trump: g.trump, playerSeat: g.playerSeat, trick: g.trick, leader: g.leader,
      tricks: g.tricks, played: g.played, voids: g.voids, discards: g.discards, variant: g.variant,
      handSizes: [g.hands[0].length, g.hands[1].length, g.hands[2].length, g.hands[3].length], bids: g.bids,
      chooser: g.chooser, dealer: g.dealer, round: g.round, proposed: g.proposed, turnCard: null, forced: g.round === 2,
    };
  };

  // Speel het spel uit met heuristische spelers; retour: netto score voor team van `me`
  AI.rollout = function (g, me, policies, rng) {
    while (g.phase === 'playing') {
      const s = g.turn;
      const card = AI.policyMove(AI.fastView(g, s), policies[s], rng);
      g.play(s, card);
    }
    const r = g.lastResult;
    const t = KJ.team(me);
    return r.score[t] - r.score[1 - t];
  };

  // Zet volgens niveau, zonder Monte-Carlo (gebruikt in rollouts en voor gemiddeld/slecht)
  AI.policyMove = function (v, level, rng) {
    rng = rng || Math.random;
    const cfg = AI.LEVELS[level] || AI.LEVELS.goed;
    const legal = KJ.legalMoves(v.hand, v.trick, v.trump, v.variant, v.seat);
    if (legal.length === 1) return legal[0];
    if (cfg.random && rng() < cfg.random) return legal[Math.floor(rng() * legal.length)];
    if (cfg.random) {
      // naïef: winnen met de hoogste als het kan, anders de laagste
      if (v.trick.length) {
        const w = KJ.currentWinner(v.trick, v.trump);
        const led = v.trick[0].card[0];
        const winners = legal.filter((c) => KJ.beats(c, w.card, led, v.trump));
        if (winners.length) return winners.sort((x, y) => KJ.strength(y, v.trump) - KJ.strength(x, v.trump))[0];
        return legal.sort((x, y) => KJ.value(x, v.trump) - KJ.value(y, v.trump))[0];
      }
      return legal.sort((x, y) => KJ.strength(y, v.trump) - KJ.strength(x, v.trump))[0];
    }
    const h = AI.heuristic(v, { signals: cfg.signals, count: cfg.count });
    if (cfg.noise && rng() < cfg.noise && h.scored.length > 1) return h.scored[1].card;
    return h.card;
  };

  /* Monte-Carlo-evaluatie van alle legale kaarten.
   * policies: niveau per zetel voor de rollouts (zo houdt het advies rekening met een zwakke maat).
   * Retour: {card, evals:[{card, ev}], reason}
   */
  AI.monteCarlo = function (v, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const legal = KJ.legalMoves(v.hand, v.trick, v.trump, v.variant, v.seat);
    const h = AI.heuristic(v, { signals: true, count: true });
    if (legal.length === 1) return { card: legal[0], evals: [{ card: legal[0], ev: 0 }], reason: 'enige', heuristic: h };
    const policies = opts.policies || ['goed', 'goed', 'goed', 'goed'];
    const samples = opts.samples || 24;
    const vals = {};
    for (const c of legal) vals[c] = [];
    for (let i = 0; i < samples; i++) {
      const hands = AI.determinize(v, rng, policies);
      const seed = Math.floor(rng() * 1e9);
      for (const c of legal) {
        const g = AI.cloneGame(v, hands);
        g.play(v.seat, c);
        // zelfde toevalsreeks per kaart: gepaarde vergelijking (minder ruis)
        vals[c].push(AI.rollout(g, v.seat, policies, KJ.makeRng(seed)));
      }
    }
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const evals = legal.map((c) => ({ card: c, ev: mean(vals[c]) })).sort((x, y) => y.ev - x.ev);
    const best = evals[0];
    // gepaarde standaardfout van het verschil met de beste kaart
    for (const e of evals) {
      const d = vals[e.card].map((x, i) => vals[best.card][i] - x);
      const m = mean(d);
      const varr = d.length > 1 ? d.reduce((s, x) => s + (x - m) * (x - m), 0) / (d.length - 1) : 0;
      e.loss = m;
      e.se = Math.sqrt(varr / d.length);
    }
    // reden ophalen uit de heuristiek voor uitleg
    const hs = h.scored.find((s) => s.card === best.card);
    return { card: best.card, evals, reason: hs ? hs.reason : h.reason, heuristic: h };
  };

  // View overdraagbaar maken (Sets -> arrays) voor een Web Worker
  AI.viewToJSON = (v) => Object.assign({}, v, { voids: v.voids.map((x) => Array.from(x)) });
  AI.viewFromJSON = (j) => Object.assign({}, j, { voids: j.voids.map((x) => new Set(x)) });

  // Kaartkeuze voor een AI-zetel
  AI.chooseCard = function (game, seat, level, policies, rng) {
    const cfg = AI.LEVELS[level] || AI.LEVELS.gemiddeld;
    const v = game.view(seat);
    if (cfg.mc) return AI.monteCarlo(v, { samples: cfg.samples, policies, rng }).card;
    return AI.policyMove(v, level, rng);
  };

  /* ---------------- Bieden ---------------- */

  /* Beoordeel een hand met `suit` als troef. ctx: {seat, dealer, turnCard, chooser}
   * Retour {score, reasons:[], trumps, aces}
   */
  AI.evalSuit = function (hand, suit, ctx) {
    ctx = ctx || {};
    const reasons = [];
    const trumps = hand.filter((c) => c[0] === suit);
    const has = (r) => hand.includes(suit + r);
    let score = 0;
    if (has('J')) { score += 30; reasons.push('boer'); }
    if (has('9')) { score += has('J') ? 24 : 18; reasons.push('nel'); }
    if (has('A')) { score += 11; reasons.push('troefaas'); }
    if (has('T')) { score += 7; }
    if (has('K')) { score += 4; }
    if (has('Q')) { score += 3; }
    if (has('K') && has('Q')) { score += 8; reasons.push('stuk'); }
    score += trumps.filter((c) => '78'.includes(c[1])).length * 3;
    if (trumps.length >= 4) { score += (trumps.length - 3) * 5; reasons.push(trumps.length + ' troeven'); }
    if (trumps.length <= 1) { score -= 25; reasons.push(trumps.length === 0 ? 'geen troef' : 'maar één troef'); }
    else if (trumps.length === 2) score -= 6;
    // bijkaarten
    let aces = 0;
    for (const s of KJ.SUITS) {
      if (s === suit) continue;
      const hasA = hand.includes(s + 'A'), hasT = hand.includes(s + 'T'), hasK = hand.includes(s + 'K');
      if (hasA) { score += 10; aces++; }
      if (hasT) score += hasA ? 7 : 2;
      if (hasK) score += hasA ? 3 : 1;
    }
    if (aces) reasons.push(aces + (aces === 1 ? ' bijaas' : ' bijazen'));
    // bekende kaart van de deler
    if (ctx.turnCard && ctx.turnCard[0] === suit && ctx.dealer != null && ctx.dealer !== ctx.seat) {
      const r = ctx.turnCard[1];
      const w = r === 'J' ? 16 : r === '9' ? 10 : r === 'A' ? 5 : 2;
      if (KJ.partner(ctx.seat) === ctx.dealer) { score += w * 0.7; reasons.push('deler (maat) heeft ' + KJ.label(ctx.turnCard)); }
      else { score -= w; reasons.push('tegenstander heeft ' + KJ.label(ctx.turnCard)); }
    }
    return { score: Math.round(score), reasons, trumps: trumps.length, aces };
  };

  /* Drempels (gekalibreerd met simulaties, zie test/sim.js bid):
   * rond score 45 is spelen break-even. Maar passen is niet gratis:
   *  - de kiezer wordt verplicht als iedereen past => neemt eerder aan
   *  - de maat van de kiezer neemt ook iets eerder aan (beschermt de kiezer)
   *  - de tegenstanders van de kiezer kunnen rustig passen: dan wordt de kiezer verplicht
   */
  AI.bidThreshold = function (seat, chooser) {
    if (seat === chooser) return 38;
    if (seat === KJ.partner(chooser)) return 41;
    return 46;
  };

  // Beslissing voor een AI-zetel. Retour: kleur of null
  AI.decideBid = function (game, seat, level, rng) {
    rng = rng || Math.random;
    const opts = game.bidOptions(seat);
    const hand = game.hands[seat];
    const ctx = { seat, dealer: game.dealer, turnCard: game.turnCard, chooser: game.chooser };
    if (game.round === 2) {
      // verplicht: beste van de drie
      if (level === 'slecht') return opts.slice().sort((a, b) => hand.filter((c) => c[0] === b).length - hand.filter((c) => c[0] === a).length)[0];
      return opts.slice().sort((a, b) => AI.evalSuit(hand, b, ctx).score - AI.evalSuit(hand, a, ctx).score)[0];
    }
    const suit = game.proposed;
    if (level === 'slecht') {
      const n = hand.filter((c) => c[0] === suit).length;
      return hand.includes(suit + 'J') || n >= 3 || rng() < 0.15 ? suit : null;
    }
    const e = AI.evalSuit(hand, suit, ctx);
    let threshold = AI.bidThreshold(seat, game.chooser);
    if (level === 'gemiddeld') threshold = 42 + (rng() - 0.5) * 24;
    if (seat === game.chooser && level === 'goed') {
      // beter nu een redelijke kleur dan straks verplicht een slechtere
      const bestOther = Math.max(...KJ.SUITS.filter((s) => s !== suit).map((s) => AI.evalSuit(hand, s, ctx).score));
      if (e.score >= threshold - 6 && e.score >= bestOther) return suit;
    }
    return e.score >= threshold ? suit : null;
  };
})();
