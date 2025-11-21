# LibertadIA - Site Web d'Automatisation IA pour PME

Site web professionnel pour LibertadIA, agence d'automatisation de systèmes IA pour les PME françaises.

## 🎯 Objectif du site

Ce site est l'outil principal de conversion de l'activité. Il transforme les visiteurs en prospects qualifiés prêts à réserver un audit gratuit. Chaque élément visuel, animation et texte démontre concrètement la valeur de l'automatisation par IA.

## 📋 Structure du projet

```
/
├── index.html                 # Page d'accueil avec calculateur ROI
├── services.html              # Méthodologie en 4 étapes
├── contact.html               # Formulaire de contact intelligent
├── css/
│   └── styles.css            # Styles complets avec variables CSS
├── js/
│   └── main.js               # Toutes les interactions et animations
├── assets/
│   ├── logo-libertadia.png   # Logo principal
│   └── Favicon.png           # Favicon du site
└── README.md                 # Ce fichier

## 🎨 Palette de couleurs

### Couleurs principales
- **Bleu principal** : `#2563EB` - CTA, liens, accents
- **Bleu hover** : `#1E40AF` - États de survol
- **Bleu clair** : `#EFF6FF` - Arrière-plans secondaires

### Couleurs de performance (ROI, statistiques)
- **Orange principal** : `#F97316` - Chiffres, résultats
- **Orange clair** : `#FFF7ED` - Arrière-plans

### Couleurs de fond
- **Fond principal** : `#FAF9F6` - Blanc cassé
- **Fond blanc** : `#FFFFFF` - Sections alternées
- **Fond sombre** : `#1F2937` - Footer

### Texte
- **Texte principal** : `#1F2937` - Titres et corps
- **Texte secondaire** : `#6B7280` - Descriptions
- **Bordures** : `#E5E7EB`

## ✨ Fonctionnalités principales

### Page d'accueil (index.html)
- **Animation SVG hero** : Transformation visuelle processus manuel → automatisé
- **Section problèmes** : 4 cartes identifiant les douleurs des PME
- **Solutions par onglets** : 5 cas d'usage concrets avec comparaisons avant/après
- **Calculateur ROI interactif** :
  - 3 sliders (coût horaire, heures/semaine, taux d'automatisation)
  - Calcul en temps réel des économies
  - Animations de compteur
  - Jauge visuelle du potentiel
- **Statistiques animées** : Compteurs qui s'animent au scroll
- **Formulaire CTA intégré** : Pour conversion rapide

### Page Services (services.html)
- **Méthodologie en 4 étapes** :
  1. Audit gratuit et sans engagement
  2. Immersion en entreprise
  3. Installation du système IA
  4. ROI garanti en moins de 4 mois
- **Icônes SVG animées** pour chaque étape
- **Timeline visuelle** avec ligne de progression
- **Section témoignages** prête à recevoir les retours clients

### Page Contact (contact.html)
- **Formulaire intelligent** qui qualifie les prospects :
  - Secteur d'activité
  - Nombre d'employés
  - Processus à automatiser
  - Budget approximatif
  - Objectifs (cases à cocher multiples)
- **Validation en temps réel**
- **Message de succès animé**
- **Informations de contact** avec cartes visuelles

## 🔧 Modifications faciles

### Changer les couleurs
Les couleurs sont définies dans `css/styles.css` sous forme de variables CSS :

```css
:root {
    --color-primary-blue: #2563EB;
    --color-performance-orange: #F97316;
    /* ... etc */
}
```

Modifiez ces valeurs pour changer toute la palette.

### Modifier le contenu
Tous les textes sont directement dans les fichiers HTML. Cherchez les balises appropriées et modifiez le contenu.

### Ajuster les animations
Dans `js/main.js`, vous pouvez modifier les durées d'animation :

```javascript
const duration = 800; // Durée en millisecondes
```

## 🚀 Déploiement

### GitHub Pages
1. Push le projet sur GitHub
2. Allez dans Settings > Pages
3. Source : Branch `main` / root
4. Le site sera disponible à `https://votre-username.github.io/repo-name`

### Netlify
1. Glissez-déposez le dossier sur netlify.com
2. Ou connectez votre repo GitHub
3. Build command : (laisser vide)
4. Publish directory : `/`

### Vercel
1. Installez Vercel CLI : `npm i -g vercel`
2. Dans le dossier du projet : `vercel`
3. Suivez les instructions

## 📱 Responsive Design

Le site est entièrement responsive avec 4 breakpoints :
- **Mobile** : < 768px
- **Tablette** : 768px - 1024px
- **Desktop** : 1024px - 1440px
- **Large** : > 1440px

### Menu mobile
Le menu se transforme en hamburger sur mobile avec animation fluide.

## ⚡ Performances

### Optimisations incluses
- **Lazy loading** des animations (Intersection Observer)
- **Préconnexion** aux Google Fonts
- **Transitions GPU** avec `transform` et `opacity`
- **Code minimaliste** sans dépendances lourdes
- **Images optimisées** (à compresser avant mise en prod)

### Recommandations
1. Compressez les images avec TinyPNG ou ImageOptim
2. Minifiez CSS et JS en production
3. Activez la compression gzip sur le serveur
4. Utilisez un CDN pour les assets statiques

## 🎯 SEO

### Éléments inclus
- Balises `<title>` uniques par page
- Meta descriptions optimisées
- Balises Open Graph pour réseaux sociaux
- URLs canoniques
- Structure sémantique HTML5
- Données structurées JSON-LD
- Alt text sur toutes les images

### Améliorations possibles
- Générer un `sitemap.xml`
- Ajouter `robots.txt`
- Implémenter Analytics (Google Analytics, Plausible, etc.)
- Ajouter Schema.org pour les services

## ♿ Accessibilité

- Navigation au clavier complète
- États `:focus` visibles
- Labels associés aux champs de formulaire
- Attributs `aria-label` sur les boutons
- Contraste de couleurs WCAG AA
- Structure HTML sémantique

## 📝 Formulaires

Les formulaires sont actuellement configurés pour afficher un message de succès. 

### Pour les connecter à un backend :
1. **Option simple** : Service comme Formspree, Form submit
2. **Option avancée** : API backend custom
3. **Pour Netlify** : Ajoutez `netlify` dans l'attribut `name` du form

Exemple Netlify :
```html
<form name="contact" netlify>
```

## 🔍 Debug

### Console
Le JavaScript log un message de succès :
```
✅ LibertadIA - JavaScript chargé avec succès
```

### Vérifier les animations
Les éléments avec la classe `animate-on-scroll` doivent apparaître progressivement au scroll.

### Test du calculateur ROI
Vérifiez que les valeurs changent en temps réel quand vous bougez les sliders.

## 📞 Support

Pour toute question sur le code :
1. Vérifiez la console pour les erreurs
2. Assurez-vous que tous les fichiers sont au bon endroit
3. Vérifiez que les chemins vers CSS et JS sont corrects

## 📄 Licence

© 2024 LibertadIA. Tous droits réservés.

---

**Développé avec ❤️ pour LibertadIA**
