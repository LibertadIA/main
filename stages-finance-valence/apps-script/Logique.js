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
  return String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '');
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
