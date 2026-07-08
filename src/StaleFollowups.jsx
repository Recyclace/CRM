import { useMemo, useState } from 'react'
import ActionCell from './ActionCell'
import ExportButton from './ExportButton'

function daysAgo(dateStr) {
  if (!dateStr) return Infinity
  const d = new Date(dateStr)
  return Math.floor((Date.now() - d.getTime()) / (1000 * 3600 * 24))
}

export default function StaleFollowups({ prospects, onOpen, onLocalUpdate }) {
  const [filters, setFilters] = useState({ search: '', segment: '', region: '', departement: '' })

  function set(field, value) {
    setFilters((f) => {
      const next = { ...f, [field]: value }
      if (field === 'region') next.departement = ''
      return next
    })
  }

  const staleAll = useMemo(() => (
    prospects.filter((p) => p.statut === 'Propale envoyée' && daysAgo(p.derniere_maj) > 14)
  ), [prospects])

  const regions = useMemo(() => {
    const set = new Set()
    staleAll.forEach((p) => { if (p.region) set.add(p.region) })
    return Array.from(set).sort()
  }, [staleAll])

  const departements = useMemo(() => {
    const set = new Set()
    staleAll.forEach((p) => {
      if (!p.departement) return
      if (filters.region && p.region !== filters.region) return
      set.add(p.departement)
    })
    return Array.from(set).sort()
  }, [staleAll, filters.region])

  const stale = useMemo(() => {
    const s = filters.search.trim().toLowerCase()
    return staleAll
      .filter((p) => {
        if (filters.segment && p.segment !== filters.segment) return false
        if (filters.region && p.region !== filters.region) return false
        if (filters.departement && p.departement !== filters.departement) return false
        if (s) {
          const hay = [p.nom, p.contact, p.email, p.ville, p.region].filter(Boolean).join(' ').toLowerCase()
          if (!hay.includes(s)) return false
        }
        return true
      })
      .sort((a, b) => daysAgo(b.derniere_maj) - daysAgo(a.derniere_maj))
  }, [staleAll, filters])

  return (
    <div className="prospects-table-wrap">
      <div className="filters-bar">
        <div className="filters-row">
          <input className="search" type="text" placeholder="Rechercher (nom, contact, email, ville...)"
            value={filters.search} onChange={(e) => set('search', e.target.value)} />
          <select value={filters.segment} onChange={(e) => set('segment', e.target.value)}>
            <option value="">B2B et B2B2C</option>
            <option value="B2B">B2B</option>
            <option value="B2B2C">B2B2C</option>
          </select>
          <select value={filters.region} onChange={(e) => set('region', e.target.value)}>
            <option value="">Toutes régions</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filters.departement} onChange={(e) => set('departement', e.target.value)}>
            <option value="">Tous départements</option>
            {departements.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="filters-row-2">
          <div className="count-info">
            {stale.length} propale(s) envoyée(s) depuis plus de 14 jours sans mise à jour
          </div>
          <ExportButton rows={stale} filename="relances-en-retard.xlsx" />
        </div>
      </div>
      <div className="list-view">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Segment</th>
              <th>Type</th>
              <th>Jours sans MAJ</th>
              <th>Téléphone</th>
              <th>Mail</th>
              <th>Région</th>
              <th>Action / Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {stale.map((p) => (
              <tr key={p.id} className="flagged">
                <td className="cell-nom" onClick={() => onOpen(p)}>{p.nom}</td>
                <td>{p.segment}</td>
                <td>{p.type}</td>
                <td><strong>{daysAgo(p.derniere_maj)} j</strong></td>
                <td>{p.telephone || '—'}</td>
                <td>{p.email || '—'}</td>
                <td>{p.region || '—'}</td>
                <td className="cell-action"><ActionCell prospect={p} onUpdated={onLocalUpdate} /></td>
              </tr>
            ))}
            {stale.length === 0 && (
              <tr><td colSpan={8} className="empty-row">Rien à relancer pour l'instant.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
