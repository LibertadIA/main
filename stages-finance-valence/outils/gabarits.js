// Gabarits HTML du CV et de la lettre. HTML simple et styles en ligne : le fichier est converti en Google Docs.

const COULEUR = '#1F3864';

function echapper(texte) {
  return String(texte === undefined || texte === null ? '' : texte)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function section(titre, contenu) {
  if (!contenu) return '';
  return '<p style="font-size:11pt;color:' + COULEUR + ';margin:8pt 0 2pt 0"><b>' +
    echapper(titre.toUpperCase()) + '</b></p>' + contenu;
}

function document(titre, corps) {
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + echapper(titre) + '</title></head>' +
    '<body style="font-family:Arial;font-size:10pt;color:#222222">' + corps + '</body></html>';
}

function cvHtml(cv, identite) {
  const coordonnees = [identite.ville, identite.telephone, identite.email, identite.linkedin]
    .filter(Boolean).map(echapper).join(' · ');

  const experiences = (cv.experiences || []).map((e) =>
    '<p style="margin:5pt 0 0 0"><b>' + echapper(e.poste) + '</b> – ' + echapper(e.structure) +
    (e.lieu ? ', ' + echapper(e.lieu) : '') + ' <span style="color:#555555">(' + echapper(e.dates) + ')</span></p>' +
    ((e.points || []).length ? '<ul style="margin:0">' + e.points.map((p) => '<li>' + echapper(p) + '</li>').join('') + '</ul>' : '')
  ).join('');

  const formations = (cv.formations || []).map((f) =>
    '<p style="margin:5pt 0 0 0"><b>' + echapper(f.diplome) + '</b> – ' + echapper(f.etablissement) +
    ' <span style="color:#555555">(' + echapper(f.dates) + ')</span>' +
    (f.details ? '<br>' + echapper(f.details) : '') + '</p>'
  ).join('');

  const ligne = (elements) => ((elements || []).length ? '<p style="margin:3pt 0">' + elements.map(echapper).join(' · ') + '</p>' : '');

  return document('CV – ' + identite.prenomNom,
    '<p style="font-size:20pt;color:' + COULEUR + ';margin:0"><b>' + echapper(identite.prenomNom) + '</b></p>' +
    '<p style="margin:2pt 0;color:#555555">' + coordonnees + '</p>' +
    '<p style="font-size:12pt;color:' + COULEUR + ';margin:8pt 0 2pt 0"><b>' + echapper(cv.titre) + '</b></p>' +
    (cv.accroche ? '<p style="margin:0 0 4pt 0">' + echapper(cv.accroche) + '</p>' : '') +
    section('Expériences', experiences) +
    section('Formation', formations) +
    section('Compétences', ligne(cv.competences)) +
    section('Langues', ligne(cv.langues)) +
    section('Centres d’intérêt', ligne(cv.centresInteret))
  );
}

function formuleAppel(destinataire) {
  if (/^madame\b/i.test(destinataire || '')) return 'Madame';
  if (/^monsieur\b/i.test(destinataire || '')) return 'Monsieur';
  return 'Madame, Monsieur';
}

function dateLongue(date) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function lettreHtml(candidature, identite, date) {
  const appel = formuleAppel(candidature.destinataire);
  const ville = String(identite.ville || '').replace(/\s*\(.*\)\s*/g, '').trim();
  const paragraphes = (candidature.lettre.paragraphes || [])
    .map((p) => '<p style="margin:0 0 8pt 0;text-align:justify">' + echapper(p) + '</p>').join('');

  return document('Lettre – ' + candidature.entreprise,
    '<p style="margin:0">' + [identite.prenomNom, identite.ville, identite.telephone, identite.email]
      .filter(Boolean).map(echapper).join('<br>') + '</p>' +
    '<p style="margin:12pt 0 0 0;text-align:right">' + echapper(candidature.entreprise) + '</p>' +
    '<p style="margin:12pt 0;text-align:right">' + echapper((ville ? ville + ', le ' : 'Le ') + dateLongue(date)) + '</p>' +
    '<p style="margin:0 0 12pt 0"><b>Objet :</b> ' + echapper(candidature.objet) + '</p>' +
    '<p style="margin:0 0 8pt 0">' + appel + ',</p>' +
    paragraphes +
    '<p style="margin:0 0 8pt 0">Je vous prie d’agréer, ' + appel + ', l’expression de mes salutations distinguées.</p>' +
    '<p style="margin:12pt 0 0 0">' + echapper(identite.prenomNom) + '</p>'
  );
}

module.exports = { cvHtml, lettreHtml, echapper, formuleAppel, dateLongue };
