# Tri Photos — design

## Objectif
Application Windows locale pour trier les photos et vidéos d'un dossier façon Tinder :
glisser à droite pour garder, à gauche pour supprimer (corbeille Windows).

## Décisions validées
- Plateforme : Windows. Livré en un seul `TriPhotos.exe` portable (Electron), sans installation.
- Suppression : corbeille Windows (`shell.trashItem`), récupérable.
- Droite = garder (le fichier ne bouge pas), gauche = supprimer.
- Dossier choisi uniquement, sous-dossiers ignorés.
- Sources : Android. Formats : JPG, JPEG, PNG, WEBP, GIF, BMP / MP4, MOV, M4V, 3GP, WEBM.

## Comportement
1. Accueil : bouton « Choisir un dossier ».
2. Une carte à la fois, triée par nom de fichier (ordre chronologique sur Android), compteur « n / total ».
3. Garder : glisser à droite, flèche →, bouton ♥. Supprimer : glisser à gauche, flèche ←, bouton ✕.
4. Vidéos : lecteur intégré (contrôles natifs, lecture auto sans le son, plein écran), Espace = lecture/pause.
   Si le format n'est pas lisible : message + bouton « Ouvrir avec le lecteur Windows ».
5. Annuler (Ctrl+Z, Retour arrière, bouton ↺) sur les 10 derniers choix. Une suppression part à la corbeille
   quand elle sort de ces 10 choix ; les suppressions restantes partent à la fin du tri, au changement de dossier
   et à la fermeture de l'app.
6. Reprise : les fichiers gardés sont mémorisés par dossier (`progress.json` dans les données de l'app) ;
   ils ne sont plus proposés à la réouverture. Si tout est déjà trié : bouton « Recommencer le tri ».
7. Fin : récap (gardées, supprimées, Mo envoyés à la corbeille, erreurs éventuelles).

## Architecture
- `src/main/media.js` : liste les médias d'un dossier (non récursif, filtre extensions, tri par nom).
- `src/main/session.js` : logique de tri pure (décisions, annulation, file de suppressions différées, stats).
- `src/main/progress.js` : mémorisation des fichiers gardés par dossier (JSON, écriture atomique).
- `src/main/main.js` : fenêtre, IPC, sélecteur de dossier, corbeille, vidage à la fermeture.
- `src/main/preload.js` : API minimale exposée au rendu (`window.triPhotos`).
- `src/renderer/` : interface (accueil, carte, glisser, clavier, vidéo, fin).

## Erreurs
- Échec de mise à la corbeille : fichier compté en erreur, affiché en notification et au récap ; fichier introuvable ignoré.
- Dossier vide : message dédié.

## Tests
- Unitaires (`node --test`) : media, session, progress.
- Bout en bout (Playwright + Electron sous Xvfb) : choisir un dossier, garder, supprimer, annuler, fin de tri, reprise.
- Build Windows via GitHub Actions (`windows-latest`), `.exe` publié en Release sur tag `tri-photos-v*`.
