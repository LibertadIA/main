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

test('selectionner garde les plus grosses structures de chaque secteur', () => {
  const entreprises = [
    { secteur: 'Banque', rang: 53, nom: 'B1' },
    { secteur: 'Comptabilité/Audit', rang: 1, nom: 'C-petit' },
    { secteur: 'Comptabilité/Audit', rang: 12, nom: 'C-moyen' },
    { secteur: 'Comptabilité/Audit', rang: 12, nom: 'A-moyen' }
  ];
  assert.deepEqual(annuaire.selectionner(entreprises, 2).map((e) => e.nom), ['B1', 'A-moyen', 'C-moyen']);
});
