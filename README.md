# CRM Recycl'ace

Application web (React + Vite + Supabase) pour le suivi commercial B2B / B2B2C.

## Mise à jour (v2)

- Connexion par email + mot de passe (fini le lien magique, peu fiable).
- Page Paramètres pour changer son mot de passe.
- Charte graphique Recycl'ace appliquée (couleurs, police Poppins, logos).
- Seules les adresses @recyclace.com sont autorisées (+ exception recyclace@gmail.com pour Pierre).
- Les comptes ne peuvent PAS être créés depuis l'appli (pas d'auto-inscription) : c'est Claude/toi qui les crée via Supabase, sur demande. Volontaire, pour garder le contrôle sur qui a accès.

## Redéployer

1. `npm install`
2. `npx vercel --prod` (depuis ce dossier)

Aucune variable d'environnement à configurer.

## Comptes actuels

- recyclace@gmail.com — mot de passe temporaire fourni par Claude, à changer dans Paramètres après la première connexion.
- (2e compte à créer — donne l'email @recyclace.com à Claude)

## Ajouter un nouvel utilisateur

Donne l'email (@recyclace.com) à Claude, qui l'ajoute côté Supabase et crée un compte avec un mot de passe temporaire. La personne le change ensuite elle-même dans Paramètres.

## Import des données

Au premier login (une seule fois), si la base est vide, un bouton "Importer les données initiales" apparaît : il charge les 7 650 prospects issus des fichiers Excel B2B / B2B2C.

## Fonctionnalités

- Vue Kanban : glisser-déposer les prospects entre les 7 statuts.
- Vue Liste : recherche + filtres (segment, type, région) + édition inline du statut.
- Fiche prospect : édition complète, ajout de notes datées, historique conservé.
- Tous les utilisateurs autorisés ont le même niveau d'accès (lecture/écriture complète).
