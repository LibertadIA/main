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

const page = (results, totalPages) => ({ results, total_results: results.length, page: 1, per_page: 25, total_pages: totalPages });

module.exports = { banqueGE, cabinetPME, cabinetFerme, cgpSolo, cabinetPetit, pmeLocale, pmeParisienne, page };
