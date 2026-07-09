# CRM Recycl'ace

Application CRM (React + Vite) avec stockage **Supabase**, prête à déployer sur **Vercel**.

## Développement local

```bash
npm install
npm run dev
```

Les identifiants Supabase sont lus depuis un fichier `.env` (déjà présent en local, non versionné). Pour repartir de zéro, copie `.env.example` en `.env` et renseigne `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API).

## Mise sur GitHub

> ⚠️ `node_modules` (6 700+ fichiers) et `.env` ne doivent jamais être versionnés — c'est déjà géré par `.gitignore`. S'ils sont apparus sur GitHub, c'est qu'aucun dépôt git ne filtrait l'upload.

Le plus simple avec **GitHub Desktop** (respecte automatiquement `.gitignore`) :

1. **File → Add local repository** → sélectionne le dossier `crm-app`.
2. **Create a repository**, puis **Publish repository**.

En ligne de commande :

```bash
cd crm-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<ton-compte>/crm-recyclace.git
git push -u origin main
```

## Déploiement sur Vercel

1. [vercel.com](https://vercel.com) → **Add New… → Project** → importe le dépôt GitHub.
2. Vercel détecte **Vite** automatiquement (build `npm run build`, sortie `dist`).
3. Dans **Environment Variables**, ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (mêmes valeurs que ton `.env`).
4. **Deploy**. Chaque `git push` sur `main` redéploie automatiquement.

## Supabase — à vérifier

- La clé `anon` est publique par nature ; la sécurité repose sur les **Row Level Security (RLS)**. Vérifie que RLS est **activé** sur la table `prospects`.
- Dans **Authentication → URL Configuration**, ajoute l'URL Vercel aux **Redirect URLs** pour que la connexion par e-mail fonctionne en production.

## Supprimer un dossier `.git` cassé (si besoin)

Un `.git` partiel a pu être créé et ne peut pas être nettoyé automatiquement. Sous Windows, PowerShell :

```powershell
Remove-Item -Recurse -Force "C:\Users\iouri\OneDrive\Desktop\00_Claude CRM\crm-app\.git"
```

Puis reprends la section « Mise sur GitHub ».

---

# Journal des versions

## v7 — ergonomie tableaux, nouveaux champs, données enrichies

- **Filtres en menu déroulant à cases à cocher** conservés, avec une barre de recherche réduite pour laisser plus de place aux filtres.
- **Case "Lead chaud/Stand by" éclatée en 3 cases indépendantes** (Lead chaud ou Lead intéressé en B2B2C, Stand by, FFT engagé en B2B) + une nouvelle case **"Important"** avec les mêmes propriétés (filtrable en haut, cochable par ligne, éditable aussi dans la fiche client).
- **Nouvelle colonne "Action"** : liste déroulante avec 4 choix (Appel, Mail, Propale à faire, A rencontrer), éditable directement dans le tableau et dans la fiche client — distincte de la colonne "Action / Commentaire" qui reste l'historique texte.
- **Tableaux repensés pour tenir sans scroll horizontal** : largeurs de colonnes fixes, noms de clubs limités à 2 lignes, texte qui passe à la ligne au lieu de déborder.
- **En-têtes de colonnes fixes (sticky)** : les noms de colonnes restent visibles en scrollant vers le bas.
- **"Dernière MAJ" renommé "MAJ"** partout (tableaux et export Excel).
- **Relances en retard** : ajout d'une colonne Département.
- **Téléphones/mails multiples** affichés sur une ligne séparés par "/".
- **Données enrichies** : 470 adresses mail détectées dans les commentaires et ajoutées à la colonne mail (sans écraser les mails déjà présents) — 479 lignes ont maintenant plusieurs mails.
- **Statuts** : "Facturé" fusionné dans "Devis signé" (12 lignes), nouveau statut "Sans retour" (ligne grise) ajouté.
- **38 clubs "tennis padel"** reclassés de "Club de padel" à "Club de tennis" (hors boutique B2B2C homonyme, laissée en Magasin spécialisé).
- **Dashboard** : graphique mensuel démarre maintenant en janvier 2026 (au lieu d'une fenêtre glissante de 12 mois), filtres Région + Segment multi-sélection.
- **Synthèse hebdomadaire** : recentrée sur des totaux globaux (le détail par utilisateur a été retiré), basée sur une fenêtre glissante de 7 jours, historique des synthèses envoyées consultable directement dans la fenêtre. L'envoi automatique chaque vendredi 16h a été mis de côté pour l'instant (aucun connecteur mail ne permet un envoi 100% automatique sans compte tiers à créer) — le bouton d'envoi manuel reste disponible à tout moment.

### Correctif important
Un bug d'édition avait tronqué deux fichiers (App.jsx, ActionCell.jsx) causant une page blanche au chargement. Fichiers réécrits intégralement et vérifiés (plus aucune troncature ni caractère invisible) avant chaque livraison désormais.

## v6 — filtres à cases à cocher, statuts revus, synthèse hebdo globale

- **Filtres multi-sélection** : Type, Région, Département, Statut, Assigné à (et Segment dans Relances) sont maintenant des menus à cases à cocher — possibilité de cocher plusieurs valeurs en même temps.
- **Colonne "Fiche" retirée** : un clic sur le nom ouvre toujours la fiche client, donc la colonne redondante en fin de tableau a été supprimée pour gagner de la place.
- **Statuts revus** : "Facturé" a été retiré et fusionné dans "Devis signé" (12 lignes mises à jour). Nouveau statut "Sans retour" ajouté, affiché avec un fond gris léger dans le tableau.
- **Lignes Stand by** : fond bleu pastel pour les repérer d'un coup d'œil dans B2B/B2B2C.
- **Téléphones et mails multiples** : affichés séparés par "/" sur la même ligne (plus lisible que le retour à la ligne testé précédemment).
- **Action / Commentaire** : affiche maintenant les deux dernières entrées datées par défaut (au lieu d'une seule), avec possibilité de tout déplier.
- **Synthèse hebdomadaire simplifiée** : uniquement des totaux globaux (propales, mails, devis, actions, évolution vs semaine dernière, objectif 5 propales/jour) — le détail par utilisateur a été retiré à la demande de Pierre.

## v5 — filtres persistants, Dashboard KPIs, relances colorées, synthèse hebdo

- **Filtres persistants et indépendants** : les filtres B2B, B2B2C et Relances restent en mémoire tout au long de la session (ils ne se réinitialisent plus en changeant d'onglet), et modifier les filtres d'un onglet n'affecte pas les autres.
- **Tri par date** ajouté dans les listes déroulantes (Nom A-Z / Date la plus récente / Date la plus ancienne), en plus du filtre statut existant.
- **Colonne "Assigné à" déplacée en toute fin de tableau.**
- **Téléphones normalisés** au format "0X XX XX XX XX" partout, et téléphones/mails multiples affichés un par ligne dans le tableau.
- **Bouton "Copier les mails"** à côté de l'en-tête "Mail" (B2B, B2B2C et Relances) : copie tous les emails des lignes actuellement filtrées.
- **FFT Engagé devient une case à cocher** (B2B uniquement). **B2B2C** : la colonne FFT est remplacée par un lien cliquable vers le site web du magasin, et "Lead chaud" est renommé "Lead intéressé" dans ce contexte.
- **"À vérifier" supprimé** : ce champ ne servait plus à rien une fois le nettoyage des données terminé (l'historique du statut d'origine reste visible dans 