const test = require('node:test');
const assert = require('node:assert/strict');
const { executerReperage } = require('../outils/reperer');
const f = require('./fixtures/annuaire');

test('executerReperage parcourt toutes les pages, dédoublonne et classe par secteur', async () => {
  const appels = [];
  const recuperer = async (url) => {
    appels.push(url);
    if (url.includes('activite_principale=64.19Z')) return f.page([f.banqueGE], 1);
    if (url.includes('activite_principale=65.11Z')) return f.page([f.banqueGE], 1);
    if (url.includes('activite_principale=69.20Z') && url.endsWith('page=1')) return f.page([f.cabinetPME, f.cabinetFerme], 2);
    if (url.includes('activite_principale=69.20Z') && url.endsWith('page=2')) return f.page([f.cabinetPetit], 2);
    if (url.includes('/search?')) return f.page([f.pmeLocale, f.pmeParisienne, f.cabinetPME], 1);
    throw new Error('URL inattendue : ' + url);
  };
  const journal = [];

  const { total, retenues } = await executerReperage({ recuperer, attenteMs: 0, journal: (m) => journal.push(m) });

  assert.equal(appels.length, 5);
  assert.equal(total, 4);
  assert.deepEqual(retenues.map((e) => [e.secteur, e.siren]), [
    ['Banque', '552120222'],
    ['Comptabilité/Audit', '111111111'],
    ['Comptabilité/Audit', '444444444'],
    ['PME', '555555555']
  ]);
  assert.deepEqual(journal, [
    'Banque : 1 structure(s) dans la zone',
    'Assurance/CGP : 0 structure(s) dans la zone',
    'Comptabilité/Audit : 2 structure(s) dans la zone',
    'PME : 1 structure(s) dans la zone'
  ]);
});

test('executerReperage respecte maxPages', async () => {
  const appels = [];
  const recuperer = async (url) => {
    appels.push(url);
    return f.page([], 400);
  };
  await executerReperage({ recuperer, attenteMs: 0, maxPages: 2, journal: () => {} });
  assert.equal(appels.length, 8);
});
