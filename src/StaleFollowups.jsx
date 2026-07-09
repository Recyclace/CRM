import { useMemo } from 'react'
import ActionCell from './ActionCell'
import ExportButton from './ExportButton'
import CopyEmailsButton from './CopyEmailsButton'
import MultiSelectDropdown from './MultiSelectDropdown'
import { daysAgo, formatMulti } from './constants'

function ageClass(days) {
  if (days > 30) return 'age-red'
  if (days > 20) return 'age-orange'
  return 'age-ocre'
}

export default function StaleFollowups({ prospects, onOpen, onLocalUpdate, filters, setFilters }) {
  function set(field, value) {
    setFilters((f) => {
      const next = { ...f, [field]: value }
      if (field === 'region') next.departement = []
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
      if (filters.region.length && !filters.region.includes(p.region)) return
      set.add(p.departement)
    })
    return Array.from(set).sort()
  }, [staleAll, filters.region])

  const stale = useMemo(() => {
    const s = filters.search.trim().toLowerCase()
    return staleAll
      .filter((p) => {
        if (filters.segment.length && !filters.segment.includes(p.segment)) return false
        if (filters.region.length && !filters.region.includes(p.region)) return false
        if (filters.departement.length && !filters.departement.includes(p.departement)) return false
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
          <MultiSelectDropdown label="Segment" options={['B2B', 'B2B2C']} selected={filters.segment} onChange={(v) => set('segment', v)} />
          <MultiSelectDropdown label="Région" options={regions} selected={filters.region} onChange={(v) => set('region', v)} />
          <MultiSelectDropdown label="Département" options={departements} selected={filters.departement} onChange={(v) => set('departement', v)} />
        </div>
        <div className="filters-row-2">
          <div className="count-info">
            {stale.length} proposition(s) commerciale(s) envoyée(s) depuis plus de 14 jours sans mise à jour
          </div>
          <div className="filters-row-2-actions">
            <CopyEmailsButton rows={stale} />
            <ExportButton rows={stale} filename="relances-en-retard.xlsx" />
          </div>
        </div>
        <div className="legend-row">
          <span className="legend-dot age-ocre"></span> 14 à 20 jours
          <span className="legend-dot age-orange"></span> 20 à 30 jours
          <span className="legend-dot age-red"></span> plus de 30 jours
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
              <tr key={p.id} className={ageClass(daysAgo(p.derniere_maj))}>
                <td className="cell-nom" onClick={() => onOpen(p)}>{p.nom}</td>
                <td>{p.segment}</td>
                <td>{p.type}</td>
                <td><strong>{daysAgo(p.derniere_maj)} j</strong></td>
                <td>{formatMulti(p.telephone)}</td>
                <td>{formatMulti(p.email)}</td>
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
