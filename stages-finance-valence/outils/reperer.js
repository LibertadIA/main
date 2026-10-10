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
