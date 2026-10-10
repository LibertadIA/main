const test = require('node:test');
const assert = require('node:assert/strict');
const { chargerAppsScript } = require('../outils/lib/charger-apps-script');

const gas = chargerAppsScript(['Schema.js', 'Logique.js']);
const { STATUTS } = gas;

const MOI = 'lea.dupre@gmail.com';
const reglages = { delaiRelance: 10, delaiSansSuite: 10 };
const j = (jour) => new Date(2026, 10, jour, 9, 0, 0);

const envoi = { de: 'Léa Dupré <lea.dupre@gmail.com>', date: j(2), estBrouillon: false, corps: 'Bonjour', idMessage: '<m1>' };
const relance = { de: 'lea.dupre@gmail.com', date: j(13), estBrouillon: false, corps: 'Relance', idMessage: '<m2>' };
const reponse = { de: 'RH <rh@cabinet.fr>', date: j(5), estBrouillon: false, corps: 'Merci,\n nous revenons vers vous', idMessage: '<m3>' };
const rebond = { de: 'Mail Delivery Subsystem <mailer-daemon@googlemail.com>', date: j(2), estBrouillon: false, corps: 'Adresse introuvable', idMessage: '<m4>' };
const brouillon = { de: MOI, date: j(1), estBrouillon: true, corps: 'Bonjour', idMessage: '<d1>' };

test('analyserFil sur un brouillon non envoyé', () => {
  assert.deepEqual(gas.analyserFil([brouillon], MOI), {
    brouillonPresent: true, envoi: null, relance: null, reponse: null, rebond: false
  });
});

test('analyserFil repère envoi, relance et réponse', () => {
  const faits = gas.analyserFil([envoi, reponse, relance], MOI);
  assert.deepEqual(faits.envoi, { date: j(2), idMessage: '<m1>' });
  assert.deepEqual(faits.relance, { date: j(13) });
  assert.deepEqual(faits.reponse, { date: j(5), extrait: 'Merci, nous revenons vers vous' });
  assert.equal(faits.rebond, false);
});

test('analyserFil repère un rebond sans le prendre pour une réponse', () => {
  const faits = gas.analyserFil([envoi, rebond], MOI);
  assert.equal(faits.rebond, true);
  assert.equal(faits.reponse, null);
});

const faitsVides = { brouillonPresent: false, envoi: null, relance: null, reponse: null, rebond: false };

test('prochainEtat ignore les statuts posés à la main', () => {
  for (const statut of [STATUTS.PRET, STATUTS.ENTRETIEN, STATUTS.REFUS, STATUTS.A_POSTULER_PORTAIL]) {
    const etat = gas.prochainEtat({ Statut: statut }, { ...faitsVides, reponse: { date: j(3), extrait: 'x' } }, reglages, j(20));
    assert.deepEqual(etat, { maj: {}, action: null }, statut);
  }
});

test('Brouillon créé → Envoyé avec date d’envoi et relance prévue', () => {
  const faits = gas.analyserFil([envoi], MOI);
  const etat = gas.prochainEtat({ Statut: STATUTS.BROUILLON_CREE }, faits, reglages, j(3));
  assert.deepEqual(etat, {
    maj: { 'Date envoi': j(2), Statut: STATUTS.ENVOYE, 'Relance prévue': j(12), Erreur: '' },
    action: null
  });
});

test('Brouillon créé encore présent → aucun changement', () => {
  const etat = gas.prochainEtat({ Statut: STATUTS.BROUILLON_CREE }, { ...faitsVides, brouillonPresent: true }, reglages, j(3));
  assert.deepEqual(etat, { maj: {}, action: null });
});

test('Brouillon supprimé sans envoi → erreur explicite', () => {
  const etat = gas.prochainEtat({ Statut: STATUTS.BROUILLON_CREE }, faitsVides, reglages, j(3));
  assert.match(etat.maj.Erreur, /Brouillon supprimé sans envoi/);
  assert.equal(etat.maj.Statut, undefined);
});

test('un rebond passe la ligne en Email invalide', () => {
  const faits = gas.analyserFil([envoi, rebond], MOI);
  const etat = gas.prochainEtat({ Statut: STATUTS.BROUILLON_CREE }, faits, reglages, j(3));
  assert.deepEqual(etat.maj, { 'Date envoi': j(2), Statut: STATUTS.EMAIL_INVALIDE });
});

test('une réponse l’emporte sur la relance', () => {
  const faits = gas.analyserFil([envoi, reponse], MOI);
  const ligne = { Statut: STATUTS.ENVOYE, 'Date envoi': j(2), 'Relance prévue': j(12) };
  const etat = gas.prochainEtat(ligne, faits, reglages, j(20));
  assert.deepEqual(etat, {
    maj: { Statut: STATUTS.REPONSE_RECUE, 'Date réponse': j(5), 'Extrait réponse': 'Merci, nous revenons vers vous' },
    action: null
  });
});

test('Envoyé sans réponse avant la date de relance → aucun changement', () => {
  const faits = gas.analyserFil([envoi], MOI);
  const ligne = { Statut: STATUTS.ENVOYE, 'Date envoi': j(2), 'Relance prévue': j(12) };
  assert.deepEqual(gas.prochainEtat(ligne, faits, reglages, j(11)), { maj: {}, action: null });
});

test('Envoyé sans réponse à la date de relance → À relancer + brouillon de relance', () => {
  const faits = gas.analyserFil([envoi], MOI);
  const ligne = { Statut: STATUTS.ENVOYE, 'Date envoi': j(2), 'Relance prévue': j(12) };
  assert.deepEqual(gas.prochainEtat(ligne, faits, reglages, j(12)), {
    maj: { Statut: STATUTS.A_RELANCER },
    action: 'BROUILLON_RELANCE'
  });
});

test('À relancer sans brouillon de relance → nouvelle tentative de création', () => {
  const faits = gas.analyserFil([envoi], MOI);
  const ligne = { Statut: STATUTS.A_RELANCER, 'Date envoi': j(2), 'ID brouillon relance': '' };
  assert.deepEqual(gas.prochainEtat(ligne, faits, reglages, j(13)), { maj: {}, action: 'BROUILLON_RELANCE' });
});

test('À relancer avec brouillon déjà créé et non envoyé → aucun changement', () => {
  const faits = gas.analyserFil([envoi], MOI);
  const ligne = { Statut: STATUTS.A_RELANCER, 'Date envoi': j(2), 'ID brouillon relance': 'r-1' };
  assert.deepEqual(gas.prochainEtat(ligne, faits, reglages, j(13)), { maj: {}, action: null });
});

test('À relancer → Relancé quand la relance est partie', () => {
  const faits = gas.analyserFil([envoi, relance], MOI);
  const ligne = { Statut: STATUTS.A_RELANCER, 'Date envoi': j(2), 'ID brouillon relance': 'r-1' };
  assert.deepEqual(gas.prochainEtat(ligne, faits, reglages, j(14)), {
    maj: { Statut: STATUTS.RELANCE, 'Date relance': j(13) },
    action: null
  });
});

test('Relancé sans réponse après le délai → Sans suite', () => {
  const faits = gas.analyserFil([envoi, relance], MOI);
  const ligne = { Statut: STATUTS.RELANCE, 'Date envoi': j(2), 'Date relance': j(13) };
  assert.deepEqual(gas.prochainEtat(ligne, faits, reglages, j(22)), { maj: {}, action: null });
  assert.deepEqual(gas.prochainEtat(ligne, faits, reglages, j(23)), { maj: { Statut: STATUTS.SANS_SUITE }, action: null });
});
