// Gabarits HTML du CV et de la lettre. HTML simple et styles en ligne : le fichier est converti en Google Docs.

const COULEUR = '#1F3864';
const BANDEAU_TEXTE = '#DCE3EF';
const FOND_TITRE = '#E4EAF4';
const GRIS = '#5F6B7A';
// Google Docs importe le HTML sur une page Letter (468 pt utiles). Le script Google passe ensuite en A4
// avec des marges latérales qui gardent cette largeur (Documents.js, POINTS_A4).
const LARGEUR = { totale: 468, dates: 108 };
// Bordures blanches : invisibles, et Google Docs n'ajoute pas ses bordures noires par défaut.
const SANS_BORDURE = 'border:1pt solid #FFFFFF';

function echapper(texte) {
  return String(texte === undefined || texte === null ? '' : texte)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function document(titre, corps) {
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + echapper(titre) + '</title>' +
    '<style>@page { size: A4; margin: 1.5cm; }</style></head>' +
    '<body style="font-family:Arial;font-size:10pt;color:#222222">' + corps + '</body></html>';
}

// Le CV est un seul tableau : Google Docs insère un paragraphe vide entre deux tableaux consécutifs.
function ligneLarge(contenu, style) {
  return '<tr><td colspan="2" style="' + SANS_BORDURE + ';' + style + '">' + contenu + '</td></tr>';
}

function ligneDatee(dates, contenu) {
  return '<tr><td style="' + SANS_BORDURE + ';width:' + LARGEUR.dates + 'pt;padding:4pt 6pt 3pt 6pt;vertical-align:top">' +
    '<p style="margin:0;font-size:9pt;color:' + GRIS + '">' + echapper(dates) + '</p></td>' +
    '<td style="' + SANS_BORDURE + ';width:' + (LARGEUR.totale - LARGEUR.dates) + 'pt;padding:4pt 6pt 3pt 6pt;vertical-align:top">' +
    contenu + '</td></tr>';
}

function titreSection(titre) {
  return ligneLarge('<p style="margin:0;font-size:10pt;color:' + COULEUR + '"><b>' + echapper(titre.toUpperCase()) + '</b></p>',
    'background-color:' + FOND_TITRE + ';padding:3pt 6pt');
}

function section(titre, lignes) {
  if (!lignes) return '';
  return ligneLarge('', 'padding:0;height:6pt') + titreSection(titre) + lignes;
}

// Puces en texte : les listes HTML deviennent dans Docs de grosses puces très en retrait.
function puces(points) {
  return (points || []).map((p, i) =>
    '<p style="margin:' + (i ? 0 : 2) + 'pt 0 0 10pt;text-indent:-9pt;font-size:9.5pt">' +
    '<span style="color:' + COULEUR + '">•</span>  ' + echapper(p) + '</p>'
  ).join('');
}

function cvHtml(cv, identite) {
  const coordonnees = [identite.ville, identite.telephone, identite.email, identite.linkedin]
    .filter(Boolean).map(echapper).join('   |   ');

  const bandeau = ligneLarge(
    '<p style="margin:0;font-size:22pt;color:#FFFFFF"><b>' + echapper(identite.prenomNom) + '</b></p>' +
    '<p style="margin:3pt 0 0 0;font-size:11.5pt;color:' + BANDEAU_TEXTE + '"><b>' + echapper(cv.titre) + '</b></p>' +
    '<p style="margin:7pt 0 0 0;font-size:9pt;color:#FFFFFF">' + coordonnees + '</p>',
    'background-color:' + COULEUR + ';padding:12pt 14pt'
  );

  const accroche = cv.accroche
    ? ligneLarge('<p style="margin:0;text-align:justify;color:#333333">' + echapper(cv.accroche) + '</p>', 'padding:8pt 6pt 0 6pt')
    : '';

  const experiences = (cv.experiences || []).map((e) => ligneDatee(e.dates,
    '<p style="margin:0"><b>' + echapper(e.poste) + '</b></p>' +
    '<p style="margin:1pt 0 0 0;font-size:9.5pt;color:' + COULEUR + '">' + echapper(e.structure) + (e.lieu ? ', ' + echapper(e.lieu) : '') + '</p>' +
    puces(e.points)
  )).join('');

  const formations = (cv.formations || []).map((f) => ligneDatee(f.dates,
    '<p style="margin:0"><b>' + echapper(f.diplome) + '</b></p>' +
    '<p style="margin:1pt 0 0 0;font-size:9.5pt;color:' + COULEUR + '">' + echapper(f.etablissement) + '</p>' +
    (f.details ? '<p style="margin:1pt 0 0 0;font-size:9pt;color:' + GRIS + '">' + echapper(f.details) + '</p>' : '')
  )).join('');

  const liste = (libelle, elements) => ((elements || []).length
    ? ligneDatee(libelle, '<p style="margin:0;font-size:9.5pt">' + elements.map(echapper).join('  ·  ') + '</p>')
    : '');
  const langues = liste('Langues', cv.langues);
  const interets = liste('Centres d’intérêt', cv.centresInteret);

  return document('CV – ' + identite.prenomNom,
    '<table style="width:' + LARGEUR.totale + 'pt;border-collapse:collapse">' +
    bandeau + accroche +
    section('Expériences', experiences) +
    section('Formation', formations) +
    section('Compétences', liste('', cv.competences)) +
    section(langues && interets ? 'Langues et centres d’intérêt' : langues ? 'Langues' : 'Centres d’intérêt', langues + interets) +
    '</table>'
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
