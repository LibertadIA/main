# Stages finance Valence

Outil personnel de recherche de stage en finance autour de Valence : repérage des entreprises, CV et lettre adaptés à chacune, brouillons Gmail, suivi automatique dans un Google Sheet.

Design : [`docs/superpowers/specs/2026-10-10-stage-finance-valence-design.md`](../docs/superpowers/specs/2026-10-10-stage-finance-valence-design.md).

## Installation du Google Sheet (une fois, environ 10 minutes)

1. Claude crée le dossier Drive « Stages Finance Valence » et, dedans, le Google Sheet « Suivi candidatures ».
2. Ouvre le Sheet → **Extensions → Apps Script**.
3. **Paramètres du projet** (roue dentée) → coche **Afficher le fichier manifeste « appsscript.json » dans l'éditeur**.
4. Dans l'éditeur, remplace tout le contenu de `appsscript.json` par celui de `apps-script/appsscript.json`.
5. Remplace tout le contenu de `Code.gs` par celui de `dist/Code.gs` (Claude te l'envoie ; il est produit par `npm run assembler`).
6. Enregistre, choisis la fonction **installer** dans la liste en haut, clique sur **Exécuter** et accepte les autorisations (Sheets, Drive, Gmail). Si Google affiche « Cette application n'a pas été validée » : **Paramètres avancés → Accéder au projet** (c'est ton propre script).
7. Recharge le Sheet : le menu **Candidatures** apparaît.
8. Remplis l'onglet **Réglages** : Prénom Nom, Signature, Dates de stage. Laisse **Mode test** à `oui` jusqu'à la fin des tests.

## Utilisation

- **Candidatures → Créer les brouillons** : crée un brouillon Gmail (CV en PDF joint) pour chaque ligne « Prêt », et prépare les PDF des lignes « À postuler (portail) ».
- **Candidatures → Mettre à jour maintenant** : relance le suivi sans attendre 8 h.
- Statuts à poser à la main : Entretien, Refus, Accepté, Postulé (portail).

## Tests avant la vague 1 (mode test activé)

Claude ajoute 3 fausses candidatures A, B et C (Docs CV de test). Les brouillons partent vers ta propre adresse.

1. **Créer les brouillons** → 3 brouillons, chacun avec le CV en PDF et le libellé « Stages ».
2. **A** : envoie-le → **Mettre à jour maintenant** → « Envoyé ». Réponds à ce mail depuis une autre adresse → **Mettre à jour maintenant** → « Réponse reçue » avec l'extrait.
3. **B** : envoie-le, mets « Délai relance (jours) » à 0 → **Mettre à jour maintenant** → « Envoyé » ; une 2e fois → « À relancer » et un brouillon de relance dans le même fil ; envoie la relance → **Mettre à jour maintenant** → « Relancé ».
4. **C** : dans le brouillon, remplace le destinataire par `adresse-inexistante-test-2026@gmail.com`, envoie → attends le message de non-remise → **Mettre à jour maintenant** → « Email invalide ».
5. Garde-fous : une ligne « Prêt » sans email, une avec un ID doc CV faux, puis double clic sur **Créer les brouillons** → erreurs explicites dans la colonne Erreur, aucun brouillon en double.
6. Remets **Mode test** à `non`, les délais à 10, et supprime les lignes et brouillons de test.

## Développement

```bash
npm test             # tous les tests
npm run assembler    # écrit dist/Code.gs
npm run reperer      # repérage via l'annuaire (réseau requis)
node outils/preparer-vague.js donnees/vagues/vague-1
```

`donnees/` et `dist/` sont ignorés par git.
