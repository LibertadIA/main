const test = require('node:test');
const assert = require('node:assert/strict');
const { chargerAppsScript } = require('../outils/lib/charger-apps-script');

const gas = chargerAppsScript(['Schema.js']);

test('les colonnes de chaque onglet sont uniques', () => {
  for (const colonnes of [gas.COLONNES_ENTREPRISES, gas.COLONNES_CANDIDATURES]) {
    assert.equal(new Set(colonnes).size, colonnes.length);
  }
});

test('les colonnes utilisées par le suivi existent', () => {
  const attendues = [
    'ID entreprise', 'Entreprise', 'Canal', 'Email', 'Objet', 'Corps', 'ID doc CV',
    'ID doc lettre', 'Lien dossier', 'Statut', 'ID brouillon', 'ID fil Gmail',
    'Date envoi', 'Relance prévue', 'ID brouillon relance', 'Date relance',
    'Date réponse', 'Extrait réponse', 'Erreur'
  ];
  for (const nom of attendues) assert.ok(gas.COLONNES_CANDIDATURES.includes(nom), nom);
});

test('chaque statut a une couleur et les statuts suivis sont des statuts connus', () => {
  const valeurs = Object.values(gas.STATUTS);
  for (const statut of valeurs) assert.ok(gas.COULEURS_STATUTS[statut], statut);
  for (const statut of gas.STATUTS_SUIVIS) assert.ok(valeurs.includes(statut), statut);
});

test('les réglages par défaut démarrent en mode test', () => {
  const modeTest = gas.REGLAGES_PAR_DEFAUT.find(([cle]) => cle === 'Mode test');
  assert.equal(modeTest[1], 'oui');
});
