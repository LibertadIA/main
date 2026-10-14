const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { preparerVague, numeroVague } = require('../outils/preparer-vague');
const { chargerAppsScript } = require('../outils/lib/charger-apps-script');
const { maitre, candidatureEmail, candidaturePortail } = require('./fixtures/candidatures');

const { COLONNES_CANDIDATURES } = chargerAppsScript(['Schema.js']);
const champ = (ligne, colonne) => ligne[COLONNES_CANDIDATURES.indexOf(colonne)];

function dossierVague(numero, candidatures) {
  const dossier = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stages-')), 'vague-' + numero);
  fs.mkdirSync(dossier);
  for (const [nom, contenu] of Object.entries(candidatures)) {
    fs.writeFileSync(path.join(dossier, nom), JSON.stringify(contenu));
  }
  return dossier;
}

test('numeroVague lit le numéro du dossier', () => {
  assert.equal(numeroVague('/x/vague-12'), 12);
  assert.throws(() => numeroVague('/x/lot-1'), /vague-<numéro>/);
});

test('preparerVague génère HTML et lignes pour une vague valide', () => {
  const portailAvecNotes = { ...candidaturePortail, notes: 'Dépôt en agence, 2 place de la République' };
  const dossier = dossierVague(2, { '111111111.json': candidatureEmail, '552120222.json': portailAvecNotes });
  const resultat = preparerVague(dossier, { maitre, date: new Date('2026-10-10T08:00:00Z') });

  assert.equal(resultat.ok, true);
  assert.deepEqual(fs.readdirSync(dossier).sort(), [
    '111111111.cv.html', '111111111.json', '552120222.cv.html', '552120222.json', '552120222.lettre.html', 'lignes.json'
  ]);

  const [email, portail] = resultat.lignes;
  assert.equal(email.length, COLONNES_CANDIDATURES.length);
  assert.equal(champ(email, 'ID candidature'), 'V2-111111111');
  assert.equal(champ(email, 'Vague'), 2);
  assert.equal(champ(email, 'Statut'), 'Prêt');
  assert.equal(champ(email, 'Corps'), candidatureEmail.corpsMail);
  assert.equal(champ(email, 'Date prêt'), '2026-10-10');
  assert.equal(champ(email, 'ID doc CV'), '');
  assert.equal(champ(portail, 'Statut'), 'À postuler (portail)');
  assert.equal(champ(portail, 'Corps'), '');
  assert.equal(champ(portail, 'Lien offre'), 'https://careers.societegenerale.com/offre-exemple');
  assert.equal(champ(email, 'Notes'), '');
  assert.equal(champ(portail, 'Notes'), 'Dépôt en agence, 2 place de la République');

  const enregistre = JSON.parse(fs.readFileSync(path.join(dossier, 'lignes.json'), 'utf8'));
  assert.deepEqual(enregistre.colonnes, COLONNES_CANDIDATURES);
  assert.deepEqual(enregistre.lignes, resultat.lignes);
});

test('preparerVague bloque toute la vague si une candidature est en erreur', () => {
  const invalide = { ...candidatureEmail, idEntreprise: '999999999', entreprise: 'Autre Cabinet', email: '' };
  const dossier = dossierVague(3, { '111111111.json': candidatureEmail, '999999999.json': invalide });
  const resultat = preparerVague(dossier, { maitre });

  assert.equal(resultat.ok, false);
  assert.equal(resultat.rapport.length, 1);
  assert.equal(resultat.rapport[0].fichier, '999999999.json');
  assert.ok(resultat.rapport[0].erreurs.includes('Email manquant ou invalide'));
  assert.deepEqual(fs.readdirSync(dossier).sort(), ['111111111.json', '999999999.json']);
});

test('preparerVague refuse deux candidatures pour la même entreprise', () => {
  const dossier = dossierVague(4, { 'a.json': candidatureEmail, 'b.json': candidatureEmail });
  const resultat = preparerVague(dossier, { maitre });
  assert.equal(resultat.ok, false);
  assert.deepEqual(resultat.rapport.map((r) => r.fichier), ['b.json']);
  assert.ok(resultat.rapport[0].erreurs.includes('Même entreprise que a.json'));
});

test('preparerVague accepte un mail de relais pour une entreprise déjà candidatée par portail', () => {
  const relais = {
    ...candidatureEmail,
    idEntreprise: candidaturePortail.idEntreprise + '-relais',
    entreprise: candidaturePortail.entreprise,
    corpsMail: candidatureEmail.corpsMail.replace('Le Cabinet Exemple Expertise', 'La Société Générale')
  };
  const dossier = dossierVague(5, { '552120222.json': candidaturePortail, '552120222-relais.json': relais });
  const resultat = preparerVague(dossier, { maitre });
  assert.equal(resultat.ok, true, JSON.stringify(resultat.rapport));
  assert.deepEqual(resultat.lignes.map((l) => champ(l, 'ID candidature')).sort(), ['V5-552120222', 'V5-552120222-relais']);
});
