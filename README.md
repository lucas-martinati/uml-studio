# 📊 UML Studio

Un outil simple et puissant pour créer des diagrammes **MCD (Modèle Conceptuel de Données)** directement dans votre navigateur.

Conçu pour être intuitif, ce générateur vous permet de visualiser rapidement vos entités et relations sans installation complexe.

## ✨ Fonctionnalités

*   **Gestion des Entités** : Créez, modifiez et déplacez des entités (tables) facilement.
*   **Attributs Dédiés** : Ajoutez des attributs, définissez les clés primaires (PK) et organisez vos données.
*   **Relations Avancées (Associations)** :
    *   Support des associations binaires, ternaires et N-aires.
    *   Gestion des **cardinalités** (0..1, 1..n, etc.).
    *   Associations avec attributs (Entité-Association).
*   **Interface Intuitive** :
    *   Glisser-déposer (Drag & Drop) fluide.
    *   Édition rapide via une barre latérale complète.
*   **Import / Export** :
    *   Sauvegardez vos travaux au format JSON.
    *   Reprenez votre travail n'importe quand en réimportant le fichier.
*   **Export Image** : Téléchargez votre diagramme en haute qualité (PNG) pour vos rapports ou présentations.

## 🛠️ Stack Technique

Ce projet est construit avec des technologies web modernes :
*   [React](https://react.dev/) - Bibliothèque pour l'interface utilisateur.
*   [TypeScript](https://www.typescriptlang.org/) - Pour un code robuste et typé.
*   [Vite](https://vitejs.dev/) - Outil de build ultra-rapide.
*   [Tailwind CSS](https://tailwindcss.com/) - Pour le stylisme et le design responsive.
*   [Lucide React](https://lucide.dev/) - Pour les icônes.

## 🚀 Installation et Démarrage

Pour lancer le projet localement sur votre machine :

1.  **Cloner le dépôt** :
    ```bash
    git clone https://github.com/lucas-martinati/uml-studio.git
    cd uml-studio
    ```

2.  **Installer les dépendances** :
    ```bash
    npm install
    ```

3.  **Lancer le serveur de développement** :
    ```bash
    npm run dev
    ```
    L'application sera accessible à l'adresse indiquée dans le terminal (généralement `http://localhost:3000`).

## 📦 Build et Déploiement

Pour créer une version de production :

```bash
npm run build
```

Pour prévisualiser la production :

```bash
npm run preview
```

### Déploiement sur GitHub Pages

Le projet inclut un script de déploiement automatique :

```bash
npm run deploy
```

## 📝 Guide d'Utilisation Rapide

1.  **Ajouter une Entité** : Utilisez le bouton "Ajouter Entité" dans le menu de droite.
2.  **Créer une Relation** : Cliquez sur "Ajouter Relation", puis définissez les entités à relier et leurs cardinalités.
3.  **Modifier** : Cliquez sur n'importe quel élément (Entité ou Relation) pour l'éditer dans le panneau latéral.
4.  **Déplacer** : Glissez les éléments sur le canevas pour organiser votre diagramme.

---
## 📄 Contexte

Ce projet a été réalisé en "vibe coding". Il a été développé avec l'assistance d'une Intelligence Artificielle.

## Atelier et sauvegarde locale

- Barre inférieure : annuler, rétablir, zoomer et centrer sur le contenu visible.
- Double-clic dans le vide : créer une entité. Shift + glisser : créer une relation.
- Ctrl / ⌘ + clic : sélection multiple. Glisser dans le vide : sélection rectangulaire.
- Clic droit + glisser : déplacer la vue, même en commençant sur un élément.
- Molette : déplacer la vue. Ctrl + molette : zoomer autour du pointeur.
- Suppr : supprimer la sélection (hors champs de saisie).
- Ctrl / ⌘ + Z : annuler ; Ctrl / ⌘ + Shift + Z : rétablir.

Les modifications sont enregistrées automatiquement sur cet appareil, pour cette adresse du site.
L’export JSON reste conseillé pour conserver une copie et changer de navigateur.
Les imports invalides sont rejetés sans remplacer le diagramme courant.

L’export PNG et le recentrage utilisent la géométrie SVG réellement affichée : les anciennes
coordonnées des relations automatiques, la grille et le rectangle de sélection sont exclus.
Les textes sont incorporés avec leurs styles et l’image reste sur fond transparent.
Les très grands diagrammes sont exportés avec une résolution réduite pour limiter la mémoire.

Tailwind est compilé localement ; le site n’a plus besoin du CDN Tailwind.
Après une mise à jour des dépendances ou de la configuration PostCSS, redémarrer `npm run dev`.

## Vérifications

```bash
npm test
npm run typecheck
npm run build
```

Les tests couvrent la validation des imports et le cadrage SVG (zoom, déplacement,
boîtes d’attributs, éléments temporaires et zones invisibles).

Les imports et la réouverture de l’atelier sont automatiquement cadrés à l’écran sans modifier les coordonnées du projet. Les anciens attributs sans `isPk` restent compatibles ; `isPrimary` est reconnu et les métadonnées SQL sont conservées.
