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
