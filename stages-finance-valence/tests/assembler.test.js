const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { assembler, ORDRE } = require('../outils/assembler');
const { DOSSIER_APPS_SCRIPT } = require('../outils/lib/charger-apps-script');

test('tous les fichiers .js d’apps-script sont assemblés, dans l’ordre', () => {
  const presents = fs.readdirSync(DOSSIER_APPS_SCRIPT).filter((f) => f.endsWith('.js')).sort();
  assert.deepEqual([...ORDRE].sort(), presents);
  const code = assembler();
  const positions = ORDRE.map((f) => code.indexOf('// ===== ' + f + ' ====='));
  assert.ok(positions.every((p) => p >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('le fichier assemblé est du JavaScript valide sans déclaration globale let/const', () => {
  const code = assembler();
  assert.doesNotThrow(() => new vm.Script(code));
  assert.doesNotMatch(code, /^(let|const) /m);
});

test('le manifeste active Gmail et Drive avancés en Europe/Paris', () => {
  const manifeste = JSON.parse(fs.readFileSync(DOSSIER_APPS_SCRIPT + '/appsscript.json', 'utf8'));
  assert.equal(manifeste.timeZone, 'Europe/Paris');
  const services = manifeste.dependencies.enabledAdvancedServices.map((s) => s.userSymbol).sort();
  assert.deepEqual(services, ['Drive', 'Gmail']);
});
