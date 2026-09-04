/* Klaverjas trainer – spelverloop (UI-onafhankelijk)
 * Zetels: 0 Zuid (jij), 1 West, 2 Noord (maat), 3 Oost. Team 0 = Zuid+Noord, team 1 = West+Oost.
 *
 * Bieden ("troef draaien"):
 *  - Na het delen wordt een troefkaart gedraaid; die kleur is de voorgestelde troef.
 *  - De kiezer (links van de deler) mag als eerste; iedereen mag in ronde 1 spelen of passen.
 *  - Passen alle vier? Dan MOET de kiezer een troef kiezen uit de drie overgebleven kleuren.
 * Instelling turnMode: 'dealer' = laatste kaart van de deler wordt gedraaid (iedereen ziet die kaart),
 *                       'los'   = los kaartje uit een tweede spel (geen informatie over handen).
 */
(function () {
  const KJ = globalThis.KJ;

  class Game {
    constructor(opts) {
      opts = opts || {};
      this.variant = opts.variant || 'rotterdams';
      this.turnMode = opts.turnMode || 'dealer';
      this.totalDeals = opts.totalDeals || 16;
      this.rng = KJ.makeRng(opts.seed != null ? opts.seed : (Math.random() * 2 ** 32) >>> 0);
      this.scores = [0, 0];
      this.dealNo = 0;
      this.dealer = opts.dealer != null ? opts.dealer : 3; // Oost deelt eerst => Zuid is kiezer
      this.phase = 'idle';
      this.results = [];
    }

    newDeal(hands, proposed) {
      this.dealNo++;
      if (this.dealNo > 1) this.dealer = KJ.next(this.dealer);
      this.hands = hands ? hands.map((h) => h.slice()) : KJ.deal(this.rng);
      if (this.turnMode === 'dealer') {
        this.turnCard = this.hands[this.dealer][7];
        this.proposed = proposed || this.turnCard[0];
      } else {
        this.turnCard = null;
        this.proposed = proposed || KJ.SUITS[Math.floor(this.rng() * 4)];
      }
      this.trump = null;
      this.playerSeat = null;
      this.round = 1;
      this.bids = [];
      this.phase = 'bidding';
      this.chooser = KJ.next(this.dealer);
      this.turn = this.chooser;
      this.trick = [];
      this.tricks = [];
      this.leader = this.chooser;
      this.played = [];
      this.voids = [new Set(), new Set(), new Set(), new Set()];
      this.discards = [[], [], [], []]; // vrij afgegooide kaarten (seinen)
      this.lastResult = null;
      this.trickNo = 0;
    }

    // Welke keuzes heeft een zetel nu?
    bidOptions(seat) {
      if (this.phase !== 'bidding' || seat !== this.turn) return [];
      if (this.round === 1) return [this.proposed, null];
      return KJ.SUITS.filter((s) => s !== this.proposed);
    }

    // suit = kleur (spelen) of null (passen)
    bid(seat, suit) {
      if (this.phase !== 'bidding' || seat !== this.turn) throw new Error('niet aan de beurt');
      const opts = this.bidOptions(seat);
      if (!opts.includes(suit)) throw new Error('ongeldige keuze');
      this.bids.push({ seat, suit: suit || null, round: this.round });
      if (suit) {
        this.trump = suit;
        this.playerSeat = seat;
        this.phase = 'playing';
        this.turn = this.leader = this.chooser;
        return { taken: true };
      }
      if (this.bids.length === 4) {
        this.round = 2;
        this.turn = this.chooser;
        return { forced: true };
      }
      this.turn = KJ.next(seat);
      return {};
    }

    legalMoves(seat) {
      return KJ.legalMoves(this.hands[seat], this.trick, this.trump, this.variant, seat);
    }

    play(seat, card) {
      if (this.phase !== 'playing' || seat !== this.turn) throw new Error('niet aan de beurt');
      const legal = this.legalMoves(seat);
      if (!legal.includes(card)) throw new Error('ongeldige kaart ' + card);
      const hand = this.hands[seat];
      if (this.trick.length) {
        const led = this.trick[0].card[0];
        if (card[0] !== led) {
          this.voids[seat].add(led);
          if (card[0] !== this.trump) {
            const winner = KJ.currentWinner(this.trick, this.trump);
            const partnerWinning = winner.seat === KJ.partner(seat);
            const trumpsOnTable = this.trick.filter((t) => t.card[0] === this.trump);
            if (this.variant === 'rotterdams') this.voids[seat].add(this.trump);
            else if (!partnerWinning && !trumpsOnTable.length) this.voids[seat].add(this.trump);
            if (partnerWinning || this.variant === 'rotterdams') this.discards[seat].push(card);
          }
        }
      }
      hand.splice(hand.indexOf(card), 1);
      this.trick.push({ seat, card });
      this.played.push(card);
      let done = null;
      if (this.trick.length === 4) {
        const winner = KJ.currentWinner(this.trick, this.trump);
        const cards = this.trick.map((t) => t.card);
        const { roem, parts } = KJ.trickRoem(cards, this.trump);
        const t = {
          leader: this.leader, winner: winner.seat, cards, plays: this.trick.slice(),
          points: KJ.trickPoints(cards, this.trump), roem, roemParts: parts,
        };
        this.tricks.push(t);
        this.trickNo++;
        done = t;
        this.trick = [];
        this.leader = this.turn = winner.seat;
        if (this.tricks.length === 8) this.finishDeal();
      } else {
        this.turn = KJ.next(seat);
      }
      return done;
    }

    finishDeal() {
      const r = KJ.scoreDeal(this.tricks, this.playerSeat);
      r.playerSeat = this.playerSeat;
      r.trump = this.trump;
      r.dealNo = this.dealNo;
      r.forced = this.round === 2;
      this.scores[0] += r.score[0];
      this.scores[1] += r.score[1];
      this.lastResult = r;
      this.results.push(r);
      this.phase = this.dealNo >= this.totalDeals ? 'gameover' : 'dealdone';
    }

    // Openbare informatie vanuit een zetel (voor AI en coach). Geen andermans kaarten!
    view(seat) {
      return {
        seat, hand: this.hands[seat].slice(), trump: this.trump, playerSeat: this.playerSeat,
        trick: this.trick.slice(), leader: this.leader, tricks: this.tricks, played: this.played.slice(),
        voids: this.voids.map((s) => new Set(s)), discards: this.discards.map((d) => d.slice()),
        variant: this.variant, handSizes: this.hands.map((h) => h.length), bids: this.bids.slice(),
        chooser: this.chooser, dealer: this.dealer, round: this.round, proposed: this.proposed,
        turnCard: this.turnCard, forced: this.round === 2,
      };
    }
  }

  KJ.Game = Game;
})();
