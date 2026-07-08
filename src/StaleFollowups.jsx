import ActionCell from './ActionCell'
import ExportButton from './ExportButton'

function daysAgo(dateStr) {
  if (!dateStr) return Infinity
  const d = new Date(dateStr)
  return Math.floor((Date.now() - d.getTime()) / (1000 * 3600 * 24))
}

export default function StaleFollowups({ prospects, onOpen, onLocalUpdate }) {
  const stale = prospects
    .filter((p) => p.statut === 'Mail envoyé' && daysAgo(p.derniere_maj) > 14)
    .sort((a, b) => daysAgo(b.derniere_maj) - daysAgo(a.derniere_maj))

  return (
    <div className="prospects-table-wrap">
      <div className="filters-bar">
        <div className="filters-row-2">
          <div className="count-info">
            {stale.length} prospect(s) en "Mail envoyé" depuis plus de 14 jours sans mise à jour
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
                <td className="cell-action"><ActionCell prospect={p} onUpdated={onLocalUpdate} /></td>
              </tr>
            ))}
            {stale.length === 0 && (
              <tr><td colSpan={7} className="empty-row">Rien à relancer pour l'instant.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
