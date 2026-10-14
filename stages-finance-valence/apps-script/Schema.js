// Schéma du classeur « Suivi candidatures » : onglets, colonnes, statuts, réglages.
// Uniquement des `var` au niveau global : ce fichier est aussi chargé sous Node pour les tests.

var ONGLETS = {
  ENTREPRISES: 'Entreprises',
  CANDIDATURES: 'Candidatures',
  REGLAGES: 'Réglages'
};

var COLONNES_ENTREPRISES = [
  'ID entreprise', 'Nom', 'Secteur', 'Ville', 'Site', 'Taille',
  'Contact', 'Email', 'Canal', 'Lien offre / portail',
  'Culture (3 mots)', "Angle d'accroche", 'Priorité', 'Source', 'État'
];

var COLONNES_CANDIDATURES = [
  'ID candidature', 'ID entreprise', 'Entreprise', 'Vague', 'Canal',
  'Destinataire', 'Email', 'Objet', 'Corps',
  'ID doc CV', 'ID doc lettre', 'Lien offre', 'Lien dossier',
  'Statut', 'Date prêt', 'ID brouillon', 'ID fil Gmail', 'Date envoi',
  'Relance prévue', 'ID brouillon relance', 'Date relance',
  'Date réponse', 'Extrait réponse', 'Erreur', 'Notes'
];

var STATUTS = {
  PRET: 'Prêt',
  BROUILLON_CREE: 'Brouillon créé',
  ENVOYE: 'Envoyé',
  A_RELANCER: 'À relancer',
  RELANCE: 'Relancé',
  REPONSE_RECUE: 'Réponse reçue',
  ENTRETIEN: 'Entretien',
  REFUS: 'Refus',
  ACCEPTE: 'Accepté',
  SANS_SUITE: 'Sans suite',
  EMAIL_INVALIDE: 'Email invalide',
  A_POSTULER_PORTAIL: 'À postuler (portail)',
  POSTULE_PORTAIL: 'Postulé (portail)'
};

// Seuls ces statuts sont modifiés par le suivi automatique ; les autres sont posés à la main.
var STATUTS_SUIVIS = [STATUTS.BROUILLON_CREE, STATUTS.ENVOYE, STATUTS.A_RELANCER, STATUTS.RELANCE];

var CANAUX = { EMAIL: 'Email', PORTAIL: 'Portail' };

var REGLAGES_PAR_DEFAUT = [
  ['Prénom Nom', ''],
  ['Signature', ''],
  ['Dates de stage', ''],
  ['Délai relance (jours)', 10],
  ['Délai sans suite (jours)', 10],
  ['Libellé Gmail', 'Stages'],
  ['Mode test', 'oui']
];

var COULEURS_STATUTS = {
  'Prêt': '#e8f0fe',
  'Brouillon créé': '#d2e3fc',
  'Envoyé': '#fef7e0',
  'À relancer': '#fce8b2',
  'Relancé': '#fdd663',
  'Réponse reçue': '#ceead6',
  'Entretien': '#81c995',
  'Accepté': '#34a853',
  'Refus': '#f6aea9',
  'Sans suite': '#e8eaed',
  'Email invalide': '#f28b82',
  'À postuler (portail)': '#e9d2fd',
  'Postulé (portail)': '#d7aefb'
};
