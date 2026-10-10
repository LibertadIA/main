const test = require('node:test');
const assert = require('node:assert/strict');
const { chargerAppsScript } = require('../outils/lib/charger-apps-script');
const { installerFakesGoogle } = require('./fakes-google');

const gas = chargerAppsScript(['Schema.js', 'Logique.js', 'Feuilles.js', 'Documents.js', 'Messagerie.js', 'Menu.js']);
const { COLONNES_CANDIDATURES, STATUTS } = gas;
const MOI = 'lea.dupre@gmail.com';
const DOC = 'application/vnd.google-apps.document';

function ligne(valeurs) {
  return COLONNES_CANDIDATURES.map((colonne) => (colonne in valeurs ? valeurs[colonne] : ''));
}

function valeur(onglets, numeroLigne, colonne) {
  return onglets.Candidatures[numeroLigne - 1][COLONNES_CANDIDATURES.indexOf(colonne)];
}

function reglages(modeTest) {
  return [
    ['Prénom Nom', 'Léa Dupré'], ['Signature', 'Léa Dupré'], ['Dates de stage', 'avril à juin 2027'],
    ['Délai relance (jours)', 10], ['Délai sans suite (jours)', 10], ['Libellé Gmail', 'Stages'],
    ['Mode test', modeTest ? 'oui' : 'non']
  ];
}

const pret = {
  'ID candidature': 'V1-111', 'ID entreprise': '111', Entreprise: 'Cabinet Exemple', Vague: 1, Canal: 'Email',
  Destinataire: 'Madame Martin', Email: 'rh@cabinet-exemple.fr', Objet: 'Candidature stage comptable',
  Corps: 'Bonjour Madame Martin,\n\nTexte.', 'ID doc CV': 'cv-111', Statut: STATUTS.PRET
};

test('creerBrouillons crée un brouillon avec le CV en PDF et passe la ligne en Brouillon créé', () => {
  const { journal, onglets } = installerFakesGoogle({
    monEmail: MOI,
    onglets: { Candidatures: [COLONNES_CANDIDATURES, ligne(pret)], Réglages: reglages(false) },
    fichiers: { 'cv-111': DOC }
  });

  gas.creerBrouillons();

  assert.equal(journal.brouillons.length, 1);
  assert.equal(journal.brouillons[0].a, 'rh@cabinet-exemple.fr');
  assert.equal(journal.brouillons[0].corps, 'Bonjour Madame Martin,\n\nTexte.\n\nLéa Dupré');
  assert.deepEqual(journal.pdf, ['CV_Lea_Dupre_Cabinet_Exemple.pdf']);
  assert.equal(valeur(onglets, 2, 'Statut'), STATUTS.BROUILLON_CREE);
  assert.equal(valeur(onglets, 2, 'ID brouillon'), 'brouillon-1');
  assert.equal(valeur(onglets, 2, 'ID fil Gmail'), 'fil-1');
  assert.equal(valeur(onglets, 2, 'Erreur'), '');
});

test('en mode test, le brouillon part vers sa propre adresse', () => {
  const { journal } = installerFakesGoogle({
    monEmail: MOI,
    onglets: { Candidatures: [COLONNES_CANDIDATURES, ligne(pret)], Réglages: reglages(true) },
    fichiers: { 'cv-111': DOC }
  });
  gas.creerBrouillons();
  assert.equal(journal.brouillons[0].a, MOI);
});

test('creerBrouillons convertit un CV resté en HTML avant export', () => {
  const { onglets } = installerFakesGoogle({
    monEmail: MOI,
    onglets: { Candidatures: [COLONNES_CANDIDATURES, ligne(pret)], Réglages: reglages(false) },
    fichiers: { 'cv-111': 'text/html' }
  });
  gas.creerBrouillons();
  assert.equal(valeur(onglets, 2, 'ID doc CV'), 'converti-cv-111');
});

test('creerBrouillons refuse un CV de 2 pages, un doublon et une ligne incomplète', () => {
  const { journal, onglets } = installerFakesGoogle({
    monEmail: MOI,
    pagesPdf: 2,
    onglets: {
      Candidatures: [
        COLONNES_CANDIDATURES,
        ligne(pret),
        ligne({ ...pret, 'ID candidature': 'V1-222', 'ID entreprise': '222', 'ID doc CV': 'cv-222', Email: '' }),
        ligne({ ...pret, 'ID candidature': 'V1-333', 'ID entreprise': '333', 'ID doc CV': 'cv-333' }),
        ligne({ ...pret, 'ID candidature': 'V2-333', 'ID entreprise': '333', 'ID doc CV': 'cv-333b', Statut: STATUTS.ENVOYE })
      ],
      Réglages: reglages(false)
    },
    fichiers: { 'cv-111': DOC, 'cv-222': DOC, 'cv-333': DOC }
  });

  gas.creerBrouillons();

  assert.equal(journal.brouillons.length, 0);
  assert.equal(valeur(onglets, 2, 'Erreur'), 'Le CV fait 2 pages : le raccourcir à 1 page');
  assert.equal(valeur(onglets, 3, 'Erreur'), 'Email manquant ou invalide');
  assert.equal(valeur(onglets, 4, 'Erreur'), 'Candidature en double pour cette entreprise');
  assert.equal(valeur(onglets, 2, 'Statut'), STATUTS.PRET);
});

test('creerBrouillons prépare les PDF des candidatures portail sans brouillon', () => {
  const portail = {
    ...pret, Canal: 'Portail', Email: '', Corps: '', 'ID doc lettre': 'lm-111', Statut: STATUTS.A_POSTULER_PORTAIL
  };
  const { journal, onglets } = installerFakesGoogle({
    monEmail: MOI,
    onglets: { Candidatures: [COLONNES_CANDIDATURES, ligne(portail)], Réglages: reglages(false) },
    fichiers: { 'cv-111': DOC, 'lm-111': DOC }
  });

  gas.creerBrouillons();

  assert.equal(journal.brouillons.length, 0);
  assert.deepEqual(journal.pdf, ['CV_Lea_Dupre_Cabinet_Exemple.pdf', 'LM_Lea_Dupre_Cabinet_Exemple.pdf']);
  assert.equal(valeur(onglets, 2, 'Lien dossier'), 'https://drive.google.com/drive/folders/dossier-1');
  assert.equal(valeur(onglets, 2, 'Statut'), STATUTS.A_POSTULER_PORTAIL);
});

test('mettreAJourSuivi détecte l’envoi puis prépare la relance à échéance', () => {
  const envoiLe = new Date(Date.now() - 11 * 24 * 3600 * 1000);
  const { journal, onglets } = installerFakesGoogle({
    monEmail: MOI,
    onglets: {
      Candidatures: [COLONNES_CANDIDATURES, ligne({ ...pret, Statut: STATUTS.BROUILLON_CREE, 'ID fil Gmail': 'fil-a', 'ID brouillon': 'b-1' })],
      Réglages: reglages(false)
    },
    fils: { 'fil-a': [{ de: 'Léa Dupré <' + MOI + '>', date: envoiLe, corps: 'Bonjour', idMessage: '<m1@mail.gmail.com>' }] }
  });

  gas.mettreAJourSuivi();
  assert.equal(valeur(onglets, 2, 'Statut'), STATUTS.ENVOYE);
  assert.equal(valeur(onglets, 2, 'Date envoi'), envoiLe);

  gas.mettreAJourSuivi();
  assert.equal(valeur(onglets, 2, 'Statut'), STATUTS.A_RELANCER);
  assert.equal(valeur(onglets, 2, 'ID brouillon relance'), 'relance-1');
  assert.equal(journal.brouillonsRelance[0].message.threadId, 'fil-a');
  const mime = Buffer.from(journal.brouillonsRelance[0].message.raw, 'base64url').toString('utf8');
  assert.match(mime, /^To: rh@cabinet-exemple\.fr\r\n/);
  assert.match(mime, /In-Reply-To: <m1@mail\.gmail\.com>/);
});

test('mettreAJourSuivi cherche le fil dans les envoyés si le brouillon a disparu', () => {
  const { journal, onglets } = installerFakesGoogle({
    monEmail: MOI,
    onglets: {
      Candidatures: [COLONNES_CANDIDATURES, ligne({ ...pret, Statut: STATUTS.BROUILLON_CREE, 'ID fil Gmail': 'fil-perdu' })],
      Réglages: reglages(false)
    }
  });

  gas.mettreAJourSuivi();

  assert.deepEqual(journal.recherches, ['in:sent to:rh@cabinet-exemple.fr subject:"Candidature stage comptable"']);
  assert.match(valeur(onglets, 2, 'Erreur'), /Brouillon supprimé sans envoi/);
});

test('mettreAJourSuivi enregistre une réponse et laisse les statuts manuels intacts', () => {
  const { onglets } = installerFakesGoogle({
    monEmail: MOI,
    onglets: {
      Candidatures: [
        COLONNES_CANDIDATURES,
        ligne({ ...pret, Statut: STATUTS.ENVOYE, 'ID fil Gmail': 'fil-a', 'Date envoi': new Date(2026, 10, 2) }),
        ligne({ ...pret, 'ID entreprise': '999', Statut: STATUTS.ENTRETIEN, 'ID fil Gmail': 'fil-a' })
      ],
      Réglages: reglages(false)
    },
    fils: {
      'fil-a': [
        { de: MOI, date: new Date(2026, 10, 2), corps: 'Bonjour', idMessage: '<m1>' },
        { de: 'RH <rh@cabinet-exemple.fr>', date: new Date(2026, 10, 4), corps: 'Pouvez-vous nous appeler ?' }
      ]
    }
  });

  gas.mettreAJourSuivi();

  assert.equal(valeur(onglets, 2, 'Statut'), STATUTS.REPONSE_RECUE);
  assert.equal(valeur(onglets, 2, 'Extrait réponse'), 'Pouvez-vous nous appeler ?');
  assert.equal(valeur(onglets, 3, 'Statut'), STATUTS.ENTRETIEN);
});
