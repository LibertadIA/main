# Recherche de stage finance (Valence) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** construire l'outil personnel décrit dans `docs/superpowers/specs/2026-10-10-stage-finance-valence-design.md` : repérage des entreprises via l'annuaire officiel, contrôle et mise en page des candidatures, script Google (brouillons Gmail, suivi, relances) et procédure Claude.

**Architecture :** deux blocs de code dans `stages-finance-valence/`.
- `apps-script/` : script lié au Google Sheet. Logique pure (`Schema.js`, `Logique.js`) testée sous Node, plus une fine couche d'appels Google (`Feuilles.js`, `Documents.js`, `Messagerie.js`, `Menu.js`) testée avec de faux services. Les fichiers sont assemblés en un seul `dist/Code.gs` à coller dans l'éditeur Apps Script.
- `outils/` : outils Node lancés par Claude (repérage via l'annuaire, contrôle qualité, gabarits HTML, préparation de vague).

Claude dépose le CV et la lettre en HTML dans Drive (convertis en Google Docs). Le script les exporte en PDF A4 au moment de créer les brouillons.

**Tech stack :** Node 22 (aucune dépendance, `node --test`), Google Apps Script V8 (SpreadsheetApp, DriveApp, DocumentApp, GmailApp, services avancés Gmail v1 et Drive v3), API `recherche-entreprises.api.gouv.fr`, connecteurs Google Drive / Google Sheets / Apollo de Claude.

**Conventions :**
- Toutes les commandes se lancent depuis `stages-finance-valence/` sauf mention contraire.
- Fichiers `apps-script/*.js` : uniquement des `var` et des déclarations `function` au niveau global (pas de `let`/`const` globaux, pas de `require`). Apps Script partage une seule portée globale entre ses fichiers, et les tests les chargent de la même façon.
- Aucune donnée personnelle versionnée : `donnees/` et `dist/` sont ignorés par git.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `stages-finance-valence/package.json` | Scripts `test`, `assembler`, `reperer`, `preparer-vague` |
| `stages-finance-valence/.gitignore` | Ignore `donnees/`, `dist/`, `node_modules/` |
| `stages-finance-valence/README.md` | Installation du Sheet, utilisation, tests en mode test |
| `apps-script/Schema.js` | Onglets, colonnes, statuts, réglages par défaut, couleurs |
| `apps-script/Logique.js` | Fonctions pures : utilitaires, brouillons et messages, machine à états du suivi |
| `apps-script/Feuilles.js` | Lecture / écriture du Sheet, initialisation des onglets, couleurs, liste déroulante |
| `apps-script/Documents.js` | Conversion HTML → Google Docs si besoin, export PDF A4 |
| `apps-script/Messagerie.js` | Brouillons Gmail, lecture des fils, recherche des envoyés, brouillon de relance |
| `apps-script/Menu.js` | Menu, `installer`, `creerBrouillons`, `mettreAJourSuivi` |
| `apps-script/appsscript.json` | Manifeste : fuseau Europe/Paris, services avancés Gmail et Drive |
| `outils/lib/charger-apps-script.js` | Charge les fichiers Apps Script dans la portée globale de Node |
| `outils/lib/http.js` | `recupererJson` avec nouvelles tentatives |
| `outils/annuaire.js` | URLs de l'annuaire, filtres de zone, normalisation en lignes `Entreprises` |
| `outils/reperer.js` | CLI de repérage → `donnees/reperage/entreprises-<date>.json` |
| `outils/controle.js` | Contrôle qualité d'une candidature |
| `outils/gabarits.js` | HTML du CV et de la lettre |
| `outils/preparer-vague.js` | CLI : contrôle + HTML + `lignes.json` d'une vague |
| `outils/assembler.js` | CLI : `dist/Code.gs` |
| `tests/*.test.js`, `tests/fakes-google.js`, `tests/fixtures/*` | Tests et exemples fictifs |
| `.claude/skills/stages-finance/SKILL.md` (racine du repo) | Procédure suivie par Claude à chaque session |

---

### Task 1 : squelette du projet et schéma du classeur

**Files:**
- Create: `stages-finance-valence/package.json`
- Create: `stages-finance-valence/.gitignore`
- Create: `stages-finance-valence/outils/lib/charger-apps-script.js`
- Create: `stages-finance-valence/apps-script/Schema.js`
- Test: `stages-finance-valence/tests/schema.test.js`

- [ ] **Step 1 : créer le squelette**

`stages-finance-valence/package.json` :

```json
{
  "name": "stages-finance-valence",
  "version": "1.0.0",
  "private": true,
  "description": "Outils de recherche de stage finance autour de Valence",
  "scripts": {
    "test": "node --test \"tests/**/*.test.js\"",
    "assembler": "node outils/assembler.js",
    "reperer": "node outils/reperer.js",
    "preparer-vague": "node outils/preparer-vague.js"
  },
  "engines": {
    "node": ">=22"
  }
}
```

`stages-finance-valence/.gitignore` :

```text
node_modules/
donnees/
dist/
```

`stages-finance-valence/outils/lib/charger-apps-script.js` :

```javascript
// Charge des fichiers Apps Script dans la portée globale de Node, comme Apps Script le fait :
// tous les fichiers d'un projet partagent la même portée globale.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const DOSSIER_APPS_SCRIPT = path.join(__dirname, '..', '..', 'apps-script');

function chargerAppsScript(fichiers) {
  for (const fichier of fichiers) {
    const code = fs.readFileSync(path.join(DOSSIER_APPS_SCRIPT, fichier), 'utf8');
    vm.runInThisContext(code, { filename: fichier });
  }
  return globalThis;
}

module.exports = { chargerAppsScript, DOSSIER_APPS_SCRIPT };
```

- [ ] **Step 2 : écrire le test qui échoue**

`stages-finance-valence/tests/schema.test.js` :

```javascript
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
```

- [ ] **Step 3 : vérifier l'échec**

Run: `npm test`
Expected: FAIL, `ENOENT: no such file or directory, open '…/apps-script/Schema.js'`

- [ ] **Step 4 : écrire le schéma**

`stages-finance-valence/apps-script/Schema.js` :

```javascript
// Schéma du classeur « Suivi candidatures » : onglets, colonnes, statuts, réglages.
// Uniquement des `var` au niveau global : ce fichier est aussi chargé sous Node pour les tests.

var ONGLETS = {
  ENTREPRISES: 'Entreprises',
  CANDIDATURES: 'Candidatures',
  REGLAGES: 'Réglages'
};

var COLONNES_ENTREPRISES = [
  'ID entreprise', 'Nom', 'Secteur', 'Ville', 'Site', 'Taille',
  'Contact', 'Email', 'Canal', 'Lien offre / portail',
  'Culture (3 mots)', "Angle d'accroche", 'Priorité', 'Source', 'État'
];

var COLONNES_CANDIDATURES = [
  'ID candidature', 'ID entreprise', 'Entreprise', 'Vague', 'Canal',
  'Destinataire', 'Email', 'Objet', 'Corps',
  'ID doc CV', 'ID doc lettre', 'Lien offre', 'Lien dossier',
  'Statut', 'Date prêt', 'ID brouillon', 'ID fil Gmail', 'Date envoi',
  'Relance prévue', 'ID brouillon relance', 'Date relance',
  'Date réponse', 'Extrait réponse', 'Erreur', 'Notes'
];

var STATUTS = {
  PRET: 'Prêt',
  BROUILLON_CREE: 'Brouillon créé',
  ENVOYE: 'Envoyé',
  A_RELANCER: 'À relancer',
  RELANCE: 'Relancé',
  REPONSE_RECUE: 'Réponse reçue',
  ENTRETIEN: 'Entretien',
  REFUS: 'Refus',
  ACCEPTE: 'Accepté',
  SANS_SUITE: 'Sans suite',
  EMAIL_INVALIDE: 'Email invalide',
  A_POSTULER_PORTAIL: 'À postuler (portail)',
  POSTULE_PORTAIL: 'Postulé (portail)'
};

// Seuls ces statuts sont modifiés par le suivi automatique ; les autres sont posés à la main.
var STATUTS_SUIVIS = [STATUTS.BROUILLON_CREE, STATUTS.ENVOYE, STATUTS.A_RELANCER, STATUTS.RELANCE];

var CANAUX = { EMAIL: 'Email', PORTAIL: 'Portail' };

var REGLAGES_PAR_DEFAUT = [
  ['Prénom Nom', ''],
  ['Signature', ''],
  ['Dates de stage', ''],
  ['Délai relance (jours)', 10],
  ['Délai sans suite (jours)', 10],
  ['Libellé Gmail', 'Stages'],
  ['Mode test', 'oui']
];

var COULEURS_STATUTS = {
  'Prêt': '#e8f0fe',
  'Brouillon créé': '#d2e3fc',
  'Envoyé': '#fef7e0',
  'À relancer': '#fce8b2',
  'Relancé': '#fdd663',
  'Réponse reçue': '#ceead6',
  'Entretien': '#81c995',
  'Accepté': '#34a853',
  'Refus': '#f6aea9',
  'Sans suite': '#e8eaed',
  'Email invalide': '#f28b82',
  'À postuler (portail)': '#e9d2fd',
  'Postulé (portail)': '#d7aefb'
};
```

- [ ] **Step 5 : vérifier le succès**

Run: `npm test`
Expected: PASS, `# pass 4`

- [ ] **Step 6 : commit**

```bash
git add stages-finance-valence/package.json stages-finance-valence/.gitignore stages-finance-valence/outils/lib/charger-apps-script.js stages-finance-valence/apps-script/Schema.js stages-finance-valence/tests/schema.test.js
git commit -m "feat(stages): squelette du projet et schéma du classeur"
```

---

### Task 2 : logique pure (utilitaires)

**Files:**
- Create: `stages-finance-valence/apps-script/Logique.js`
- Test: `stages-finance-valence/tests/logique-utilitaires.test.js`

- [ ] **Step 1 : écrire le test qui échoue**

`stages-finance-valence/tests/logique-utilitaires.test.js` :

```javascript
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
```

- [ ] **Step 2 : vérifier l'échec**

Run: `node --test tests/logique-utilitaires.test.js`
Expected: FAIL, `ENOENT … apps-script/Logique.js`

- [ ] **Step 3 : créer `Logique.js` avec la section utilitaires**

`stages-finance-valence/apps-script/Logique.js` :

```javascript
// Fonctions pures du suivi : aucune dépendance aux services Google, testées sous Node.
// Uniquement des `var` et des déclarations de fonctions au niveau global.

// --- Utilitaires -------------------------------------------------------------

function ajouterJours(date, jours) {
  var resultat = new Date(date.getTime());
  resultat.setDate(resultat.getDate() + Number(jours));
  return resultat;
}

function formaterDate(date) {
  var jj = ('0' + date.getDate()).slice(-2);
  var mm = ('0' + (date.getMonth() + 1)).slice(-2);
  return jj + '/' + mm + '/' + date.getFullYear();
}

function sansAccents(texte) {
  return String(texte).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function nomFichier(prefixe, prenomNom, entreprise) {
  var morceaux = [prefixe, prenomNom, entreprise].map(function (morceau) {
    return sansAccents(morceau).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  });
  return morceaux.join('_') + '.pdf';
}

function extrait(texte, longueur) {
  var propre = String(texte || '').replace(/\s+/g, ' ').trim();
  var max = longueur || 200;
  return propre.length <= max ? propre : propre.slice(0, max - 1) + '…';
}

function estEmailValide(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function adresseDe(expediteur) {
  var correspondance = String(expediteur || '').match(/<([^>]+)>/);
  return (correspondance ? correspondance[1] : String(expediteur || '')).trim().toLowerCase();
}

function estRebond(expediteur) {
  return /mailer-daemon|postmaster/i.test(String(expediteur || ''));
}

function lettreColonne(numero) {
  var lettres = '';
  var reste = numero;
  while (reste > 0) {
    var modulo = (reste - 1) % 26;
    lettres = String.fromCharCode(65 + modulo) + lettres;
    reste = Math.floor((reste - 1) / 26);
  }
  return lettres;
}

function indexerEntetes(entetes) {
  var index = {};
  entetes.forEach(function (entete, i) { index[entete] = i; });
  return index;
}

function ligneVersObjet(valeurs, entetes) {
  var objet = {};
  entetes.forEach(function (entete, i) { objet[entete] = valeurs[i]; });
  return objet;
}

function nombreOu(valeur, parDefaut) {
  return valeur === '' || valeur === null || valeur === undefined || isNaN(Number(valeur)) ? parDefaut : Number(valeur);
}

function reglagesDepuisPaires(paires) {
  var brut = {};
  paires.forEach(function (paire) { brut[String(paire[0]).trim()] = paire[1]; });
  return {
    prenomNom: String(brut['Prénom Nom'] || '').trim(),
    signature: String(brut['Signature'] || ''),
    datesStage: String(brut['Dates de stage'] || '').trim(),
    delaiRelance: nombreOu(brut['Délai relance (jours)'], 10),
    delaiSansSuite: nombreOu(brut['Délai sans suite (jours)'], 10),
    libelle: String(brut['Libellé Gmail'] || 'Stages').trim(),
    modeTest: /^(oui|true|1)$/i.test(String(brut['Mode test']).trim())
  };
}
```

- [ ] **Step 4 : vérifier le succès**

Run: `node --test tests/logique-utilitaires.test.js`
Expected: PASS, `# pass 10`

- [ ] **Step 5 : commit**

```bash
git add stages-finance-valence/apps-script/Logique.js stages-finance-valence/tests/logique-utilitaires.test.js
git commit -m "feat(stages): utilitaires purs du script (dates, noms de fichier, réglages)"
```

---

### Task 3 : logique pure (brouillons et messages)

**Files:**
- Modify: `stages-finance-valence/apps-script/Logique.js` (ajout en fin de fichier)
- Test: `stages-finance-valence/tests/logique-messages.test.js`

- [ ] **Step 1 : écrire le test qui échoue**

`stages-finance-valence/tests/logique-messages.test.js` :

```javascript
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

test('sansCitation garde seulement le texte nouveau d’une réponse', () => {
  assert.equal(
    gas.sansCitation('bien reçu\n\nLe dim. 11 oct. 2026 à 16:41, Gabrie\nl <g@gmail.com> a écrit :\n> Bonjour'),
    'bien reçu'
  );
  assert.equal(gas.sansCitation('Thanks!\nOn Sun, Oct 11, 2026 at 4:41 PM Gabriel <g@gmail.com> wrote:\n> Hi'), 'Thanks!');
  assert.equal(gas.sansCitation("Merci\n\n-----Message d'origine-----\nDe : Gabriel"), 'Merci');
  assert.equal(gas.sansCitation('Réponse\n> citation'), 'Réponse');
  assert.equal(gas.sansCitation('  Pas de citation  '), 'Pas de citation');
});
```

- [ ] **Step 2 : vérifier l'échec**

Run: `node --test tests/logique-messages.test.js`
Expected: FAIL, `TypeError: gas.validerPourBrouillon is not a function`

- [ ] **Step 3 : ajouter la section à la fin de `Logique.js`**

```javascript
// --- Brouillons et messages -----------------------------------------------------

function validerPourBrouillon(ligne) {
  if (!estEmailValide(ligne['Email'])) return 'Email manquant ou invalide';
  if (!String(ligne['Objet'] || '').trim()) return 'Objet manquant';
  if (!String(ligne['Corps'] || '').trim()) return 'Corps du mail manquant';
  if (!String(ligne['ID doc CV'] || '').trim()) return 'ID doc CV manquant';
  return null;
}

function doublonsEntreprise(lignes) {
  var vus = {};
  var doublons = [];
  lignes.forEach(function (ligne) {
    var id = String(ligne['ID entreprise'] || '').trim();
    if (!id) return;
    if (vus[id] && doublons.indexOf(id) === -1) doublons.push(id);
    vus[id] = true;
  });
  return doublons;
}

function corpsAvecSignature(corps, signature) {
  return signature ? corps + '\n\n' + signature : corps;
}

function corpsRelance(ligne, reglages) {
  var salutation = ligne['Destinataire'] ? 'Bonjour ' + ligne['Destinataire'] + ',' : 'Bonjour,';
  var dates = reglages.datesStage ? ' (' + reglages.datesStage + ')' : '';
  var lignes = [
    salutation,
    '',
    'Je me permets de revenir vers vous au sujet de ma candidature pour un stage' + dates +
      ' au sein de ' + ligne['Entreprise'] + ', envoyée le ' + formaterDate(ligne['Date envoi']) + '.',
    'Je reste disponible pour un échange à votre convenance.',
    '',
    'Bien cordialement,'
  ];
  if (reglages.signature) lignes.push(reglages.signature);
  return lignes.join('\n');
}

function requeteFilEnvoye(email, objet) {
  return 'in:sent to:' + email + ' subject:"' + String(objet).replace(/"/g, '') + '"';
}

function construireMimeRelance(parametres, encoderBase64) {
  var sujet = /^re:/i.test(parametres.objet) ? parametres.objet : 'Re: ' + parametres.objet;
  return [
    'To: ' + parametres.a,
    'Subject: =?UTF-8?B?' + encoderBase64(sujet) + '?=',
    'In-Reply-To: ' + parametres.idMessageOrigine,
    'References: ' + parametres.idMessageOrigine,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encoderBase64(parametres.corps)
  ].join('\r\n');
}

// Coupe la citation du message d'origine (« Le … a écrit : », « On … wrote: », lignes « > », Outlook).
function sansCitation(corps) {
  var texte = String(corps || '');
  var marqueurs = [
    /(^|\n)[ \t]*(Le|On) [^\n]*(\n[^\n]*){0,2}?(a écrit|wrote)[ \t]*:/,
    /(^|\n)[ \t]*>/,
    /(^|\n)[ \t]*-{2,}[ \t]*(Original Message|Message d'origine)/i
  ];
  var fin = texte.length;
  marqueurs.forEach(function (marqueur) {
    var trouve = marqueur.exec(texte);
    if (trouve && trouve.index < fin) fin = trouve.index;
  });
  return texte.slice(0, fin).trim();
}

function compterPagesPdf(texte) {
  var pages = String(texte).match(/\/Type\s*\/Page(?![A-Za-z])/g);
  return pages ? pages.length : 0;
}
```

- [ ] **Step 4 : vérifier le succès**

Run: `node --test tests/logique-messages.test.js`
Expected: PASS, `# pass 10`

- [ ] **Step 5 : commit**

```bash
git add stages-finance-valence/apps-script/Logique.js stages-finance-valence/tests/logique-messages.test.js
git commit -m "feat(stages): validation des brouillons, corps de relance et message MIME"
```

---

### Task 4 : logique pure (machine à états du suivi)

**Files:**
- Modify: `stages-finance-valence/apps-script/Logique.js` (ajout en fin de fichier)
- Test: `stages-finance-valence/tests/logique-suivi.test.js`

- [ ] **Step 1 : écrire le test qui échoue**

`stages-finance-valence/tests/logique-suivi.test.js` :

```javascript
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

test('analyserFil retire le texte cité de l’extrait de réponse', () => {
  const citee = { ...reponse, corps: 'Bien reçu\n\nLe lun. 2 nov. 2026 à 09:00, Léa <lea.dupre@gmail.com> a écrit :\n> Bonjour' };
  assert.equal(gas.analyserFil([envoi, citee], MOI).reponse.extrait, 'Bien reçu');
  const queCitation = { ...reponse, corps: '> Bonjour' };
  assert.equal(gas.analyserFil([envoi, queCitation], MOI).reponse.extrait, '> Bonjour');
});
```

- [ ] **Step 2 : vérifier l'échec**

Run: `node --test tests/logique-suivi.test.js`
Expected: FAIL, `TypeError: gas.analyserFil is not a function`

- [ ] **Step 3 : ajouter la section à la fin de `Logique.js`**

```javascript
// --- Suivi -----------------------------------------------------------------------

// messages : [{ de, date, estBrouillon, corps, idMessage }] dans l'ordre du fil.
function analyserFil(messages, monEmail) {
  var moi = String(monEmail || '').toLowerCase();
  var faits = { brouillonPresent: false, envoi: null, relance: null, reponse: null, rebond: false };
  messages.forEach(function (message) {
    if (message.estBrouillon) {
      faits.brouillonPresent = true;
    } else if (estRebond(message.de)) {
      faits.rebond = true;
    } else if (adresseDe(message.de) === moi) {
      if (!faits.envoi) faits.envoi = { date: message.date, idMessage: message.idMessage };
      else if (!faits.relance) faits.relance = { date: message.date };
    } else if (!faits.reponse) {
      faits.reponse = { date: message.date, extrait: extrait(sansCitation(message.corps) || message.corps, 200) };
    }
  });
  return faits;
}

// Renvoie les cellules à mettre à jour et l'éventuelle action à mener ('BROUILLON_RELANCE').
function prochainEtat(ligne, faits, reglages, aujourdhui) {
  var statut = ligne['Statut'];
  var maj = {};
  if (STATUTS_SUIVIS.indexOf(statut) === -1) return { maj: maj, action: null };

  if (faits.envoi && !ligne['Date envoi']) maj['Date envoi'] = faits.envoi.date;

  if (faits.rebond) {
    maj['Statut'] = STATUTS.EMAIL_INVALIDE;
    return { maj: maj, action: null };
  }
  if (faits.reponse) {
    maj['Statut'] = STATUTS.REPONSE_RECUE;
    maj['Date réponse'] = faits.reponse.date;
    maj['Extrait réponse'] = faits.reponse.extrait;
    return { maj: maj, action: null };
  }

  if (statut === STATUTS.BROUILLON_CREE) {
    if (faits.envoi) {
      maj['Statut'] = STATUTS.ENVOYE;
      maj['Relance prévue'] = ajouterJours(faits.envoi.date, reglages.delaiRelance);
      maj['Erreur'] = '';
    } else if (!faits.brouillonPresent) {
      maj['Erreur'] = 'Brouillon supprimé sans envoi : repasser la ligne en « Prêt » et vider « ID brouillon » pour le recréer';
    }
    return { maj: maj, action: null };
  }

  if (statut === STATUTS.ENVOYE) {
    var prevue = ligne['Relance prévue'];
    if (faits.envoi && prevue && aujourdhui >= prevue) {
      maj['Statut'] = STATUTS.A_RELANCER;
      return { maj: maj, action: 'BROUILLON_RELANCE' };
    }
    return { maj: maj, action: null };
  }

  if (statut === STATUTS.A_RELANCER) {
    if (faits.relance) {
      maj['Statut'] = STATUTS.RELANCE;
      maj['Date relance'] = faits.relance.date;
      return { maj: maj, action: null };
    }
    var aRecreer = faits.envoi && !ligne['ID brouillon relance'];
    return { maj: maj, action: aRecreer ? 'BROUILLON_RELANCE' : null };
  }

  // Relancé
  var dateRelance = ligne['Date relance'];
  if (dateRelance && aujourdhui >= ajouterJours(dateRelance, reglages.delaiSansSuite)) {
    maj['Statut'] = STATUTS.SANS_SUITE;
  }
  return { maj: maj, action: null };
}
```

- [ ] **Step 4 : vérifier le succès**

Run: `npm test`
Expected: PASS, `# pass 39`

- [ ] **Step 5 : commit**

```bash
git add stages-finance-valence/apps-script/Logique.js stages-finance-valence/tests/logique-suivi.test.js
git commit -m "feat(stages): machine à états du suivi (envoi, réponse, rebond, relance)"
```

---

### Task 5 : appels aux services Google (Sheet, Drive, Docs, Gmail) et menu

**Files:**
- Create: `stages-finance-valence/apps-script/Feuilles.js`
- Create: `stages-finance-valence/apps-script/Documents.js`
- Create: `stages-finance-valence/apps-script/Messagerie.js`
- Create: `stages-finance-valence/apps-script/Menu.js`
- Create: `stages-finance-valence/apps-script/appsscript.json`
- Create: `stages-finance-valence/tests/fakes-google.js`
- Test: `stages-finance-valence/tests/apps-script-integration.test.js`

- [ ] **Step 1 : écrire les faux services Google**

`stages-finance-valence/tests/fakes-google.js` :

```javascript
// Fausses versions minimales des services Google utilisés par le script, pour les tests d'intégration.

function installerFakesGoogle({ monEmail = 'lea.dupre@gmail.com', onglets = {}, fils = {}, fichiers = {}, pagesPdf = 1 } = {}) {
  const journal = { brouillons: [], brouillonsRelance: [], pdf: [], toasts: [], recherches: [] };

  const feuille = (nom) => ({
    getDataRange: () => ({ getValues: () => onglets[nom].map((ligne) => ligne.slice()) }),
    getRange: (ligne, colonne) => ({
      setValue: (valeur) => {
        while (onglets[nom].length < ligne) onglets[nom].push([]);
        onglets[nom][ligne - 1][colonne - 1] = valeur;
      }
    })
  });

  globalThis.SpreadsheetApp = {
    getActiveSpreadsheet: () => ({
      getSheetByName: (nom) => (onglets[nom] ? feuille(nom) : null),
      toast: (message) => journal.toasts.push(message)
    })
  };

  const fil = (id) => ({
    getId: () => id,
    addLabel: () => {},
    getMessages: () => (fils[id] || []).map((m) => ({
      getFrom: () => m.de,
      getDate: () => m.date,
      isDraft: () => Boolean(m.estBrouillon),
      getPlainBody: () => m.corps || '',
      getHeader: () => m.idMessage || ''
    }))
  });

  let compteur = 0;
  globalThis.GmailApp = {
    getThreadById: (id) => (fils[id] ? fil(id) : null),
    getUserLabelByName: () => ({}),
    createLabel: () => ({}),
    search: (requete) => {
      journal.recherches.push(requete);
      return [];
    },
    createDraft: (a, objet, corps, options) => {
      compteur += 1;
      const idFil = 'fil-' + compteur;
      fils[idFil] = [{ de: monEmail, date: new Date(), estBrouillon: true, corps }];
      journal.brouillons.push({ a, objet, corps, options });
      return { getId: () => 'brouillon-' + compteur, getMessage: () => ({ getThread: () => fil(idFil) }) };
    }
  };

  globalThis.Gmail = {
    Users: {
      getProfile: (utilisateur) => ({ emailAddress: utilisateur === 'me' ? monEmail : '' }),
      Drafts: {
        create: (ressource) => {
          journal.brouillonsRelance.push(ressource);
          return { id: 'relance-' + journal.brouillonsRelance.length };
        }
      }
    }
  };

  globalThis.Utilities = {
    Charset: { UTF_8: 'UTF-8' },
    base64Encode: (texte) => Buffer.from(texte, 'utf8').toString('base64'),
    base64EncodeWebSafe: (texte) => Buffer.from(texte, 'utf8').toString('base64url')
  };

  globalThis.MimeType = { PDF: 'application/pdf' };

  const dossier = {
    getId: () => 'dossier-1',
    getUrl: () => 'https://drive.google.com/drive/folders/dossier-1',
    getFilesByName: () => ({ hasNext: () => false }),
    createFile: (blob) => journal.pdf.push(blob.nom)
  };

  globalThis.DriveApp = {
    getFileById: (id) => {
      if (!fichiers[id]) throw new Error('Fichier introuvable : ' + id);
      return {
        getMimeType: () => fichiers[id],
        getName: () => id + '.html',
        getBlob: () => ({}),
        getParents: () => ({ next: () => dossier }),
        getAs: () => {
          const blob = {
            nom: null,
            setName: (nom) => { blob.nom = nom; return blob; },
            getDataAsString: () => '<< /Type /Page >>'.repeat(pagesPdf)
          };
          return blob;
        }
      };
    }
  };

  globalThis.Drive = {
    Files: {
      create: (ressource) => {
        const id = 'converti-' + ressource.name;
        fichiers[id] = 'application/vnd.google-apps.document';
        return { id };
      }
    }
  };

  const corps = {};
  for (const methode of ['setPageWidth', 'setPageHeight', 'setMarginTop', 'setMarginBottom', 'setMarginLeft', 'setMarginRight']) {
    corps[methode] = () => corps;
  }
  globalThis.DocumentApp = { openById: () => ({ getBody: () => corps, saveAndClose: () => {} }) };

  return { journal, onglets, fils };
}

module.exports = { installerFakesGoogle };
```

- [ ] **Step 2 : écrire le test d'intégration qui échoue**

`stages-finance-valence/tests/apps-script-integration.test.js` :

```javascript
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
```

- [ ] **Step 3 : vérifier l'échec**

Run: `node --test tests/apps-script-integration.test.js`
Expected: FAIL, `ENOENT … apps-script/Feuilles.js`

- [ ] **Step 4 : écrire `Feuilles.js`**

`stages-finance-valence/apps-script/Feuilles.js` :

```javascript
// Lecture et écriture du classeur (SpreadsheetApp).

function classeur() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function lireTable(nomOnglet) {
  var feuille = classeur().getSheetByName(nomOnglet);
  if (!feuille) throw new Error('Onglet introuvable : ' + nomOnglet + ' (lancer « Installer / réparer le classeur »)');
  var valeurs = feuille.getDataRange().getValues();
  var entetes = valeurs[0];
  var lignes = valeurs.slice(1).map(function (ligne, i) {
    var objet = ligneVersObjet(ligne, entetes);
    objet._numero = i + 2;
    return objet;
  });
  return { feuille: feuille, entetes: entetes, lignes: lignes };
}

function ecrireMaj(table, ligne, maj) {
  var index = indexerEntetes(table.entetes);
  Object.keys(maj).forEach(function (colonne) {
    if (!(colonne in index)) throw new Error('Colonne inconnue : ' + colonne);
    table.feuille.getRange(ligne._numero, index[colonne] + 1).setValue(maj[colonne]);
    ligne[colonne] = maj[colonne];
  });
}

function lireReglages() {
  var feuille = classeur().getSheetByName(ONGLETS.REGLAGES);
  if (!feuille) throw new Error('Onglet Réglages introuvable (lancer « Installer / réparer le classeur »)');
  return reglagesDepuisPaires(feuille.getDataRange().getValues());
}

function assurerOnglet(nom, entetes) {
  var feuille = classeur().getSheetByName(nom) || classeur().insertSheet(nom);
  if (feuille.getLastRow() === 0) {
    feuille.getRange(1, 1, 1, entetes.length).setValues([entetes]).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
  return feuille;
}

function initialiserClasseur() {
  assurerOnglet(ONGLETS.ENTREPRISES, COLONNES_ENTREPRISES);
  var candidatures = assurerOnglet(ONGLETS.CANDIDATURES, COLONNES_CANDIDATURES);

  var reglages = classeur().getSheetByName(ONGLETS.REGLAGES) || classeur().insertSheet(ONGLETS.REGLAGES);
  if (reglages.getLastRow() === 0) {
    reglages.getRange(1, 1, REGLAGES_PAR_DEFAUT.length, 2).setValues(REGLAGES_PAR_DEFAUT);
    reglages.getRange(1, 1, REGLAGES_PAR_DEFAUT.length, 1).setFontWeight('bold');
  }

  var colonneStatut = COLONNES_CANDIDATURES.indexOf('Statut') + 1;
  var lettre = lettreColonne(colonneStatut);
  var plage = candidatures.getRange(2, 1, candidatures.getMaxRows() - 1, COLONNES_CANDIDATURES.length);
  var regles = Object.keys(COULEURS_STATUTS).map(function (statut) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$' + lettre + '2="' + statut + '"')
      .setBackground(COULEURS_STATUTS[statut])
      .setRanges([plage])
      .build();
  });
  candidatures.setConditionalFormatRules(regles);

  var validation = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.keys(COULEURS_STATUTS), true)
    .setAllowInvalid(false)
    .build();
  candidatures.getRange(2, colonneStatut, candidatures.getMaxRows() - 1, 1).setDataValidation(validation);
}
```

- [ ] **Step 5 : écrire `Documents.js`**

`stages-finance-valence/apps-script/Documents.js` :

```javascript
// Conversion des fichiers déposés par Claude (HTML ou Google Docs) en PDF A4 (DriveApp, DocumentApp, Drive avancé).

var MIME_GOOGLE_DOCS = 'application/vnd.google-apps.document';
var POINTS_A4 = { largeur: 595.28, hauteur: 841.89, marge: 42.5 };

// Si le fichier est resté en HTML, le convertit en Google Docs dans le même dossier et renvoie l'ID du Doc.
function assurerGoogleDoc(idFichier) {
  var fichier = DriveApp.getFileById(idFichier);
  if (fichier.getMimeType() === MIME_GOOGLE_DOCS) return idFichier;
  var dossier = fichier.getParents().next();
  var doc = Drive.Files.create(
    { name: fichier.getName().replace(/\.html?$/i, ''), mimeType: MIME_GOOGLE_DOCS, parents: [dossier.getId()] },
    fichier.getBlob()
  );
  return doc.id;
}

function exporterPdf(idFichier, nom) {
  var idDoc = assurerGoogleDoc(idFichier);
  var doc = DocumentApp.openById(idDoc);
  doc.getBody()
    .setPageWidth(POINTS_A4.largeur).setPageHeight(POINTS_A4.hauteur)
    .setMarginTop(POINTS_A4.marge).setMarginBottom(POINTS_A4.marge)
    .setMarginLeft(POINTS_A4.marge).setMarginRight(POINTS_A4.marge);
  doc.saveAndClose();

  var fichier = DriveApp.getFileById(idDoc);
  var dossier = fichier.getParents().next();
  var anciens = dossier.getFilesByName(nom);
  while (anciens.hasNext()) anciens.next().setTrashed(true);

  var pdf = fichier.getAs(MimeType.PDF).setName(nom);
  dossier.createFile(pdf);
  return { idDoc: idDoc, blob: pdf, pages: compterPagesPdf(pdf.getDataAsString()), urlDossier: dossier.getUrl() };
}
```

- [ ] **Step 6 : écrire `Messagerie.js`**

`stages-finance-valence/apps-script/Messagerie.js` :

```javascript
// Brouillons et lecture des fils Gmail (GmailApp, Gmail avancé).

// Adresse de la boîte Gmail réellement utilisée. Session.getActiveUser() peut renvoyer une chaîne vide
// quand le classeur appartient à un autre compte que celui qui exécute le script.
function monEmail() {
  var email = Gmail.Users.getProfile('me').emailAddress;
  if (!email) throw new Error('Adresse Gmail introuvable : relancer « Installer / réparer le classeur »');
  return email;
}

function destinataireEffectif(ligne, reglages) {
  return reglages.modeTest ? monEmail() : String(ligne['Email']).trim();
}

function libelleGmail(nom) {
  return GmailApp.getUserLabelByName(nom) || GmailApp.createLabel(nom);
}

function creerBrouillonCandidature(ligne, reglages, pdfCv) {
  var brouillon = GmailApp.createDraft(
    destinataireEffectif(ligne, reglages),
    ligne['Objet'],
    corpsAvecSignature(ligne['Corps'], reglages.signature),
    { attachments: [pdfCv], name: reglages.prenomNom }
  );
  var fil = brouillon.getMessage().getThread();
  fil.addLabel(libelleGmail(reglages.libelle));
  return { idBrouillon: brouillon.getId(), idFil: fil.getId() };
}

function lireFil(idFil) {
  if (!idFil) return [];
  var fil;
  try {
    fil = GmailApp.getThreadById(idFil);
  } catch (e) {
    fil = null;
  }
  if (!fil) return [];
  return fil.getMessages().map(function (message) {
    return {
      de: message.getFrom(),
      date: message.getDate(),
      estBrouillon: message.isDraft(),
      corps: message.getPlainBody(),
      idMessage: message.getHeader('Message-ID')
    };
  });
}

function chercherFilEnvoye(ligne, reglages) {
  var fils = GmailApp.search(requeteFilEnvoye(destinataireEffectif(ligne, reglages), ligne['Objet']), 0, 1);
  return fils.length ? fils[0].getId() : null;
}

function creerBrouillonRelance(ligne, reglages, idMessageOrigine) {
  var brut = construireMimeRelance({
    a: destinataireEffectif(ligne, reglages),
    objet: ligne['Objet'],
    corps: corpsRelance(ligne, reglages),
    idMessageOrigine: idMessageOrigine
  }, function (texte) {
    return Utilities.base64Encode(texte, Utilities.Charset.UTF_8);
  });
  var brouillon = Gmail.Users.Drafts.create(
    { message: { raw: Utilities.base64EncodeWebSafe(brut), threadId: ligne['ID fil Gmail'] } },
    'me'
  );
  return brouillon.id;
}
```

- [ ] **Step 7 : écrire `Menu.js`**

`stages-finance-valence/apps-script/Menu.js` :

```javascript
// Menu « Candidatures », actions et déclencheur quotidien.
// `installer` reste la première fonction de Code.gs : c'est celle que l'éditeur lance par défaut.

function installer() {
  initialiserClasseur();
  ScriptApp.getProjectTriggers().forEach(function (declencheur) {
    if (declencheur.getHandlerFunction() === 'mettreAJourSuivi') ScriptApp.deleteTrigger(declencheur);
  });
  ScriptApp.newTrigger('mettreAJourSuivi').timeBased().everyDays(1).atHour(8).create();
  classeur().toast('Classeur prêt, suivi quotidien programmé à 8 h.', 'Candidatures', 10);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Candidatures')
    .addItem('Créer les brouillons', 'creerBrouillons')
    .addItem('Mettre à jour maintenant', 'mettreAJourSuivi')
    .addSeparator()
    .addItem('Installer / réparer le classeur', 'installer')
    .addToUi();
}

function creerBrouillons() {
  var reglages = lireReglages();
  var table = lireTable(ONGLETS.CANDIDATURES);
  var doublons = doublonsEntreprise(table.lignes);
  var bilan = { brouillons: 0, portails: 0, erreurs: 0 };

  table.lignes.forEach(function (ligne) {
    try {
      if (ligne['Statut'] === STATUTS.PRET && ligne['Canal'] === CANAUX.EMAIL && !ligne['ID brouillon']) {
        if (doublons.indexOf(String(ligne['ID entreprise'])) !== -1) throw new Error('Candidature en double pour cette entreprise');
        var erreur = validerPourBrouillon(ligne);
        if (erreur) throw new Error(erreur);
        var cv = exporterPdf(ligne['ID doc CV'], nomFichier('CV', reglages.prenomNom, ligne['Entreprise']));
        if (cv.pages > 1) throw new Error('Le CV fait ' + cv.pages + ' pages : le raccourcir à 1 page');
        var brouillon = creerBrouillonCandidature(ligne, reglages, cv.blob);
        ecrireMaj(table, ligne, {
          'ID doc CV': cv.idDoc,
          'ID brouillon': brouillon.idBrouillon,
          'ID fil Gmail': brouillon.idFil,
          'Lien dossier': cv.urlDossier,
          'Statut': STATUTS.BROUILLON_CREE,
          'Erreur': ''
        });
        bilan.brouillons++;
      } else if (ligne['Statut'] === STATUTS.A_POSTULER_PORTAIL && ligne['ID doc CV'] && !ligne['Lien dossier']) {
        var cvPortail = exporterPdf(ligne['ID doc CV'], nomFichier('CV', reglages.prenomNom, ligne['Entreprise']));
        var maj = { 'ID doc CV': cvPortail.idDoc, 'Lien dossier': cvPortail.urlDossier, 'Erreur': '' };
        if (ligne['ID doc lettre']) {
          maj['ID doc lettre'] = exporterPdf(ligne['ID doc lettre'], nomFichier('LM', reglages.prenomNom, ligne['Entreprise'])).idDoc;
        }
        if (cvPortail.pages > 1) maj['Erreur'] = 'Le CV fait ' + cvPortail.pages + ' pages : le raccourcir à 1 page';
        ecrireMaj(table, ligne, maj);
        bilan.portails++;
      }
    } catch (e) {
      ecrireMaj(table, ligne, { 'Erreur': e.message });
      bilan.erreurs++;
    }
  });

  classeur().toast(
    bilan.brouillons + ' brouillon(s), ' + bilan.portails + ' dossier(s) portail, ' + bilan.erreurs + ' erreur(s)',
    'Candidatures', 10
  );
}

function mettreAJourSuivi() {
  var reglages = lireReglages();
  var table = lireTable(ONGLETS.CANDIDATURES);
  var moi = monEmail();
  var aujourdhui = new Date();

  table.lignes.forEach(function (ligne) {
    if (STATUTS_SUIVIS.indexOf(ligne['Statut']) === -1) return;
    try {
      var faits = analyserFil(lireFil(ligne['ID fil Gmail']), moi);
      if (ligne['Statut'] === STATUTS.BROUILLON_CREE && !faits.envoi && !faits.brouillonPresent) {
        var idFil = chercherFilEnvoye(ligne, reglages);
        if (idFil) {
          ecrireMaj(table, ligne, { 'ID fil Gmail': idFil });
          faits = analyserFil(lireFil(idFil), moi);
        }
      }
      var etat = prochainEtat(ligne, faits, reglages, aujourdhui);
      if (etat.action === 'BROUILLON_RELANCE') {
        etat.maj['ID brouillon relance'] = creerBrouillonRelance(ligne, reglages, faits.envoi.idMessage);
      }
      if (Object.keys(etat.maj).length) ecrireMaj(table, ligne, etat.maj);
    } catch (e) {
      ecrireMaj(table, ligne, { 'Erreur': e.message });
    }
  });
}
```

- [ ] **Step 8 : écrire le manifeste**

`stages-finance-valence/apps-script/appsscript.json` :

```json
{
  "timeZone": "Europe/Paris",
  "dependencies": {
    "enabledAdvancedServices": [
      { "userSymbol": "Gmail", "serviceId": "gmail", "version": "v1" },
      { "userSymbol": "Drive", "serviceId": "drive", "version": "v3" }
    ]
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

- [ ] **Step 9 : vérifier le succès**

Run: `npm test`
Expected: PASS, `# pass 47`

- [ ] **Step 10 : commit**

```bash
git add stages-finance-valence/apps-script stages-finance-valence/tests/fakes-google.js stages-finance-valence/tests/apps-script-integration.test.js
git commit -m "feat(stages): script Google (brouillons, export PDF, suivi quotidien, menu)"
```

---

### Task 6 : assemblage de `dist/Code.gs`

**Files:**
- Create: `stages-finance-valence/outils/assembler.js`
- Test: `stages-finance-valence/tests/assembler.test.js`

- [ ] **Step 1 : écrire le test qui échoue**

`stages-finance-valence/tests/assembler.test.js` :

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { assembler, ORDRE } = require('../outils/assembler');
const { DOSSIER_APPS_SCRIPT } = require('../outils/lib/charger-apps-script');

test('tous les fichiers .js d’apps-script sont assemblés, dans l’ordre', () => {
  const presents = fs.readdirSync(DOSSIER_APPS_SCRIPT).filter((f) => f.endsWith('.js')).sort();
  assert.deepEqual([...ORDRE].sort(), presents);
  const code = assembler();
  const positions = ORDRE.map((f) => code.indexOf('// ===== ' + f + ' ====='));
  assert.ok(positions.every((p) => p >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('le fichier assemblé est du JavaScript valide sans déclaration globale let/const', () => {
  const code = assembler();
  assert.doesNotThrow(() => new vm.Script(code));
  assert.doesNotMatch(code, /^(let|const) /m);
});

test('installer est la première fonction du fichier, donc celle que l’éditeur lance par défaut', () => {
  const premiere = assembler().match(/^function (\w+)/m);
  assert.equal(premiere[1], 'installer');
});

test('le fichier assemblé ne contient aucun caractère combinant invisible (fragile au copier-coller)', () => {
  assert.doesNotMatch(assembler(), /[\u0300-\u036f]/);
});

test('le manifeste active Gmail et Drive avancés en Europe/Paris', () => {
  const manifeste = JSON.parse(fs.readFileSync(DOSSIER_APPS_SCRIPT + '/appsscript.json', 'utf8'));
  assert.equal(manifeste.timeZone, 'Europe/Paris');
  const services = manifeste.dependencies.enabledAdvancedServices.map((s) => s.userSymbol).sort();
  assert.deepEqual(services, ['Drive', 'Gmail']);
});
```

- [ ] **Step 2 : vérifier l'échec**

Run: `node --test tests/assembler.test.js`
Expected: FAIL, `Cannot find module '../outils/assembler'`

- [ ] **Step 3 : écrire l'assembleur**

`stages-finance-valence/outils/assembler.js` :

```javascript
// Assemble les fichiers Apps Script en un seul `dist/Code.gs`, à coller dans l'éditeur Apps Script.
const fs = require('node:fs');
const path = require('node:path');
const { DOSSIER_APPS_SCRIPT } = require('./lib/charger-apps-script');

// Menu.js en premier : l'éditeur Apps Script lance par défaut la première fonction du fichier (installer).
const ORDRE = ['Menu.js', 'Schema.js', 'Logique.js', 'Feuilles.js', 'Documents.js', 'Messagerie.js'];

function assembler() {
  return ORDRE.map((fichier) => {
    const code = fs.readFileSync(path.join(DOSSIER_APPS_SCRIPT, fichier), 'utf8');
    return '// ===== ' + fichier + ' =====\n' + code.trimEnd() + '\n';
  }).join('\n');
}

if (require.main === module) {
  const sortie = path.join(__dirname, '..', 'dist', 'Code.gs');
  fs.mkdirSync(path.dirname(sortie), { recursive: true });
  fs.writeFileSync(sortie, assembler());
  console.log('Écrit : ' + sortie);
}

module.exports = { assembler, ORDRE };
```

- [ ] **Step 4 : vérifier le succès et produire le fichier**

Run: `node --test tests/assembler.test.js && npm run assembler && git status --short dist`
Expected: PASS (`# pass 3`), `Écrit : …/dist/Code.gs`, et `git status` n'affiche rien pour `dist/` (ignoré).

- [ ] **Step 5 : commit**

```bash
git add stages-finance-valence/outils/assembler.js stages-finance-valence/tests/assembler.test.js
git commit -m "feat(stages): assemblage du script en un seul Code.gs"
```

---

### Task 7 : client HTTP avec nouvelles tentatives

La sortie réseau de l'environnement coupe parfois la connexion (`ECONNRESET`) ou renvoie une erreur amont en texte (`upstream connect error`). Le client réessaie avec une attente qui double à chaque essai.

**Files:**
- Create: `stages-finance-valence/outils/lib/http.js`
- Test: `stages-finance-valence/tests/http.test.js`

- [ ] **Step 1 : écrire le test qui échoue**

`stages-finance-valence/tests/http.test.js` :

```javascript
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
```

- [ ] **Step 2 : vérifier l'échec**

Run: `node --test tests/http.test.js`
Expected: FAIL, `Cannot find module '../outils/lib/http'`

- [ ] **Step 3 : écrire le client**

`stages-finance-valence/outils/lib/http.js` :

```javascript
// Récupération JSON avec nouvelles tentatives : la connexion sortante est parfois coupée ou renvoie une erreur amont.

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function recupererJson(url, { tentatives = 5, attenteMs = 1000, fetchImpl = fetch, attendre = dormir } = {}) {
  let derniereErreur;
  for (let essai = 1; essai <= tentatives; essai++) {
    try {
      const reponse = await fetchImpl(url);
      if (reponse.status >= 400 && reponse.status < 500 && reponse.status !== 429) {
        throw Object.assign(new Error('HTTP ' + reponse.status + ' sur ' + url), { definitive: true });
      }
      if (!reponse.ok) throw new Error('HTTP ' + reponse.status);
      return JSON.parse(await reponse.text());
    } catch (erreur) {
      if (erreur.definitive) throw erreur;
      derniereErreur = erreur;
      if (essai < tentatives) await attendre(attenteMs * 2 ** (essai - 1));
    }
  }
  throw new Error('Échec après ' + tentatives + ' tentatives sur ' + url + ' : ' + derniereErreur.message);
}

module.exports = { recupererJson, dormir };
```

- [ ] **Step 4 : vérifier le succès**

Run: `node --test tests/http.test.js`
Expected: PASS, `# pass 4`

- [ ] **Step 5 : commit**

```bash
git add stages-finance-valence/outils/lib/http.js stages-finance-valence/tests/http.test.js
git commit -m "feat(stages): client JSON avec nouvelles tentatives"
```

---

### Task 8 : normalisation des résultats de l'annuaire

Faits vérifiés sur l'API réelle le 2026-10-10 :
- `/near_point?lat&long&radius&activite_principale=<codes séparés par des virgules>` fonctionne et renvoie les unités légales qui ont un établissement dans le rayon (`matching_etablissements`), **y compris des établissements fermés** (`etat_administratif: "F"`), d'où le filtre.
- `/search?departement=26,07&categorie_entreprise=PME,ETI&…` sélectionne aussi par établissement : les grands groupes parisiens remontent. On garde donc les seules entreprises dont le **siège** est à moins de 30 km.
- Pas de site web ni d'email dans l'annuaire, mais il donne les `dirigeants` (on ignore ceux des grands groupes, sans intérêt pour un stage local).

**Files:**
- Create: `stages-finance-valence/tests/fixtures/annuaire.js`
- Create: `stages-finance-valence/outils/annuaire.js`
- Test: `stages-finance-valence/tests/annuaire.test.js`

- [ ] **Step 1 : écrire les exemples de réponses**

`stages-finance-valence/tests/fixtures/annuaire.js` :

```javascript
// Extraits simplifiés de réponses réelles de recherche-entreprises.api.gouv.fr (champs utilisés uniquement).

const etablissement = (commune, latitude, longitude, etat = 'A') => ({
  libelle_commune: commune, latitude: String(latitude), longitude: String(longitude), etat_administratif: etat
});

const VALENCE = etablissement('VALENCE', 44.9307, 4.8951);
const ROMANS = etablissement('ROMANS-SUR-ISERE', 45.0434, 5.0511);
const LYON = etablissement('LYON', 45.764, 4.8357);
const PARIS = etablissement('PARIS', 48.8566, 2.3522);

const banqueGE = {
  siren: '552120222', nom_complet: 'SOCIETE GENERALE (SG)', etat_administratif: 'A', categorie_entreprise: 'GE',
  tranche_effectif_salarie: '53', caractere_employeur: 'O',
  dirigeants: [{ type_dirigeant: 'personne physique', qualite: 'Directeur Général', prenoms: 'SLAWOMIR', nom: 'KRUPA' }],
  siege: PARIS, matching_etablissements: [VALENCE]
};

const cabinetPME = {
  siren: '111111111', nom_complet: 'CABINET EXEMPLE EXPERTISE', etat_administratif: 'A', categorie_entreprise: 'PME',
  tranche_effectif_salarie: '12', caractere_employeur: 'O',
  dirigeants: [
    { type_dirigeant: 'personne morale', qualite: 'Commissaire aux comptes titulaire', denomination: 'KPMG' },
    { type_dirigeant: 'personne physique', qualite: 'Président de SAS', prenoms: 'JEAN MARC', nom: 'DUPONT-MARTIN (DUPONT)' }
  ],
  siege: VALENCE, matching_etablissements: [VALENCE]
};

const cabinetFerme = {
  siren: '222222222', nom_complet: 'CABINET FERME', etat_administratif: 'A', categorie_entreprise: 'PME',
  tranche_effectif_salarie: '11', caractere_employeur: 'O', dirigeants: [],
  siege: LYON, matching_etablissements: [{ ...VALENCE, etat_administratif: 'F' }]
};

const cgpSolo = {
  siren: '333333333', nom_complet: 'CONSEIL SOLO', etat_administratif: 'A', categorie_entreprise: 'PME',
  tranche_effectif_salarie: 'NN', caractere_employeur: 'N', dirigeants: [],
  siege: VALENCE, matching_etablissements: [VALENCE]
};

const cabinetPetit = {
  siren: '444444444', nom_complet: 'CABINET PETIT', etat_administratif: 'A', categorie_entreprise: 'PME',
  tranche_effectif_salarie: '01', caractere_employeur: 'O',
  dirigeants: [{ type_dirigeant: 'personne physique', qualite: 'Gérant', prenoms: 'MARIE', nom: 'DURAND' }],
  siege: ROMANS, matching_etablissements: [ROMANS]
};

const pmeLocale = {
  siren: '555555555', nom_complet: 'INDUSTRIE DROME', etat_administratif: 'A', categorie_entreprise: 'PME',
  tranche_effectif_salarie: '21', caractere_employeur: 'O',
  dirigeants: [{ type_dirigeant: 'personne physique', qualite: 'Président', prenoms: 'PAUL', nom: 'BERNARD' }],
  siege: ROMANS, matching_etablissements: [ROMANS]
};

const pmeParisienne = {
  siren: '666666666', nom_complet: 'GROUPE PARIS', etat_administratif: 'A', categorie_entreprise: 'ETI',
  tranche_effectif_salarie: '42', caractere_employeur: 'O', dirigeants: [],
  siege: PARIS, matching_etablissements: [ROMANS]
};

const mairie = {
  siren: '777777777', nom_complet: 'COMMUNE DE VALENCE', etat_administratif: 'A', categorie_entreprise: 'GE',
  tranche_effectif_salarie: '42', caractere_employeur: 'O', nature_juridique: '7210', dirigeants: [],
  siege: VALENCE, matching_etablissements: [VALENCE]
};

const association = {
  siren: '888888888', nom_complet: 'ASSOCIATION EXEMPLE', etat_administratif: 'A', categorie_entreprise: 'PME',
  tranche_effectif_salarie: '21', caractere_employeur: 'O', nature_juridique: '9220', dirigeants: [],
  siege: ROMANS, matching_etablissements: [ROMANS]
};

const page = (results, totalPages) => ({ results, total_results: results.length, page: 1, per_page: 25, total_pages: totalPages });

module.exports = { banqueGE, cabinetPME, cabinetFerme, cgpSolo, cabinetPetit, pmeLocale, pmeParisienne, mairie, association, page };
```

- [ ] **Step 2 : écrire le test qui échoue**

`stages-finance-valence/tests/annuaire.test.js` :

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const annuaire = require('../outils/annuaire');
const { chargerAppsScript } = require('../outils/lib/charger-apps-script');
const f = require('./fixtures/annuaire');

const { COLONNES_ENTREPRISES } = chargerAppsScript(['Schema.js']);
const champ = (entreprise, colonne) => entreprise.ligne[COLONNES_ENTREPRISES.indexOf(colonne)];

test('urlSecteur et urlPme ciblent Valence + 30 km et la Drôme / l’Ardèche', () => {
  assert.equal(
    annuaire.urlSecteur(['69.20Z', '66.22Z'], 2),
    'https://recherche-entreprises.api.gouv.fr/near_point?lat=44.9334&long=4.8924&radius=30&activite_principale=69.20Z,66.22Z&per_page=25&page=2'
  );
  assert.equal(
    annuaire.urlPme(1),
    'https://recherche-entreprises.api.gouv.fr/search?departement=26,07&categorie_entreprise=PME,ETI&tranche_effectif_salarie=21,22,31,32,41,42&etat_administratif=A&per_page=25&page=1'
  );
});

test('distanceKm : Valence → Romans ≈ 18 km, Valence → Lyon ≈ 93 km', () => {
  assert.ok(Math.abs(annuaire.distanceKm(annuaire.VALENCE, { lat: 45.0434, long: 5.0511 }) - 18) < 2);
  assert.ok(Math.abs(annuaire.distanceKm(annuaire.VALENCE, { lat: 45.764, long: 4.8357 }) - 93) < 3);
});

test('contactDepuisDirigeants garde une personne physique dirigeante, jamais pour un grand groupe', () => {
  assert.equal(annuaire.contactDepuisDirigeants(f.cabinetPME), 'Jean Dupont-Martin (Président de SAS)');
  assert.equal(annuaire.contactDepuisDirigeants(f.cabinetPetit), 'Marie Durand (Gérant)');
  assert.equal(annuaire.contactDepuisDirigeants(f.banqueGE), '');
  assert.equal(annuaire.contactDepuisDirigeants(f.cabinetFerme), '');
});

test('normaliserResultats (proximité) écarte les établissements fermés, hors zone et sans salarié', () => {
  const entreprises = annuaire.normaliserResultats(
    [f.banqueGE, f.cabinetPME, f.cabinetFerme, f.cgpSolo, f.cabinetPetit],
    'Comptabilité/Audit',
    'proximite'
  );
  assert.deepEqual(entreprises.map((e) => e.siren), ['552120222', '111111111', '444444444']);

  const [banque, cabinet, petit] = entreprises;
  assert.equal(champ(banque, 'Canal'), 'Portail');
  assert.equal(champ(banque, 'Ville'), 'VALENCE');
  assert.equal(champ(banque, 'Taille'), '10000+');
  assert.equal(champ(cabinet, 'Canal'), 'Email');
  assert.equal(champ(cabinet, 'Priorité'), 'B');
  assert.equal(champ(petit, 'Priorité'), 'C');
  assert.equal(champ(cabinet, 'Source'), 'Annuaire');
  assert.equal(champ(cabinet, 'État'), 'À traiter');
  assert.equal(champ(cabinet, 'Email'), '');
  assert.equal(cabinet.ligne.length, COLONNES_ENTREPRISES.length);
});

test('normaliserResultats (siège) exige un siège dans la zone', () => {
  const entreprises = annuaire.normaliserResultats([f.pmeLocale, f.pmeParisienne], 'PME', 'siege');
  assert.deepEqual(entreprises.map((e) => e.siren), ['555555555']);
  assert.equal(champ(entreprises[0], 'Ville'), 'ROMANS-SUR-ISERE');
});

test('normaliserResultats (siège) écarte les organismes publics et les associations', () => {
  const entreprises = annuaire.normaliserResultats([f.pmeLocale, f.mairie, f.association], 'PME', 'siege');
  assert.deepEqual(entreprises.map((e) => e.siren), ['555555555']);
});

test('normaliserResultats (proximité) garde les mutuelles et assureurs quelle que soit leur forme juridique', () => {
  const mutuelle = { ...f.cabinetPME, siren: '999999999', nature_juridique: '8210' };
  assert.deepEqual(annuaire.normaliserResultats([mutuelle], 'Assurance/CGP', 'proximite').map((e) => e.siren), ['999999999']);
});

test('selectionner garde les plus grosses structures de chaque secteur', () => {
  const entreprises = [
    { secteur: 'Banque', rang: 53, nom: 'B1' },
    { secteur: 'Comptabilité/Audit', rang: 1, nom: 'C-petit' },
    { secteur: 'Comptabilité/Audit', rang: 12, nom: 'C-moyen' },
    { secteur: 'Comptabilité/Audit', rang: 12, nom: 'A-moyen' }
  ];
  assert.deepEqual(annuaire.selectionner(entreprises, 2).map((e) => e.nom), ['B1', 'A-moyen', 'C-moyen']);
});
```

- [ ] **Step 3 : vérifier l'échec**

Run: `node --test tests/annuaire.test.js`
Expected: FAIL, `Cannot find module '../outils/annuaire'`

- [ ] **Step 4 : écrire le module**

`stages-finance-valence/outils/annuaire.js` :

```javascript
// Requêtes vers l'annuaire officiel des entreprises et transformation en lignes de l'onglet Entreprises.
const { chargerAppsScript } = require('./lib/charger-apps-script');

const { COLONNES_ENTREPRISES } = chargerAppsScript(['Schema.js']);

const BASE = 'https://recherche-entreprises.api.gouv.fr';
const VALENCE = { lat: 44.9334, long: 4.8924 };
const RAYON_KM = 30;

// Secteurs cherchés autour de Valence, dans l'ordre de priorité (le premier secteur trouvé l'emporte).
const SECTEURS = [
  { secteur: 'Banque', naf: ['64.19Z'] },
  { secteur: 'Assurance/CGP', naf: ['65.11Z', '65.12Z', '66.22Z', '66.19B', '66.30Z'] },
  { secteur: 'Comptabilité/Audit', naf: ['69.20Z'] }
];
const TRANCHES_PME = ['21', '22', '31', '32', '41', '42'];

const LIBELLES_TRANCHES = {
  NN: 'Non renseigné', '00': '0 salarié', '01': '1-2', '02': '3-5', '03': '6-9', '11': '10-19', '12': '20-49',
  '21': '50-99', '22': '100-199', '31': '200-249', '32': '250-499', '41': '500-999', '42': '1000-1999',
  '51': '2000-4999', '52': '5000-9999', '53': '10000+'
};

const QUALITES_CONTACT = /pr[ée]sident|g[ée]rant|directeur g[ée]n[ée]ral|associ[ée]/i;

function urlSecteur(naf, page) {
  return BASE + '/near_point?lat=' + VALENCE.lat + '&long=' + VALENCE.long + '&radius=' + RAYON_KM +
    '&activite_principale=' + naf.join(',') + '&per_page=25&page=' + page;
}

function urlPme(page) {
  return BASE + '/search?departement=26,07&categorie_entreprise=PME,ETI&tranche_effectif_salarie=' +
    TRANCHES_PME.join(',') + '&etat_administratif=A&per_page=25&page=' + page;
}

function distanceKm(a, b) {
  const rad = (degres) => (degres * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLong = rad(b.long - a.long);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLong / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function rangTranche(code) {
  return /^\d\d$/.test(String(code)) ? Number(code) : -1;
}

function estDansZone(etablissement) {
  const lat = Number(etablissement && etablissement.latitude);
  const long = Number(etablissement && etablissement.longitude);
  if (!etablissement || !lat || !long) return false;
  return distanceKm(VALENCE, { lat, long }) <= RAYON_KM;
}

// mode 'proximite' : un établissement actif dans la zone suffit ; mode 'siege' : le siège doit être dans la zone.
function etablissementRetenu(resultat, mode) {
  if (mode === 'siege') {
    const siege = resultat.siege;
    return siege && siege.etat_administratif === 'A' && estDansZone(siege) ? siege : null;
  }
  return (resultat.matching_etablissements || []).find((e) => e.etat_administratif === 'A' && estDansZone(e)) || null;
}

function capitaliser(texte) {
  return String(texte).toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, separateur, lettre) => separateur + lettre.toUpperCase());
}

function contactDepuisDirigeants(resultat) {
  if (resultat.categorie_entreprise === 'GE') return '';
  const dirigeant = (resultat.dirigeants || []).find(
    (d) => d.type_dirigeant === 'personne physique' && QUALITES_CONTACT.test(d.qualite || '')
  );
  if (!dirigeant) return '';
  const prenom = capitaliser(String(dirigeant.prenoms || '').trim().split(/\s+/)[0]);
  const nom = capitaliser(String(dirigeant.nom || '').replace(/\(.*?\)/g, '').trim());
  return (prenom + ' ' + nom).trim() + ' (' + dirigeant.qualite + ')';
}

function estEmployeur(resultat) {
  return rangTranche(resultat.tranche_effectif_salarie) >= 1 || resultat.caractere_employeur === 'O';
}

// Formes juridiques 7xxx (droit public), 8xxx (organismes sociaux) et 9xxx (associations…) :
// hors cible pour les services finance d'entreprises (mode 'siege' uniquement, les mutuelles restent en proximité).
function estHorsCiblePme(resultat, mode) {
  return mode === 'siege' && /^[789]/.test(String(resultat.nature_juridique || ''));
}

function normaliserResultats(resultats, secteur, mode) {
  const entreprises = [];
  for (const resultat of resultats) {
    if (resultat.etat_administratif !== 'A' || !estEmployeur(resultat) || estHorsCiblePme(resultat, mode)) continue;
    const etablissement = etablissementRetenu(resultat, mode);
    if (!etablissement) continue;
    const rang = rangTranche(resultat.tranche_effectif_salarie);
    const valeurs = {
      'ID entreprise': resultat.siren,
      'Nom': resultat.nom_complet,
      'Secteur': secteur,
      'Ville': etablissement.libelle_commune || '',
      'Taille': LIBELLES_TRANCHES[resultat.tranche_effectif_salarie] || 'Non renseigné',
      'Contact': contactDepuisDirigeants(resultat),
      'Canal': resultat.categorie_entreprise === 'GE' ? 'Portail' : 'Email',
      'Priorité': rang >= 3 ? 'B' : 'C',
      'Source': 'Annuaire',
      'État': 'À traiter'
    };
    entreprises.push({
      siren: resultat.siren,
      secteur,
      rang,
      nom: resultat.nom_complet,
      ligne: COLONNES_ENTREPRISES.map((colonne) => (colonne in valeurs ? valeurs[colonne] : ''))
    });
  }
  return entreprises;
}

// Garde les `parSecteur` plus grosses structures de chaque secteur.
function selectionner(entreprises, parSecteur) {
  const secteurs = [...new Set(entreprises.map((e) => e.secteur))];
  return secteurs.flatMap((secteur) =>
    entreprises
      .filter((e) => e.secteur === secteur)
      .sort((a, b) => b.rang - a.rang || a.nom.localeCompare(b.nom, 'fr'))
      .slice(0, parSecteur)
  );
}

module.exports = {
  SECTEURS, VALENCE, RAYON_KM, LIBELLES_TRANCHES, urlSecteur, urlPme, distanceKm, rangTranche,
  contactDepuisDirigeants, normaliserResultats, selectionner
};
```

- [ ] **Step 5 : vérifier le succès**

Run: `node --test tests/annuaire.test.js`
Expected: PASS, `# pass 6`

- [ ] **Step 6 : commit**

```bash
git add stages-finance-valence/outils/annuaire.js stages-finance-valence/tests/annuaire.test.js stages-finance-valence/tests/fixtures/annuaire.js
git commit -m "feat(stages): normalisation des résultats de l'annuaire des entreprises"
```

---

### Task 9 : CLI de repérage

**Files:**
- Create: `stages-finance-valence/outils/reperer.js`
- Test: `stages-finance-valence/tests/reperer.test.js`

- [ ] **Step 1 : écrire le test qui échoue**

`stages-finance-valence/tests/reperer.test.js` :

```javascript
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
```

- [ ] **Step 2 : vérifier l'échec**

Run: `node --test tests/reperer.test.js`
Expected: FAIL, `Cannot find module '../outils/reperer'`

- [ ] **Step 3 : écrire la CLI**

`stages-finance-valence/outils/reperer.js` :

```javascript
// Repère les structures cibles dans l'annuaire officiel et écrit les lignes de l'onglet Entreprises.
// Usage : node outils/reperer.js [--par-secteur 25]
const fs = require('node:fs');
const path = require('node:path');
const { recupererJson, dormir } = require('./lib/http');
const { SECTEURS, urlSecteur, urlPme, normaliserResultats, selectionner } = require('./annuaire');
const { chargerAppsScript } = require('./lib/charger-apps-script');

const { COLONNES_ENTREPRISES } = chargerAppsScript(['Schema.js']);

async function executerReperage({ recuperer = recupererJson, maxPages = 80, parSecteur = 25, attenteMs = 300, journal = console.log } = {}) {
  const sources = [
    ...SECTEURS.map((s) => ({ secteur: s.secteur, mode: 'proximite', url: (page) => urlSecteur(s.naf, page) })),
    { secteur: 'PME', mode: 'siege', url: urlPme }
  ];
  const vus = new Set();
  const toutes = [];

  for (const source of sources) {
    let page = 1;
    let totalPages = 1;
    let trouvees = 0;
    do {
      const donnees = await recuperer(source.url(page));
      totalPages = Math.min(donnees.total_pages || 1, maxPages);
      for (const entreprise of normaliserResultats(donnees.results || [], source.secteur, source.mode)) {
        if (vus.has(entreprise.siren)) continue;
        vus.add(entreprise.siren);
        toutes.push(entreprise);
        trouvees += 1;
      }
      page += 1;
      if (attenteMs) await dormir(attenteMs);
    } while (page <= totalPages);
    journal(source.secteur + ' : ' + trouvees + ' structure(s) dans la zone');
  }

  const retenues = selectionner(toutes, parSecteur);
  return { total: toutes.length, retenues };
}

async function principal() {
  const index = process.argv.indexOf('--par-secteur');
  const parSecteur = index !== -1 ? Number(process.argv[index + 1]) : 25;
  const { total, retenues } = await executerReperage({ parSecteur });
  const date = new Date().toISOString().slice(0, 10);
  const sortie = path.join(__dirname, '..', 'donnees', 'reperage', 'entreprises-' + date + '.json');
  fs.mkdirSync(path.dirname(sortie), { recursive: true });
  fs.writeFileSync(sortie, JSON.stringify({
    genereLe: date, total, colonnes: COLONNES_ENTREPRISES, lignes: retenues.map((e) => e.ligne)
  }, null, 2));
  console.log(retenues.length + ' structure(s) retenue(s) sur ' + total + ' → ' + sortie);
}

if (require.main === module) {
  principal().catch((erreur) => {
    console.error(erreur.message);
    process.exit(1);
  });
}

module.exports = { executerReperage };
```

- [ ] **Step 4 : vérifier le succès**

Run: `node --test tests/reperer.test.js`
Expected: PASS, `# pass 2`

- [ ] **Step 5 : essai réel limité (réseau)**

Run:
```bash
node -e "require('./outils/reperer').executerReperage({ maxPages: 2, parSecteur: 5 }).then(r => { console.log('total', r.total); r.retenues.forEach(e => console.log(e.ligne.slice(0, 9).join(' | '))); })"
```
Expected : une ligne par secteur (`Banque : … structure(s) dans la zone`, etc.), puis des lignes comme `552120222 | SOCIETE GENERALE (SG) | Banque | VALENCE |  | 10000+ |  |  | Portail`. Avec seulement 2 pages, `PME : 0` est normal : les PME locales arrivent après les grands groupes dans les résultats.

- [ ] **Step 6 : commit**

```bash
git add stages-finance-valence/outils/reperer.js stages-finance-valence/tests/reperer.test.js
git commit -m "feat(stages): CLI de repérage des entreprises autour de Valence"
```

---

### Task 10 : contrôle qualité des candidatures

**Files:**
- Create: `stages-finance-valence/tests/fixtures/cv-maitre-exemple.json`
- Create: `stages-finance-valence/tests/fixtures/candidatures.js`
- Create: `stages-finance-valence/outils/controle.js`
- Test: `stages-finance-valence/tests/controle.test.js`

- [ ] **Step 1 : écrire les exemples fictifs**

`stages-finance-valence/tests/fixtures/cv-maitre-exemple.json` :

```json
{
  "identite": {
    "prenomNom": "Léa Dupré",
    "email": "lea.dupre@example.com",
    "telephone": "06 00 00 00 00",
    "ville": "Valence (26)",
    "linkedin": "linkedin.com/in/lea-dupre-exemple"
  },
  "experiences": [
    {
      "poste": "Vendeuse conseil (job d'été)",
      "structure": "Magasin Exemple",
      "lieu": "Valence",
      "dates": "Juillet – août 2025",
      "points": ["Conseil et encaissement de 80 clients par jour", "Clôture et comptage de caisse quotidiens"]
    },
    {
      "poste": "Trésorière",
      "structure": "BDE Exemple",
      "lieu": "Valence",
      "dates": "2024 – 2025",
      "points": ["Suivi du budget annuel de 12 000 €", "Relances des cotisations impayées"]
    }
  ],
  "formations": [
    {
      "diplome": "BUT Gestion des entreprises et des administrations – 2e année",
      "etablissement": "IUT Exemple",
      "dates": "2025 – 2026",
      "details": "Parcours gestion comptable, fiscale et financière"
    },
    {
      "diplome": "Baccalauréat général, mention bien",
      "etablissement": "Lycée Exemple",
      "dates": "2024",
      "details": ""
    }
  ],
  "competences": ["Excel (tableaux croisés dynamiques, RECHERCHEX)", "Sage Comptabilité", "Rigueur", "Relation client"],
  "langues": ["Anglais B2", "Espagnol B1"],
  "centresInteret": ["Handball en club", "Bénévolat aux Restos du Cœur"]
}
```

`stages-finance-valence/tests/fixtures/candidatures.js` (le corps du mail d'exemple fait 149 mots) :

```javascript
// Candidatures fictives valides, à dériver dans les tests.
const maitre = require('./cv-maitre-exemple.json');

const corpsMail = [
  'Bonjour Monsieur Dupont,',
  '',
  'Le Cabinet Exemple Expertise accompagne depuis trente ans les artisans et les PME de la Drôme, avec une proximité qui me parle :',
  'je suis en deuxième année de BUT Gestion des entreprises et des administrations à Valence, parcours gestion comptable, fiscale et financière.',
  'Je recherche un stage de huit à dix semaines, d’avril à juin 2027, pour découvrir la tenue de dossiers et la préparation des bilans.',
  'Trésorière de mon BDE, j’ai suivi un budget de douze mille euros et relancé les cotisations impayées ;',
  'en job d’été, j’ai clôturé chaque jour la caisse d’un magasin. J’utilise Excel et Sage au quotidien.',
  'Rigoureuse et à l’aise avec les clients, je serais heureuse de mettre ces qualités au service de votre équipe.',
  'Vous trouverez mon CV en pièce jointe. Seriez-vous disponible pour un court échange téléphonique dans les prochaines semaines ?',
  'Je vous remercie par avance de votre attention.'
].join('\n');

const cv = {
  titre: 'Stage en expertise comptable – avril à juin 2027',
  accroche: 'Étudiante en BUT GEA, parcours gestion comptable et financière, rigoureuse et à l’aise avec Excel et Sage.',
  experiences: [maitre.experiences[1], maitre.experiences[0]],
  formations: maitre.formations,
  competences: ['Sage Comptabilité', 'Excel (tableaux croisés dynamiques, RECHERCHEX)', 'Rigueur'],
  langues: ['Anglais B2'],
  centresInteret: ['Handball en club']
};

const candidatureEmail = {
  idEntreprise: '111111111',
  entreprise: 'Cabinet Exemple Expertise',
  canal: 'Email',
  destinataire: 'Monsieur Dupont',
  email: 'contact@cabinet-exemple.fr',
  lienOffre: '',
  objet: 'Candidature – stage en expertise comptable (avril à juin 2027)',
  corpsMail,
  cv
};

const paragraphe = (n) => Array.from({ length: n }, (_, i) => 'mot' + i).join(' ');

const candidaturePortail = {
  idEntreprise: '552120222',
  entreprise: 'Société Générale',
  canal: 'Portail',
  destinataire: '',
  email: '',
  lienOffre: 'https://careers.societegenerale.com/offre-exemple',
  objet: 'Candidature – stage conseiller clientèle (avril à juin 2027)',
  corpsMail: '',
  cv: { ...cv, titre: 'Stage conseiller clientèle – avril à juin 2027' },
  lettre: {
    paragraphes: [
      'Société Générale ' + paragraphe(90),
      paragraphe(90),
      paragraphe(90)
    ]
  }
};

module.exports = { maitre, candidatureEmail, candidaturePortail };
```

- [ ] **Step 2 : écrire le test qui échoue**

`stages-finance-valence/tests/controle.test.js` :

```javascript
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
```

- [ ] **Step 3 : vérifier l'échec**

Run: `node --test tests/controle.test.js`
Expected: FAIL, `Cannot find module '../outils/controle'`

- [ ] **Step 4 : écrire le contrôle**

`stages-finance-valence/outils/controle.js` :

```javascript
// Contrôle qualité d'une candidature rédigée par Claude, avant passage au statut « Prêt ».

const LIMITES = {
  corpsMail: { min: 120, max: 150 },
  lettre: { min: 250, max: 300 },
  objetMax: 120,
  experiencesMax: 4,
  pointsMax: 4,
  competencesMax: 12
};

function normaliser(texte) {
  return ' ' + String(texte || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
}

function compterMots(texte) {
  return String(texte || '').split(/\s+/).filter((mot) => /[\p{L}\p{N}]/u.test(mot)).length;
}

function contient(texte, nom) {
  return normaliser(texte).includes(normaliser(nom));
}

const cleExperience = (e) => normaliser(e.structure) + '|' + normaliser(e.dates);
const cleFormation = (f) => normaliser(f.etablissement) + '|' + normaliser(f.dates);

function verifierListe(erreurs, adaptees, maitres, libelle, cle) {
  const connues = new Set(maitres.map(cle));
  for (const element of adaptees) {
    if (!connues.has(cle(element))) erreurs.push(libelle + ' absent(e) du CV maître : ' + JSON.stringify(element));
  }
}

// Renvoie la liste des erreurs (vide si la candidature est prête).
function controlerCandidature(candidature, maitre, nomsAutresEntreprises = []) {
  const erreurs = [];
  const c = candidature;
  const cv = c.cv || {};

  for (const champ of ['idEntreprise', 'entreprise', 'objet']) {
    if (!String(c[champ] || '').trim()) erreurs.push('Champ manquant : ' + champ);
  }
  if (String(c.objet || '').length > LIMITES.objetMax) erreurs.push('Objet trop long (> ' + LIMITES.objetMax + ' caractères)');
  if (c.canal !== 'Email' && c.canal !== 'Portail') erreurs.push('Canal inconnu : ' + c.canal);

  let texte = '';
  if (c.canal === 'Email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email || '').trim())) erreurs.push('Email manquant ou invalide');
    texte = c.corpsMail || '';
    const mots = compterMots(texte);
    if (mots < LIMITES.corpsMail.min || mots > LIMITES.corpsMail.max) {
      erreurs.push('Corps du mail : ' + mots + ' mots (attendu ' + LIMITES.corpsMail.min + '-' + LIMITES.corpsMail.max + ')');
    }
  }
  if (c.canal === 'Portail') {
    const paragraphes = (c.lettre && c.lettre.paragraphes) || [];
    texte = paragraphes.join('\n');
    const mots = compterMots(texte);
    if (mots < LIMITES.lettre.min || mots > LIMITES.lettre.max) {
      erreurs.push('Lettre : ' + mots + ' mots (attendu ' + LIMITES.lettre.min + '-' + LIMITES.lettre.max + ')');
    }
  }
  if (texte && c.entreprise && !contient(texte, c.entreprise)) {
    erreurs.push('Le texte ne cite pas l’entreprise « ' + c.entreprise + ' »');
  }
  for (const autre of nomsAutresEntreprises) {
    if (autre && texte && contient(texte + ' ' + c.objet + ' ' + cv.titre + ' ' + cv.accroche, autre)) {
      erreurs.push('Mentionne une autre entreprise : « ' + autre + ' »');
    }
  }

  if (!String(cv.titre || '').trim()) erreurs.push('CV : titre manquant');
  const experiences = cv.experiences || [];
  if (experiences.length > LIMITES.experiencesMax) erreurs.push('CV : plus de ' + LIMITES.experiencesMax + ' expériences');
  for (const experience of experiences) {
    if ((experience.points || []).length > LIMITES.pointsMax) {
      erreurs.push('CV : plus de ' + LIMITES.pointsMax + ' points pour « ' + experience.poste + ' »');
    }
  }
  if ((cv.competences || []).length > LIMITES.competencesMax) erreurs.push('CV : plus de ' + LIMITES.competencesMax + ' compétences');

  verifierListe(erreurs, experiences, maitre.experiences || [], 'Expérience', cleExperience);
  verifierListe(erreurs, cv.formations || [], maitre.formations || [], 'Formation', cleFormation);
  verifierListe(erreurs, cv.competences || [], maitre.competences || [], 'Compétence', normaliser);
  verifierListe(erreurs, cv.langues || [], maitre.langues || [], 'Langue', normaliser);
  verifierListe(erreurs, cv.centresInteret || [], maitre.centresInteret || [], 'Centre d’intérêt', normaliser);

  return erreurs;
}

module.exports = { controlerCandidature, compterMots, LIMITES };
```

- [ ] **Step 5 : vérifier le succès**

Run: `node --test tests/controle.test.js`
Expected: PASS, `# pass 9`

- [ ] **Step 6 : commit**

```bash
git add stages-finance-valence/outils/controle.js stages-finance-valence/tests/controle.test.js stages-finance-valence/tests/fixtures/cv-maitre-exemple.json stages-finance-valence/tests/fixtures/candidatures.js
git commit -m "feat(stages): contrôle qualité des candidatures (aucun fait inventé)"
```

---

### Task 11 : gabarits HTML du CV et de la lettre

**Files:**
- Create: `stages-finance-valence/outils/gabarits.js`
- Test: `stages-finance-valence/tests/gabarits.test.js`

- [ ] **Step 1 : écrire le test qui échoue**

`stages-finance-valence/tests/gabarits.test.js` :

```javascript
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
  assert.ok(html.includes('<p style="font-size:20pt;color:#1F3864;margin:0"><b>Léa Dupré</b></p>'));
  assert.ok(html.includes('Valence (26) · 06 00 00 00 00 · lea.dupre@example.com'));
  assert.ok(html.includes('<b>Stage en expertise comptable – avril à juin 2027</b>'));
  for (const titre of ['EXPÉRIENCES', 'FORMATION', 'COMPÉTENCES', 'LANGUES', 'CENTRES D’INTÉRÊT']) {
    assert.ok(html.includes('<p style="font-size:11pt;color:#1F3864;margin:8pt 0 2pt 0"><b>' + titre + '</b></p>'), titre);
  }
  // Pas de <h1>/<h2> ni de bordure : une fois convertis en Google Docs, ils ajoutent des lignes vides.
  assert.doesNotMatch(html, /<h[12]|border/);
  assert.ok(html.indexOf('Trésorière') < html.indexOf('Vendeuse conseil'));
  assert.ok(html.includes('<li>Suivi du budget annuel de 12 000 €</li>'));
});

test('cvHtml omet les sections vides et échappe le contenu', () => {
  const html = cvHtml({ titre: 'Stage <test>', experiences: [], formations: [], competences: [] }, maitre.identite);
  assert.ok(html.includes('Stage &lt;test&gt;'));
  assert.ok(!html.includes('EXPÉRIENCES'));
  assert.ok(!html.includes('LANGUES'));
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
```

- [ ] **Step 2 : vérifier l'échec**

Run: `node --test tests/gabarits.test.js`
Expected: FAIL, `Cannot find module '../outils/gabarits'`

- [ ] **Step 3 : écrire les gabarits**

`stages-finance-valence/outils/gabarits.js` :

```javascript
// Gabarits HTML du CV et de la lettre. HTML simple et styles en ligne : le fichier est converti en Google Docs.

const COULEUR = '#1F3864';

function echapper(texte) {
  return String(texte === undefined || texte === null ? '' : texte)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function section(titre, contenu) {
  if (!contenu) return '';
  return '<p style="font-size:11pt;color:' + COULEUR + ';margin:8pt 0 2pt 0"><b>' +
    echapper(titre.toUpperCase()) + '</b></p>' + contenu;
}

function document(titre, corps) {
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + echapper(titre) + '</title></head>' +
    '<body style="font-family:Arial;font-size:10pt;color:#222222">' + corps + '</body></html>';
}

function cvHtml(cv, identite) {
  const coordonnees = [identite.ville, identite.telephone, identite.email, identite.linkedin]
    .filter(Boolean).map(echapper).join(' · ');

  const experiences = (cv.experiences || []).map((e) =>
    '<p style="margin:5pt 0 0 0"><b>' + echapper(e.poste) + '</b> – ' + echapper(e.structure) +
    (e.lieu ? ', ' + echapper(e.lieu) : '') + ' <span style="color:#555555">(' + echapper(e.dates) + ')</span></p>' +
    ((e.points || []).length ? '<ul style="margin:0">' + e.points.map((p) => '<li>' + echapper(p) + '</li>').join('') + '</ul>' : '')
  ).join('');

  const formations = (cv.formations || []).map((f) =>
    '<p style="margin:5pt 0 0 0"><b>' + echapper(f.diplome) + '</b> – ' + echapper(f.etablissement) +
    ' <span style="color:#555555">(' + echapper(f.dates) + ')</span>' +
    (f.details ? '<br>' + echapper(f.details) : '') + '</p>'
  ).join('');

  const ligne = (elements) => ((elements || []).length ? '<p style="margin:3pt 0">' + elements.map(echapper).join(' · ') + '</p>' : '');

  return document('CV – ' + identite.prenomNom,
    '<p style="font-size:20pt;color:' + COULEUR + ';margin:0"><b>' + echapper(identite.prenomNom) + '</b></p>' +
    '<p style="margin:2pt 0;color:#555555">' + coordonnees + '</p>' +
    '<p style="font-size:12pt;color:' + COULEUR + ';margin:8pt 0 2pt 0"><b>' + echapper(cv.titre) + '</b></p>' +
    (cv.accroche ? '<p style="margin:0 0 4pt 0">' + echapper(cv.accroche) + '</p>' : '') +
    section('Expériences', experiences) +
    section('Formation', formations) +
    section('Compétences', ligne(cv.competences)) +
    section('Langues', ligne(cv.langues)) +
    section('Centres d’intérêt', ligne(cv.centresInteret))
  );
}

function formuleAppel(destinataire) {
  if (/^madame\b/i.test(destinataire || '')) return 'Madame';
  if (/^monsieur\b/i.test(destinataire || '')) return 'Monsieur';
  return 'Madame, Monsieur';
}

function dateLongue(date) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function lettreHtml(candidature, identite, date) {
  const appel = formuleAppel(candidature.destinataire);
  const ville = String(identite.ville || '').replace(/\s*\(.*\)\s*/g, '').trim();
  const paragraphes = (candidature.lettre.paragraphes || [])
    .map((p) => '<p style="margin:0 0 8pt 0;text-align:justify">' + echapper(p) + '</p>').join('');

  return document('Lettre – ' + candidature.entreprise,
    '<p style="margin:0">' + [identite.prenomNom, identite.ville, identite.telephone, identite.email]
      .filter(Boolean).map(echapper).join('<br>') + '</p>' +
    '<p style="margin:12pt 0 0 0;text-align:right">' + echapper(candidature.entreprise) + '</p>' +
    '<p style="margin:12pt 0;text-align:right">' + echapper((ville ? ville + ', le ' : 'Le ') + dateLongue(date)) + '</p>' +
    '<p style="margin:0 0 12pt 0"><b>Objet :</b> ' + echapper(candidature.objet) + '</p>' +
    '<p style="margin:0 0 8pt 0">' + appel + ',</p>' +
    paragraphes +
    '<p style="margin:0 0 8pt 0">Je vous prie d’agréer, ' + appel + ', l’expression de mes salutations distinguées.</p>' +
    '<p style="margin:12pt 0 0 0">' + echapper(identite.prenomNom) + '</p>'
  );
}

module.exports = { cvHtml, lettreHtml, echapper, formuleAppel, dateLongue };
```

- [ ] **Step 4 : vérifier le succès**

Run: `node --test tests/gabarits.test.js`
Expected: PASS, `# pass 6`

- [ ] **Step 5 : commit**

```bash
git add stages-finance-valence/outils/gabarits.js stages-finance-valence/tests/gabarits.test.js
git commit -m "feat(stages): gabarits HTML du CV et de la lettre"
```

---

### Task 12 : préparation d'une vague

**Files:**
- Create: `stages-finance-valence/outils/preparer-vague.js`
- Test: `stages-finance-valence/tests/preparer-vague.test.js`

- [ ] **Step 1 : écrire le test qui échoue**

`stages-finance-valence/tests/preparer-vague.test.js` :

```javascript
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
  const dossier = dossierVague(2, { '111111111.json': candidatureEmail, '552120222.json': candidaturePortail });
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
```

- [ ] **Step 2 : vérifier l'échec**

Run: `node --test tests/preparer-vague.test.js`
Expected: FAIL, `Cannot find module '../outils/preparer-vague'`

- [ ] **Step 3 : écrire la CLI**

`stages-finance-valence/outils/preparer-vague.js` :

```javascript
// Contrôle les candidatures d'une vague, génère leurs fichiers HTML et les lignes de l'onglet Candidatures.
// Usage : node outils/preparer-vague.js donnees/vagues/vague-1 [--maitre donnees/cv-maitre.json]
const fs = require('node:fs');
const path = require('node:path');
const { controlerCandidature } = require('./controle');
const { cvHtml, lettreHtml } = require('./gabarits');
const { chargerAppsScript } = require('./lib/charger-apps-script');

const { COLONNES_CANDIDATURES, STATUTS } = chargerAppsScript(['Schema.js']);

function numeroVague(dossier) {
  const correspondance = path.basename(path.resolve(dossier)).match(/^vague-(\d+)$/);
  if (!correspondance) throw new Error('Le dossier doit s’appeler vague-<numéro> : ' + dossier);
  return Number(correspondance[1]);
}

function ligneCandidature(c, vague, date) {
  const valeurs = {
    'ID candidature': 'V' + vague + '-' + c.idEntreprise,
    'ID entreprise': c.idEntreprise,
    'Entreprise': c.entreprise,
    'Vague': vague,
    'Canal': c.canal,
    'Destinataire': c.destinataire || '',
    'Email': c.email || '',
    'Objet': c.objet,
    'Corps': c.canal === 'Email' ? c.corpsMail : '',
    'Lien offre': c.lienOffre || '',
    'Statut': c.canal === 'Email' ? STATUTS.PRET : STATUTS.A_POSTULER_PORTAIL,
    'Date prêt': date.toISOString().slice(0, 10)
  };
  return COLONNES_CANDIDATURES.map((colonne) => (colonne in valeurs ? valeurs[colonne] : ''));
}

function preparerVague(dossier, { maitre, date = new Date() }) {
  const vague = numeroVague(dossier);
  const candidatures = fs.readdirSync(dossier)
    .filter((f) => f.endsWith('.json') && f !== 'lignes.json')
    .sort()
    .map((fichier) => ({ fichier, donnees: JSON.parse(fs.readFileSync(path.join(dossier, fichier), 'utf8')) }));

  const rapport = [];
  const vus = new Map();
  for (const c of candidatures) {
    const autres = candidatures
      .filter((o) => o.donnees.idEntreprise !== c.donnees.idEntreprise)
      .map((o) => o.donnees.entreprise);
    const erreurs = controlerCandidature(c.donnees, maitre, autres);
    if (vus.has(c.donnees.idEntreprise)) erreurs.push('Même entreprise que ' + vus.get(c.donnees.idEntreprise));
    vus.set(c.donnees.idEntreprise, c.fichier);
    if (erreurs.length) rapport.push({ fichier: c.fichier, erreurs });
  }
  if (rapport.length) return { ok: false, rapport };

  const fichiersHtml = [];
  for (const c of candidatures) {
    const base = path.join(dossier, path.basename(c.fichier, '.json'));
    fs.writeFileSync(base + '.cv.html', cvHtml(c.donnees.cv, maitre.identite));
    fichiersHtml.push(base + '.cv.html');
    if (c.donnees.canal === 'Portail') {
      fs.writeFileSync(base + '.lettre.html', lettreHtml(c.donnees, maitre.identite, date));
      fichiersHtml.push(base + '.lettre.html');
    }
  }
  const lignes = candidatures.map((c) => ligneCandidature(c.donnees, vague, date));
  fs.writeFileSync(path.join(dossier, 'lignes.json'), JSON.stringify({ colonnes: COLONNES_CANDIDATURES, lignes }, null, 2));
  return { ok: true, lignes, fichiersHtml };
}

function principal() {
  const dossier = process.argv[2];
  if (!dossier) {
    console.error('Usage : node outils/preparer-vague.js donnees/vagues/vague-<numéro> [--maitre chemin]');
    process.exit(1);
  }
  const index = process.argv.indexOf('--maitre');
  const cheminMaitre = index !== -1 ? process.argv[index + 1] : path.join(__dirname, '..', 'donnees', 'cv-maitre.json');
  const maitre = JSON.parse(fs.readFileSync(cheminMaitre, 'utf8'));
  const resultat = preparerVague(dossier, { maitre });
  if (!resultat.ok) {
    for (const { fichier, erreurs } of resultat.rapport) {
      console.error('✗ ' + fichier);
      for (const erreur of erreurs) console.error('   - ' + erreur);
    }
    process.exit(1);
  }
  console.log('✓ ' + resultat.lignes.length + ' candidature(s) prêtes, ' + resultat.fichiersHtml.length + ' fichier(s) HTML générés');
}

if (require.main === module) principal();

module.exports = { preparerVague, ligneCandidature, numeroVague };
```

- [ ] **Step 4 : vérifier le succès de toute la suite**

Run: `npm test`
Expected: PASS, `# tests 81`, `# pass 81`, `# fail 0`

- [ ] **Step 5 : commit**

```bash
git add stages-finance-valence/outils/preparer-vague.js stages-finance-valence/tests/preparer-vague.test.js
git commit -m "feat(stages): préparation d'une vague (contrôle, HTML, lignes du Sheet)"
```

---

### Task 13 : procédure Claude et guide d'installation

**Files:**
- Create: `.claude/skills/stages-finance/SKILL.md` (racine du repo)
- Create: `stages-finance-valence/README.md`

- [ ] **Step 1 : écrire la procédure Claude**

`.claude/skills/stages-finance/SKILL.md` :

````markdown
---
name: stages-finance
description: Procédure de la recherche de stage finance autour de Valence (dossier stages-finance-valence/) - repérage des entreprises via l'annuaire officiel puis Apollo, préparation d'une vague de candidatures (CV adapté + lettre courte dans le mail), dépôt dans Google Drive et ajout au Google Sheet « Suivi candidatures ». À utiliser dès que l'utilisateur dit « lance le repérage », « prépare la vague N », « trouve les contacts », « mets à jour mon CV maître » ou demande où en sont ses candidatures.
---

# Stages finance Valence

Design : `docs/superpowers/specs/2026-10-10-stage-finance-valence-design.md`. Code : `stages-finance-valence/`.

## Règles non négociables

- **Ne jamais inventer** d'expérience, de compétence, de résultat, de langue ou de loisir : tout vient de `donnees/cv-maitre.json`. `preparer-vague.js` bloque sinon ; ne jamais contourner ce contrôle.
- **Apollo** : annoncer le coût estimé en crédits (bloc `mcp_credits`) **avant** tout appel qui en consomme ; après, donner les crédits dépensés et le solde.
- **Aucune donnée personnelle dans git** : tout ce qui est personnel reste dans `stages-finance-valence/donnees/` (ignoré par git), Drive, le Sheet ou Gmail.
- **Rien n'est envoyé par Claude** : l'utilisateur crée les brouillons depuis le menu du Sheet et envoie lui-même.

## 0. Début de session

1. `cd stages-finance-valence && npm test` : tout doit passer.
2. Lire `donnees/config.json` (`{"idDossierRacine": "...", "idClasseur": "...", "compteEnvoi": "...", "exclusions": ["..."]}`). S'il manque : chercher « Stages Finance Valence » avec la recherche Google Drive, sinon demander les liens à l'utilisateur, puis l'écrire. Le Sheet et le dossier sont partagés avec `compteEnvoi`, qui a installé le script : c'est sa boîte Gmail qui reçoit les brouillons.
3. Télécharger `cv-maitre.json` (racine du dossier Drive) vers `donnees/cv-maitre.json`.

## 1. Repérage

1. `node outils/reperer.js --par-secteur 25` → `donnees/reperage/entreprises-<date>.json` (`colonnes`, `lignes`). Les coupures réseau sont réessayées automatiquement ; relancer si la commande échoue quand même.
2. Lire la colonne A de l'onglet `Entreprises` (`Entreprises!A:A`) et retirer les SIREN déjà présents, ainsi que les entreprises dont le nom contient un des motifs `exclusions` de `config.json` (anciens employeurs, sans tenir compte de la casse).
3. Ajouter les nouvelles lignes : `append_values` sur `Entreprises!A1`.
4. Résumer en une ligne par secteur.

## 2. Enrichissement (seulement pour les cibles de la prochaine vague)

Pour chaque entreprise retenue :
1. **Site public** : WebSearch « <nom> <ville> », puis WebFetch des pages accueil / à propos / carrières. Noter : 3 mots de culture, 1 angle d'accroche (fait concret et daté), email de contact générique, offre de stage éventuelle.
2. **Apollo** (canal Email, sans email nominatif) :
   - `apollo_mixed_people_api_search` sur le domaine du site, titres : Directeur financier, DAF, Responsable administratif et financier, Expert-comptable associé, Responsable RH, Directeur d'agence ;
   - coût annoncé, puis `apollo_people_match` pour obtenir l'email.
3. Mettre à jour la ligne (`update_values`) : Site, Contact, Email, Lien offre / portail, Culture (3 mots), Angle d'accroche, Priorité (**A** si offre en cours ou contact nommé avec email), Source (`Annuaire + site` ou `Annuaire + Apollo`).

## 3. Préparer la vague N

1. Choisir 10-15 lignes `À traiter` : priorité A puis B, secteurs équilibrés.
2. Pour chacune, écrire `donnees/vagues/vague-N/<SIREN>.json` :

```json
{
  "idEntreprise": "<SIREN>",
  "entreprise": "<nom exact, cité tel quel dans le texte>",
  "canal": "Email | Portail",
  "destinataire": "Madame X | Monsieur Y | vide",
  "email": "<email, vide si Portail>",
  "lienOffre": "<URL de l'offre ou du portail>",
  "objet": "Candidature – stage <domaine> (<dates>)",
  "corpsMail": "<Email : 120-150 mots, sans signature>",
  "cv": {
    "titre": "Stage <domaine> – <dates>",
    "accroche": "<1-2 phrases>",
    "experiences": [{ "poste": "", "structure": "", "lieu": "", "dates": "", "points": [""] }],
    "formations": [{ "diplome": "", "etablissement": "", "dates": "", "details": "" }],
    "competences": [""],
    "langues": [""],
    "centresInteret": [""]
  },
  "lettre": { "paragraphes": ["<Portail uniquement : 3 paragraphes, 250-300 mots au total>"] }
}
```

3. `node outils/preparer-vague.js donnees/vagues/vague-N` ; corriger les fichiers jusqu'au « ✓ ».
4. **Vague 1** : montrer à l'utilisateur chaque corps de mail et le CV de chaque secteur, puis attendre sa validation avant tout dépôt.
5. Dépôt Drive, pour chaque candidature :
   - créer le dossier de l'entreprise : `create_file`, `title` = nom de l'entreprise, `parentId` = `idDossierRacine`, type dossier `application/vnd.google-apps.folder` ;
   - `create_file`, `title` = `CV_<Prénom>_<Nom>_<Entreprise>`, `parentId` = dossier, `contentMimeType` = `text/html`, `textContent` = contenu de `<SIREN>.cv.html` → noter l'ID ;
   - Portail : même chose pour `<SIREN>.lettre.html` (`LM_…`).
6. Reporter les ID dans les colonnes « ID doc CV » / « ID doc lettre » des lignes de `lignes.json`, puis `append_values` sur `Candidatures!A1`. Ne pas remplir « Lien dossier » : le script s'en charge.
7. Passer la colonne `État` des entreprises concernées à `Vague N`.
8. Dire à l'utilisateur : « Ouvre le Sheet → menu Candidatures → Créer les brouillons, puis relis et envoie depuis Gmail. Pour les portails, les PDF sont dans le lien du dossier. »

## Règles de rédaction

- **CV** : partir du CV maître ; adapter le titre (poste + dates), l'accroche, l'ordre des expériences, le choix des compétences (libellés exacts du maître, 12 au plus), reformuler les points sans ajouter de fait. 4 expériences × 4 points au plus.
  - Banque : relation client, rigueur, conformité.
  - Cabinet comptable / audit : Excel, logiciels comptables, précision.
  - Assurance / gestion de patrimoine : pédagogie, produits financiers.
  - PME : contrôle de gestion, reporting.
- **Corps du mail** (Email) : salutation ; accroche propre à l'entreprise (fait concret tiré du site, nom exact de l'entreprise) ; 2-3 atouts prouvés par le CV maître ; dates de stage, demande d'échange, mention du CV en pièce jointe. La signature est ajoutée par le script.
- **Lettre complète** (Portail) : 3 paragraphes (l'entreprise / moi / nous). Formule d'appel et formule de politesse sont ajoutées par le gabarit.
- **Ton** : formel pour les banques et les assureurs, direct et concret pour les PME et les cabinets.
- Ne jamais citer une autre entreprise de la vague.

## 4. Point d'étape

« Où en sont mes candidatures ? » : lire `Candidatures!A:Y`, compter par statut, lister les « Réponse reçue » (avec extrait) et les « À relancer ».

## 5. Mise à jour du CV maître

Quand l'utilisateur donne une nouvelle expérience ou compétence : modifier `donnees/cv-maitre.json`, puis remplacer `cv-maitre.json` dans Drive.
````

- [ ] **Step 2 : écrire le guide**

`stages-finance-valence/README.md` :

````markdown
# Stages finance Valence

Outil personnel de recherche de stage en finance autour de Valence : repérage des entreprises, CV et lettre adaptés à chacune, brouillons Gmail, suivi automatique dans un Google Sheet.

Design : [`docs/superpowers/specs/2026-10-10-stage-finance-valence-design.md`](../docs/superpowers/specs/2026-10-10-stage-finance-valence-design.md).

## Installation du Google Sheet (une fois, environ 10 minutes)

1. Claude crée le dossier Drive « Stages Finance Valence » et, dedans, le Google Sheet « Suivi candidatures », puis partage le dossier en modification avec le compte Gmail qui enverra les candidatures.
2. **Depuis ce compte Gmail-là** (celui qui envoie), ouvre le Sheet → **Extensions → Apps Script**. Le script agit sur la boîte Gmail du compte qui l'installe.
3. **Paramètres du projet** (roue dentée) → coche **Afficher le fichier manifeste « appsscript.json » dans l'éditeur**.
4. Dans l'éditeur, remplace tout le contenu de `appsscript.json` par celui de `apps-script/appsscript.json`.
5. Remplace tout le contenu de `Code.gs` par celui de `dist/Code.gs` (Claude te l'envoie ; il est produit par `npm run assembler`).
6. Enregistre (icône disquette), puis **recharge l'onglet du Sheet** : le menu **Candidatures** apparaît à droite de « Aide ».
7. **Candidatures → Installer / réparer le classeur**, puis accepte les autorisations (Sheets, Drive, Gmail). Si Google affiche « Cette application n'a pas été validée » : **Paramètres avancés → Accéder au projet** (c'est ton propre script). Relance l'élément de menu une fois les autorisations données : les onglets Entreprises, Candidatures et Réglages apparaissent.
   Autre possibilité : dans l'éditeur, vérifier que la liste à côté d'**Exécuter** affiche `installer` (c'est la fonction proposée par défaut), puis cliquer sur **Exécuter**.
8. Remplis l'onglet **Réglages** : Prénom Nom, Signature, Dates de stage. Laisse **Mode test** à `oui` jusqu'à la fin des tests.

## Utilisation

- **Candidatures → Créer les brouillons** : crée un brouillon Gmail (CV en PDF joint) pour chaque ligne « Prêt », et prépare les PDF des lignes « À postuler (portail) ».
- **Candidatures → Mettre à jour maintenant** : relance le suivi sans attendre 8 h.
- Statuts à poser à la main : Entretien, Refus, Accepté, Postulé (portail).

## Tests avant la vague 1 (mode test activé)

Claude ajoute 3 fausses candidatures A, B et C (Docs CV de test). Les brouillons partent vers ta propre adresse.

1. **Créer les brouillons** → 3 brouillons, chacun avec le CV en PDF et le libellé « Stages ».
2. **A** : envoie-le → **Mettre à jour maintenant** → « Envoyé ». Réponds à ce mail depuis une autre adresse → **Mettre à jour maintenant** → « Réponse reçue » avec l'extrait.
3. **B** : envoie-le, mets « Délai relance (jours) » à 0 → **Mettre à jour maintenant** → « Envoyé » ; une 2e fois → « À relancer » et un brouillon de relance dans le même fil ; envoie la relance → **Mettre à jour maintenant** → « Relancé ».
4. **C** : dans le brouillon, remplace le destinataire par `adresse-inexistante-test-2026@gmail.com`, envoie → attends le message de non-remise → **Mettre à jour maintenant** → « Email invalide ».
5. Garde-fous : une ligne « Prêt » sans email, une avec un ID doc CV faux, puis double clic sur **Créer les brouillons** → erreurs explicites dans la colonne Erreur, aucun brouillon en double.
6. Remets **Mode test** à `non`, les délais à 10, et supprime les lignes et brouillons de test.

## Développement

```bash
npm test             # tous les tests
npm run assembler    # écrit dist/Code.gs
npm run reperer      # repérage via l'annuaire (réseau requis)
node outils/preparer-vague.js donnees/vagues/vague-1
```

`donnees/` et `dist/` sont ignorés par git.
````

- [ ] **Step 3 : vérifier qu'aucune donnée personnelle n'est suivie par git**

Run (depuis la racine du repo) : `git status --short && git check-ignore -v stages-finance-valence/donnees/x stages-finance-valence/dist/x`
Expected : seuls `.claude/skills/stages-finance/SKILL.md` et `stages-finance-valence/README.md` apparaissent comme nouveaux ; les deux chemins sont ignorés par `stages-finance-valence/.gitignore`.

- [ ] **Step 4 : commit**

```bash
git add .claude/skills/stages-finance/SKILL.md stages-finance-valence/README.md
git commit -m "docs(stages): procédure Claude et guide d'installation"
```

---

### Task 14 : mise en service Google, avec l'utilisateur

Cette tâche demande les comptes Google de l'utilisateur. Claude prépare et guide ; l'utilisateur clique.

- [ ] **Step 1 : créer le dossier et le Sheet**

Avec le connecteur Google Drive :
- `create_file` : `title` = `Stages Finance Valence`, type dossier `application/vnd.google-apps.folder` → noter l'ID ;
- `create_file` : `title` = `Suivi candidatures`, type `application/vnd.google-apps.spreadsheet`, `parentId` = ID du dossier → noter l'ID.

Écrire `stages-finance-valence/donnees/config.json` :
```json
{ "idDossierRacine": "<ID dossier>", "idClasseur": "<ID Sheet>" }
```

- [ ] **Step 2 : vérifier la conversion HTML → Google Docs**

`create_file` dans le dossier avec `title` = `test-conversion`, `contentMimeType` = `text/html`, `textContent` = le HTML produit par :
```bash
node -e "const {cvHtml}=require('./outils/gabarits');const {maitre,candidatureEmail}=require('./tests/fixtures/candidatures');process.stdout.write(cvHtml(candidatureEmail.cv, maitre.identite))"
```
Expected : le fichier créé a le type `application/vnd.google-apps.document`. Sinon, rien à changer : `assurerGoogleDoc` le convertira lors de l'export. Le noter dans `donnees/config.json` (`"conversionAuto": true|false`).

- [ ] **Step 3 : installer le script**

`npm run assembler`, puis envoyer à l'utilisateur `dist/Code.gs` et `apps-script/appsscript.json` (SendUserFile). Le guider pas à pas avec la section « Installation » du README. Lui faire remplir l'onglet Réglages, en laissant `Mode test` à `oui`.

- [ ] **Step 4 : dérouler les tests en mode test**

Préparer 3 candidatures de test (A, B, C) à partir de `tests/fixtures/candidatures.js` : Docs CV déposés comme au Step 2, lignes ajoutées dans `Candidatures`. Puis dérouler avec l'utilisateur la section « Tests avant la vague 1 » du README, points 1 à 6.
Expected : chaque statut attendu apparaît, le PDF du CV fait 1 page et ressemble au Doc. En cas d'écart, corriger le code (tests d'abord), réassembler, recoller `Code.gs`.

- [ ] **Step 5 : remettre en production**

`Mode test` à `non`, délais à 10, lignes et brouillons de test supprimés.

---

### Task 15 : CV maître, repérage réel, vague 1

- [ ] **Step 1 : CV maître**

Récupérer le CV de l'utilisateur (PDF ou Word) et le convertir en `donnees/cv-maitre.json`, au format de `tests/fixtures/cv-maitre-exemple.json`. Le faire valider, puis le déposer dans Drive (`create_file`, `textContent`, `contentMimeType` = `application/json`, `disableConversionToGoogleType` = `true`).
Demander aussi les dates exactes du stage et le budget Apollo acceptable par vague.

- [ ] **Step 2 : repérage**

Suivre la section 1 de `.claude/skills/stages-finance/SKILL.md`.
Expected : onglet `Entreprises` rempli (jusqu'à 25 structures par secteur), récapitulatif par secteur donné à l'utilisateur.

- [ ] **Step 3 : vague 1**

Suivre les sections 2 et 3 de la procédure, avec validation complète de la vague 1 par l'utilisateur avant dépôt.
Expected : 10 à 15 lignes `Prêt` ou `À postuler (portail)` dans `Candidatures` ; après « Créer les brouillons », autant de brouillons Gmail à relire.
