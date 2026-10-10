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

function compterPagesPdf(texte) {
  var pages = String(texte).match(/\/Type\s*\/Page(?![A-Za-z])/g);
  return pages ? pages.length : 0;
}

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
      faits.reponse = { date: message.date, extrait: extrait(message.corps, 200) };
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
