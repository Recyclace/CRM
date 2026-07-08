# CRM Recycl'ace

## v4 — corrections et ajustements

- **Bug B2B2C corrigé** : le chargement des données s'arrêtait trop tôt dans certains cas (pagination fragile). Il est maintenant basé sur le nombre réel de lignes en base, avec un message d'alerte si un chargement est incomplet.
- **Colonnes réorganisées** : Nom, Statut, Assigné à, Dernière MAJ, Téléphone, Mail, Département, Région, Action, puis Lead chaud / Stand by / FFT Engagé à la fin, et un bouton "Fiche" pour ouvrir la fiche client complète (contact, ville, site web, groupe, historique...).
- **Tri alphabétique** : les noms commençant par un chiffre passent à la fin.
- **100 lignes par page** (au lieu de 40) pour voir plus de résultats d'un coup.
- **Régions et départements nettoyés** : toutes les variantes d'écriture unifiées (ex. "Haut de France" / "Hauts-de-France" → une seule valeur), départements numériques remplacés par leur nom, région déduite du département quand elle manquait. Départements manquants complétés quand la ville permettait de le déduire (grandes villes reconnues) : 393 → 272 lignes restantes sans département (aucune info exploitable dans le fichier source pour celles-ci).
- **Lead chaud / Stand by précochés** automatiquement pour les lignes dont l'ancien statut Excel était explicitement "Lead chaud" ou "Stand by".
- **Nouvelle colonne "Assigné à"** (Pierre / Iouri / Aurélie), filtrable, éditable directement dans le tableau et dans la fiche client.
- **Onglet Kanban** de retour, simplifié : Propale envoyée / Devis envoyé / Lead chaud / Stand by (une même fiche peut apparaître dans plusieurs colonnes).
- **Onglet Relances en retard** : critère changé pour "Propale envoyée" (proposition commerciale) de plus de 14 jours sans mise à jour, avec filtres région / département / B2B ou B2B2C / recherche libre.
- **Dashboard** : les prospects listés dans les pipes (leads chauds, devis envoyés, stand by) sont cliquables et ouvrent directement la fiche client.

### Reste à savoir
- ~272 lignes sans département identifiable (pas de ville exploitable dans les données sources) — à compléter manuellement si besoin.
- L'enrichissement Tenup (emails/téléphones manquants) est toujours en attente, sur demande.

## Redéployer

1. `npm install`
2. `npx vercel --prod` (depuis ce dossier)

## Comptes

- recyclace@gmail.com
- iouri.dadhemar@recyclace.com

Mot de passe changeable dans Paramètres. Pour ajouter quelqu'un (@recyclace.com), donne l'email à Claude.
