export const STATUSES = [
  "À contacter",
  "Mail envoyé",
  "Propale envoyée",
  "Devis envoyé",
  "Devis signé",
  "Sans retour",
  "Abandon",
]

// Feu tricolore demandé par Pierre : rouge = abandon, jaune = en cours, vert = gagné
export const STATUS_COLORS = {
  "À contacter": "#9AA0A6",
  "Mail envoyé": "#E0A800",
  "Propale envoyée": "#E0A800",
  "Devis envoyé": "#E0A800",
  "Devis signé": "#1F4A38",
  "Sans retour": "#B0B7BE",
  "Abandon": "#C0392B",
}

export const TYPES_B2B = ["Ligue / Comité", "Club de tennis", "Club de padel"]
export const TYPES_B2B2C = ["Magasin spécialisé", "Grande distribution"]
export const ASSIGNEES = ["Pierre", "Iouri", "Aurélie"]

// Tri alphabétique, les noms commençant par un chiffre passent à la fin
export function nameSort(a, b) {
  const an = (a.nom || '').trim()
  const bn = (b.nom || '').trim()
  const aDigit = /^[0-9]/.test(an)
  const bDigit = /^[0-9]/.test(bn)
  if (aDigit && !bDigit) return 1
  if (!aDigit && bDigit) return -1
  return an.localeCompare(bn, 'fr', { sensitivity: 'base' })
}

export function daysAgo(dateStr) {
  if (!dateStr) return Infinity
  const d = new Date(dateStr)
  return Math.floor((Date.now() - d.getTime()) / (1000 * 3600 * 24))
}

// Une propale est considérée comme "effectivement envoyée" si le statut le confirme,
// OU si le prospect est passé en Abandon mais que le commentaire mentionne une propale
// envoyée avant l'abandon (demande explicite de Pierre pour ne pas fausser le taux de conversion).
export function isPropaleEffective(p) {
  if (!p) return false
  if (["Propale envoyée", "Devis envoyé", "Devis signé"].includes(p.statut)) return true
  if (p.statut === "Abandon" && /propale/i.test(p.action_commentaire || "")) return true
  return false
}

export function sortByDate(a, b, dir) {
  const da = a.derniere_maj ? new Date(a.derniere_maj).getTime() : 0
  const db = b.derniere_maj ? new Date(b.derniere_maj).getTime() : 0
  return dir === 'asc' ? da - db : db - da
}

// Affiche plusieurs numéros/mails séparés par " / " plutôt qu'à la ligne (demande Pierre)
export function formatMulti(value) {
  if (!value) return '—'
  return value.split(/\n+/).map((v) => v.trim()).filter(Boolean).join(' / ')
}
