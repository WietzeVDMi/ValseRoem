// Laadt de browser-scripts in Node (ze schrijven naar globalThis.KJ)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
for (const f of ['cards.js', 'rules.js', 'game.js', 'ai.js', 'coach.js']) {
  const p = path.join(__dirname, '..', 'js', f);
  if (fs.existsSync(p)) vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p });
}
module.exports = globalThis.KJ;
