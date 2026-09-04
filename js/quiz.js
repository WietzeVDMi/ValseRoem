/* Valse Roem – oefenscenario's en drills */
(function () {
  const KJ = globalThis.KJ;
  const AI = KJ.AI;
  const Quiz = (KJ.Quiz = {});

  /* Scenario's: jij bent Zuid (0), Noord (2) is je maat, West (1) en Oost (3) zijn tegenstanders.
   * history: eerdere slagen [{leader, cards}] (kaarten in speelvolgorde vanaf leader)
   * trick: kaarten in de huidige slag vóór jou (in speelvolgorde vanaf leader)
   */
  Quiz.SCENARIOS = [
    {
      id: 'smeren', type: 'card', title: 'Smeren', cat: 'Smeren',
      trump: 'S', playerSeat: 3, hand: ['HT', 'HJ', 'HK', 'S7', 'KK', 'K9', 'RQ', 'R8'],
      leader: 1, trick: ['H7', 'HA', 'H8'],
      text: 'Schoppen is troef (Oost speelt). West kwam uit met ♥7, je maat Noord legde ♥A, Oost ♥8. Jij speelt als laatste.',
      question: 'Welke kaart speel je?', answers: ['HT'],
      explanation: 'Je maat heeft de slag zeker (aas, en jij bent de laatste). Smeer je ♥10: 10 punten voor jullie. De ♥H is 4, de ♥B 2. Geen van je kaarten maakt een reeks met 7-8-A.',
    },
    {
      id: 'roemboven', type: 'card', title: 'Roem gaat vóór smeren', cat: 'Roem',
      trump: 'S', playerSeat: 3, hand: ['HT', 'H8', 'HK', 'S7', 'KK', 'K9', 'RQ', 'R8'],
      leader: 1, trick: ['H7', 'HA', 'H9'],
      text: 'Zelfde situatie, één kaart anders: West ♥7, je maat ♥A, Oost ♥9. Jij bent de laatste.',
      question: 'Welke kaart speel je?', answers: ['H8'],
      explanation: 'Smeren met de ♥10 is 10 punten. Maar ♥8 maakt met 7 en 9 een driekaart: 20 roem in de slag van je maat. Roem in eigen slag telt dubbel zo zwaar als een gesmeerde tien; en je ♥10 is daarna vrij (de aas is weg).',
    },
    {
      id: 'roemtegen', type: 'card', title: 'Roem tegen voorkomen', cat: 'Roem tegen',
      trump: 'S', playerSeat: 1, hand: ['R9', 'RK', 'H7', 'H8', 'K8', 'KJ', 'S7', 'SQ'],
      leader: 1, trick: ['R8', 'RQ', 'RT'],
      text: 'Schoppen is troef (West speelt). West kwam uit met ♦8, je maat ♦V, Oost ♦10. Oost ligt voor. Jij bent de laatste.',
      question: 'Je moet ruiten bekennen: ♦9 of ♦H?', answers: ['RK'],
      explanation: 'De ♦9 kost 0 punten maar maakt 8-9-10: een driekaart van 20 roem voor de tegenpartij. De ♦H kost 4 punten. Kijk vóór elke bijgooi: welke kaart maakt een reeks met wat er ligt?',
    },
    {
      id: 'trekken', type: 'card', title: 'Troef trekken', cat: 'Troef trekken',
      trump: 'K', playerSeat: 0, hand: ['KJ', 'K9', 'K8', 'K7', 'HA', 'HT', 'R8', 'SQ'],
      leader: 0, trick: [],
      text: 'Jij hebt klaveren aangenomen en komt uit voor de eerste slag.',
      question: 'Waarmee kom je uit?', answers: ['KJ'],
      explanation: 'Troef trekken met de boer. Iedereen moet troef bijspelen als hij kan; zo haal je de troeven eruit voordat je ♥A en ♥10 getroefd kunnen worden. Daarna volgt de nel.',
    },
    {
      id: 'naarmaat', type: 'card', title: 'Troef naar je maat', cat: 'Troef trekken',
      trump: 'H', playerSeat: 2, hand: ['H7', 'H8', 'SK', 'S7', 'RQ', 'R9', 'KK', 'K8'],
      leader: 0, trick: [],
      text: 'Jij was kiezer en paste, je maat Noord nam harten aan. Jij komt uit.',
      question: 'Waarmee kom je uit?', answers: ['H7', 'H8'],
      explanation: 'Speel troef naar je maat toe: hij heeft de sterke troeven en kan zo trekken. Zelf heb je niets vrij; met een heer of vrouw uitkomen geeft alleen punten weg.',
    },
    {
      id: 'azeneruit', type: 'card', title: 'Tegenspel: azen eruit', cat: 'Tegenspel',
      trump: 'S', playerSeat: 3, hand: ['HA', 'H7', 'RA', 'RQ', 'KT', 'K8', 'S8', 'SK'],
      leader: 0, trick: [],
      text: 'Oost speelt schoppen. Jij komt uit voor de eerste slag.',
      question: 'Waarmee kom je uit?', answers: ['HA', 'RA'],
      explanation: 'Speel je azen voordat de speler een kleur renonce wordt en gaat troeven. Geen troef spelen (dat helpt de speler) en niet je ♣10 (de aas loopt nog rond).',
    },
    {
      id: 'geentroef', type: 'card', title: 'Geen troef tegen de speler', cat: 'Tegenspel',
      trump: 'R', playerSeat: 1, hand: ['R8', 'R7', 'K7', 'K8', 'H9', 'HQ', 'SK', 'SJ'],
      leader: 0, trick: [],
      text: 'West speelt ruiten. Jij komt uit en hebt geen vrije kaart.',
      question: 'Waarmee kom je uit?', answers: ['K7', 'K8', 'H9'],
      explanation: 'Kom laag uit in een kleur waar je niets te verliezen hebt. Geen troef (je speelt de speler in de kaart), geen ♠H of ♥V (punten weggeven).',
    },
    {
      id: 'verplichttroef', type: 'card', title: 'Verplicht troeven op je maat', cat: 'Slag pakken',
      trump: 'S', playerSeat: 2, hand: ['S9', 'S7', 'SK', 'RA', 'R8', 'K9', 'K7', 'KQ'],
      leader: 1, trick: ['H7', 'HA', 'H8'],
      text: 'Schoppen is troef, je maat speelt. West kwam uit met ♥7, Noord legde ♥A, Oost ♥8. Jij hebt geen harten, dus je moet troeven (Rotterdams), en je bent de laatste.',
      question: 'Welke troef?', answers: ['S7', 'SK'],
      explanation: 'Je bent verplicht te troeven, ook op de aas van je maat. De slag is toch van jullie: doe het met je laagste troef (of met de heer om zijn 4 punten veilig te stellen), maar nooit met de nel. Die heb je nodig in de troefstrijd. Moet er nog een tegenstander ná je spelen, troef dan hoog genoeg om de slag te houden.',
    },
    {
      id: 'seinlezen', type: 'card', title: 'Een sein lezen', cat: 'Seinen',
      trump: 'K', playerSeat: 3, hand: ['H7', 'HQ', 'S8', 'S9', 'SK'],
      history: [{ leader: 3, cards: ['KJ', 'K7', 'KK', 'K9'] }, { leader: 3, cards: ['KA', 'K8', 'KT', 'KQ'] }, { leader: 3, cards: ['R7', 'RA', 'R8', 'H9'] }],
      leader: 0, trick: [],
      text: 'Klaveren is troef (Oost speelt). Oost trok twee keer troef: alle acht troeven zijn weg. Slag 3: Oost ♦7, jij ♦A, West ♦8, en je maat Noord kon niet bekennen: hij gooide ♥9 af. Jij won en komt uit.',
      question: 'Waarmee kom je uit?', answers: ['H7', 'HQ'],
      explanation: 'Een 9 of hoger afgooien betekent: "kom hier uit, ik heb de aas". Speel harten: je maat pakt de slag met ♥A en kan daarna zelf verder. Met ♠ uitkomen geef je de tegenpartij de slag voor niets.',
    },
    {
      id: 'nietsmeren', type: 'card', title: 'Niet smeren als het onveilig is', cat: 'Smeren',
      trump: 'S', playerSeat: 3, hand: ['RT', 'R9', 'HQ', 'H7', 'K8', 'K7', 'KJ'],
      history: [{ leader: 2, cards: ['RK', 'RQ', 'R7', 'S8'] }],
      leader: 2, trick: ['RA', 'R8'],
      text: 'Schoppen is troef (Oost speelt). In de eerste slag troefde West al een ruitenslag. Nu komt je maat met ♦A, Oost legt ♦8. West speelt na jou.',
      question: 'Welke ruiten leg je bij?', answers: ['R9'],
      explanation: 'West heeft geen ruiten meer en troeft (Rotterdams: verplicht). Smeer je ♦10 dan geef je 10 punten cadeau. Gooi de ♦9 bij en houd de 10 voor een veilige slag.',
    },
    {
      id: 'introeven', type: 'card', title: 'Goedkoop introeven', cat: 'Slag pakken',
      trump: 'H', playerSeat: 0, hand: ['HJ', 'HK', 'H7', 'RA', 'R9', 'S8', 'S7', 'RQ'],
      leader: 1, trick: ['KA', 'K7', 'KT'],
      text: 'Harten is troef, jij speelt. West kwam uit met ♣A, je maat ♣7, Oost ♣10. Jij hebt geen klaveren en speelt als laatste.',
      question: 'Welke troef?', answers: ['H7'],
      explanation: 'Er ligt 21 punten. Elke troef wint, dus troef met je laagste. Bewaar de boer voor het troef trekken.',
    },
    {
      id: 'stuk', type: 'card', title: 'Stuk maken', cat: 'Roem',
      trump: 'R', playerSeat: 2, hand: ['RK', 'R8', 'HA', 'H8', 'SQ', 'S9', 'K7', 'KT'],
      leader: 2, trick: ['RJ', 'RQ'],
      text: 'Ruiten is troef, je maat speelt en trekt met de boer. Oost legde ♦V bij. Troef gevraagd: je mag ♦H of ♦8 spelen.',
      question: 'Welke?', answers: ['RK'],
      explanation: 'De boer wint zeker. Met de ♦H maak je stuk: heer en vrouw van troef in één slag is 20 roem, plus 4 punten voor de heer. Gratis punten in een slag die toch van jullie is.',
    },
    {
      id: 'vierkaart', type: 'card', title: 'De vierkaart afmaken', cat: 'Roem',
      trump: 'S', playerSeat: 2, hand: ['K7', 'KQ', 'KJ', 'HA', 'H9', 'R8', 'S9', 'S7'],
      leader: 1, trick: ['K8', 'KT', 'K9'],
      text: 'Schoppen is troef, je maat speelt. West ♣8, je maat ♣10, Oost ♣9. Jij bent de laatste en moet klaveren bekennen.',
      question: 'Welke klaveren?', answers: ['K7', 'KJ'],
      explanation: 'Je maat wint met de 10. Met ♣7 (7-8-9-10) of ♣B (8-9-10-B) maak je een vierkaart: 50 roem. De ♣V geeft maar een driekaart (20).',
    },
    {
      id: 'vrijnietveilig', type: 'card', title: 'Tellen: vrij is niet hetzelfde als veilig', cat: 'Vrije kaarten',
      trump: 'S', playerSeat: 1, hand: ['HT', 'HK', 'K9', 'K8', 'K7', 'RQ'],
      history: [{ leader: 1, cards: ['HA', 'H7', 'H8', 'H9'] }, { leader: 1, cards: ['R7', 'R8', 'RJ', 'RA'] }],
      leader: 0, trick: [],
      text: 'Schoppen is troef (West speelt). Slag 1: West ♥A, Noord ♥7, Oost ♥8, jij ♥9. Slag 2: West ♦7, Noord ♦8, Oost ♦B, jij ♦A. Nu kom jij uit. Je ♥10 is de hoogste harten die nog in het spel is.',
      question: 'Waarmee kom je uit?', answers: ['K7', 'K8', 'K9'],
      explanation: 'Je ♥10 is vrij, maar niet veilig: er zijn al zes harten weg en jij hebt er twee. Er lopen er nog maar twee rond bij drie spelers, dus minstens één is renonce en West (de speler) heeft troef. Kom laag uit in klaveren en bewaar de ♥10 tot de troeven eruit zijn.',
    },
    {
      id: 'bid1', type: 'bid', title: 'Aannemen als tegenstander', cat: 'Aannemen',
      hand: ['SJ', 'S9', 'S7', 'HA', 'HT', 'R8', 'KQ', 'K7'], proposed: 'S', dealer: 2, chooser: 3,
      text: 'Schoppen wordt gedraaid (de deler is je maat Noord, zijn laatste kaart is ♠8). Oost is kiezer en past. Jij bent aan de beurt.',
      question: 'Spelen of passen?', answer: 'S',
      explanation: 'Boer, nel en nog een troef plus ♥A-10: dit is een topkaart (handwaarde ruim boven de drempel). Als tegenstander van de kiezer mag je kieskeurig zijn, maar dit is geen twijfelgeval.',
      turnCard: 'S8',
    },
    {
      id: 'bid2', type: 'bid', title: 'Passen ondanks de azen', cat: 'Aannemen',
      hand: ['SA', 'S8', 'HA', 'HK', 'RT', 'R9', 'KQ', 'K8'], proposed: 'S', dealer: 3, chooser: 0,
      text: 'Schoppen wordt gedraaid; Oost (deler) heeft ♠V. Jij bent kiezer.',
      question: 'Spelen of passen?', answer: null,
      explanation: 'Twee troeven zonder boer of nel: je verliest de troefstrijd en de tegenpartij troeft je azen. Passen, ook al ben je kiezer. Word je verplicht, kies dan harten (aas + heer) en pak je azen vroeg.',
      turnCard: 'SQ',
    },
    {
      id: 'bid3', type: 'bid', title: 'De kiezer met een redelijke hand', cat: 'Aannemen',
      hand: ['HJ', 'H8', 'H7', 'RA', 'RK', 'S9', 'K9', 'K7'], proposed: 'H', dealer: 3, chooser: 0,
      text: 'Harten wordt gedraaid; Oost (deler) heeft ♥10. Jij bent kiezer.',
      question: 'Spelen of passen?', answer: 'H',
      explanation: 'Boer met twee kleine troeven en ♦A-H. Krap, maar als kiezer word je verplicht als iedereen past, en dan zijn de andere kleuren slechter. Nu spelen is beter dan straks gedwongen.',
      turnCard: 'HT',
    },
  ];

  // Bouw een view (zoals Game.view(0)) uit een scenario
  Quiz.buildView = function (sc) {
    const trump = sc.trump;
    const voids = [new Set(), new Set(), new Set(), new Set()];
    const discards = [[], [], [], []];
    const played = [];
    const tricks = [];
    const register = (leader, cards) => {
      const trick = [];
      if (!cards.length) return trick;
      const led = cards[0][0];
      cards.forEach((card, i) => {
        const seat = (leader + i) % 4;
        if (card[0] !== led) {
          voids[seat].add(led);
          if (card[0] !== trump) { voids[seat].add(trump); discards[seat].push(card); }
        }
        trick.push({ seat, card });
        played.push(card);
      });
      return trick;
    };
    for (const h of sc.history || []) {
      const t = register(h.leader, h.cards);
      const w = KJ.currentWinner(t, trump);
      tricks.push({ leader: h.leader, winner: w.seat, cards: h.cards, plays: t, points: KJ.trickPoints(h.cards, trump), roem: KJ.trickRoem(h.cards, trump).roem });
    }
    const trick = register(sc.leader, sc.trick || []);
    // handgroottes: 8 - aantal gespeelde kaarten per zetel
    const perSeat = [0, 0, 0, 0];
    for (const t of tricks) t.plays.forEach((p) => perSeat[p.seat]++);
    trick.forEach((p) => perSeat[p.seat]++);
    return {
      seat: 0, hand: sc.hand.slice(), trump, playerSeat: sc.playerSeat, trick, leader: sc.leader, tricks, played,
      voids, discards, variant: 'rotterdams', handSizes: perSeat.map((n) => 8 - n), bids: [], chooser: 0, dealer: 3,
      round: 1, proposed: trump, turnCard: null, forced: false,
    };
  };

  Quiz.legal = function (sc) {
    const v = Quiz.buildView(sc);
    return KJ.legalMoves(v.hand, v.trick, v.trump, v.variant, 0);
  };

  /* ---------- Drills ---------- */

  // Bied-drill: willekeurige hand en rol
  Quiz.bidDrill = function (rng) {
    rng = rng || Math.random;
    const g = new KJ.Game({ seed: Math.floor(rng() * 1e9), dealer: Math.floor(rng() * 4) });
    g.newDeal();
    // laat AI's vóór Zuid beslissen (goed niveau) tot Zuid aan de beurt is of iemand speelt
    while (g.phase === 'bidding' && g.turn !== 0) g.bid(g.turn, AI.decideBid(g, g.turn, 'goed', rng));
    if (g.phase !== 'bidding') return Quiz.bidDrill(rng);
    return { game: g, advice: KJ.Coach.bidAdvice(g, 0) };
  };

  // Zet-drill: speel met goede AI's tot Zuid aan de beurt is met een echte keuze
  Quiz.moveDrill = function (rng, policies) {
    rng = rng || Math.random;
    policies = policies || ['goed', 'goed', 'goed', 'goed'];
    for (let tries = 0; tries < 20; tries++) {
      const g = new KJ.Game({ seed: Math.floor(rng() * 1e9), dealer: Math.floor(rng() * 4) });
      g.newDeal();
      while (g.phase === 'bidding') g.bid(g.turn, AI.decideBid(g, g.turn, 'goed', rng));
      const targetTrick = Math.floor(rng() * 7);
      while (g.phase === 'playing') {
        if (g.turn === 0 && g.tricks.length >= targetTrick && g.legalMoves(0).length >= 2) {
          return { game: g, view: g.view(0), policies };
        }
        g.play(g.turn, AI.policyMove(g.view(g.turn), g.turn === 0 ? 'heuristiek' : (policies[g.turn] === 'goed' ? 'heuristiek' : policies[g.turn]), rng));
      }
    }
    return null;
  };

  // Tel-drill: speel k slagen en stel een telvraag
  Quiz.countDrill = function (rng) {
    rng = rng || Math.random;
    const g = new KJ.Game({ seed: Math.floor(rng() * 1e9), dealer: Math.floor(rng() * 4) });
    g.newDeal();
    while (g.phase === 'bidding') g.bid(g.turn, AI.decideBid(g, g.turn, 'gemiddeld', rng));
    const k = 2 + Math.floor(rng() * 4);
    while (g.phase === 'playing' && g.tricks.length < k) g.play(g.turn, AI.policyMove(g.view(g.turn), 'gemiddeld', rng));
    // vraag zolang de slag leeg is (net na een complete slag)
    const v = g.view(0);
    const a = AI.analyze(v, { count: true, signals: false });
    const questions = [];
    questions.push({ q: `Hoeveel troeven (${KJ.SUIT_SYMBOL[v.trump]}) zitten er nog bij de andere drie spelers?`, answer: a.unseenTrumps, type: 'number' });
    const suits = KJ.SUITS.filter((s) => s !== v.trump);
    const s = suits[Math.floor(rng() * suits.length)];
    const hi = a.unseenBySuit[s].concat(v.hand.filter((c) => c[0] === s)).sort((x, y) => KJ.strength(y, v.trump) - KJ.strength(x, v.trump))[0];
    questions.push({ q: `Wat is de hoogste ${KJ.SUIT_SYMBOL[s]} die nog in het spel is (bij jou of bij een ander)?`, answer: hi ? hi : 'geen', type: 'card', suit: s });
    const seats = [1, 2, 3].filter((x) => v.voids[x].size);
    if (seats.length) {
      const st = seats[Math.floor(rng() * seats.length)];
      questions.push({ q: `Van welke kleur(en) weet je zeker dat ${KJ.SEAT_NAME[st]} ze niet meer heeft?`, answer: [...v.voids[st]], type: 'suits' });
    }
    return { game: g, view: v, questions };
  };
})();
