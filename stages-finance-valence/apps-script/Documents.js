// Conversion des fichiers déposés par Claude (HTML ou Google Docs) en PDF A4 (DriveApp, DocumentApp, Drive avancé).

var MIME_GOOGLE_DOCS = 'application/vnd.google-apps.document';
// Marges latérales : (595,28 - 468) / 2, pour garder la largeur des tableaux importés depuis le HTML (page Letter).
var POINTS_A4 = { largeur: 595.28, hauteur: 841.89, margeHautBas: 42.5, margeCotes: 63.64 };

// Si le fichier est resté en HTML, le convertit en Google Docs dans le même dossier et renvoie l'ID du Doc.
function assurerGoogleDoc(idFichier) {
  var fichier = DriveApp.getFileById(idFichier);
  if (fichier.getMimeType() === MIME_GOOGLE_DOCS) return idFichier;
  var dossier = fichier.getParents().next();
  var doc = Drive.Files.create(
    { name: fichier.getName().replace(/\.html?$/i, ''), mimeType: MIME_GOOGLE_DOCS, parents: [dossier.getId()] },
    fichier.getBlob()
  );
  return doc.id;
}

function exporterPdf(idFichier, nom) {
  var idDoc = assurerGoogleDoc(idFichier);
  var doc = DocumentApp.openById(idDoc);
  var corps = doc.getBody();
  // Docs importe le HTML sur une page Letter : on la passe en A4. Un document déjà en A4 (CV Word converti) reste intact.
  if (Math.abs(corps.getPageWidth() - POINTS_A4.largeur) > 1) {
    corps
      .setPageWidth(POINTS_A4.largeur).setPageHeight(POINTS_A4.hauteur)
      .setMarginTop(POINTS_A4.margeHautBas).setMarginBottom(POINTS_A4.margeHautBas)
      .setMarginLeft(POINTS_A4.margeCotes).setMarginRight(POINTS_A4.margeCotes);
  }
  doc.saveAndClose();

  var fichier = DriveApp.getFileById(idDoc);
  var dossier = fichier.getParents().next();
  var anciens = dossier.getFilesByName(nom);
  while (anciens.hasNext()) anciens.next().setTrashed(true);

  var pdf = fichier.getAs(MimeType.PDF).setName(nom);
  dossier.createFile(pdf);
  return { idDoc: idDoc, blob: pdf, pages: compterPagesPdf(pdf.getDataAsString()), urlDossier: dossier.getUrl() };
}
