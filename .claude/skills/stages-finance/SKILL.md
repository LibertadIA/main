---
name: stages-finance
description: Procédure de la recherche de stage finance autour de Valence (dossier stages-finance-valence/) - repérage des entreprises via l'annuaire officiel puis Apollo, préparation d'une vague de candidatures (CV adapté + lettre courte dans le mail), dépôt dans Google Drive et ajout au Google Sheet « Suivi candidatures ». À utiliser dès que l'utilisateur dit « lance le repérage », « prépare la vague N », « trouve les contacts », « mets à jour mon CV maître » ou demande où en sont ses candidatures.
---

# Stages finance Valence

Design : `docs/superpowers/specs/2026-10-10-stage-finance-valence-design.md`. Code : `stages-finance-valence/`.

## Règles non négociables

- **Ne jamais inventer** d'expérience, de compétence, de résultat, de langue ou de loisir : tout vient de `donnees/cv-maitre.json`. `preparer-vague.js` bloque sinon ; ne jamais contourner ce contrôle.
- **Apollo** : annoncer le coût estimé en crédits (bloc `mcp_credits`) **avant** tout appel qui en consomme ; après, donner les crédits dépensés et le solde.
- **Aucune donnée personnelle dans git** : tout ce qui est personnel reste dans `stages-finance-valence/donnees/` (ignoré par git), Drive, le Sheet ou Gmail.
- **Rien n'est envoyé par Claude** : l'utilisateur crée les brouillons depuis le menu du Sheet et envoie lui-même.

## 0. Début de session

1. `cd stages-finance-valence && npm test` : tout doit passer.
2. Lire `donnees/config.json` (`{"idDossierRacine": "...", "idClasseur": "..."}`). S'il manque : chercher « Stages Finance Valence » avec la recherche Google Drive, sinon demander les liens à l'utilisateur, puis l'écrire.
3. Télécharger `cv-maitre.json` (racine du dossier Drive) vers `donnees/cv-maitre.json`.

## 1. Repérage

1. `node outils/reperer.js --par-secteur 25` → `donnees/reperage/entreprises-<date>.json` (`colonnes`, `lignes`). Les coupures réseau sont réessayées automatiquement ; relancer si la commande échoue quand même.
2. Lire la colonne A de l'onglet `Entreprises` (`Entreprises!A:A`) et retirer les SIREN déjà présents.
3. Ajouter les nouvelles lignes : `append_values` sur `Entreprises!A1`.
4. Résumer en une ligne par secteur.

## 2. Enrichissement (seulement pour les cibles de la prochaine vague)

Pour chaque entreprise retenue :
1. **Site public** : WebSearch « <nom> <ville> », puis WebFetch des pages accueil / à propos / carrières. Noter : 3 mots de culture, 1 angle d'accroche (fait concret et daté), email de contact générique, offre de stage éventuelle.
2. **Apollo** (canal Email, sans email nominatif) :
   - `apollo_mixed_people_api_search` sur le domaine du site, titres : Directeur financier, DAF, Responsable administratif et financier, Expert-comptable associé, Responsable RH, Directeur d'agence ;
   - coût annoncé, puis `apollo_people_match` pour obtenir l'email.
3. Mettre à jour la ligne (`update_values`) : Site, Contact, Email, Lien offre / portail, Culture (3 mots), Angle d'accroche, Priorité (**A** si offre en cours ou contact nommé avec email), Source (`Annuaire + site` ou `Annuaire + Apollo`).

## 3. Préparer la vague N

1. Choisir 10-15 lignes `À traiter` : priorité A puis B, secteurs équilibrés.
2. Pour chacune, écrire `donnees/vagues/vague-N/<SIREN>.json` :

```json
{
  "idEntreprise": "<SIREN>",
  "entreprise": "<nom exact, cité tel quel dans le texte>",
  "canal": "Email | Portail",
  "destinataire": "Madame X | Monsieur Y | vide",
  "email": "<email, vide si Portail>",
  "lienOffre": "<URL de l'offre ou du portail>",
  "objet": "Candidature – stage <domaine> (<dates>)",
  "corpsMail": "<Email : 120-150 mots, sans signature>",
  "cv": {
    "titre": "Stage <domaine> – <dates>",
    "accroche": "<1-2 phrases>",
    "experiences": [{ "poste": "", "structure": "", "lieu": "", "dates": "", "points": [""] }],
    "formations": [{ "diplome": "", "etablissement": "", "dates": "", "details": "" }],
    "competences": [""],
    "langues": [""],
    "centresInteret": [""]
  },
  "lettre": { "paragraphes": ["<Portail uniquement : 3 paragraphes, 250-300 mots au total>"] }
}
```

3. `node outils/preparer-vague.js donnees/vagues/vague-N` ; corriger les fichiers jusqu'au « ✓ ».
4. **Vague 1** : montrer à l'utilisateur chaque corps de mail et le CV de chaque secteur, puis attendre sa validation avant tout dépôt.
5. Dépôt Drive, pour chaque candidature :
   - créer le dossier de l'entreprise : `create_file`, `title` = nom de l'entreprise, `parentId` = `idDossierRacine`, type dossier `application/vnd.google-apps.folder` ;
   - `create_file`, `title` = `CV_<Prénom>_<Nom>_<Entreprise>`, `parentId` = dossier, `contentMimeType` = `text/html`, `textContent` = contenu de `<SIREN>.cv.html` → noter l'ID ;
   - Portail : même chose pour `<SIREN>.lettre.html` (`LM_…`).
6. Reporter les ID dans les colonnes « ID doc CV » / « ID doc lettre » des lignes de `lignes.json`, puis `append_values` sur `Candidatures!A1`. Ne pas remplir « Lien dossier » : le script s'en charge.
7. Passer la colonne `État` des entreprises concernées à `Vague N`.
8. Dire à l'utilisateur : « Ouvre le Sheet → menu Candidatures → Créer les brouillons, puis relis et envoie depuis Gmail. Pour les portails, les PDF sont dans le lien du dossier. »

## Règles de rédaction

- **CV** : partir du CV maître ; adapter le titre (poste + dates), l'accroche, l'ordre des expériences, le choix des compétences (libellés exacts du maître, 12 au plus), reformuler les points sans ajouter de fait. 4 expériences × 4 points au plus.
  - Banque : relation client, rigueur, conformité.
  - Cabinet comptable / audit : Excel, logiciels comptables, précision.
  - Assurance / gestion de patrimoine : pédagogie, produits financiers.
  - PME : contrôle de gestion, reporting.
- **Corps du mail** (Email) : salutation ; accroche propre à l'entreprise (fait concret tiré du site, nom exact de l'entreprise) ; 2-3 atouts prouvés par le CV maître ; dates de stage, demande d'échange, mention du CV en pièce jointe. La signature est ajoutée par le script.
- **Lettre complète** (Portail) : 3 paragraphes (l'entreprise / moi / nous). Formule d'appel et formule de politesse sont ajoutées par le gabarit.
- **Ton** : formel pour les banques et les assureurs, direct et concret pour les PME et les cabinets.
- Ne jamais citer une autre entreprise de la vague.

## 4. Point d'étape

« Où en sont mes candidatures ? » : lire `Candidatures!A:Y`, compter par statut, lister les « Réponse reçue » (avec extrait) et les « À relancer ».

## 5. Mise à jour du CV maître

Quand l'utilisateur donne une nouvelle expérience ou compétence : modifier `donnees/cv-maitre.json`, puis remplacer `cv-maitre.json` dans Drive.
