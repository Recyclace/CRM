# CRM Recycl'ace

Application web (React + Vite + Supabase) pour le suivi commercial B2B / B2B2C.

## Déploiement sur Vercel (toi-même)

1. Installe les dépendances :
   ```
   npm install
   ```
2. Connecte-toi à Vercel (si ce n'est pas déjà fait) :
   ```
   npx vercel login
   ```
3. Déploie :
   ```
   npx vercel --prod
   ```
   Accepte les options par défaut (le projet est un site Vite standard, Vercel le détecte automatiquement : build command `npm run build`, output `dist`).

Aucune variable d'environnement à configurer : la connexion à Supabase est déjà incluse dans le code (clé publique, sans risque).

## Première connexion

1. Ouvre l'URL Vercel donnée après le déploiement.
2. Connecte-toi avec l'email `recyclace@gmail.com` (déjà autorisé) — tu reçois un lien magique par mail, clique dessus.
3. Au premier chargement, la base est vide : clique sur "Importer les données initiales" (bouton affiché automatiquement) pour charger les 7 650 prospects issus de tes fichiers Excel. À faire une seule fois.

## Ajouter d'autres utilisateurs

Seuls les emails présents dans la table `allowed_emails` (Supabase) peuvent créer un compte. Pour en ajouter, exécute dans l'éditeur SQL Supabase (projet "Recyclace's Project") :
```sql
insert into public.allowed_emails(email) values ('email-collegue@exemple.com');
```
Dis-moi les emails à ajouter et je peux aussi le faire directement depuis ce chat.

## Fonctionnalités

- Vue Kanban : glisser-déposer les prospects entre les 7 statuts.
- Vue Liste : recherche + filtres (segment, type, région) + édition inline du statut.
- Fiche prospect : édition complète, ajout de notes datées, historique conservé.
- Tous les utilisateurs autorisés ont le même niveau d'accès (lecture/écriture complète).
