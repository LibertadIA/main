const test = require('node:test');
const assert = require('node:assert/strict');
const { chargerAppsScript } = require('../outils/lib/charger-apps-script');

const gas = chargerAppsScript(['Schema.js', 'Logique.js']);

test('ajouterJours ajoute des jours calendaires sans modifier la date source', () => {
  const depart = new Date(2026, 9, 28);
  const resultat = gas.ajouterJours(depart, 10);
  assert.equal(resultat.getFullYear(), 2026);
  assert.equal(resultat.getMonth(), 10);
  assert.equal(resultat.getDate(), 7);
  assert.equal(depart.getDate(), 28);
});

test('formaterDate écrit jj/mm/aaaa', () => {
  assert.equal(gas.formaterDate(new Date(2026, 0, 5)), '05/01/2026');
});

test('nomFichier retire accents et caractères spéciaux', () => {
  assert.equal(
    gas.nomFichier('CV', 'Léa Dupré', 'Crédit Agricole Sud Rhône-Alpes'),
    'CV_Lea_Dupre_Credit_Agricole_Sud_Rhone_Alpes.pdf'
  );
});

test('extrait compacte les espaces et coupe à la longueur demandée', () => {
  assert.equal(gas.extrait('  Bonjour,\n\n  merci  ', 200), 'Bonjour, merci');
  assert.equal(gas.extrait('abcdefghij', 5), 'abcd…');
  assert.equal(gas.extrait(null, 5), '');
});

test('estEmailValide', () => {
  assert.equal(gas.estEmailValide('rh@cabinet.fr'), true);
  assert.equal(gas.estEmailValide(' rh@cabinet.fr '), true);
  assert.equal(gas.estEmailValide('rh@cabinet'), false);
  assert.equal(gas.estEmailValide(''), false);
});

test('adresseDe extrait l’adresse d’un champ « De »', () => {
  assert.equal(gas.adresseDe('Jean Dupont <Jean.Dupont@Banque.fr>'), 'jean.dupont@banque.fr');
  assert.equal(gas.adresseDe('rh@cabinet.fr'), 'rh@cabinet.fr');
});

test('estRebond reconnaît les messages de non-remise', () => {
  assert.equal(gas.estRebond('Mail Delivery Subsystem <mailer-daemon@googlemail.com>'), true);
  assert.equal(gas.estRebond('postmaster@banque.fr'), true);
  assert.equal(gas.estRebond('rh@banque.fr'), false);
});

test('lettreColonne convertit un numéro en lettre', () => {
  assert.equal(gas.lettreColonne(1), 'A');
  assert.equal(gas.lettreColonne(14), 'N');
  assert.equal(gas.lettreColonne(27), 'AA');
});

test('ligneVersObjet associe chaque valeur à son en-tête', () => {
  assert.deepEqual(gas.ligneVersObjet(['x', 3], ['Nom', 'Vague']), { Nom: 'x', Vague: 3 });
  assert.deepEqual(gas.indexerEntetes(['Nom', 'Vague']), { Nom: 0, Vague: 1 });
});

test('reglagesDepuisPaires lit l’onglet Réglages avec des valeurs par défaut', () => {
  const reglages = gas.reglagesDepuisPaires([
    ['Prénom Nom', ' Léa Dupré '],
    ['Signature', 'Léa Dupré\n06 00 00 00 00'],
    ['Dates de stage', 'avril à juin 2027'],
    ['Délai relance (jours)', ''],
    ['Délai sans suite (jours)', 7],
    ['Libellé Gmail', 'Stages'],
    ['Mode test', true]
  ]);
  assert.deepEqual(reglages, {
    prenomNom: 'Léa Dupré',
    signature: 'Léa Dupré\n06 00 00 00 00',
    datesStage: 'avril à juin 2027',
    delaiRelance: 10,
    delaiSansSuite: 7,
    libelle: 'Stages',
    modeTest: true
  });
  assert.equal(gas.reglagesDepuisPaires([['Mode test', 'non']]).modeTest, false);
});
