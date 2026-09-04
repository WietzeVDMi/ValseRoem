/* Klaverjas trainer – de coach: advies, beoordeling en uitleg */
(function () {
  const KJ = globalThis.KJ;
  const AI = KJ.AI;
  const Coach = (KJ.Coach = {});

  const L = KJ.label;

  Coach.REASONS = {
    'troef-trekken-hoog': { cat: 'Troef trekken', text: 'Troef trekken met je hoogste troef. Zo haal je de troeven van de tegenpartij eruit voordat ze je azen introeven.' },
    'troef-naar-maat': { cat: 'Troef trekken', text: 'Je maat speelt: speel troef naar je maat toe, zodat die troef kan trekken.' },
    'boer-lokken': { cat: 'Troef trekken', text: 'Kleine troef om de boer eruit te lokken. Jij houdt de nel (troef 9) achter de hand.' },
    'troef-trekken-laag': { cat: 'Troef trekken', text: 'Met veel troeven kun je laag troef trekken; je maat of jij pakt hem later hoger op.' },
    'troef-op': { cat: 'Troef trekken', text: 'De tegenpartij heeft geen troef meer: nu zijn je troeven gewoon vrije kaarten.' },
    'troef-zwak': { cat: 'Troef trekken', text: 'Troef uitkomen met een zwakke troefhand is meestal onverstandig.' },
    'vrije-troef': { cat: 'Vrije kaarten', text: 'Deze troef is de hoogste die nog in het spel is: een zekere slag.' },
    'geen-troef-tegen': { cat: 'Tegenspel', text: 'Kom niet uit in troef tegen de speler: je speelt hem zijn troeven in handen.' },
    'vrije-kaart': { cat: 'Vrije kaarten', text: 'Vrije kaart: de hoogste die nog in het spel is. Pak de punten voordat iemand kan troeven.' },
    'laag-uitkomen': { cat: 'Uitkomen', text: 'Laag uitkomen in een kleur waar je niets te verliezen hebt; laat de anderen maar werken.' },
    'punten-weggeven': { cat: 'Punten weggeven', text: 'Met deze kaart geef je punten weg zonder dat er een slag tegenover staat.' },
    'sein-maat': { cat: 'Seinen', text: 'Je maat heeft om deze kleur gevraagd (hoge kaart afgegooid): speel die kleur.' },
    'maat-laten-troeven': { cat: 'Tegenspel', text: 'Je maat heeft deze kleur niet meer en kan troeven.' },
    smeren: { cat: 'Smeren', text: 'Je maat heeft de slag zeker: smeer je punten (10 of aas) erbij.' },
    'punten-meegeven': { cat: 'Smeren', text: 'Je maat heeft de slag: geef punten mee.' },
    'laag-bijgooien': { cat: 'Punten weggeven', text: 'Deze slag is niet van jullie (of niet zeker): gooi zo laag mogelijk bij.' },
    winnen: { cat: 'Slag pakken', text: 'Pak de slag: dit is een veilige winnende kaart.' },
    'winnen-riskant': { cat: 'Slag pakken', text: 'Probeer de slag te pakken, al kan er nog iemand overheen.' },
    introeven: { cat: 'Slag pakken', text: 'Introeven: met een troef pak je de punten van de tegenpartij.' },
    'introeven-riskant': { cat: 'Slag pakken', text: 'Introeven, met het risico dat er wordt overtroefd.' },
    overnemen: { cat: 'Maat overnemen', text: 'Je maat lag voor, maar niet veilig: neem de slag over met een zekere kaart.' },
    'maat-overnemen-onnodig': { cat: 'Maat overnemen', text: 'Je maat had de slag al veilig; je verspilt een hoge kaart door hem te overtroeven/overnemen.' },
    'seinen-hoog': { cat: 'Seinen', text: 'Vrij afgooien: met een hoge kaart (9 of hoger) vraag je je maat om deze kleur te spelen (je hebt daar de aas).' },
    'seinen-laag': { cat: 'Seinen', text: 'Vrij afgooien: een 7 of 8 zegt tegen je maat "hier heb ik niets".' },
    roem: { cat: 'Roem', text: 'Deze kaart maakt roem in een slag die van jullie wordt.' },
    enige: { cat: '', text: 'Je had geen keuze.' },
  };

  // Tekst als deze kaart de beste keuze is (negatieve redenen krijgen een mildere formulering)
  Coach.BEST_TEXT = {
    'punten-weggeven': 'Er is geen goede uitkomst; deze kaart kost het minst.',
    'laag-bijgooien': 'Deze slag is niet van jullie: zo laag mogelijk bijgooien.',
    'troef-zwak': 'Niets beters voorhanden; de minst schadelijke kaart.',
    'geen-troef-tegen': 'De minst schadelijke kaart in deze situatie.',
    'winnen-riskant': 'Pak de slag; er kan nog iemand overheen, maar de alternatieven zijn slechter.',
    'introeven-riskant': 'Introeven is hier het beste, ook al kan er overtroefd worden.',
  };
  Coach.reasonText = (tag, asBest) => (asBest && Coach.BEST_TEXT[tag]) || (Coach.REASONS[tag] || { text: '' }).text;
  Coach.reasonCat = (tag) => (Coach.REASONS[tag] || { cat: 'Overig' }).cat || 'Overig';

  /* ---------- Bieden ---------- */

  Coach.roleName = function (seat, chooser) {
    if (seat === chooser) return 'kiezer';
    if (seat === KJ.partner(chooser)) return 'maat van de kiezer';
    return 'tegenstander van de kiezer';
  };

  Coach.bidAdvice = function (game, seat) {
    const hand = game.hands[seat];
    const ctx = { seat, dealer: game.dealer, turnCard: game.turnCard, chooser: game.chooser };
    const role = Coach.roleName(seat, game.chooser);
    const suits = game.round === 1 ? [game.proposed] : game.bidOptions(seat);
    const evals = suits.map((s) => Object.assign({ suit: s }, AI.evalSuit(hand, s, ctx))).sort((a, b) => b.score - a.score);
    const th = AI.bidThreshold(seat, game.chooser);
    const lines = [];
    let advice, verdictSuit = null;
    if (game.round === 1) {
      const e = evals[0];
      const s = e.suit;
      lines.push(`Je bent ${role}. Gedraaid: ${KJ.SUIT_SYMBOL[s]} ${KJ.SUIT_NAME[s]}.` + (game.turnCard ? ` De deler (${KJ.SEAT_NAME[game.dealer]}) heeft ${L(game.turnCard)}.` : ''));
      lines.push(`Handwaarde met ${KJ.SUIT_SYMBOL[s]} als troef: ${e.score} (${e.reasons.join(', ') || 'weinig'}).`);
      if (seat === game.chooser) {
        const bestOther = KJ.SUITS.filter((x) => x !== s).map((x) => Object.assign({ suit: x }, AI.evalSuit(hand, x, ctx))).sort((a, b) => b.score - a.score)[0];
        lines.push(`Let op: als iedereen past moet jij kiezen uit de andere drie. Je beste alternatief is dan ${KJ.SUIT_SYMBOL[bestOther.suit]} (${bestOther.score}).`);
        if (e.score >= th || (e.score >= th - 6 && e.score >= bestOther.score)) { advice = 'spelen'; verdictSuit = s; }
        else advice = 'passen';
      } else {
        if (seat === KJ.partner(game.chooser)) lines.push('Als jij past en de tegenstanders ook, wordt je maat verplicht. Neem daarom een redelijke hand aan.');
        else lines.push('Passen kost jou niets: als iedereen past wordt de kiezer (tegenstander) verplicht. Speel alleen met een echt goede hand.');
        advice = e.score >= th ? 'spelen' : 'passen';
        if (advice === 'spelen') verdictSuit = s;
      }
      const margin = e.score - th;
      lines.push(advice === 'spelen'
        ? (margin > 12 ? `Advies: spelen. Duidelijk sterk genoeg.` : `Advies: spelen, al is het krap.`)
        : (margin > -8 ? `Advies: passen, al is het een twijfelgeval.` : `Advies: passen. Te weinig troefkracht.`));
    } else {
      lines.push(`Iedereen paste: je bent verplicht een van de drie andere kleuren te kiezen.`);
      for (const e of evals) lines.push(`${KJ.SUIT_SYMBOL[e.suit]} ${KJ.SUIT_NAME[e.suit]}: ${e.score} (${e.reasons.join(', ') || 'niets'})`);
      advice = 'spelen'; verdictSuit = evals[0].suit;
      lines.push(`Advies: ${KJ.SUIT_SYMBOL[verdictSuit]} ${KJ.SUIT_NAME[verdictSuit]}.` + (evals[0].score < 30 ? ' Slechte hand: probeer vooral nat te vermijden door je azen vroeg te pakken.' : ''));
    }
    return { role, evals, threshold: th, advice, suit: verdictSuit, lines };
  };

  // Beoordeel de gemaakte biedkeuze. Retour null als in orde, anders {text, cat}
  Coach.reviewBid = function (advice, chosenSuit, round) {
    if (round === 1) {
      if (advice.advice === 'spelen' && !chosenSuit) return { cat: 'Aannemen', text: 'Je paste met een hand die sterk genoeg was om te spelen (' + advice.evals[0].score + ').' };
      if (advice.advice === 'passen' && chosenSuit) return { cat: 'Aannemen', text: 'Je nam aan met een te zwakke hand (' + advice.evals[0].score + ', drempel ' + advice.threshold + '). Kans op nat.' };
      return null;
    }
    if (chosenSuit !== advice.suit) {
      const e = advice.evals.find((x) => x.suit === chosenSuit);
      const b = advice.evals[0];
      if (b.score - e.score >= 8) return { cat: 'Aannemen', text: `${KJ.SUIT_SYMBOL[b.suit]} (${b.score}) was een betere troefkeuze dan ${KJ.SUIT_SYMBOL[chosenSuit]} (${e.score}).` };
    }
    return null;
  };

  /* ---------- Kaartkeuze ---------- */

  // Situatiebeschrijving in woorden
  Coach.describe = function (v) {
    const a = AI.analyze(v, { signals: true, count: true });
    const parts = [];
    if (v.trick.length) {
      const w = a.winner;
      const who = w.seat === a.partner ? 'je maat' : KJ.team(w.seat) === a.myTeam ? 'jij' : KJ.SEAT_NAME[w.seat];
      parts.push(`${KJ.SUIT_SYMBOL[a.led]} gevraagd, ${who} ligt voor met ${L(w.card)}.`);
      const pts = KJ.trickPoints(v.trick.map((t) => t.card), v.trump);
      parts.push(`Er ligt ${pts} punt${pts === 1 ? '' : 'en'} op tafel.`);
      if (a.partnerWinning && !a.lastToPlay) {
        const th = a.threat(w.card, a.led);
        parts.push(th < 0.25 ? 'De slag van je maat lijkt veilig.' : 'De slag van je maat is niet zeker.');
      }
      if (a.lastToPlay) parts.push('Jij speelt als laatste.');
    } else {
      parts.push('Jij komt uit.');
    }
    parts.push(`Troef (${KJ.SUIT_SYMBOL[v.trump]}) nog bij anderen: ${a.unseenTrumps}.`);
    const vrij = v.hand.filter((c) => a.isVrij(c));
    if (vrij.length) parts.push('Vrije kaarten in je hand: ' + vrij.map(L).join(' ') + '.');
    if (a.partnerLikes.size) parts.push('Je maat vroeg om: ' + [...a.partnerLikes].map((s) => KJ.SUIT_SYMBOL[s]).join(' ') + '.');
    return { text: parts.join(' '), analysis: a };
  };

  /* Analyse van alle legale kaarten: Monte-Carlo + heuristische redenen.
   * policies: niveau per zetel (zodat het advies rekening houdt met de kwaliteit van je maat).
   */
  Coach.analyzeMove = function (v, policies, samples) {
    const mc = AI.monteCarlo(v, { samples: samples || 40, policies });
    const reasons = {};
    for (const s of mc.heuristic.scored) reasons[s.card] = s.reason;
    return { mc, reasons, evals: mc.evals, best: mc.evals[0] };
  };

  Coach.hint = function (v, policies, samples) {
    const an = Coach.analyzeMove(v, policies, samples);
    const d = Coach.describe(v);
    const best = an.best;
    const lines = [d.text];
    if (an.evals.length === 1) lines.push('Je hebt maar één toegestane kaart: ' + L(best.card) + '.');
    else {
      lines.push(`Advies: ${L(best.card)}. ${Coach.reasonText(an.reasons[best.card], true)}`);
      const alt = an.evals[1];
      if (alt && best.ev - alt.ev < 4) lines.push(`${L(alt.card)} is bijna even goed.`);
      const worst = an.evals[an.evals.length - 1];
      if (worst && best.ev - worst.ev > 15) lines.push(`Vermijd ${L(worst.card)}: dat kost gemiddeld ${Math.round(best.ev - worst.ev)} punten.`);
    }
    return { lines, analysis: an, best };
  };

  /* Beoordeel een gespeelde kaart. Retour {grade:'goed'|'onnauwkeurig'|'fout', loss, text, cat, best}
   * an = Coach.analyzeMove(...) berekend vóór de zet.
   */
  Coach.review = function (v, an, card, policies) {
    const played = an.evals.find((e) => e.card === card);
    const best = an.best;
    const loss = best.ev - played.ev;
    const se = played.se || 0;
    const d = Coach.describe(v);
    const bestReason = an.reasons[best.card], playedReason = an.reasons[card];
    // alleen een fout noemen als het verschil duidelijk boven de simulatieruis uitkomt
    let grade = loss >= Math.max(15, 3 * se) ? 'fout' : loss >= Math.max(8, 2.5 * se) ? 'onnauwkeurig' : 'goed';
    if (an.evals.length === 1) grade = 'goed';
    let cat = Coach.reasonCat(bestReason);
    // roem tegen: gaf de gespeelde kaart roem aan de tegenpartij die te vermijden was?
    const a = d.analysis;
    if (v.trick.length) {
      const nt = v.trick.concat([{ seat: v.seat, card }]);
      const cards = nt.map((t) => t.card);
      const w = KJ.currentWinner(nt, v.trump);
      const r = KJ.trickRoem(cards, v.trump).roem;
      if (r && KJ.team(w.seat) !== a.myTeam) {
        const bestRoem = KJ.trickRoem(v.trick.concat([{ seat: v.seat, card: best.card }]).map((t) => t.card), v.trump).roem;
        if (bestRoem < r) { cat = 'Roem tegen'; if (grade === 'goed') grade = 'onnauwkeurig'; }
      }
    }
    let text;
    if (grade === 'goed') {
      text = card === best.card ? `Goed: ${L(card)}. ${Coach.reasonText(playedReason, true)}` : `Prima: ${L(card)} is vrijwel even goed als ${L(best.card)}.`;
    } else {
      text = `${grade === 'fout' ? 'Fout' : 'Onnauwkeurig'}: ${L(card)} kost gemiddeld ${Math.round(loss)} punten t.o.v. ${L(best.card)}. `;
      if (cat === 'Roem tegen') text += 'Je gaf de tegenpartij vermijdbare roem. ';
      text += Coach.reasonText(bestReason, true);
      if (playedReason && playedReason !== bestReason && Coach.reasonText(playedReason)) text += ` (Jouw kaart: ${Coach.reasonText(playedReason).replace(/\.$/, '').toLowerCase()}.)`;
      text += Coach.partnerTip(cat, policies, v);
    }
    return { grade, loss, text, cat, best: best.card, situation: d.text };
  };

  // Extra tip afhankelijk van het niveau van je maat
  Coach.partnerTip = function (cat, policies, v) {
    const p = policies ? policies[KJ.partner(v.seat)] : 'goed';
    if (p === 'slecht') {
      if (cat === 'Seinen') return ' Met een zwakke maat hebben seinen weinig zin: die leest ze toch niet.';
      if (cat === 'Smeren') return ' Bij een zwakke maat: smeer alleen als de slag écht zeker is.';
      if (cat === 'Slag pakken' || cat === 'Maat overnemen') return ' Met een zwakke maat pak je zelf de zekere slagen; reken niet op je maat.';
      if (cat === 'Troef trekken') return ' Met een zwakke maat moet jij de troefcontrole houden.';
    }
    if (p === 'gemiddeld') {
      if (cat === 'Seinen') return ' Een gemiddelde maat mist seinen soms; maak ze extra duidelijk (7 of 8 = niets, 9+ = kom hier).';
    }
    return '';
  };

  /* Samenvatting van een spel: roem tegen, nat, fouten */
  Coach.dealSummary = function (game, myTeam, reviews) {
    const r = game.lastResult;
    const opp = 1 - myTeam;
    const lines = [];
    const playing = KJ.team(r.playerSeat) === myTeam;
    lines.push(`${playing ? 'Jullie speelden' : 'De tegenpartij speelde'} ${KJ.SUIT_SYMBOL[r.trump]}${r.forced ? ' (verplicht)' : ''}. Kaartpunten ${r.pts[myTeam]} tegen ${r.pts[opp]}, roem ${r.roem[myTeam]} tegen ${r.roem[opp]}.`);
    if (r.nat) lines.push(playing ? 'Nat! Alle punten en roem gaan naar de tegenpartij.' : 'De tegenpartij ging nat: alles voor jullie.');
    if (r.pit >= 0) lines.push(r.pit === myTeam ? 'Pit! +100.' : 'Pit tegen: +100 voor hen.');
    if (r.roem[opp] >= 40) lines.push(`Roem tegen: ${r.roem[opp]}. Kijk in het slagoverzicht welke slagen roem opleverden en of je die kon vermijden.`);
    const mistakes = (reviews || []).filter((x) => x.grade !== 'goed');
    if (mistakes.length) lines.push(`Verbeterpunten: ${mistakes.length} (${mistakes.map((m) => m.cat).filter((c, i, arr) => arr.indexOf(c) === i).join(', ')}).`);
    else if (reviews && reviews.length) lines.push('Geen fouten gevonden in jouw zetten. Netjes.');
    return lines;
  };
})();
