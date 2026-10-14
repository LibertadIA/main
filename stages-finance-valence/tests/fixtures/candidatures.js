// Candidatures fictives valides, à dériver dans les tests.
const maitre = require('./cv-maitre-exemple.json');

const corpsMail = [
  'Bonjour Monsieur Dupont,',
  '',
  'Le Cabinet Exemple Expertise accompagne depuis trente ans les artisans et les PME de la Drôme, avec une proximité qui me parle :',
  'je suis en deuxième année de BUT Gestion des entreprises et des administrations à Valence, parcours gestion comptable, fiscale et financière.',
  'Je recherche un stage de huit à dix semaines, d’avril à juin 2027, pour découvrir la tenue de dossiers et la préparation des bilans.',
  'Trésorière de mon BDE, j’ai suivi un budget de douze mille euros et relancé les cotisations impayées ;',
  'en job d’été, j’ai clôturé chaque jour la caisse d’un magasin. J’utilise Excel et Sage au quotidien.',
  'Rigoureuse et à l’aise avec les clients, je serais heureuse de mettre ces qualités au service de votre équipe.',
  'Vous trouverez mon CV en pièce jointe. Seriez-vous disponible pour un court échange téléphonique dans les prochaines semaines ?',
  'Je vous remercie par avance de votre attention.'
].join('\n');

const cv = {
  titre: 'Stage en expertise comptable – avril à juin 2027',
  accroche: 'Étudiante en BUT GEA, parcours gestion comptable et financière, rigoureuse et à l’aise avec Excel et Sage.',
  experiences: [maitre.experiences[1], maitre.experiences[0]],
  formations: maitre.formations,
  competences: ['Sage Comptabilité', 'Excel (tableaux croisés dynamiques, RECHERCHEX)', 'Rigueur'],
  langues: ['Anglais B2'],
  centresInteret: ['Handball en club']
};

const candidatureEmail = {
  idEntreprise: '111111111',
  entreprise: 'Cabinet Exemple Expertise',
  canal: 'Email',
  destinataire: 'Monsieur Dupont',
  email: 'contact@cabinet-exemple.fr',
  lienOffre: '',
  objet: 'Candidature – stage en expertise comptable (avril à juin 2027)',
  corpsMail,
  cv
};

const paragraphe = (n) => Array.from({ length: n }, (_, i) => 'mot' + i).join(' ');

const candidaturePortail = {
  idEntreprise: '552120222',
  entreprise: 'Société Générale',
  canal: 'Portail',
  destinataire: '',
  email: '',
  lienOffre: 'https://careers.societegenerale.com/offre-exemple',
  objet: 'Candidature – stage conseiller clientèle (avril à juin 2027)',
  corpsMail: '',
  cv: { ...cv, titre: 'Stage conseiller clientèle – avril à juin 2027' },
  lettre: {
    paragraphes: [
      'Société Générale ' + paragraphe(90),
      paragraphe(90),
      paragraphe(90)
    ]
  }
};

module.exports = { maitre, candidatureEmail, candidaturePortail };
