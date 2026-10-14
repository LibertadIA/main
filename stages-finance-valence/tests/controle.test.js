const test = require('node:test');
const assert = require('node:assert/strict');
const { controlerCandidature, compterMots } = require('../outils/controle');
const { maitre, candidatureEmail, candidaturePortail } = require('./fixtures/candidatures');

test('compterMots ignore la ponctuation isolée', () => {
  assert.equal(compterMots('Bonjour , je suis – ici ! 2027'), 5);
});

test('les candidatures d’exemple passent le contrôle', () => {
  assert.deepEqual(controlerCandidature(candidatureEmail, maitre, ['Société Générale']), []);
  assert.deepEqual(controlerCandidature(candidaturePortail, maitre, ['Cabinet Exemple Expertise']), []);
});

test('refuse un email invalide et un corps hors fourchette', () => {
  const erreurs = controlerCandidature({ ...candidatureEmail, email: 'contact@', corpsMail: 'Bonjour Cabinet Exemple Expertise' }, maitre);
  assert.deepEqual(erreurs, ['Email manquant ou invalide', 'Corps du mail : 4 mots (attendu 120-150)']);
});

test('refuse une lettre portail hors fourchette', () => {
  const erreurs = controlerCandidature({ ...candidaturePortail, lettre: { paragraphes: ['Société Générale court'] } }, maitre);
  assert.deepEqual(erreurs, ['Lettre : 3 mots (attendu 250-300)']);
});

test('exige le nom de l’entreprise (accents et casse ignorés) et refuse celui d’une autre', () => {
  const sansNom = candidatureEmail.corpsMail.replace('Le Cabinet Exemple Expertise', 'Votre cabinet');
  assert.deepEqual(
    controlerCandidature({ ...candidatureEmail, corpsMail: sansNom }, maitre),
    ['Le texte ne cite pas l’entreprise « Cabinet Exemple Expertise »']
  );
  const autre = candidatureEmail.corpsMail.replace('Je vous remercie par avance', 'Je vous remercie, comme BDO,');
  assert.deepEqual(controlerCandidature({ ...candidatureEmail, corpsMail: autre }, maitre, ['BDO']), [
    'Mentionne une autre entreprise : « BDO »'
  ]);
  const accents = candidatureEmail.corpsMail.replace('Le Cabinet Exemple Expertise', 'Le CABINET EXEMPLE EXPERTISE');
  assert.deepEqual(controlerCandidature({ ...candidatureEmail, entreprise: 'Cabinet Exemple Expertisé', corpsMail: accents }, maitre), []);
});

test('refuse toute expérience, formation, compétence, langue ou loisir absent du CV maître', () => {
  const cv = {
    ...candidatureEmail.cv,
    experiences: [...candidatureEmail.cv.experiences, { poste: 'Analyste', structure: 'Banque Inventée', dates: '2025', points: [] }],
    formations: [{ diplome: 'Master', etablissement: 'École Inventée', dates: '2026' }],
    competences: ['Python'],
    langues: ['Allemand C1'],
    centresInteret: ['Golf']
  };
  const erreurs = controlerCandidature({ ...candidatureEmail, cv }, maitre);
  assert.equal(erreurs.length, 5);
  assert.match(erreurs[0], /^Expérience absent\(e\) du CV maître/);
  assert.match(erreurs[1], /^Formation absent\(e\) du CV maître/);
  assert.match(erreurs[2], /^Compétence absent\(e\) du CV maître : "Python"/);
  assert.match(erreurs[3], /^Langue absent\(e\)/);
  assert.match(erreurs[4], /^Centre d’intérêt absent\(e\)/);
});

test('accepte un poste reformulé tant que structure et dates correspondent', () => {
  const experiences = [{ ...maitre.experiences[1], poste: 'Trésorière du bureau des étudiants', points: ['Budget de 12 000 €'] }];
  assert.deepEqual(controlerCandidature({ ...candidatureEmail, cv: { ...candidatureEmail.cv, experiences } }, maitre), []);
});

test('limite la longueur du CV', () => {
  const experience = { ...maitre.experiences[0], points: ['a', 'b', 'c', 'd', 'e'] };
  const cv = { ...candidatureEmail.cv, experiences: [experience, experience, experience, experience, experience] };
  const erreurs = controlerCandidature({ ...candidatureEmail, cv }, maitre);
  assert.ok(erreurs.includes('CV : plus de 4 expériences'));
  assert.ok(erreurs.includes('CV : plus de 4 points pour « Vendeuse conseil (job d\'été) »'));
});

test('signale les champs et le canal manquants', () => {
  const erreurs = controlerCandidature({ cv: {} }, maitre);
  assert.deepEqual(erreurs, [
    'Champ manquant : idEntreprise', 'Champ manquant : entreprise', 'Champ manquant : objet',
    'Canal inconnu : undefined', 'CV : titre manquant'
  ]);
});
