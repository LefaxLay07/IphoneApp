# Habitudes 🌱

Une application iPhone pour suivre ses habitudes quotidiennes : boire de l'eau, lire, méditer, faire du sport…

- ✅ Cochez chaque habitude du jour et suivez vos **séries** 🔥
- 📅 Corrigez un jour oublié directement depuis la semaine affichée
- 📊 Statistiques : record, taux de réussite sur 30 jours, calendrier des 16 dernières semaines
- 🌙 Mode sombre automatique
- ✈️ Fonctionne **hors ligne**, sans compte : vos données restent sur votre iPhone
- 💾 Sauvegarde / restauration via un fichier

C'est une *application web installable* (PWA) : pas besoin de Mac, d'Xcode ni de compte Apple Developer.

## Mettre l'application en ligne (une seule fois)

1. Sur GitHub, ouvrez le dépôt → **Settings** → **Pages**.
2. Dans *Build and deployment* → *Source*, choisissez **Deploy from a branch**.
3. Sélectionnez la branche qui contient ces fichiers (par ex. `main`) et le dossier **/ (root)**, puis **Save**.
4. Après une minute, l'adresse apparaît en haut de la page, du type
   `https://<votre-nom>.github.io/IphoneApp/`.

> GitHub Pages est gratuit pour les dépôts **publics**. Pour un dépôt privé, il faut un abonnement GitHub payant
> (ou héberger les fichiers ailleurs : Netlify, Vercel, Cloudflare Pages… il suffit d'y déposer le dossier).

## Installer sur l'iPhone

1. Ouvrez l'adresse dans **Safari**.
2. Touchez le bouton **Partager** (carré avec une flèche vers le haut).
3. Choisissez **« Sur l'écran d'accueil »**, puis **Ajouter**.

L'icône **Habitudes** apparaît sur l'écran d'accueil ; l'app s'ouvre en plein écran, comme une app classique.

## Tester sur ordinateur

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page |
| `styles.css` | Apparence (style iOS, mode clair/sombre) |
| `app.js` | Logique de l'application |
| `sw.js` | Cache hors ligne (changez `VERSION` à chaque mise à jour) |
| `manifest.webmanifest` | Nom, icônes et mode plein écran |
| `icons/` | Icônes de l'application |
