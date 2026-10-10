const test = require('node:test');
const assert = require('node:assert/strict');
const { chargerAppsScript } = require('../outils/lib/charger-apps-script');

const gas = chargerAppsScript(['Schema.js', 'Logique.js']);

const ligneValide = {
  'ID entreprise': '123456789',
  Entreprise: 'Cabinet Exemple',
  Email: 'rh@cabinet-exemple.fr',
  Objet: 'Candidature stage comptable',
  Corps: 'Bonjour,\n\nTexte.',
  'ID doc CV': 'doc-cv-1'
};

test('validerPourBrouillon accepte une ligne complète', () => {
  assert.equal(gas.validerPourBrouillon(ligneValide), null);
});

test('validerPourBrouillon signale le premier champ manquant', () => {
  assert.equal(gas.validerPourBrouillon({ ...ligneValide, Email: '' }), 'Email manquant ou invalide');
  assert.equal(gas.validerPourBrouillon({ ...ligneValide, Objet: ' ' }), 'Objet manquant');
  assert.equal(gas.validerPourBrouillon({ ...ligneValide, Corps: '' }), 'Corps du mail manquant');
  assert.equal(gas.validerPourBrouillon({ ...ligneValide, 'ID doc CV': '' }), 'ID doc CV manquant');
});

test('doublonsEntreprise liste les entreprises présentes plusieurs fois', () => {
  const lignes = [
    { 'ID entreprise': 'A' }, { 'ID entreprise': 'B' }, { 'ID entreprise': 'A' }, { 'ID entreprise': '' }
  ];
  assert.deepEqual(gas.doublonsEntreprise(lignes), ['A']);
});

test('corpsAvecSignature ajoute la signature si elle existe', () => {
  assert.equal(gas.corpsAvecSignature('Texte', 'Léa'), 'Texte\n\nLéa');
  assert.equal(gas.corpsAvecSignature('Texte', ''), 'Texte');
});

test('corpsRelance est court, poli et reprend entreprise, date et signature', () => {
  const corps = gas.corpsRelance(
    { Destinataire: 'Madame Martin', Entreprise: 'Cabinet Exemple', 'Date envoi': new Date(2026, 10, 2) },
    { signature: 'Léa Dupré', datesStage: 'avril à juin 2027' }
  );
  assert.equal(corps, [
    'Bonjour Madame Martin,',
    '',
    'Je me permets de revenir vers vous au sujet de ma candidature pour un stage (avril à juin 2027) au sein de Cabinet Exemple, envoyée le 02/11/2026.',
    'Je reste disponible pour un échange à votre convenance.',
    '',
    'Bien cordialement,',
    'Léa Dupré'
  ].join('\n'));
});

test('corpsRelance sans destinataire ni dates', () => {
  const corps = gas.corpsRelance(
    { Destinataire: '', Entreprise: 'PME Exemple', 'Date envoi': new Date(2026, 10, 2) },
    { signature: '', datesStage: '' }
  );
  assert.ok(corps.startsWith('Bonjour,\n'));
  assert.ok(corps.includes('pour un stage au sein de PME Exemple'));
  assert.ok(corps.endsWith('Bien cordialement,'));
});

test('requeteFilEnvoye construit une recherche Gmail sans guillemets parasites', () => {
  assert.equal(
    gas.requeteFilEnvoye('rh@cabinet.fr', 'Stage "finance" 2027'),
    'in:sent to:rh@cabinet.fr subject:"Stage finance 2027"'
  );
});

test('construireMimeRelance produit un message de réponse dans le fil', () => {
  const b64 = (texte) => Buffer.from(texte, 'utf8').toString('base64');
  const brut = gas.construireMimeRelance(
    { a: 'rh@cabinet.fr', objet: 'Candidature stage', corps: 'Relance é', idMessageOrigine: '<abc@mail.gmail.com>' },
    b64
  );
  const lignes = brut.split('\r\n');
  assert.equal(lignes[0], 'To: rh@cabinet.fr');
  assert.equal(lignes[1], 'Subject: =?UTF-8?B?' + b64('Re: Candidature stage') + '?=');
  assert.equal(lignes[2], 'In-Reply-To: <abc@mail.gmail.com>');
  assert.equal(lignes[3], 'References: <abc@mail.gmail.com>');
  assert.equal(lignes[lignes.length - 1], b64('Relance é'));
  assert.equal(lignes[lignes.length - 2], '');
});

test('construireMimeRelance ne double pas le préfixe Re:', () => {
  const b64 = (texte) => Buffer.from(texte, 'utf8').toString('base64');
  const brut = gas.construireMimeRelance(
    { a: 'x@y.fr', objet: 'RE: Candidature', corps: 'x', idMessageOrigine: '<m>' },
    b64
  );
  assert.ok(brut.includes('Subject: =?UTF-8?B?' + b64('RE: Candidature') + '?='));
});

test('compterPagesPdf compte les objets /Type /Page sans compter /Pages', () => {
  const pdf = '<< /Type /Pages /Count 2 >> << /Type /Page >> << /Type/Page /Parent 1 0 R >>';
  assert.equal(gas.compterPagesPdf(pdf), 2);
  assert.equal(gas.compterPagesPdf('rien'), 0);
});
