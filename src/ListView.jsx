import { useState } from 'react'
import { STATUSES, STATUS_COLORS } from './constants'

const PAGE_SIZE = 50

export default function ListView({ prospects, onOpen, onStatusChange }) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(prospects.length / PAGE_SIZE))
  const start = page * PAGE_SIZE
  const rows = prospects.slice(start, start + PAGE_SIZE)

  return (
    <div className="list-view">
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Segment</th>
            <th>Type</th>
            <th>Région</th>
            <th>Contact</th>
            <th>Statut</th>
            <th>Dernière MAJ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className={p.doublon_potentiel || p.a_verifier ? 'flagged' : ''}>
              <td className="cell-nom" onClick={() => onOpen(p)}>{p.nom}</td>
              <td>{p.segment}</td>
              <td>{p.type}</td>
              <td>{p.region || p.ville || '—'}</td>
              <td>{p.contact || p.email || '—'}</td>
              <td>
                <select
                  value={p.statut}
                  style={{ borderColor: STATUS_COLORS[p.statut] }}
                  onChange={(e) => onStatusChange(p, e.target.value)}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td>{p.derniere_maj || '—'}</td>
              <td><button className="link-btn" onClick={() => onOpen(p)}>Ouvrir</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Précédent</button>
        <span>Page {page + 1} / {pageCount}</span>
        <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Suivant →</button>
      </div>
    </div>
  )
}
