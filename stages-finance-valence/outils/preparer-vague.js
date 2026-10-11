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
    // Un mail de relais (ID « <SIREN>-relais ») vise la même entreprise qu'une candidature portail : pas une « autre ».
    const autres = candidatures
      .filter((o) => o.donnees.idEntreprise !== c.donnees.idEntreprise && o.donnees.entreprise !== c.donnees.entreprise)
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
