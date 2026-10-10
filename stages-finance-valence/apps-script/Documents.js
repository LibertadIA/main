// Conversion des fichiers déposés par Claude (HTML ou Google Docs) en PDF A4 (DriveApp, DocumentApp, Drive avancé).

var MIME_GOOGLE_DOCS = 'application/vnd.google-apps.document';
var POINTS_A4 = { largeur: 595.28, hauteur: 841.89, marge: 42.5 };

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
  doc.getBody()
    .setPageWidth(POINTS_A4.largeur).setPageHeight(POINTS_A4.hauteur)
    .setMarginTop(POINTS_A4.marge).setMarginBottom(POINTS_A4.marge)
    .setMarginLeft(POINTS_A4.marge).setMarginRight(POINTS_A4.marge);
  doc.saveAndClose();

  var fichier = DriveApp.getFileById(idDoc);
  var dossier = fichier.getParents().next();
  var anciens = dossier.getFilesByName(nom);
  while (anciens.hasNext()) anciens.next().setTrashed(true);

  var pdf = fichier.getAs(MimeType.PDF).setName(nom);
  dossier.createFile(pdf);
  return { idDoc: idDoc, blob: pdf, pages: compterPagesPdf(pdf.getDataAsString()), urlDossier: dossier.getUrl() };
}
