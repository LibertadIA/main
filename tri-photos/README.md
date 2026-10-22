# Tri Photos

Trie les photos et vidéos d'un dossier façon Tinder : glisse à droite pour garder, à gauche pour supprimer.
Les fichiers supprimés partent dans la **corbeille Windows** (récupérables).

## Installation

1. Onglet **Releases** du dépôt → télécharge `TriPhotos.exe`
   (ou onglet **Actions** → dernier passage « Tri Photos » → artefact `TriPhotos`).
2. Double-clique dessus. Rien à installer.
3. Au premier lancement, Windows peut afficher « Windows a protégé votre ordinateur » (l'app n'est pas signée) :
   clique sur **Informations complémentaires** puis **Exécuter quand même**.

Le démarrage prend quelques secondes (l'app se décompresse à chaque lancement).

## Utilisation

1. **Choisir un dossier** (les sous-dossiers sont ignorés).
2. Pour chaque photo ou vidéo :

| Action | Souris | Clavier |
| --- | --- | --- |
| Garder (le fichier ne bouge pas) | glisser à droite ou ♥ | → |
| Supprimer (corbeille) | glisser à gauche ou ✕ | ← |
| Annuler (10 derniers choix) | ↺ | Ctrl+Z ou Retour arrière |
| Lecture / pause d'une vidéo | contrôles du lecteur | Espace |

- Pour pouvoir annuler, un fichier supprimé part à la corbeille quand il sort des 10 derniers choix.
  Tout ce qui reste part à la fin du tri, au changement de dossier ou à la fermeture de l'app.
- Les fichiers gardés sont mémorisés : si tu fermes en cours de route, tu reprends là où tu t'étais arrêté.
  Le bouton **Recommencer le tri** efface cette mémoire pour le dossier.
- Une vidéo illisible dans l'app (certains formats HEVC) peut être ouverte avec le lecteur Windows.
- Sur une clé USB ou une carte SD, Windows n'a pas de corbeille : la suppression y est **définitive**.
  Copie d'abord tes photos sur le PC (un téléphone branché en USB n'est pas un dossier utilisable).

Formats : JPG, JPEG, PNG, WEBP, GIF, BMP, MP4, MOV, M4V, 3GP, WEBM.

## Développement

Depuis le dossier `tri-photos/` :

```bash
npm install
npm start              # lancer l'app
npm test               # tests unitaires
npm run test:e2e       # tests de bout en bout (Linux : xvfb-run -a npm run test:e2e)
npm run dist           # fabrique dist/TriPhotos.exe
```

Chaque push qui touche `tri-photos/` lance les tests et fabrique l'exe (artefact GitHub Actions,
workflow `.github/workflows/tri-photos.yml`). Un tag `tri-photos-v*` publie l'exe dans une Release.
