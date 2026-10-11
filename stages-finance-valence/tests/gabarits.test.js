const test = require('node:test');
const assert = require('node:assert/strict');
const { cvHtml, lettreHtml, echapper, formuleAppel, dateLongue } = require('../outils/gabarits');
const { maitre, candidatureEmail, candidaturePortail } = require('./fixtures/candidatures');

test('echapper neutralise le HTML', () => {
  assert.equal(echapper('<b>"A & B"</b>'), '&lt;b&gt;&quot;A &amp; B&quot;&lt;/b&gt;');
  assert.equal(echapper(undefined), '');
});

test('cvHtml contient identité, titre, sections et expériences dans l’ordre donné', () => {
  const html = cvHtml(candidatureEmail.cv, maitre.identite);
  assert.match(html, /^<!doctype html>/);
  assert.ok(html.includes('<p style="margin:0;font-size:22pt;color:#FFFFFF"><b>Léa Dupré</b></p>'));
  assert.ok(html.includes('Valence (26)   |   06 00 00 00 00   |   lea.dupre@example.com'));
  assert.ok(html.includes('<b>Stage en expertise comptable – avril à juin 2027</b>'));
  for (const titre of ['EXPÉRIENCES', 'FORMATION', 'COMPÉTENCES', 'LANGUES ET CENTRES D’INTÉRÊT']) {
    assert.ok(html.includes('<p style="margin:0;font-size:10pt;color:#1F3864"><b>' + titre + '</b></p>'), titre);
  }
  assert.ok(html.indexOf('Trésorière') < html.indexOf('Vendeuse conseil'));
  assert.ok(html.includes('</span>  Suivi du budget annuel de 12 000 €</p>'));
});

test('cvHtml tient dans un seul tableau à la largeur importée par Google Docs', () => {
  const html = cvHtml(candidatureEmail.cv, maitre.identite);
  // Docs insère un paragraphe vide entre deux tableaux, transforme h1/h2 en titres espacés
  // et les listes HTML en grosses puces en retrait.
  assert.equal(html.match(/<table/g).length, 1);
  assert.ok(html.includes('<table style="width:468pt;'));
  assert.doesNotMatch(html, /<h[12]|<ul|<li/);
});

test('cvHtml omet les sections vides et échappe le contenu', () => {
  const html = cvHtml({ titre: 'Stage <test>', experiences: [], formations: [], competences: [] }, maitre.identite);
  assert.ok(html.includes('Stage &lt;test&gt;'));
  assert.ok(!html.includes('EXPÉRIENCES'));
  assert.ok(!html.includes('LANGUES'));
  assert.ok(!html.includes('CENTRES'));
});

test('cvHtml titre la dernière section selon ce qui est rempli', () => {
  const html = cvHtml({ titre: 'Stage', langues: ['Anglais B2'] }, maitre.identite);
  assert.ok(html.includes('<b>LANGUES</b>'));
  assert.ok(!html.includes('CENTRES'));
});

test('formuleAppel suit le destinataire', () => {
  assert.equal(formuleAppel('Madame Martin'), 'Madame');
  assert.equal(formuleAppel('Monsieur Dupont'), 'Monsieur');
  assert.equal(formuleAppel(''), 'Madame, Monsieur');
});

test('dateLongue écrit la date en toutes lettres', () => {
  assert.equal(dateLongue(new Date(2026, 9, 10)), '10 octobre 2026');
});

test('lettreHtml assemble en-tête, objet, paragraphes et formule de politesse', () => {
  const html = lettreHtml(candidaturePortail, maitre.identite, new Date(2026, 9, 10));
  assert.ok(html.includes('Léa Dupré<br>Valence (26)<br>06 00 00 00 00<br>lea.dupre@example.com'));
  assert.ok(html.includes('>Valence, le 10 octobre 2026</p>'));
  assert.ok(html.includes('<b>Objet :</b> Candidature – stage conseiller clientèle (avril à juin 2027)'));
  assert.ok(html.includes('>Madame, Monsieur,</p>'));
  assert.equal(html.split('text-align:justify').length - 1, 3);
  assert.ok(html.includes('Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.'));
});
