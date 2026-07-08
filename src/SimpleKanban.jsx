import { nameSort } from './constants'

const COLUMNS = [
  { key: 'propale', label: 'Propale envoyée', filter: (p) => p.statut === 'Propale envoyée' },
  { key: 'devis', label: 'Devis envoyé', filter: (p) => p.statut === 'Devis envoyé' },
  { key: 'chaud', label: 'Lead chaud', filter: (p) => p.lead_chaud },
  { key: 'standby', label: 'Stand by', filter: (p) => p.stand_by },
]

export default function SimpleKanban({ prospects, onOpen }) {
  return (
    <div className="kanban-board">
      {COLUMNS.map((col) => {
        const items = prospects.filter(col.filter).sort(nameSort)
        return (
          <div key={col.key} className="kanban-col">
            <div className="kanban-col-header">
              <span>{col.label}</span>
              <span className="col-count">{items.length}</span>
            </div>
            <div className="kanban-col-body">
              {items.slice(0, 100).map((p) => (
                <div key={p.id} className="kanban-card" onClick={() => onOpen(p)}>
                  <div className="kc-title">{p.nom}</div>
                  <div className="kc-meta">
                    <span className="tag small">{p.segment}</span>
                    <span className="tag small">{p.type}</span>
                  </div>
                  {(p.region) && <div className="kc-sub">{p.region}</div>}
                  <div className="kc-date">MAJ : {p.derniere_maj || '—'}</div>
                </div>
              ))}
              {items.length === 0 && <div className="more-hint">Rien ici pour l'instant.</div>}
              {items.length > 100 && <div className="more-hint">+ {items.length - 100} autres</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
