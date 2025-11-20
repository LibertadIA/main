# 🔧 Guide de Dépannage - Pack Immersion Ultra

## Problème : Le Pack Immersion ne se charge pas sur Hostinger

### ✅ Solution en 5 Étapes

---

## ÉTAPE 1️⃣ : Utiliser la Page de Diagnostic

1. **Upload le fichier `diagnostic-immersion.html`** sur Hostinger (même dossier que index.html)

2. **Ouvre la page dans ton navigateur** :
   ```
   https://tonsite.com/diagnostic-immersion.html
   ```

3. **Regarde les résultats** :
   - ✅ Si tous les tests sont verts → Le problème vient d'ailleurs
   - ❌ Si des tests sont rouges → Note lesquels échouent

4. **Prends une capture d'écran** des résultats ou clique sur "Copier les résultats"

---

## ÉTAPE 2️⃣ : Vérifier la Console du Navigateur

1. **Ouvre ton site** : `https://tonsite.com/index.html`

2. **Ouvre la Console** :
   - Windows/Linux : `F12` ou `Ctrl + Shift + I`
   - Mac : `Cmd + Option + I`

3. **Clique sur l'onglet "Console"**

4. **Vérifie les messages** :

   **✅ Messages attendus (BONS SIGNES) :**
   ```
   🚀 LibertadIA - Site chargé avec succès
   ✨ Pack Immersion Ultra activé
   💡 GSAP et animations activés
   ```

   **❌ Messages d'erreur possibles (PROBLÈMES) :**

   - **`Uncaught ReferenceError: initScrollProgress is not defined`**
     → Le fichier `script.js` n'est pas chargé correctement

   - **`Failed to load resource: script.js 404`**
     → Le fichier script.js n'existe pas sur le serveur

   - **`Uncaught SyntaxError: Unexpected token`**
     → Erreur de copier-coller dans le code

   - **`gsap is not defined`**
     → GSAP ne charge pas (problème de CDN ou connexion)

5. **Prends une capture d'écran** de la console

---

## ÉTAPE 3️⃣ : Vérifier les Fichiers sur Hostinger

### A) Vérifie que TOUS les fichiers sont uploadés :

Connecte-toi à Hostinger File Manager et vérifie :

```
public_html/
├── index.html             ✅ REQUIS
├── styles.css             ✅ REQUIS
├── script.js              ✅ REQUIS
├── services.html          (optionnel)
├── contact.html           (optionnel)
├── logo-libertadia.png    ✅ REQUIS
└── diagnostic-immersion.html (pour tester)
```

### B) Vérifie la TAILLE des fichiers :

Les fichiers doivent avoir cette taille approximative :

- **index.html** : ~20-25 KB
- **styles.css** : ~55-65 KB
- **script.js** : ~30-35 KB

⚠️ Si un fichier fait 0 KB ou beaucoup moins, il n'a pas été uploadé correctement !

### C) Vérifie que les noms sont EXACTS :

- ❌ `Script.js` → MAUVAIS (majuscule)
- ✅ `script.js` → BON
- ❌ `styles .css` → MAUVAIS (espace)
- ✅ `styles.css` → BON

---

## ÉTAPE 4️⃣ : Vider le Cache du Navigateur

Parfois le navigateur affiche une vieille version. Essaie :

### Windows/Linux :
```
Ctrl + Shift + R    (rechargement forcé)
```

### Mac :
```
Cmd + Shift + R     (rechargement forcé)
```

### OU en mode navigation privée :
```
Ctrl + Shift + N    (Chrome/Edge)
Ctrl + Shift + P    (Firefox)
```

---

## ÉTAPE 5️⃣ : Re-télécharger et Re-uploader les Fichiers

Si rien ne fonctionne, il y a peut-être eu une erreur lors du copier-coller.

### Méthode 1 : Télécharger depuis GitHub

1. Va sur : `https://github.com/LibertadIA/main`

2. Clique sur le bouton **Code** → **Download ZIP**

3. Dézippe le fichier

4. Dans Hostinger File Manager :
   - **SUPPRIME** les anciens fichiers (index.html, styles.css, script.js)
   - **UPLOADE** les nouveaux fichiers depuis le ZIP

### Méthode 2 : Copier le code brut depuis GitHub

Pour chaque fichier (index.html, styles.css, script.js) :

1. Va sur GitHub
2. Clique sur le fichier
3. Clique sur le bouton **Raw** en haut à droite
4. `Ctrl + A` pour tout sélectionner
5. `Ctrl + C` pour copier
6. Dans Hostinger :
   - Crée un nouveau fichier avec le bon nom
   - `Ctrl + V` pour coller
   - SAUVEGARDE

---

## 🔍 Problèmes Spécifiques et Solutions

### Problème A : "Rien ne s'affiche, page blanche"

**Cause possible :** Erreur JavaScript qui bloque tout

**Solution :**
1. Ouvre la Console (F12)
2. Regarde la première ligne d'erreur rouge
3. Note le numéro de ligne et le message
4. Partage-moi cette info

---

### Problème B : "Le site s'affiche mais pas d'animations"

**Cause possible :** GSAP ne charge pas

**Solution :**
1. Ouvre la Console
2. Tape : `typeof gsap`
3. Si ça dit `undefined` → GSAP ne charge pas
4. Vérifie ta connexion internet
5. Vérifie que les liens CDN GSAP sont bien dans `<head>` de index.html :
   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
   ```

---

### Problème C : "Progress bar et particules invisibles"

**Cause possible :** CSS ne charge pas

**Solution :**
1. Vérifie que `styles.css` est bien uploadé
2. Dans le code source de index.html (clic droit → Voir le code source), vérifie :
   ```html
   <link rel="stylesheet" href="styles.css">
   ```
3. Le nom doit être EXACTEMENT `styles.css` (pas de majuscule)

---

### Problème D : "Logo ne s'affiche pas (404)"

**Cause possible :** Fichier logo pas uploadé

**Solution :**
1. Télécharge `logo-libertadia.png` depuis GitHub
2. Upload-le dans Hostinger au MÊME endroit que index.html
3. Vérifie le nom exact : `logo-libertadia.png` (tout en minuscules)

---

## 📞 Checklist Finale

Avant de me contacter, vérifie que tu as fait :

- [ ] Uploadé `diagnostic-immersion.html` et testé
- [ ] Ouvert la Console (F12) sur le site
- [ ] Vérifié que tous les fichiers existent sur Hostinger
- [ ] Vérifié la taille des fichiers (pas 0 KB)
- [ ] Vidé le cache avec `Ctrl + Shift + R`
- [ ] Testé en navigation privée
- [ ] Pris des captures d'écran des erreurs

---

## 🆘 Informations à me Fournir

Si rien ne fonctionne après tout ça, envoie-moi :

1. **Capture d'écran de la page de diagnostic** (`diagnostic-immersion.html`)
2. **Capture d'écran de la Console** (F12) avec les erreurs
3. **Liste des fichiers** dans ton File Manager Hostinger
4. **Taille des fichiers** (index.html, styles.css, script.js)
5. **URL de ton site** pour que je teste

---

## ✅ Test Rapide : Le Code Fonctionne Localement ?

Pour vérifier si le problème vient d'Hostinger ou du code :

1. **Télécharge tous les fichiers depuis GitHub sur ton ordinateur**
2. **Mets-les dans un dossier**
3. **Double-clique sur `index.html`**
4. **Vérifie si les animations fonctionnent**

Si ça fonctionne en local mais pas sur Hostinger → Problème d'upload
Si ça ne fonctionne pas en local → Problème dans le code

---

## 🎯 Raccourci : Version Minimale pour Tester

Si tu veux juste tester rapidement, crée un fichier `test-minimal.html` :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Test Minimal</title>
    <style>
        .scroll-progress-bar {
            position: fixed;
            top: 0;
            left: 0;
            height: 4px;
            background: blue;
            width: 0%;
            z-index: 9999;
        }
    </style>
</head>
<body>
    <div class="scroll-progress-bar"></div>

    <div style="height: 3000px; padding: 50px;">
        <h1>Test Scroll</h1>
        <p>Scrolle vers le bas et regarde la barre bleue en haut se remplir</p>
    </div>

    <script>
        console.log('✅ Test minimal chargé');

        window.addEventListener('scroll', function() {
            const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            document.querySelector('.scroll-progress-bar').style.width = scrolled + '%';
        });
    </script>
</body>
</html>
```

Si ce fichier minimal fonctionne, c'est bon signe !

---

**Tiens-moi au courant des résultats ! 🚀**
