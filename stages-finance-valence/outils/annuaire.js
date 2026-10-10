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

function normaliserResultats(resultats, secteur, mode) {
  const entreprises = [];
  for (const resultat of resultats) {
    if (resultat.etat_administratif !== 'A' || !estEmployeur(resultat)) continue;
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
