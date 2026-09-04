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
  let game = null, gen = 0, reviews = [], pending = null, shownTrick = null, hintCard = null, busy = false;

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
    reviews = []; pending = null; shownTrick = null; hintCard = null;
    log('result', `<b>Spel ${game.dealNo}.</b> ${esc(settings.names[game.dealer])} deelt, ${esc(settings.names[game.chooser])} is kiezer. Gedraaid: ${suitHtml(game.proposed)}${game.turnCard ? ' (' + lab(game.turnCard) + ' van de deler)' : ''}.`);
    render();
    schedule(advance, settings.speed);
  }

  function schedule(fn, ms) { const g = gen; setTimeout(() => { if (g === gen) fn(); }, ms); }

  function advance() {
    if (!game) return;
    if (game.phase === 'bidding') {
      if (game.turn === 0) { render(); return; }
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
      if (game.turn === 0) { prepareUserTurn(); render(); return; }
      const seat = game.turn;
      const card = AI.chooseCard(game, seat, levelOf(seat), policies());
      playCard(seat, card);
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
    const g = gen, dealNo = game.dealNo, trickNo = game.tricks.length, n = game.trick.length;
    setTimeout(() => {
      if (g !== gen || !game || game.dealNo !== dealNo || game.tricks.length !== trickNo || game.trick.length !== n || game.turn !== 0) return;
      pending = { key: dealNo + ':' + trickNo + ':' + n, an: Coach.analyzeMove(v, policies(), settings.samples), v };
    }, 30);
  }

  function playCard(seat, card) {
    busy = true;
    let review = null;
    if (seat === 0 && settings.coachAuto) {
      const key = game.dealNo + ':' + game.tricks.length + ':' + game.trick.length;
      const v = game.view(0);
      const an = pending && pending.key === key ? pending.an : Coach.analyzeMove(v, policies(), settings.samples);
      review = Coach.review(v, an, card, policies());
      reviews.push(review);
      stats.moves++;
      if (review.grade !== 'goed') stats.mistakes[review.cat] = (stats.mistakes[review.cat] || 0) + 1;
      save('vr_stats', stats);
    }
    const done = game.play(seat, card);
    hintCard = null; pending = null;
    if (review) log(review.grade, `<span class="grade">${review.grade === 'goed' ? '✓' : review.grade === 'fout' ? '✗' : '~'}</span> ${rich(review.text)}`, review.situation);
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
    const lines = Coach.dealSummary(game, 0, reviews);
    log('result', `<b>Uitslag spel ${r.dealNo}: ${r.score[0]} – ${r.score[1]}.</b><br>${lines.map(rich).join('<br>')}`);
    stats.deals++;
    if (r.score[0] > r.score[1]) stats.dealsWon++;
    if (r.nat) { if (KJ.team(r.playerSeat) === 0) stats.natOwn++; else stats.natOpp++; }
    stats.roemAgainst += r.roem[1]; stats.roemFor += r.roem[0]; stats.pointsFor += r.score[0]; stats.pointsAgainst += r.score[1];
    if (game.phase === 'gameover') {
      stats.booms++;
      if (game.scores[0] > game.scores[1]) stats.boomsWon++;
      log('result', `<b>Boom afgelopen: ${game.scores[0]} – ${game.scores[1]}.</b> ${game.scores[0] > game.scores[1] ? 'Gewonnen!' : game.scores[0] < game.scores[1] ? 'Verloren.' : 'Gelijk.'}`);
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
    $('#btn-hint').disabled = !(game.phase === 'playing' && game.turn === 0 && !busy) && !(game.phase === 'bidding' && game.turn === 0);
  }

  function renderSeat(s) {
    const el = $('#seat-' + s);
    const isTurn = (game.phase === 'bidding' || game.phase === 'playing') && game.turn === s && !shownTrick;
    const tags = [];
    if (game.dealer === s) tags.push('deler');
    if (game.playerSeat === s) tags.push('speler');
    const lvl = s === 0 ? 'jij' : s === 2 ? 'maat · ' + AI.LEVELS[settings.partnerLevel].label.toLowerCase() : AI.LEVELS[settings.oppLevel].label.toLowerCase();
    let html = `<div class="name${isTurn ? ' turn' : ''}">${esc(settings.names[s])} <span class="lvl">${lvl}</span>${tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>`;
    if (s === 0) {
      const hand = KJ.sortHand(game.hands[0], game.trump);
      const legal = game.phase === 'playing' && game.turn === 0 && !busy && !shownTrick ? game.legalMoves(0) : null;
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
    if (game.phase === 'bidding' && game.turn === 0) {
      html += renderBidBox();
    } else if (game.phase === 'bidding') msg = `${esc(settings.names[game.turn])} denkt na...`;
    else if (game.phase === 'playing' && game.turn === 0 && !shownTrick) msg = game.trick.length ? 'Jij bent aan de beurt.' : 'Jij komt uit.';
    else if (game.phase === 'dealdone') msg = `<div>Spel ${game.dealNo} klaar: ${game.lastResult.score[0]} – ${game.lastResult.score[1]}${game.lastResult.nat ? ' (nat)' : ''}</div><button class="primary" id="btn-next">Volgende spel</button>`;
    else if (game.phase === 'gameover') msg = `<div>Boom klaar: ${game.scores[0]} – ${game.scores[1]}</div><button class="primary" id="btn-next">Nieuwe boom</button>`;
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
    if (game.phase !== 'bidding' || game.turn !== 0) return;
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
    if (!game || game.phase !== 'playing' || game.turn !== 0 || busy || shownTrick) return;
    if (!game.legalMoves(0).includes(card)) return;
    playCard(0, card);
  }

  $('#btn-hint').addEventListener('click', () => {
    if (!game) return;
    if (game.phase === 'bidding' && game.turn === 0) { showBidAdvice(); return; }
    if (game.phase !== 'playing' || game.turn !== 0 || busy) return;
    const v = game.view(0);
    const h = Coach.hint(v, policies(), settings.samples);
    const key = game.dealNo + ':' + game.tricks.length + ':' + game.trick.length;
    pending = { key, an: h.analysis, v };
    hintCard = h.best.card;
    stats.hints++; save('vr_stats', stats);
    const ev = h.analysis.evals.map((e) => `<span class="${e.card === h.best.card ? 'best' : ''}">${KJ.label(e.card)} ${e.ev >= 0 ? '+' : ''}${Math.round(e.ev)}</span>`).join('');
    log('hint', `<b>Hint.</b> ${rich(h.lines.slice(1).join(' '))}<div class="evals">${ev}</div>`, h.lines[0]);
    renderSeat(0);
  });
  $('#btn-tricks').addEventListener('click', () => { const el = $('#tricklist'); el.hidden = !el.hidden; });
  $('#btn-newboom').addEventListener('click', () => { if (!game || game.phase === 'gameover' || confirm('Huidige boom afbreken en een nieuwe beginnen?')) startBoom(); });

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
        const an = Coach.analyzeMove(v, ['goed', 'goed', 'goed', 'goed'], 60);
        const ok = sc.answers.includes(card);
        markScenario(sc.id, ok);
        const ev = an.evals.map((e) => `<span class="${sc.answers.includes(e.card) ? 'best' : ''}">${KJ.label(e.card)} ${e.ev >= 0 ? '+' : ''}${Math.round(e.ev)}</span>`).join('');
        $('#scen-fb').innerHTML = `<div class="feedback ${ok ? 'goed' : 'fout'}"><b>${ok ? 'Goed: ' + KJ.label(card) + '.' : KJ.label(card) + ' is niet de beste kaart. Beter: ' + sc.answers.map(KJ.label).join(' of ') + '.'}</b> ${rich(sc.explanation)}<div class="evals">${ev}</div><small>Verwachte puntenwinst per kaart volgens de simulatie (gemiddeld verschil voor jullie over de rest van het spel).</small></div>`;
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
        const an = Coach.analyzeMove(v, policies(), Math.max(60, settings.samples));
        const rv = Coach.review(v, an, card, policies());
        const ok = rv.grade === 'goed';
        stats.drills.zet[0] += ok ? 1 : 0; stats.drills.zet[1]++; save('vr_stats', stats);
        const ev = an.evals.map((e) => `<span class="${e.card === an.best.card ? 'best' : ''}">${KJ.label(e.card)} ${e.ev >= 0 ? '+' : ''}${Math.round(e.ev)}</span>`).join('');
        $('#zet-fb').innerHTML = `<div class="feedback ${rv.grade}">${rich(rv.text)}<div class="evals">${ev}</div></div>`;
        $$('.hand .card', root).forEach((x) => x.classList.remove('legal'));
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
  function renderComp() {
    const root = $('#competitie');
    const cur = comp.series[comp.series.length - 1];
    const w = seriesWins(cur);
    const pairName = (p) => p.join(' & ');
    let html = `<div class="cards-grid">
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
        ${row('Foutloze zetten', pct(s.moves - mistakes.reduce((a, m) => a + m[1], 0), s.moves))}
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

  /* ---------- start ---------- */
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
