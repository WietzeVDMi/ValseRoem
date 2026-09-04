/* Valse Roem – rekenwerk (simulaties) buiten de hoofdthread */
importScripts('cards.js', 'rules.js', 'game.js', 'ai.js', 'coach.js');
self.onmessage = function (e) {
  const { id, op, view, policies, samples } = e.data;
  const v = KJ.AI.viewFromJSON(view);
  let result;
  try {
    if (op === 'analyze') {
      const an = KJ.Coach.analyzeMove(v, policies, samples);
      result = { evals: an.evals, reasons: an.reasons, best: an.best };
    } else if (op === 'choose') {
      result = { card: KJ.AI.monteCarlo(v, { samples, policies }).card };
    }
  } catch (err) {
    result = { error: String(err) };
  }
  self.postMessage({ id, result });
};
