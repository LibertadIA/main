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
  return ' ' + String(texte || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
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
