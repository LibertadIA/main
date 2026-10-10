// Menu « Candidatures », actions et déclencheur quotidien.

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Candidatures')
    .addItem('Créer les brouillons', 'creerBrouillons')
    .addItem('Mettre à jour maintenant', 'mettreAJourSuivi')
    .addSeparator()
    .addItem('Installer / réparer le classeur', 'installer')
    .addToUi();
}

function installer() {
  initialiserClasseur();
  ScriptApp.getProjectTriggers().forEach(function (declencheur) {
    if (declencheur.getHandlerFunction() === 'mettreAJourSuivi') ScriptApp.deleteTrigger(declencheur);
  });
  ScriptApp.newTrigger('mettreAJourSuivi').timeBased().everyDays(1).atHour(8).create();
  classeur().toast('Classeur prêt, suivi quotidien programmé à 8 h.', 'Candidatures', 10);
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
