/* Valse Roem – gebruikersinterface */
(function () {
  const KJ = globalThis.KJ, AI = KJ.AI, Coach = KJ.Coach, Quiz = KJ.Quiz;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- opslag ---------- */
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ? Object.assign({}, d, v) : JSON.parse(JSON.stringify(d)); } catch (e) { return JSON.parse(JSON.stringify(d)); } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privé-modus */ } };

  const DEFAULT_SETTINGS = {
    names: ['Wietze', 'Erwin', 'Laurens', 'Wilco'],
    partnerLevel: 'gemiddeld', oppLevel: 'goed', variant: 'rotterdams', turnMode: 'dealer',
    speed: 700, samples: 40, coachAuto: true, showCount: true,
  };
  const DEFAULT_STATS = {
    deals: 0, dealsWon: 0, booms: 0, boomsWon: 0, natOwn: 0, natOpp: 0, roemAgainst: 0, roemFor: 0, pointsFor: 0, pointsAgainst: 0,
    moves: 0, mistakes: {}, hints: 0, scenarios: {}, drills: { bied: [0, 0], zet: [0, 0], tel: [0, 0] },
  };
  const DEFAULT_COMP = {
    series: [
      { pairs: [['Wietze', 'Wilco'], ['Laurens', 'Erwin']], baseWins: [10, 5], booms: [], finished: true },
      { pairs: [['Wietze', 'Laurens'], ['Wilco', 'Erwin']], baseWins: [3, 3], booms: [], finished: false },
    ],
    record: { score: 2219, pair: ['Wilco', 'Erwin'] },
  };
  let settings = load('vr_settings', DEFAULT_SETTINGS);
  let stats = load('vr_stats', DEFAULT_STATS);
  let comp = load('vr_comp', DEFAULT_COMP);

  const policies = () => ['goed', settings.oppLevel, settings.partnerLevel, settings.oppLevel];
  const levelOf = (seat) => (seat === 0 ? null : seat === 2 ? settings.partnerLevel : settings.oppLevel);
  const teamName = (t) => (t === 0 ? `${settings.names[0]} & ${settings.names[2]}` : `${settings.names[1]} & ${settings.names[3]}`);

  /* ---------- rekenwerk: Web Worker met terugval naar de hoofdthread ---------- */
  const Engine = (() => {
    let worker = null, seq = 0;
    const pendingCalls = {};
    const sync = (op, p) => (op === 'analyze' ? Coach.analyzeMove(p.view, p.policies, p.samples) : { card: AI.monteCarlo(p.view, { samples: p.samples, policies: p.policies }).card });
    const fallbackAll = () => { for (const id in pendingCalls) { const c = pendingCalls[id]; delete pendingCalls[id]; c.resolve(sync(c.op, c.payload)); } };
    try {
      if (location.protocol !== 'file:' && typeof Worker !== 'undefined') {
        worker = new Worker('js/worker.js');
        worker.onmessage = (e) => { const c = pendingCalls[e.data.id]; delete pendingCalls[e.data.id]; if (!c) return; if (e.data.result && e.data.result.error) c.resolve(sync(c.op, c.payload)); else c.resolve(e.data.result); };
        worker.onerror = () => { worker = null; fallbackAll(); };
      }
    } catch (e) { worker = null; }
    const call = (op, payload) => new Promise((resolve) => {
      if (!worker) { resolve(sync(op, payload)); return; }
      const id = ++seq;
      pendingCalls[id] = { resolve, op, payload };
      worker.postMessage({ id, op, view: AI.viewToJSON(payload.view), policies: payload.policies, samples: payload.samples });
    });
    return {
      analyze: (view, policies, samples) => call('analyze', { view, policies, samples }),
      choose: (view, policies, samples) => call('choose', { view, policies, samples }),
      hasWorker: () => !!worker,
    };
  })();

  /* ---------- kaart-html ---------- */
  function cardHtml(c, cls, trump) {
    const red = KJ.SUIT_RED[c[0]] ? ' red' : '';
    const t = trump && c[0] === trump ? ' trump' : '';
    return `<div class="card${red}${t} ${cls || ''}" data-card="${c}"><span class="r">${KJ.RANK_LABEL[c[1]]}</span><span class="s">${KJ.SUIT_SYMBOL[c[0]]}</span><span class="r2">${KJ.RANK_LABEL[c[1]]}</span></div>`;
  }
  const backHtml = () => '<div class="card back"></div>';
  const suitHtml = (s) => `<span class="${KJ.SUIT_RED[s] ? 'red' : ''}" style="${KJ.SUIT_RED[s] ? 'color:#c21f1f' : ''}">${KJ.SUIT_SYMBOL[s]}</span>`;
  const lab = (c) => `<b style="${KJ.SUIT_RED[c[0]] ? 'color:#c21f1f' : ''}">${KJ.label(c)}</b>`;
  const rich = (text) => esc(text).replace(/([♣♦♥♠])(10|[789ABHV])?/g, (m, s) => (s === '♥' || s === '♦' ? `<span style="color:#c21f1f">${m}</span>` : m));

  /* ---------- tabs ---------- */
  $$('.tabs button').forEach((b) => b.addEventListener('click', () => {
    $$('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
    if (b.dataset.tab === 'stats') renderStats();
    if (b.dataset.tab === 'competitie') renderComp();
  }));
  $$('.subtabs button').forEach((b) => b.addEventListener('click', () => {
    $$('.subtabs button').forEach((x) => x.classList.toggle('active', x === b));
    $$('.sub').forEach((t) => t.classList.toggle('active', t.id === 'sub-' + b.dataset.sub));
  }));

  /* =====================================================================
     SPELEN
     ===================================================================== */
  let game = null, gen = 0, reviews = [], pendingReviews = [], pending = null, shownTrick = null, hintCard = null, busy = false, waiting = false, timer = null;

  function log(type, html, situation) {
    const el = document.createElement('div');
    el.className = 'm ' + type;
    el.innerHTML = html + (situation ? `<span class="sit">${rich(situation)}</span>` : '');
    $('#coachlog').appendChild(el);
    $('#coachlog').scrollTop = 1e9;
  }
  const clearLog = () => { $('#coachlog').innerHTML = ''; };

  function startBoom() {
    gen++;
    game = new KJ.Game({ variant: settings.variant, turnMode: settings.turnMode, dealer: 3 });
    clearLog();
    log('result', `<b>Nieuwe boom.</b> 16 spellen. Jij bent Zuid, ${esc(settings.names[2])} (${AI.LEVELS[settings.partnerLevel].label.toLowerCase()}) is je maat. Tegen ${esc(settings.names[1])} en ${esc(settings.names[3])} (${AI.LEVELS[settings.oppLevel].label.toLowerCase()}).`);
    startDeal();
  }

  function startDeal() {
    game.newDeal();
    reviews = []; pendingReviews = []; pending = null; shownTrick = null; hintCard = null; busy = false; waiting = false;
    log('result', `<b>Spel ${game.dealNo}.</b> ${esc(settings.names[game.dealer])} deelt, ${esc(settings.names[game.chooser])} is kiezer. Gedraaid: ${suitHtml(game.proposed)}${game.turnCard ? ' (' + lab(game.turnCard) + ' van de deler)' : ''}.`);
    render();
    schedule(advance, settings.speed);
  }

  function schedule(fn, ms) { const g = gen; clearTimeout(timer); timer = setTimeout(() => { if (g === gen) fn(); }, ms); }

  function advance() {
    if (!game) return;
    waiting = false;
    if (game.phase === 'bidding') {
      if (game.turn === 0) { waiting = true; render(); return; }
      const seat = game.turn;
      const suit = AI.decideBid(game, seat, levelOf(seat));
      const r = game.bid(seat, suit);
      log('info', `${esc(settings.names[seat])}: ${suit ? 'speelt ' + suitHtml(suit) : 'pas'}.`);
      if (r.forced) log('info', `Iedereen paste: ${esc(settings.names[game.chooser])} moet kiezen uit de andere drie kleuren.`);
      if (r.taken) onTaken();
      render();
      schedule(advance, settings.speed);
      return;
    }
    if (game.phase === 'playing') {
      if (game.turn === 0) { waiting = true; prepareUserTurn(); render(); return; }
      const seat = game.turn, level = levelOf(seat), cfg = AI.LEVELS[level];
      if (cfg.mc) {
        const g = gen, dealNo = game.dealNo, n = game.played.length;
        Engine.choose(game.view(seat), policies(), cfg.samples).then((r) => {
          if (g !== gen || !game || game.dealNo !== dealNo || game.played.length !== n || game.turn !== seat) return;
          playCard(seat, r.card);
        });
      } else playCard(seat, AI.policyMove(game.view(seat), level));
      return;
    }
  }

  function onTaken() {
    log('info', `<b>${esc(settings.names[game.playerSeat])} speelt ${suitHtml(game.trump)}.</b> ${KJ.team(game.playerSeat) === 0 ? 'Jullie moeten meer dan de helft halen.' : 'Jullie zijn tegenpartij: 81 punten is genoeg om ze nat te spelen.'}`);
  }

  function prepareUserTurn() {
    pending = null;
    if (!settings.coachAuto) return;
    const v = game.view(0);
    pending = { key: game.dealNo + ':' + game.tricks.length + ':' + game.trick.length, promise: Engine.analyze(v, policies(), settings.samples) };
  }

  function playCard(seat, card) {
    busy = true;
    if (seat === 0 && settings.coachAuto) {
      const key = game.dealNo + ':' + game.tricks.length + ':' + game.trick.length;
      const v = game.view(0);
      const promise = pending && pending.key === key ? pending.promise : Engine.analyze(v, policies(), settings.samples);
      const g = gen;
      const pol = policies();
      pendingReviews.push(promise.then((an) => {
        if (g !== gen) return;
        try {
          const review = Coach.review(v, an, card, pol);
          reviews.push(review);
          stats.moves++;
          if (review.grade !== 'goed') { stats.mistakes[review.cat] = (stats.mistakes[review.cat] || 0) + 1; stats.moveMistakes = (stats.moveMistakes || 0) + 1; }
          save('vr_stats', stats);
          log(review.grade, `<span class="grade">${review.grade === 'goed' ? '✓' : review.grade === 'fout' ? '✗' : '~'}</span> ${rich(review.text)}`, review.situation);
        } catch (err) {
          console.error('beoordeling mislukt', err);
          log('info', 'De coach kon deze zet niet beoordelen (' + esc(err.message) + ').');
        }
      }));
    }
    const done = game.play(seat, card);
    hintCard = null; pending = null;
    if (done) {
      shownTrick = done;
      const who = done.winner === 0 ? 'Jij wint' : `${esc(settings.names[done.winner])} wint`;
      log(KJ.team(done.winner) === 0 ? 'info' : 'info', `${who} slag ${game.tricks.length} (${done.points + (game.tricks.length === 8 ? 10 : 0)} punten${done.roem ? ', <b>roem ' + done.roem + '</b>: ' + done.roemParts.join(', ') : ''}).`);
      render();
      schedule(() => { shownTrick = null; busy = false; if (game.phase === 'playing') advance(); else endDeal(); }, Math.max(900, settings.speed * 1.6));
    } else {
      render();
      busy = false;
      schedule(advance, settings.speed);
    }
  }

  function endDeal() {
    const r = game.lastResult;
    const g = gen, gm = game, rv = reviews;
    // wacht (kort) op lopende beoordelingen, zodat de samenvatting compleet is
    const settled = Promise.race([Promise.allSettled(pendingReviews), new Promise((res) => setTimeout(res, 4000))]);
    settled.then(() => {
      if (g !== gen) return;
      const lines = Coach.dealSummary(r, 0, rv);
      log('result', `<b>Uitslag spel ${r.dealNo}: ${r.score[0]} – ${r.score[1]}.</b><br>${lines.map(rich).join('<br>')}`);
    });
    stats.deals++;
    if (r.score[0] > r.score[1]) stats.dealsWon++;
    if (r.nat) { if (KJ.team(r.playerSeat) === 0) stats.natOwn++; else stats.natOpp++; }
    stats.roemAgainst += r.roem[1]; stats.roemFor += r.roem[0]; stats.pointsFor += r.score[0]; stats.pointsAgainst += r.score[1];
    if (game.phase === 'gameover') {
      stats.booms++;
      if (game.scores[0] > game.scores[1]) stats.boomsWon++;
      settled.then(() => { if (g === gen) log('result', `<b>Boom afgelopen: ${gm.scores[0]} – ${gm.scores[1]}.</b> ${gm.scores[0] > gm.scores[1] ? 'Gewonnen!' : gm.scores[0] < gm.scores[1] ? 'Verloren.' : 'Gelijk.'}`); });
    }
    save('vr_stats', stats);
    render();
  }

  /* ---------- weergave ---------- */
  function render() {
    if (!game) return;
    renderScore();
    for (let s = 0; s < 4; s++) renderSeat(s);
    renderCenter();
    renderTricklist();
  }

  function renderScore() {
    $('#scoreboard').innerHTML = `<div class="score">
      <span class="team">${esc(teamName(0))}</span><span class="pts">${game.scores[0]}</span>
      <span class="team">${esc(teamName(1))}</span><span class="pts">${game.scores[1]}</span></div>
      <small>Spel ${game.dealNo} van ${game.totalDeals}</small>`;
    let info = '';
    if (game.trump) {
      const a = settings.showCount && game.phase === 'playing' ? AI.analyze(game.view(0), { count: true, signals: true }) : null;
      info += `<div>Troef: <b>${suitHtml(game.trump)} ${KJ.SUIT_NAME[game.trump]}</b>, speler: <b>${esc(settings.names[game.playerSeat])}</b>${game.round === 2 ? ' (verplicht)' : ''}</div>`;
      if (a) {
        info += `<div>Troef bij de anderen: <b>${a.unseenTrumps}</b></div>`;
        const vrij = game.hands[0].filter((c) => a.isVrij(c));
        if (vrij.length) info += `<div>Vrij in je hand: <b>${vrij.map((c) => KJ.label(c)).join(' ')}</b></div>`;
        const pl = [...a.partnerLikes].map((s) => KJ.SUIT_SYMBOL[s]).join(' ');
        if (pl) info += `<div>Maat vraagt: <b>${pl}</b></div>`;
        const voids = [1, 2, 3].map((s) => (game.voids[s].size ? `${esc(settings.names[s])}: geen ${[...game.voids[s]].map((x) => KJ.SUIT_SYMBOL[x]).join(' ')}` : '')).filter(Boolean);
        if (voids.length) info += `<div>${voids.join('<br>')}</div>`;
      }
    } else if (game.phase === 'bidding') {
      info += `<div>Gedraaid: <b>${suitHtml(game.proposed)}</b>${game.turnCard ? ' (' + lab(game.turnCard) + ' bij ' + esc(settings.names[game.dealer]) + ')' : ''}</div>`;
    }
    if (game.lastResult && (game.phase === 'dealdone' || game.phase === 'gameover')) {
      const r = game.lastResult;
      info += `<div>Laatste spel: ${r.score[0]} – ${r.score[1]}${r.nat ? ' (nat)' : ''}${r.pit >= 0 ? ' (pit)' : ''}</div>`;
    }
    $('#dealinfo').innerHTML = `<div class="dealinfo">${info}</div>`;
    $('#btn-hint').disabled = !waiting || game.turn !== 0 || busy;
  }

  function renderSeat(s) {
    const el = $('#seat-' + s);
    const isTurn = (game.phase === 'bidding' || game.phase === 'playing') && game.turn === s && !shownTrick;
    const userMayAct = waiting && game.turn === 0 && !busy && !shownTrick;
    const tags = [];
    if (game.dealer === s) tags.push('deler');
    if (game.playerSeat === s) tags.push('speler');
    const lvl = s === 0 ? 'jij' : s === 2 ? 'maat · ' + AI.LEVELS[settings.partnerLevel].label.toLowerCase() : AI.LEVELS[settings.oppLevel].label.toLowerCase();
    let html = `<div class="name${isTurn ? ' turn' : ''}">${esc(settings.names[s])} <span class="lvl">${lvl}</span>${tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>`;
    if (s === 0) {
      const hand = KJ.sortHand(game.hands[0], game.trump);
      const legal = game.phase === 'playing' && userMayAct ? game.legalMoves(0) : null;
      html += `<div class="hand">${hand.map((c) => cardHtml(c, legal ? (legal.includes(c) ? 'legal' : 'illegal') : '', game.trump) ).join('')}</div>`;
    } else {
      html += `<div class="backs">${backHtml().repeat(game.hands[s].length)}</div>`;
    }
    el.innerHTML = html;
    if (s === 0) {
      $$('.card.legal', el).forEach((c) => c.addEventListener('click', () => onUserCard(c.dataset.card)));
      if (hintCard) { const h = $(`.card[data-card="${hintCard}"]`, el); if (h) h.classList.add('hint'); }
    }
  }

  function renderCenter() {
    const el = $('#center');
    const trick = shownTrick ? shownTrick.plays : game.trick;
    const pos = { 0: 's', 1: 'w', 2: 'n', 3: 'e' };
    let html = '';
    for (const p of ['n', 'w', 'e', 's']) {
      const t = trick.find((x) => pos[x.seat] === p);
      const win = shownTrick && t && t.seat === shownTrick.winner ? 'winner' : '';
      html += `<div class="slot ${p}">${t ? cardHtml(t.card, win, game.trump) : ''}</div>`;
    }
    let msg = '';
    if (game.phase === 'bidding' && game.turn === 0 && waiting) {
      html += renderBidBox();
    } else if (game.phase === 'bidding') msg = `${esc(settings.names[game.turn])} denkt na...`;
    else if (game.phase === 'playing' && game.turn === 0 && !shownTrick) msg = game.trick.length ? 'Jij bent aan de beurt.' : 'Jij komt uit.';
    else if (game.phase === 'dealdone' && !shownTrick) msg = `<div>Spel ${game.dealNo} klaar: ${game.lastResult.score[0]} – ${game.lastResult.score[1]}${game.lastResult.nat ? ' (nat)' : ''}</div><button class="primary" id="btn-next">Volgende spel</button>`;
    else if (game.phase === 'gameover' && !shownTrick) msg = `<div>Boom klaar: ${game.scores[0]} – ${game.scores[1]}</div><button class="primary" id="btn-next">Nieuwe boom</button>`;
    if (msg) html += `<div class="msg">${msg}</div>`;
    el.innerHTML = html;
    const nb = $('#btn-next');
    if (nb) nb.addEventListener('click', () => (game.phase === 'gameover' ? startBoom() : startDeal()));
    $$('.bidbox button[data-bid]', el).forEach((b) => b.addEventListener('click', () => onUserBid(b.dataset.bid === 'pas' ? null : b.dataset.bid)));
    const ab = $('#btn-bidadvice', el);
    if (ab) ab.addEventListener('click', showBidAdvice);
  }

  function renderBidBox() {
    const opts = game.bidOptions(0);
    let html = `<div class="bidbox"><h3>${game.round === 1 ? 'Spelen of passen?' : 'Iedereen paste: kies troef'}</h3>`;
    html += `<div>Gedraaid: ${suitHtml(game.proposed)} ${KJ.SUIT_NAME[game.proposed]}${game.turnCard ? ` (${lab(game.turnCard)} bij ${esc(settings.names[game.dealer])})` : ''}. Jij bent ${Coach.roleName(0, game.chooser)}.</div><div class="btns">`;
    for (const o of opts) html += o ? `<button class="primary" data-bid="${o}">Spelen ${KJ.SUIT_SYMBOL[o]}</button>` : `<button data-bid="pas">Passen</button>`;
    html += `<button id="btn-bidadvice">Advies</button></div><div id="bidadvice"></div></div>`;
    return html;
  }

  function showBidAdvice() {
    const adv = Coach.bidAdvice(game, 0);
    stats.hints++; save('vr_stats', stats);
    const box = $('#bidadvice');
    if (box) box.innerHTML = `<div class="advice">${adv.lines.map(rich).join('<br>')}</div>`;
  }

  function renderTricklist() {
    const el = $('#tricklist');
    if (!game.tricks.length) { el.innerHTML = '<small>Nog geen slagen.</small>'; return; }
    el.innerHTML = game.tricks.map((t, i) => `<div class="t"><span class="who">${i + 1}. ${esc(settings.names[t.winner])}</span>${t.plays.map((p) => cardHtml(p.card, 'small' + (p.seat === t.winner ? ' winner' : ''), game.trump)).join('')}<small>${t.points}${t.roem ? ' +' + t.roem : ''}</small></div>`).join('');
  }

  /* ---------- acties ---------- */
  function onUserBid(suit) {
    if (game.phase !== 'bidding' || game.turn !== 0 || !waiting) return;
    waiting = false;
    const adv = Coach.bidAdvice(game, 0);
    const round = game.round;
    const r = game.bid(0, suit);
    log('info', `Jij: ${suit ? 'speelt ' + suitHtml(suit) : 'pas'}.`);
    const rv = Coach.reviewBid(adv, suit, round);
    if (rv) { log('onnauwkeurig', rich(rv.text)); stats.mistakes[rv.cat] = (stats.mistakes[rv.cat] || 0) + 1; save('vr_stats', stats); }
    else log('goed', 'Goede keuze. ' + rich(adv.lines[adv.lines.length - 1]));
    if (r.forced) log('info', `Iedereen paste: jij moet kiezen uit de andere drie kleuren.`);
    if (r.taken) onTaken();
    render();
    schedule(advance, settings.speed);
  }

  function onUserCard(card) {
    if (!game || game.phase !== 'playing' || game.turn !== 0 || busy || shownTrick || !waiting) return;
    if (!game.legalMoves(0).includes(card)) return;
    waiting = false;
    playCard(0, card);
  }

  $('#btn-hint').addEventListener('click', () => {
    if (!game) return;
    if (game.phase === 'bidding' && game.turn === 0) { showBidAdvice(); return; }
    if (game.phase !== 'playing' || game.turn !== 0 || busy || !waiting) return;
    const v = game.view(0);
    const key = game.dealNo + ':' + game.tricks.length + ':' + game.trick.length;
    const promise = pending && pending.key === key ? pending.promise : Engine.analyze(v, policies(), Math.max(settings.samples, 40));
    pending = { key, promise };
    stats.hints++; save('vr_stats', stats);
    const g = gen;
    log('hint', '<b>Hint.</b> Even rekenen...');
    const el = $('#coachlog').lastElementChild;
    promise.then((an) => {
      if (g !== gen) return;
      const h = Coach.hint(v, policies(), settings.samples, an);
      const ev = an.evals.map((e) => `<span class="${e.card === h.best.card ? 'best' : ''}">${KJ.label(e.card)} ${e.ev >= 0 ? '+' : ''}${Math.round(e.ev)}</span>`).join('');
      el.innerHTML = `<b>Hint.</b> ${rich(h.lines.slice(1).join(' '))}<div class="evals">${ev}</div><span class="sit">${rich(h.lines[0])}</span>`;
      if (game && game.phase === 'playing' && game.turn === 0 && waiting && game.dealNo + ':' + game.tricks.length + ':' + game.trick.length === key) { hintCard = h.best.card; renderSeat(0); }
    });
  });
  $('#btn-tricks').addEventListener('click', () => { const el = $('#tricklist'); el.hidden = !el.hidden; });
  $('#btn-newboom').addEventListener('click', () => { if (!game || game.phase === 'gameover' || confirm('Huidige boom afbreken en een nieuwe beginnen?')) startBoom(); });

  /* =====================================================================
     KAARTEN: informatieblad punten per kaart
     ===================================================================== */
  let infoTrump = (() => { try { return localStorage.getItem('vr_infotrump') || 'S'; } catch (e) { return 'S'; } })();
  function renderKaarten() {
    const root = $('#kaarten');
    const trump = infoTrump;
    const order = (s) => (s === trump ? ['J', '9', 'A', 'T', 'K', 'Q', '8', '7'] : ['A', 'T', 'K', 'Q', 'J', '9', '8', '7']);
    const suits = [trump].concat(KJ.SUITS.filter((s) => s !== trump));
    const col = (s) => {
      const isT = s === trump;
      return `<div class="infosuit ${isT ? 'istrump' : ''}"><h3><span class="${KJ.SUIT_RED[s] ? 'red' : ''}">${KJ.SUIT_SYMBOL[s]}</span> ${KJ.SUIT_NAME[s]}${isT ? ' <span class="tag">troef</span>' : ''}</h3>
        <div class="inforows">${order(s).map((r, i) => { const c = s + r; const v = KJ.value(c, trump); return `<div class="inforow"><span class="rank">${i + 1}</span>${cardHtml(c, '', null)}<span class="nm">${KJ.RANK_NAME[r]}${isT && r === 'J' ? ' (boer)' : isT && r === '9' ? ' (nel)' : ''}</span><span class="pts ${v ? '' : 'zero'}">${v}</span></div>`; }).join('')}</div>
        <div class="infototal">samen ${order(s).reduce((a, r) => a + KJ.value(s + r, trump), 0)} punten</div></div>`;
    };
    root.innerHTML = `<div class="box infobox">
      <h2>Punten per kaart</h2>
      <p>Welke kleur is troef?</p>
      <div class="trumppick">${KJ.SUITS.map((s) => `<button data-trump="${s}" class="${s === trump ? 'primary' : ''}"><span class="${KJ.SUIT_RED[s] ? 'red' : ''}">${KJ.SUIT_SYMBOL[s]}</span> ${KJ.SUIT_NAME[s]}</button>`).join('')}</div>
      <div class="infogrid">${suits.map(col).join('')}</div>
      <div class="inforules">
        <div><b>Volgorde</b>: hoogste bovenaan. In troef winnen boer en nel van alles; in de andere kleuren is de aas het hoogst en staat de boer pas op de vijfde plaats.</div>
        <div><b>Totaal</b>: alle kaarten samen 152 punten, de laatste slag 10 extra = <b>162</b>. De spelende partij heeft minimaal <b>82</b> nodig.</div>
        <div><b>Roem</b> (in één slag): drie opeenvolgende van één kleur 20 · vier opeenvolgende 50 · troefheer + troefvrouw (stuk) 20 · vier dezelfde (10, V, H, A) 100 · vier boeren 200 · alle slagen (pit) 100. Voor reeksen telt de gewone volgorde 7-8-9-10-B-V-H-A, ook in troef.</div>
      </div></div>`;
    $$('button[data-trump]', root).forEach((b) => b.addEventListener('click', () => { infoTrump = b.dataset.trump; try { localStorage.setItem('vr_infotrump', infoTrump); } catch (e) {} renderKaarten(); }));
  }

  /* =====================================================================
     LESSEN
     ===================================================================== */
  function renderLessons() {
    const nav = $('#lessonnav');
    nav.innerHTML = KJ.LESSONS.map((l, i) => `<button data-i="${i}" class="${i === 0 ? 'active' : ''}">${esc(l.title)}<small>${esc(l.summary)}</small></button>`).join('');
    const show = (i) => {
      $$('button', nav).forEach((b) => b.classList.toggle('active', +b.dataset.i === i));
      const l = KJ.LESSONS[i];
      $('#lessonbody').innerHTML = `<h2>${esc(l.title)}</h2>${l.html}`;
      $('#lessonbody').scrollIntoView({ block: 'nearest' });
    };
    $$('button', nav).forEach((b) => b.addEventListener('click', () => show(+b.dataset.i)));
    show(0);
  }

  /* =====================================================================
     OEFENEN
     ===================================================================== */
  const SEAT_LABEL = ['Zuid (jij)', 'West', 'Noord (maat)', 'Oost'];

  function miniTable(trick, trump, leader, extra) {
    const pos = { 0: 's', 1: 'w', 2: 'n', 3: 'e' };
    const cells = { n: '', w: '', e: '', s: '' };
    for (const t of trick) cells[pos[t.seat]] = cardHtml(t.card, '', trump);
    return `<div class="mini">
      <div></div><div><div class="lab">Noord (maat)</div>${cells.n}</div><div></div>
      <div><div class="lab">West</div>${cells.w}</div><div>${extra || ''}</div><div><div class="lab">Oost</div>${cells.e}</div>
      <div></div><div><div class="lab">Zuid (jij)</div>${cells.s}</div><div></div></div>`;
  }
  function histHtml(tricks, trump, names) {
    if (!tricks.length) return '';
    return `<div class="hist"><b>Eerdere slagen</b>${tricks.map((t, i) => `<div class="t"><span class="who">${i + 1}. ${esc((names || SEAT_LABEL)[t.winner])}</span>${t.plays.map((p) => `<span title="${esc((names || SEAT_LABEL)[p.seat])}">${cardHtml(p.card, 'small', trump)}</span>`).join('')}<small>${t.points}${t.roem ? ' +' + t.roem + ' roem' : ''}</small></div>`).join('')}</div>`;
  }

  // ---- scenario's
  let scenIdx = 0;
  function renderScenarios() {
    const root = $('#sub-scenario');
    const list = Quiz.SCENARIOS.map((s, i) => `<button data-i="${i}" class="${i === scenIdx ? 'active' : ''}${stats.scenarios[s.id] === true ? ' done' : ''}">${i + 1}. ${esc(s.title)}</button>`).join('');
    const sc = Quiz.SCENARIOS[scenIdx];
    let body;
    if (sc.type === 'bid') {
      body = `<div class="drill"><h3>${esc(sc.title)}</h3><p class="situ">${rich(sc.text)}</p>
        <div class="hand">${KJ.sortHand(sc.hand, sc.proposed).map((c) => cardHtml(c, '', sc.proposed)).join('')}</div>
        <p><b>${esc(sc.question)}</b></p><div class="btns"><button class="primary" data-ans="${sc.proposed}">Spelen ${KJ.SUIT_SYMBOL[sc.proposed]}</button><button data-ans="pas">Passen</button></div><div id="scen-fb"></div>
        <div class="btns"><button id="scen-next">Volgende scenario</button></div></div>`;
    } else {
      const v = Quiz.buildView(sc);
      const legal = KJ.legalMoves(v.hand, v.trick, v.trump, v.variant, 0);
      body = `<div class="drill"><h3>${esc(sc.title)}</h3><p class="situ">${rich(sc.text)}</p>
        <div>Troef: ${suitHtml(sc.trump)} ${KJ.SUIT_NAME[sc.trump]} · speler: ${SEAT_LABEL[sc.playerSeat]}</div>
        ${histHtml(v.tricks, v.trump)}
        ${miniTable(v.trick, v.trump, v.leader)}
        <p><b>${esc(sc.question)}</b> <small>Klik op een kaart.</small></p>
        <div class="hand">${KJ.sortHand(v.hand, v.trump).map((c) => cardHtml(c, legal.includes(c) ? 'legal' : 'illegal', v.trump)).join('')}</div>
        <div id="scen-fb"></div><div class="btns"><button id="scen-next">Volgende scenario</button></div></div>`;
    }
    root.innerHTML = `<div class="scenlist">${list}</div>${body}`;
    $$('.scenlist button', root).forEach((b) => b.addEventListener('click', () => { scenIdx = +b.dataset.i; renderScenarios(); }));
    $('#scen-next').addEventListener('click', () => { scenIdx = (scenIdx + 1) % Quiz.SCENARIOS.length; renderScenarios(); });
    if (sc.type === 'bid') {
      $$('button[data-ans]', root).forEach((b) => b.addEventListener('click', () => {
        const ans = b.dataset.ans === 'pas' ? null : b.dataset.ans;
        const ok = ans === sc.answer;
        markScenario(sc.id, ok);
        $('#scen-fb').innerHTML = `<div class="feedback ${ok ? 'goed' : 'fout'}"><b>${ok ? 'Goed.' : 'Niet de beste keuze.'}</b> ${rich(sc.explanation)}</div>`;
      }));
    } else {
      $$('.hand .card.legal', root).forEach((el) => el.addEventListener('click', () => {
        const card = el.dataset.card;
        const v = Quiz.buildView(sc);
        const ok = sc.answers.includes(card);
        markScenario(sc.id, ok);
        $('#scen-fb').innerHTML = `<div class="feedback ${ok ? 'goed' : 'fout'}"><b>${ok ? 'Goed: ' + KJ.label(card) + '.' : KJ.label(card) + ' is niet de beste kaart. Beter: ' + sc.answers.map(KJ.label).join(' of ') + '.'}</b> ${rich(sc.explanation)}<div class="evals">Even rekenen...</div></div>`;
        Engine.analyze(v, ['goed', 'goed', 'goed', 'goed'], 60).then((an) => {
        if (!$('#scen-fb') || Quiz.SCENARIOS[scenIdx] !== sc) return;
        const ev = an.evals.map((e) => `<span class="${sc.answers.includes(e.card) ? 'best' : ''}">${KJ.label(e.card)} ${e.ev >= 0 ? '+' : ''}${Math.round(e.ev)}</span>`).join('');
        $('#scen-fb').innerHTML = `<div class="feedback ${ok ? 'goed' : 'fout'}"><b>${ok ? 'Goed: ' + KJ.label(card) + '.' : KJ.label(card) + ' is niet de beste kaart. Beter: ' + sc.answers.map(KJ.label).join(' of ') + '.'}</b> ${rich(sc.explanation)}<div class="evals">${ev}</div><small>Verwachte puntenwinst per kaart volgens de simulatie (gemiddeld verschil voor jullie over de rest van het spel).</small></div>`;
        });
      }));
    }
  }
  function markScenario(id, ok) {
    if (stats.scenarios[id] !== true) stats.scenarios[id] = ok;
    save('vr_stats', stats);
    $$('.scenlist button').forEach((b) => { if (Quiz.SCENARIOS[+b.dataset.i].id === id && ok) b.classList.add('done'); });
  }

  // ---- bied-drill
  function renderBidDrill() {
    const root = $('#sub-bied');
    const d = Quiz.bidDrill();
    const g = d.game;
    const bidsSoFar = g.bids.map((b) => `${SEAT_LABEL[b.seat]}: ${b.suit ? 'speelt ' + KJ.SUIT_SYMBOL[b.suit] : 'pas'}`).join(', ');
    const opts = g.bidOptions(0);
    root.innerHTML = `<div class="drill"><h3>Bied-drill</h3>
      <p class="situ">${SEAT_LABEL[g.dealer]} deelt, ${SEAT_LABEL[g.chooser]} is kiezer. Jij bent <b>${Coach.roleName(0, g.chooser)}</b>. Gedraaid: ${suitHtml(g.proposed)} ${KJ.SUIT_NAME[g.proposed]}${g.turnCard ? ` (${lab(g.turnCard)} bij ${SEAT_LABEL[g.dealer]})` : ''}.${bidsSoFar ? ' Tot nu toe: ' + bidsSoFar + '.' : ''}${g.round === 2 ? ' <b>Iedereen paste: jij moet kiezen.</b>' : ''}</p>
      <div class="hand">${KJ.sortHand(g.hands[0], g.proposed).map((c) => cardHtml(c, '', g.round === 1 ? g.proposed : null)).join('')}</div>
      <div class="btns">${opts.map((o) => o ? `<button class="primary" data-bid="${o}">Spelen ${KJ.SUIT_SYMBOL[o]}</button>` : `<button data-bid="pas">Passen</button>`).join('')}</div>
      <div id="bied-fb"></div><div class="btns"><button id="bied-next">Volgende hand</button></div></div>`;
    $('#bied-next').addEventListener('click', renderBidDrill);
    $$('button[data-bid]', root).forEach((b) => b.addEventListener('click', () => {
      const suit = b.dataset.bid === 'pas' ? null : b.dataset.bid;
      const rv = Coach.reviewBid(d.advice, suit, g.round);
      const ok = !rv;
      stats.drills.bied[0] += ok ? 1 : 0; stats.drills.bied[1]++; save('vr_stats', stats);
      $('#bied-fb').innerHTML = `<div class="feedback ${ok ? 'goed' : 'fout'}"><b>${ok ? 'Eens met de coach.' : rich(rv.text)}</b><br>${d.advice.lines.map(rich).join('<br>')}</div>`;
      $$('button[data-bid]', root).forEach((x) => (x.disabled = true));
    }));
  }

  // ---- zet-drill
  function renderMoveDrill() {
    const root = $('#sub-zet');
    root.innerHTML = '<div class="drill">Even geduld, situatie wordt gemaakt...</div>';
    setTimeout(() => {
      const d = Quiz.moveDrill(Math.random, policies());
      if (!d) { root.innerHTML = '<div class="drill">Geen situatie gevonden, probeer opnieuw.</div>'; return; }
      const v = d.view, g = d.game;
      const legal = KJ.legalMoves(v.hand, v.trick, v.trump, v.variant, 0);
      const names = [settings.names[0] + ' (jij)', settings.names[1], settings.names[2] + ' (maat)', settings.names[3]];
      const desc = Coach.describe(v);
      root.innerHTML = `<div class="drill"><h3>Zet-drill</h3>
        <p class="situ">Troef: ${suitHtml(v.trump)} ${KJ.SUIT_NAME[v.trump]} · speler: <b>${esc(names[v.playerSeat])}</b>${g.round === 2 ? ' (verplicht)' : ''} · slag ${v.tricks.length + 1} · maat: ${AI.LEVELS[settings.partnerLevel].label.toLowerCase()}, tegenstanders: ${AI.LEVELS[settings.oppLevel].label.toLowerCase()}</p>
        ${histHtml(v.tricks, v.trump, names)}
        ${miniTable(v.trick, v.trump, v.leader, `<div class="lab">${v.trick.length ? esc(names[v.leader]) + ' kwam uit' : 'Jij komt uit'}</div>`)}
        <p><small>${rich(desc.text)}</small></p>
        <p><b>Welke kaart speel je?</b></p>
        <div class="hand">${KJ.sortHand(v.hand, v.trump).map((c) => cardHtml(c, legal.includes(c) ? 'legal' : 'illegal', v.trump)).join('')}</div>
        <div id="zet-fb"></div><div class="btns"><button id="zet-next">Volgende situatie</button></div></div>`;
      $('#zet-next').addEventListener('click', renderMoveDrill);
      $$('.hand .card.legal', root).forEach((el) => el.addEventListener('click', () => {
        const card = el.dataset.card;
        $$('.hand .card', root).forEach((x) => x.classList.remove('legal'));
        $('#zet-fb').innerHTML = '<div class="feedback">Even rekenen...</div>';
        Engine.analyze(v, policies(), Math.max(60, settings.samples)).then((an) => {
          const rv = Coach.review(v, an, card, policies());
          const ok = rv.grade === 'goed';
          stats.drills.zet[0] += ok ? 1 : 0; stats.drills.zet[1]++; save('vr_stats', stats);
          const ev = an.evals.map((e) => `<span class="${e.card === an.best.card ? 'best' : ''}">${KJ.label(e.card)} ${e.ev >= 0 ? '+' : ''}${Math.round(e.ev)}</span>`).join('');
          if ($('#zet-fb')) $('#zet-fb').innerHTML = `<div class="feedback ${rv.grade}">${rich(rv.text)}<div class="evals">${ev}</div></div>`;
        });
      }));
    }, 20);
  }

  // ---- tel-drill
  function renderCountDrill() {
    const root = $('#sub-tel');
    const d = Quiz.countDrill();
    const v = d.view;
    const names = [settings.names[0] + ' (jij)', settings.names[1], settings.names[2] + ' (maat)', settings.names[3]];
    let qhtml = '';
    d.questions.forEach((q, i) => {
      let input;
      if (q.type === 'number') input = `<input type="number" min="0" max="8" id="tel-q${i}" style="width:5em">`;
      else if (q.type === 'card') input = `<select id="tel-q${i}"><option value="geen">geen meer</option>${KJ.RANKS.slice().reverse().map((r) => `<option value="${q.suit + r}">${KJ.SUIT_SYMBOL[q.suit]}${KJ.RANK_LABEL[r]}</option>`).join('')}</select>`;
      else input = KJ.SUITS.map((s) => `<label><input type="checkbox" data-q="${i}" value="${s}"> ${KJ.SUIT_SYMBOL[s]}</label>`).join(' ');
      qhtml += `<div class="form-row" style="margin:.5em 0">${rich(q.q)}<br>${input} <span id="tel-fb${i}"></span></div>`;
    });
    root.innerHTML = `<div class="drill"><h3>Tel-drill</h3>
      <p class="situ">Troef: ${suitHtml(v.trump)} ${KJ.SUIT_NAME[v.trump]} · speler: <b>${esc(names[v.playerSeat])}</b>. Er zijn ${v.tricks.length} slagen gespeeld. Kijk naar de slagen en je hand, en beantwoord de vragen uit je hoofd (niet nakijken in de lijst is de oefening).</p>
      ${histHtml(v.tricks, v.trump, names)}
      <div class="hand">${KJ.sortHand(v.hand, v.trump).map((c) => cardHtml(c, '', v.trump)).join('')}</div>
      ${qhtml}
      <div class="btns"><button class="primary" id="tel-check">Controleer</button><button id="tel-next">Volgende</button></div></div>`;
    $('#tel-next').addEventListener('click', renderCountDrill);
    $('#tel-check').addEventListener('click', () => {
      d.questions.forEach((q, i) => {
        let given, ok;
        if (q.type === 'number') { given = +$('#tel-q' + i).value; ok = given === q.answer; }
        else if (q.type === 'card') { given = $('#tel-q' + i).value; ok = given === q.answer; }
        else { given = $$(`input[data-q="${i}"]:checked`, root).map((x) => x.value).sort(); ok = JSON.stringify(given) === JSON.stringify(q.answer.slice().sort()); }
        stats.drills.tel[0] += ok ? 1 : 0; stats.drills.tel[1]++;
        const ansText = q.type === 'suits' ? q.answer.map((s) => KJ.SUIT_SYMBOL[s]).join(' ') : q.type === 'card' ? (q.answer === 'geen' ? 'geen meer' : KJ.label(q.answer)) : q.answer;
        $('#tel-fb' + i).innerHTML = ok ? '<b style="color:var(--ok)">✓ goed</b>' : `<b style="color:var(--bad)">✗</b> juist: ${rich(String(ansText))}`;
      });
      save('vr_stats', stats);
      $('#tel-check').disabled = true;
    });
  }

  /* =====================================================================
     COMPETITIE
     ===================================================================== */
  function seriesWins(s) { const w = s.baseWins.slice(); for (const b of s.booms) w[b.winner]++; return w; }
  const pairName = (p) => p.join(' & ');

  // ---- scoreblad: per ronde schrijven tijdens een echte boom
  const ROEM_CHIPS = [['driekaart', 20], ['vierkaart', 50], ['stuk', 20], ['vier gelijke', 100], ['vier boeren', 200], ['pit', 100]];
  function emptySheet() { return { date: new Date().toISOString().slice(0, 10), firstDealer: 0, rows: Array.from({ length: 16 }, () => ({ pa: '', ra: '', pb: '', rb: '', ta: [], tb: [], auto: null, status: '' })) }; }
  function sheetTotals(sheet) {
    let a = 0, b = 0, filled = 0;
    const run = sheet.rows.map((r) => {
      const ra = (+r.pa || 0) + (+r.ra || 0), rb = (+r.pb || 0) + (+r.rb || 0);
      if (r.pa !== '' || r.pb !== '') filled++;
      a += ra; b += rb;
      return [a, b];
    });
    return { a, b, filled, run };
  }
  const sheetDealers = (cur) => [cur.pairs[0][0], cur.pairs[1][0], cur.pairs[0][1], cur.pairs[1][1]];
  const rowStatus = (r) => (r.status === 'natA' ? 'A nat' : r.status === 'natB' ? 'B nat' : r.status === 'verzaakA' ? 'A verzaakt' : r.status === 'verzaakB' ? 'B verzaakt' : '');
  function renderSheet(cur) {
    const sheet = comp.sheet || (comp.sheet = emptySheet());
    for (const r of sheet.rows) { r.ta = r.ta || []; r.tb = r.tb || []; r.status = r.status || ''; }
    const dealers = sheetDealers(cur);
    const t = sheetTotals(sheet);
    let rows = '';
    sheet.rows.forEach((r, i) => {
      rows += `<tr data-i="${i}" class="${r.status ? 'st' : ''}">
      <td class="nr">${i + 1}<div class="dealer">${esc(dealers[(sheet.firstDealer + i) % 4])}</div></td>
      <td><input type="number" inputmode="numeric" data-f="pa" value="${r.pa}"></td><td class="roemcell" data-open="${i}"><span class="rv ra">${r.ra ? '+' + r.ra : ''}</span><div class="tags">${r.ta.map(esc).join(' + ')}</div></td>
      <td><input type="number" inputmode="numeric" data-f="pb" value="${r.pb}"></td><td class="roemcell" data-open="${i}"><span class="rv rb">${r.rb ? '+' + r.rb : ''}</span><div class="tags">${r.tb.map(esc).join(' + ')}</div></td>
      <td class="natbtns"><button data-roem="${i}" title="roem, nat of verzaken">⋯</button><div class="tags status">${rowStatus(r)}</div></td></tr>`;
      if ((i + 1) % 4 === 0) {
        const [sa, sb] = t.run[i];
        const diff = sa - sb;
        rows += `<tr class="subtotal"><td>${i + 1}</td><td class="tot" colspan="2">${sa}</td><td class="tot" colspan="2">${sb}</td><td><small>${diff === 0 ? 'gelijk' : (diff > 0 ? 'A' : 'B') + ' +' + Math.abs(diff)}</small></td></tr>`;
      }
    });
    return `<div class="box sheet"><h3>Boom schrijven</h3>
      <div class="form" style="max-width:760px;grid-template-columns:auto 1fr auto 1fr auto">
        <label>Datum</label><input type="date" id="sheet-date" value="${sheet.date}">
        <label>Eerste deler</label><select id="sheet-dealer">${dealers.map((d, i) => `<option value="${i}" ${sheet.firstDealer === i ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
        <button id="sheet-lot">Lootje trekken</button>
      </div>
      <div id="sheet-lotmsg"></div>
      <p><small>Vul per ronde de punten in (de 162 inclusief de 10 van de laatste slag). Vul je één kant in, dan wordt de andere kant automatisch aangevuld tot 162. Tik op de roem-kolom of op <b>⋯</b> om roem aan te vinken (driekaart, stuk, pit...), of om nat of verzaken te noteren. A = ${esc(pairName(cur.pairs[0]))}, B = ${esc(pairName(cur.pairs[1]))}. Het blad wordt automatisch bewaard.</small></p>
      <div class="standbar"><span>A ${esc(pairName(cur.pairs[0]))}</span><b id="sheet-ta">${t.a}</b><span class="dash">–</span><b id="sheet-tb">${t.b}</b><span>B ${esc(pairName(cur.pairs[1]))}</span></div>
      <div style="overflow-x:auto"><table class="tbl sheettbl">
        <tr><th>#</th><th colspan="2">A: ${esc(pairName(cur.pairs[0]))}</th><th colspan="2">B: ${esc(pairName(cur.pairs[1]))}</th><th></th></tr>
        <tr><th></th><th>punten</th><th>roem</th><th>punten</th><th>roem</th><th></th></tr>
        ${rows}
        <tr class="total"><td><b>Tot.</b></td><td class="tot" colspan="2" id="sheet-ta2">${t.a}</td><td class="tot" colspan="2" id="sheet-tb2">${t.b}</td><td></td></tr>
      </table></div>
      <div class="btns"><button class="primary" id="sheet-finish">Boom afsluiten en bij de stand zetten</button><button id="sheet-clear">Blad leegmaken</button></div>
      <div id="sheet-msg"></div></div>
      <div id="roem-modal" class="modal" hidden></div>`;
  }
  function bindSheet(root, cur) {
    const sheet = comp.sheet;
    const tbl = $('.sheettbl', root);
    const dealers = sheetDealers(cur);
    const refresh = () => {
      const t = sheetTotals(sheet);
      $$('tr[data-i]', tbl).forEach((tr) => {
        const i = +tr.dataset.i, r = sheet.rows[i], on = r.pa !== '' || r.pb !== '';
        $('.rv.ra', tr).textContent = r.ra ? '+' + r.ra : ''; $('.rv.rb', tr).textContent = r.rb ? '+' + r.rb : '';
        $$('.tags', tr)[0].textContent = r.ta.join(' + '); $$('.tags', tr)[1].textContent = r.tb.join(' + ');
        $('.status', tr).textContent = rowStatus(r);
        tr.classList.toggle('st', !!r.status);
        for (const f of ['pa', 'pb']) { const inp = $(`input[data-f="${f}"]`, tr); if (inp.value !== r[f]) inp.value = r[f]; }
      });
      $$('tr.subtotal', tbl).forEach((tr, k) => {
        const [sa, sb] = t.run[k * 4 + 3], diff = sa - sb;
        const tds = $$('.tot', tr); tds[0].textContent = sa; tds[1].textContent = sb;
        $('small', tr).textContent = diff === 0 ? 'gelijk' : (diff > 0 ? 'A' : 'B') + ' +' + Math.abs(diff);
      });
      $('#sheet-ta').textContent = t.a; $('#sheet-tb').textContent = t.b; $('#sheet-ta2').textContent = t.a; $('#sheet-tb2').textContent = t.b;
      save('vr_comp', comp);
    };
    const complement = (r, f, tr) => {
      const other = f === 'pa' ? 'pb' : 'pa';
      if (r.auto === f) r.auto = null;
      if (r[other] === '' || r.auto === other) {
        if (r[f] !== '' && +r[f] >= 0 && +r[f] <= 162) { r[other] = String(162 - +r[f]); r.auto = other; }
        else if (r[f] === '' && r.auto === other) { r[other] = ''; r.auto = null; }
      }
    };
    $$('tr[data-i] input', tbl).forEach((inp) => {
      inp.addEventListener('input', () => {
        const tr = inp.closest('tr'), i = +tr.dataset.i, r = sheet.rows[i], f = inp.dataset.f;
        r[f] = inp.value;
        if (r.status) r.status = '';
        complement(r, f, tr);
        refresh();
      });
    });
    // ---- modal per ronde: roem, nat, verzaken
    const modal = $('#roem-modal', root);
    const openModal = (i) => {
      const r = sheet.rows[i];
      const side = (s, name) => {
        const rf = s === 'a' ? 'ra' : 'rb', tf = s === 'a' ? 'ta' : 'tb';
        return `<div class="mside"><h4>${s.toUpperCase()}: ${esc(name)}</h4>
          <div class="mrow"><label>Punten</label><input type="number" inputmode="numeric" data-mf="${s === 'a' ? 'pa' : 'pb'}" value="${r[s === 'a' ? 'pa' : 'pb']}"></div>
          <div class="mrow"><label>Roem</label><input type="number" inputmode="numeric" data-mf="${rf}" value="${r[rf]}" placeholder="0"></div>
          <div class="chips">${ROEM_CHIPS.map(([l, v]) => `<button data-chip="${s}" data-v="${v}" data-l="${l}">${l} +${v}</button>`).join('')}<button data-undo="${s}" title="laatste ongedaan maken">↶ ongedaan</button></div>
          <div class="tags" data-tags="${s}">${r[tf].map(esc).join(' + ')}</div>
          <div class="btns"><button data-status="nat${s.toUpperCase()}" class="${r.status === 'nat' + s.toUpperCase() ? 'primary' : ''}">${esc(name)} nat</button><button data-status="verzaak${s.toUpperCase()}" class="${r.status === 'verzaak' + s.toUpperCase() ? 'primary' : ''}">${esc(name)} verzaakt</button></div>
        </div>`;
      };
      modal.innerHTML = `<div class="mbox"><div class="mhead"><h3>Ronde ${i + 1} · deler ${esc(dealers[(sheet.firstDealer + i) % 4])}</h3><button data-close>Sluiten</button></div>
        <div class="msides">${side('a', pairName(cur.pairs[0]))}${side('b', pairName(cur.pairs[1]))}</div>
        <p><small>Nat: de spelende partij haalt niet meer dan de helft; alle 162 punten en alle roem gaan naar de tegenpartij. Verzaken: idem, alle punten en roem naar de tegenpartij. Klik nogmaals om ongedaan te maken.</small></p></div>`;
      modal.hidden = false;
      const sync = () => {
        for (const f of ['pa', 'ra', 'pb', 'rb']) { const inp = $(`input[data-mf="${f}"]`, modal); if (inp && inp.value !== r[f]) inp.value = r[f]; }
        $('[data-tags="a"]', modal).textContent = r.ta.join(' + '); $('[data-tags="b"]', modal).textContent = r.tb.join(' + ');
        $$('button[data-status]', modal).forEach((b) => b.classList.toggle('primary', b.dataset.status === r.status));
        refresh();
      };
      $$('input[data-mf]', modal).forEach((inp) => inp.addEventListener('input', () => {
        const f = inp.dataset.mf; r[f] = inp.value;
        if (f === 'pa' || f === 'pb') { if (r.status) r.status = ''; complement(r, f); }
        sync();
      }));
      $$('button[data-chip]', modal).forEach((b) => b.addEventListener('click', () => {
        const s = b.dataset.chip, rf = s === 'a' ? 'ra' : 'rb', tf = s === 'a' ? 'ta' : 'tb';
        r[rf] = String((+r[rf] || 0) + +b.dataset.v); r[tf].push(b.dataset.l);
        if (r.status) applyStatus(r, r.status); // roem bij nat/verzaken gaat naar de tegenpartij
        sync();
      }));
      $$('button[data-undo]', modal).forEach((b) => b.addEventListener('click', () => {
        const s = b.dataset.undo, rf = s === 'a' ? 'ra' : 'rb', tf = s === 'a' ? 'ta' : 'tb';
        const last = r[tf].pop();
        if (last) { const v = (ROEM_CHIPS.find((c) => c[0] === last) || [0, 0])[1]; r[rf] = String(Math.max(0, (+r[rf] || 0) - v)); }
        sync();
      }));
      $$('button[data-status]', modal).forEach((b) => b.addEventListener('click', () => {
        const st = b.dataset.status;
        if (r.status === st) { r.status = ''; r.pa = ''; r.pb = ''; r.auto = null; }
        else applyStatus(r, st);
        sync();
      }));
      $('[data-close]', modal).addEventListener('click', () => { modal.hidden = true; });
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
    };
    // nat/verzaken: verliezende partij 0 punten en 0 roem, de ander 162 + alle roem
    const applyStatus = (r, st) => {
      const loser = st.endsWith('A') ? 'a' : 'b';
      const roem = (+r.ra || 0) + (+r.rb || 0);
      const tags = r.ta.concat(r.tb);
      if (loser === 'a') { r.pa = '0'; r.ra = '0'; r.ta = []; r.pb = '162'; r.rb = String(roem); r.tb = tags; }
      else { r.pb = '0'; r.rb = '0'; r.tb = []; r.pa = '162'; r.ra = String(roem); r.ta = tags; }
      r.auto = null; r.status = st;
    };
    $$('button[data-roem]', tbl).forEach((b) => b.addEventListener('click', () => openModal(+b.dataset.roem)));
    $$('td[data-open]', tbl).forEach((td) => td.addEventListener('click', () => openModal(+td.dataset.open)));
    $('#sheet-lot').addEventListener('click', () => {
      const pick = Math.floor(Math.random() * 4);
      sheet.firstDealer = pick; save('vr_comp', comp);
      renderComp();
      $('#sheet-lotmsg').innerHTML = `<div class="feedback goed">Lootje getrokken: <b>${esc(dealers[pick])}</b> deelt als eerste.</div>`;
    });
    $('#sheet-date').addEventListener('change', (e) => { sheet.date = e.target.value; save('vr_comp', comp); });
    $('#sheet-dealer').addEventListener('change', (e) => { sheet.firstDealer = +e.target.value; save('vr_comp', comp); renderComp(); });
    $('#sheet-clear').addEventListener('click', () => { if (confirm('Scoreblad leegmaken?')) { comp.sheet = emptySheet(); save('vr_comp', comp); renderComp(); } });
    $('#sheet-finish').addEventListener('click', () => {
      const t = sheetTotals(sheet);
      if (t.filled < 16 && !confirm(`Er zijn pas ${t.filled} van de 16 rondes ingevuld. Toch afsluiten?`)) return;
      if (t.a === t.b) { $('#sheet-msg').innerHTML = '<small>Gelijkspel: geen winnaar.</small>'; return; }
      const winner = t.a > t.b ? 0 : 1;
      cur.booms.push({ date: sheet.date, winner, scores: [t.a, t.b], rows: sheet.rows });
      const hi = Math.max(t.a, t.b);
      if (hi > comp.record.score) comp.record = { score: hi, pair: cur.pairs[winner] };
      const ww = seriesWins(cur);
      if (ww[winner] >= 10) cur.finished = true;
      comp.sheet = emptySheet();
      save('vr_comp', comp); renderComp();
      if (cur.finished) alert(`${pairName(cur.pairs[winner])} heeft de serie gewonnen met ${ww[0]}-${ww[1]}! Start een nieuwe serie met andere koppels.`);
    });
  }

  function renderComp() {
    const root = $('#competitie');
    const cur = comp.series[comp.series.length - 1];
    const w = seriesWins(cur);
    let html = renderSheet(cur) + `<div class="cards-grid" style="margin-top:1em">
      <div class="box"><h3>Huidige stand</h3>
        <div class="big">${w[0]} – ${w[1]}</div>
        <div>${esc(pairName(cur.pairs[0]))} tegen ${esc(pairName(cur.pairs[1]))}</div>
        <small>Wie het eerst 10 bomen wint; daarna wisselen de koppels. Een boom is 16 potjes.</small>
        <hr><b>Boom toevoegen</b>
        <div class="form">
          <label>Winnaar</label><select id="comp-winner"><option value="0">${esc(pairName(cur.pairs[0]))}</option><option value="1">${esc(pairName(cur.pairs[1]))}</option></select>
          <label>Score ${esc(pairName(cur.pairs[0]))}</label><input type="number" id="comp-s0" placeholder="bijv. 1650">
          <label>Score ${esc(pairName(cur.pairs[1]))}</label><input type="number" id="comp-s1" placeholder="bijv. 1420">
          <label>Datum</label><input type="date" id="comp-date" value="${new Date().toISOString().slice(0, 10)}">
          <span></span><button class="primary" id="comp-add">Toevoegen</button>
        </div>
      </div>
      <div class="box"><h3>Record</h3>
        <div class="big">${comp.record.score}</div><div>${esc(pairName(comp.record.pair))} (hoogste boomscore)</div>
        <hr><h3>Gespeelde bomen (deze serie)</h3>
        ${cur.booms.length ? `<table class="tbl"><tr><th>Datum</th><th>Winnaar</th><th>Score</th><th></th></tr>${cur.booms.map((b, i) => `<tr><td>${esc(b.date)}</td><td>${esc(pairName(cur.pairs[b.winner]))}</td><td>${b.scores ? b.scores.join(' – ') : ''}</td><td><button data-del="${i}">×</button></td></tr>`).join('')}</table>` : '<small>Nog geen bomen gelogd sinds de start van de app. De stand van 3-3 is als beginstand ingevoerd.</small>'}
      </div>
      <div class="box"><h3>Eerdere series</h3>
        ${comp.series.slice(0, -1).map((s) => { const ww = seriesWins(s); return `<div class="stat-row"><span>${esc(pairName(s.pairs[0]))} – ${esc(pairName(s.pairs[1]))}</span><b>${ww[0]} – ${ww[1]}</b></div>`; }).join('') || '<small>Geen.</small>'}
        <hr><h3>Nieuwe serie</h3>
        <div class="form">
          <label>Koppel 1</label><input id="comp-p1" placeholder="Wietze & Erwin">
          <label>Koppel 2</label><input id="comp-p2" placeholder="Laurens & Wilco">
          <span></span><button id="comp-newseries">Serie starten</button>
        </div>
        <hr><div class="btns"><button id="comp-export">Exporteer</button><button id="comp-import">Importeer</button></div>
        <textarea id="comp-json" style="width:100%;height:80px;margin-top:.5em;font-size:.8rem" placeholder="JSON"></textarea>
      </div></div>`;
    root.innerHTML = html;
    bindSheet(root, cur);
    $('#comp-add').addEventListener('click', () => {
      const winner = +$('#comp-winner').value;
      const s0 = +$('#comp-s0').value, s1 = +$('#comp-s1').value;
      const scores = s0 || s1 ? [s0, s1] : null;
      cur.booms.push({ date: $('#comp-date').value, winner, scores });
      if (scores) {
        const hi = Math.max(s0, s1);
        if (hi > comp.record.score) comp.record = { score: hi, pair: cur.pairs[s0 >= s1 ? 0 : 1] };
      }
      const ww = seriesWins(cur);
      if (ww[winner] >= 10) cur.finished = true;
      save('vr_comp', comp); renderComp();
      if (cur.finished) alert(`${pairName(cur.pairs[winner])} heeft de serie gewonnen met ${ww[0]}-${ww[1]}! Start hieronder een nieuwe serie met andere koppels.`);
    });
    $$('button[data-del]', root).forEach((b) => b.addEventListener('click', () => { cur.booms.splice(+b.dataset.del, 1); save('vr_comp', comp); renderComp(); }));
    $('#comp-newseries').addEventListener('click', () => {
      const p1 = $('#comp-p1').value.split('&').map((x) => x.trim()).filter(Boolean);
      const p2 = $('#comp-p2').value.split('&').map((x) => x.trim()).filter(Boolean);
      if (p1.length !== 2 || p2.length !== 2) { alert('Vul twee koppels in als "Naam & Naam".'); return; }
      cur.finished = true;
      comp.series.push({ pairs: [p1, p2], baseWins: [0, 0], booms: [], finished: false });
      save('vr_comp', comp); renderComp();
    });
    $('#comp-export').addEventListener('click', () => { $('#comp-json').value = JSON.stringify(comp, null, 1); });
    $('#comp-import').addEventListener('click', () => {
      try { const c = JSON.parse($('#comp-json').value); if (c.series && c.record) { comp = c; save('vr_comp', comp); renderComp(); } else alert('Ongeldig bestand.'); } catch (e) { alert('Ongeldige JSON.'); }
    });
  }

  /* =====================================================================
     STATISTIEKEN
     ===================================================================== */
  function renderStats() {
    const s = stats;
    const mistakes = Object.entries(s.mistakes).sort((a, b) => b[1] - a[1]);
    const maxM = mistakes.length ? mistakes[0][1] : 1;
    const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '–');
    const row = (k, v) => `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`;
    const scen = Object.values(s.scenarios);
    $('#stats').innerHTML = `<div class="cards-grid">
      <div class="box"><h3>Spelen</h3>
        ${row('Bomen gespeeld / gewonnen', `${s.booms} / ${s.boomsWon}`)}
        ${row('Spellen gespeeld / gewonnen', `${s.deals} / ${s.dealsWon} (${pct(s.dealsWon, s.deals)})`)}
        ${row('Gemiddelde score per spel (jullie – zij)', s.deals ? `${Math.round(s.pointsFor / s.deals)} – ${Math.round(s.pointsAgainst / s.deals)}` : '–')}
        ${row('Nat gegaan / tegenpartij nat', `${s.natOwn} / ${s.natOpp}`)}
        ${row('Roem tegen per spel', s.deals ? (s.roemAgainst / s.deals).toFixed(1) : '–')}
        ${row('Roem voor per spel', s.deals ? (s.roemFor / s.deals).toFixed(1) : '–')}
        ${row('Zetten beoordeeld', s.moves)}
        ${row('Foutloze zetten', pct(s.moves - (s.moveMistakes || 0), s.moves))}
        ${row('Hints gebruikt', s.hints)}
      </div>
      <div class="box"><h3>Verbeterpunten</h3>
        ${mistakes.length ? mistakes.map(([k, v]) => `<div style="margin:.4em 0"><div class="stat-row" style="border:0"><span>${esc(k)}</span><b>${v}</b></div><div class="bar"><i style="width:${Math.round((100 * v) / maxM)}%"></i></div></div>`).join('') : '<small>Nog geen fouten geregistreerd. Speel een paar spellen met de coach aan.</small>'}
        <hr><small>Tip: de categorie bovenaan is je grootste lek. Lees de bijbehorende les en doe de zet-drill.</small>
      </div>
      <div class="box"><h3>Oefenen</h3>
        ${row('Scenario\'s goed opgelost', `${scen.filter((x) => x === true).length} van ${KJ.Quiz.SCENARIOS.length}`)}
        ${row('Bied-drill', `${s.drills.bied[0]} / ${s.drills.bied[1]} (${pct(s.drills.bied[0], s.drills.bied[1])})`)}
        ${row('Zet-drill', `${s.drills.zet[0]} / ${s.drills.zet[1]} (${pct(s.drills.zet[0], s.drills.zet[1])})`)}
        ${row('Tel-drill', `${s.drills.tel[0]} / ${s.drills.tel[1]} (${pct(s.drills.tel[0], s.drills.tel[1])})`)}
        <hr><div class="btns"><button id="stats-reset">Statistieken wissen</button></div>
      </div></div>`;
    $('#stats-reset').addEventListener('click', () => { if (confirm('Alle statistieken wissen?')) { stats = JSON.parse(JSON.stringify(DEFAULT_STATS)); save('vr_stats', stats); renderStats(); } });
  }

  /* =====================================================================
     INSTELLINGEN
     ===================================================================== */
  function renderSettings() {
    const lv = (id, val) => `<select id="${id}">${Object.entries(AI.LEVELS).filter(([k, c]) => !c.hidden).map(([k, c]) => `<option value="${k}" ${k === val ? 'selected' : ''}>${c.label}</option>`).join('')}</select>`;
    $('#settings').innerHTML = `<div class="cards-grid">
      <div class="box"><h3>Tafel</h3><div class="form">
        <label>Jij (Zuid)</label><input id="set-n0" value="${esc(settings.names[0])}">
        <label>Maat (Noord)</label><input id="set-n2" value="${esc(settings.names[2])}">
        <label>Tegenstander (West)</label><input id="set-n1" value="${esc(settings.names[1])}">
        <label>Tegenstander (Oost)</label><input id="set-n3" value="${esc(settings.names[3])}">
        <label>Niveau maat</label>${lv('set-partner', settings.partnerLevel)}
        <label>Niveau tegenstanders</label>${lv('set-opp', settings.oppLevel)}
      </div>
      <p><small><b>Goed</b>: telt kaarten, seint, leest seinen en rekent zetten door. <b>Gemiddeld</b>: speelt verstandig maar telt niet en seint niet, af en toe een slordigheid. <b>Slecht</b>: speelt half willekeurig en neemt te vaak aan.</small></p>
      </div>
      <div class="box"><h3>Regels</h3><div class="form">
        <label>Variant</label><select id="set-variant"><option value="rotterdams" ${settings.variant === 'rotterdams' ? 'selected' : ''}>Rotterdams</option><option value="amsterdams" ${settings.variant === 'amsterdams' ? 'selected' : ''}>Amsterdams</option></select>
        <label>Troef draaien</label><select id="set-turn"><option value="dealer" ${settings.turnMode === 'dealer' ? 'selected' : ''}>Laatste kaart van de deler (open)</option><option value="los" ${settings.turnMode === 'los' ? 'selected' : ''}>Los kaartje (geen informatie)</option></select>
      </div><p><small>Bieden: de kiezer (links van de deler) mag eerst; in ronde 1 mag iedereen passen. Passen alle vier, dan kiest de kiezer verplicht uit de drie andere kleuren. Zestien spellen per boom.</small></p></div>
      <div class="box"><h3>Coach</h3><div class="form">
        <label>Zetten automatisch beoordelen</label><input type="checkbox" id="set-auto" ${settings.coachAuto ? 'checked' : ''}>
        <label>Telhulp tonen (troeven, vrije kaarten)</label><input type="checkbox" id="set-count" ${settings.showCount ? 'checked' : ''}>
        <label>Rekendiepte (simulaties per kaart)</label><select id="set-samples">${[20, 40, 80, 150].map((n) => `<option value="${n}" ${settings.samples === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <label>Tempo</label><select id="set-speed">${[[300, 'snel'], [700, 'normaal'], [1200, 'rustig']].map(([n, l]) => `<option value="${n}" ${settings.speed === n ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div><p><small>Zet de telhulp uit als je wilt oefenen met zelf tellen.</small></p>
      <div class="btns"><button class="primary" id="set-save">Opslaan</button></div><div id="set-msg"></div></div></div>`;
    $('#set-save').addEventListener('click', () => {
      settings.names = ['set-n0', 'set-n1', 'set-n2', 'set-n3'].map((id) => $('#' + id).value.trim() || 'Speler');
      settings.partnerLevel = $('#set-partner').value; settings.oppLevel = $('#set-opp').value;
      settings.variant = $('#set-variant').value; settings.turnMode = $('#set-turn').value;
      settings.coachAuto = $('#set-auto').checked; settings.showCount = $('#set-count').checked;
      settings.samples = +$('#set-samples').value; settings.speed = +$('#set-speed').value;
      save('vr_settings', settings);
      $('#set-msg').innerHTML = '<small>Opgeslagen. Namen en niveaus gelden meteen; regels vanaf de volgende boom.</small>';
      if (game) render();
    });
  }

  // debug-haakje (alleen lezen)
  window.ValseRoem = { get game() { return game; }, status: () => ({ phase: game && game.phase, turn: game && game.turn, waiting, busy, shownTrick: !!shownTrick, pendingReviews: pendingReviews.length, reviews: reviews.length, worker: Engine.hasWorker() }) };

  /* ---------- start ---------- */
  renderKaarten();
  renderLessons();
  renderScenarios();
  const drillInit = { bied: renderBidDrill, zet: renderMoveDrill, tel: renderCountDrill };
  $$('.subtabs button').forEach((b) => b.addEventListener('click', () => {
    const fn = drillInit[b.dataset.sub];
    if (fn) { fn(); delete drillInit[b.dataset.sub]; }
  }));
  renderComp();
  renderStats();
  renderSettings();
  startBoom();
})();
