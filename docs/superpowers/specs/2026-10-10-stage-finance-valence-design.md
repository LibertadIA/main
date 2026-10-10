# Recherche de stage finance — Valence : design

Date : 2026-10-10
Statut : validé en brainstorming, en attente de relecture

## 1. Objectif

Outil **personnel** pour décrocher un **stage court (1-3 mois)** en finance autour de Valence (Drôme), démarrage dans 3 à 6 mois :

1. repérer et centraliser les structures cibles ;
2. générer pour chacune un CV adapté et une lettre de motivation courte, alignés sur le poste et la culture de l'entreprise ;
3. préparer les emails de candidature en brouillons Gmail, validés et envoyés par l'utilisateur ;
4. suivre automatiquement les envois, réponses et relances dans un Google Sheet.

**Hors périmètre** : comptes utilisateurs, paiement, interface web, envoi automatique sans validation, candidature automatique sur les portails carrières, classement automatique des réponses (entretien / refus).

## 2. Cadre

| Élément | Choix |
|---|---|
| Zone | Valence + 30 km (Drôme 26 et Ardèche 07 limitrophe) |
| Secteurs | Banques de réseau, assurance / gestion de patrimoine, cabinets comptables / audit, services finance de PME |
| Contrat | Stage court 1-3 mois |
| Boîte mail | Gmail |
| Suivi | Google Sheet |
| Fichiers | Google Drive |
| Base CV | CV existant de l'utilisateur |
| Volume | Vagues de 10-15 candidatures par semaine |

## 3. Architecture

Option retenue : **Claude + Google Sheet + Apps Script**.

| Composant | Rôle |
|---|---|
| **Claude (sessions à la demande)** | Repérage, analyse culture, génération CV / lettre, dépôt des PDF dans Drive, ajout des lignes dans le Sheet |
| **Dossier Drive « Stages Finance Valence »** | `CV_maitre` + un sous-dossier par entreprise contenant ses PDF |
| **Google Sheet « Suivi candidatures »** | Onglets `Entreprises`, `Candidatures`, `Réglages` |
| **Apps Script lié au Sheet** | Création des brouillons Gmail, détection envoi / réponse / rebond, relances, mise en couleur |

**Données personnelles** (CV, contacts, emails) : uniquement dans Drive / Sheet / Gmail. **Jamais dans le repo.** Le repo ne contient que ce document et le code Apps Script.

## 4. Déroulé

1. **Repérage** (une fois, enrichi au fil de l'eau) → onglet `Entreprises`, 60-100 structures, priorisées A/B/C.
2. **Vague hebdo** : l'utilisateur demande « prépare la vague N » → Claude sélectionne 10-15 cibles (A d'abord), génère les contenus, dépose les PDF, crée les lignes `Candidatures` au statut **Prêt** (canal email) ou **À postuler (portail)**.
3. **Brouillons** : menu `Candidatures > Créer les brouillons` → brouillons Gmail → l'utilisateur relit et envoie.
4. **Suivi quotidien** automatique (déclencheur 8 h) : envoi, réponse, rebond, relance.
5. **Portails carrières** (grandes banques) : l'utilisateur postule lui-même avec les fichiers préparés, puis met à jour le statut à la main.

## 5. Repérage des entreprises

### 5.1 Source principale : annuaire officiel des entreprises

API publique gratuite `recherche-entreprises.api.gouv.fr` :
- recherche géographique : rayon 30 km autour de Valence (repli : liste des codes commune de la zone si la recherche par rayon n'est pas disponible) ;
- filtre par activité principale (NAF) ;
- établissements actifs uniquement ;
- récupère : raison sociale, adresse, effectif, dirigeants (pour la personnalisation « Bonjour Monsieur / Madame X »).

| Secteur | Codes NAF |
|---|---|
| Banques | 64.19Z |
| Assurance / courtage | 65.11Z, 65.12Z, 66.22Z |
| Gestion de patrimoine / fonds | 66.19B, 66.30Z |
| Comptabilité / audit | 69.20Z |
| Services finance de PME | Tous secteurs, tranche d'effectif ≥ 50 salariés |

### 5.2 Complément : Apollo (si besoin)

Utilisé **uniquement** pour ce que l'annuaire ne fournit pas :
- le bon contact (DAF, RH, directeur d'agence, associé) ;
- son email nominatif.

Règle : **coût estimé en crédits annoncé avant toute dépense**, puis crédits consommés et solde après.

### 5.3 Site web public de l'entreprise

Lecture du site (sans navigateur piloté) pour : culture (valeurs, ton, actualités), page carrières / offres, email de contact générique si Apollo ne trouve rien.

### 5.4 Priorisation

- **A** : offre en cours, ou accueil de stagiaires connu, ou contact nommé avec email.
- **B** : structure pertinente, email générique seulement.
- **C** : candidature spontanée plus incertaine.

## 6. Modèle de données (Google Sheet)

### 6.1 Onglet `Entreprises`

| Colonne | Contenu |
|---|---|
| ID entreprise | SIREN (unique) |
| Nom | Raison sociale / nom d'usage |
| Secteur | Banque, Assurance/CGP, Comptabilité/Audit, PME |
| Ville | Commune de l'établissement |
| Site | URL |
| Taille | Tranche d'effectif |
| Contact | Nom + fonction |
| Email | Email du contact ou générique |
| Canal | Email / Portail |
| Lien offre / portail | URL |
| Culture (3 mots) | ex. « mutualiste, proximité, rigueur » |
| Angle d'accroche | Fait concret à citer |
| Priorité | A / B / C |
| Source | Annuaire / Apollo / Site |
| État | À traiter / Vague N / Écartée |

### 6.2 Onglet `Candidatures`

| Colonne | Rempli par |
|---|---|
| ID candidature, ID entreprise, Entreprise, Vague | Claude |
| Canal, Destinataire, Email | Claude |
| Objet, Corps (lettre courte) | Claude |
| ID fichier CV, ID fichier lettre PDF (portail uniquement), Lien offre | Claude |
| Statut | Claude → script → utilisateur |
| Date prêt | Claude |
| ID brouillon | Script |
| Date envoi, ID fil Gmail | Script |
| Relance prévue, Date relance | Script |
| Date réponse, Extrait réponse (200 car.) | Script |
| Erreur | Script |
| Notes | Utilisateur |

### 6.3 Onglet `Réglages`

Prénom Nom, signature email, dates de stage souhaitées, délai avant relance (10 j), délai avant « Sans suite » (10 j), libellé Gmail (`Stages`), **mode test** (oui/non : redirige les brouillons vers l'adresse de l'utilisateur).

## 7. Génération des contenus

### 7.1 CV maître

Le CV existant est restructuré en une référence unique : formation, expériences, compétences, projets, langues, outils. Stocké dans Drive.

### 7.2 CV adapté (1 page, même gabarit sobre)

- Titre et accroche adaptés au poste.
- Mise en avant selon le secteur :
  - Banque : relation client, rigueur, conformité ;
  - Cabinet comptable : Excel, logiciels comptables, précision ;
  - Gestion de patrimoine : pédagogie, produits financiers ;
  - PME : contrôle de gestion, reporting.
- **Réordonner et reformuler uniquement. Aucune expérience, compétence ou résultat inventé.**
- Nom de fichier : `CV_Prénom_Nom_Entreprise.pdf`.

### 7.3 Lettre de motivation selon le canal

| Canal | Corps du mail | Pièces jointes |
|---|---|---|
| Email (cabinets, CGP, PME, agences) | Lettre courte 120-150 mots | CV adapté |
| Portail carrières | — | CV adapté + lettre complète 250-300 mots en PDF (`LM_Prénom_Nom_Entreprise.pdf`) |

Structure commune (Vous / Moi / Nous) :
1. accroche spécifique à l'entreprise (fait concret : actualité, valeur, modèle) ;
2. 2-3 atouts reliés au poste ;
3. dates de stage + demande d'échange.

Ton calé sur la culture : formel (banque) à direct (PME).

### 7.4 Contrôle qualité avant « Prêt »

- Nom de l'entreprise et du contact corrects partout.
- Aucun reste de texte d'une autre candidature.
- CV sur 1 page, lettre courte dans la fourchette de mots.
- Aucun fait non présent dans le CV maître.
- **Vague 1 validée intégralement par l'utilisateur** (calibrage du ton), contrôles par sondage ensuite.

## 8. Apps Script

### 8.1 Menu `Candidatures`

- **Créer les brouillons** : pour chaque ligne `Statut = Prêt` et `Canal = Email` sans ID brouillon → `GmailApp.createDraft` (objet, corps + signature, CV en pièce jointe depuis Drive), libellé `Stages`, enregistre l'ID brouillon → statut **Brouillon créé**.
- **Mettre à jour maintenant** : exécute le suivi (8.2) immédiatement.

### 8.2 Suivi quotidien (déclencheur horaire 8 h)

| Condition | Détection | Nouveau statut |
|---|---|---|
| Brouillon envoyé | Message dans les envoyés vers l'email de la ligne avec l'objet de la ligne | **Envoyé** + date envoi, ID fil, relance prévue = envoi + 10 j |
| Rebond | Message `mailer-daemon` / non-remise mentionnant l'email après la date d'envoi | **Email invalide** |
| Réponse | Message dans le fil dont l'expéditeur n'est pas l'utilisateur | **Réponse reçue** + date + extrait |
| Pas de réponse à la date de relance | Statut Envoyé, date ≥ relance prévue | **À relancer** + brouillon de relance (3 lignes, dans le même fil) |
| Relance envoyée | Nouveau message envoyé dans le fil après la création du brouillon de relance | **Relancé** + date relance |
| Pas de réponse 10 j après relance | Statut Relancé, date ≥ date relance + 10 j | **Sans suite** |

Une seule relance par candidature. Les statuts **Entretien**, **Refus**, **Accepté** et **Postulé (portail)** sont posés à la main par l'utilisateur ; le script ne les modifie jamais.

### 8.3 Statuts

`Prêt` → `Brouillon créé` → `Envoyé` → (`À relancer` → `Relancé`) → `Réponse reçue` → `Entretien` / `Refus` / `Accepté`
Branches : `Email invalide`, `Sans suite`, `À postuler (portail)` → `Postulé (portail)`.

Mise en forme conditionnelle par statut (couleur de ligne).

### 8.4 Gestion des erreurs

- Email manquant ou PDF introuvable → pas de brouillon, message dans la colonne `Erreur`.
- Jamais deux brouillons pour une même ligne (ID brouillon déjà présent → ignorée).
- Jamais deux candidatures pour un même ID entreprise (contrôle à la création des lignes par Claude et dans le script).
- Erreur sur une ligne → consignée, le traitement continue sur les autres lignes.
- Volume (10-15/semaine) très en dessous des quotas Gmail ; l'envoi reste manuel.

## 9. Tests

Avant la vague 1, en **mode test** :
1. 2 fausses candidatures vers l'adresse de l'utilisateur.
2. Vérifier : brouillon créé avec pièce jointe et libellé → envoi détecté → réponse détectée (répondre depuis une autre adresse) → relance générée (délai réduit à 0 j pour le test) → rebond détecté (adresse inexistante).
3. Vérifier les garde-fous : ligne sans email, PDF manquant, double clic sur « Créer les brouillons ».
4. Désactiver le mode test, rétablir les délais à 10 j.

## 10. Emplacement dans le repo

- `docs/superpowers/specs/` : ce document.
- `stages-finance-valence/apps-script/` : code Apps Script (copié-collé dans l'éditeur Apps Script du Sheet).
- Aucune donnée personnelle versionnée.

## 11. Points à fournir par l'utilisateur au démarrage

- CV actuel (PDF ou Word).
- Dates de stage exactes et durée.
- Formation en cours (école, niveau) si absente du CV.
- Budget de crédits Apollo acceptable par vague.
