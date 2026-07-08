# CRM Recycl'ace

## v3 — mise à jour majeure

- **2 onglets séparés** : B2B (Ligues/Comités, Clubs de tennis, Clubs de padel) et B2B2C (Magasins spécialisés, Grande distribution = Décathlon/Intersport/Sport 2000 uniquement).
- **Dashboard** (remplace le Kanban) : KPIs clés, graphe mensuel (mails envoyés / propales envoyées / devis envoyés sur 12 mois), pipe des leads chauds, pipe des devis envoyés, pipe stand by.
- **Statut en bouton coloré** : gris = à contacter, jaune = mail envoyé/propale envoyée/devis envoyé, vert = devis signé/facturé, rouge = abandon.
- **Cases à cocher "Lead chaud" et "Stand by"** par ligne, remontées sur le Dashboard avec l'action en face.
- **Commentaire éditable en ligne** : ajoute une note directement dans le tableau (sans ouvrir la fiche), datée automatiquement, la "Dernière MAJ" se met à jour toute seule.
- **Filtres Région → Département** (dépendants), + type, statut, recherche libre.
- **Export Excel** des données filtrées, à tout moment (bouton "Exporter en Excel").
- **Temps réel** : toute modification faite par un compte est visible instantanément par les autres (Supabase Realtime).
- **Onglet "Relances en retard"** : liste automatiquement les prospects en "Mail envoyé" depuis plus de 14 jours sans mise à jour.

### Nettoyage des données effectué
- Reclassification : centres de padel → onglet B2B (comme des clubs). Clubs "tennis" vs "padel" détectés par le nom. Magasins "grande distribution" détectés par enseigne (Décathlon/Intersport/Sport 2000), le reste en "magasin spécialisé".
- Emails/téléphones qui étaient stockés par erreur dans le champ contact ont été déplacés dans les bonnes colonnes.
- Doublons (même nom) fusionnés : commentaires combinés, la ligne la plus à jour est conservée. 7650 → 7563 lignes.
- Région complétée pour les clubs à partir de la Ligue de rattachement, quand elle manquait.

### Non fait (à voir plus tard)
- Enrichissement via Tenup (mails/téléphones manquants) : mis de côté comme demandé, gros chantier à part.
- Département manquant sur ~986 lignes : pas de source fiable pour le déduire automatiquement (pas de code postal exploitable dans le fichier d'origine).
- Le graphe mensuel n'a un historique fiable qu'à partir d'aujourd'hui : pour les prospects déjà présents, seul le statut actuel est connu (pas d'historique des changements passés).

## Redéployer

1. `npm install`
2. `npx vercel --prod` (depuis ce dossier)

## Comptes

- recyclace@gmail.com
- iouri.dadhemar@recyclace.com

Mot de passe changeable dans Paramètres. Pour ajouter quelqu'un, donne l'email @recyclace.com à Claude.
