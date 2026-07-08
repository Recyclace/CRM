export const STATUSES = [
  "À contacter",
  "Mail envoyé",
  "Propale envoyée",
  "Devis envoyé",
  "Devis signé",
  "Facturé",
  "Abandon",
]

// Feu tricolore demandé par Pierre : rouge = abandon, jaune = en cours, vert = gagné
export const STATUS_COLORS = {
  "À contacter": "#9AA0A6",
  "Mail envoyé": "#E0A800",
  "Propale envoyée": "#E0A800",
  "Devis envoyé": "#E0A800",
  "Devis signé": "#1F4A38",
  "Facturé": "#1F4A38",
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
