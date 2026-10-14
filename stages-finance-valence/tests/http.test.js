const test = require('node:test');
const assert = require('node:assert/strict');
const { recupererJson } = require('../outils/lib/http');

const reponse = (status, texte) => ({ status, ok: status >= 200 && status < 300, text: async () => texte });

function fetchSequence(sequence) {
  const appels = [];
  const fetchImpl = async (url) => {
    appels.push(url);
    const suivant = sequence.shift();
    if (suivant instanceof Error) throw suivant;
    return suivant;
  };
  return { fetchImpl, appels };
}

test('renvoie le JSON au premier succès', async () => {
  const { fetchImpl, appels } = fetchSequence([reponse(200, '{"a":1}')]);
  assert.deepEqual(await recupererJson('https://x', { fetchImpl, attendre: async () => {} }), { a: 1 });
  assert.equal(appels.length, 1);
});

test('réessaie après coupure réseau, erreur 5xx, 429 et réponse non JSON, avec attente croissante', async () => {
  const attentes = [];
  const { fetchImpl, appels } = fetchSequence([
    new Error('ECONNRESET'), reponse(503, 'upstream connect error'), reponse(429, ''), reponse(200, 'upstream c'), reponse(200, '{"ok":true}')
  ]);
  const resultat = await recupererJson('https://x', { fetchImpl, attenteMs: 10, attendre: async (ms) => attentes.push(ms) });
  assert.deepEqual(resultat, { ok: true });
  assert.equal(appels.length, 5);
  assert.deepEqual(attentes, [10, 20, 40, 80]);
});

test('abandonne après le nombre de tentatives prévu', async () => {
  const { fetchImpl } = fetchSequence([new Error('ECONNRESET'), new Error('ECONNRESET')]);
  await assert.rejects(
    recupererJson('https://x', { fetchImpl, tentatives: 2, attendre: async () => {} }),
    /Échec après 2 tentatives sur https:\/\/x : ECONNRESET/
  );
});

test('ne réessaie pas une erreur 4xx définitive', async () => {
  const { fetchImpl, appels } = fetchSequence([reponse(400, 'mauvaise requête')]);
  await assert.rejects(recupererJson('https://x', { fetchImpl, attendre: async () => {} }), /HTTP 400/);
  assert.equal(appels.length, 1);
});
