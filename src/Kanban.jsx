import { useMemo, useState } from 'react'
import {
  DndContext, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { STATUSES, STATUS_COLORS } from './constants'

const MAX_PER_COLUMN = 80

function Card({ p, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: p.id })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50, opacity: isDragging ? 0.5 : 1 }
    : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="kanban-card"
      onClick={() => onOpen(p)}
    >
      <div className="kc-title">{p.nom}</div>
      <div className="kc-meta">
        <span className="tag small">{p.segment}</span>
        <span className="tag small">{p.type}</span>
      </div>
      {(p.region || p.ville) && <div className="kc-sub">{[p.ville, p.region].filter(Boolean).join(' · ')}</div>}
      {p.derniere_maj && <div className="kc-date">MAJ : {p.derniere_maj}</div>}
    </div>
  )
}

function Column({ status, items, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const shown = items.slice(0, MAX_PER_COLUMN)
  const hiddenCount = items.length - shown.length
  return (
    <div ref={setNodeRef} className={`kanban-col ${isOver ? 'over' : ''}`}>
      <div className="kanban-col-header" style={{ borderColor: STATUS_COLORS[status] }}>
        <span>{status}</span>
        <span className="col-count">{items.length}</span>
      </div>
      <div className="kanban-col-body">
        {shown.map((p) => <Card key={p.id} p={p} onOpen={onOpen} />)}
        {hiddenCount > 0 && (
          <div className="more-hint">+ {hiddenCount} autres — affine les filtres pour les voir</div>
        )}
      </div>
    </div>
  )
}

export default function Kanban({ prospects, onOpen, onStatusChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [activeId, setActiveId] = useState(null)

  const byStatus = useMemo(() => {
    const map = {}
    STATUSES.forEach((s) => { map[s] = [] })
    for (const p of prospects) {
      if (map[p.statut]) map[p.statut].push(p)
      else map['À contacter'].push(p)
    }
    return map
  }, [prospects])

  const activeProspect = activeId ? prospects.find((p) => p.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(e.active.id)}
      onDragEnd={(e) => {
        setActiveId(null)
        const { active, over } = e
        if (over && STATUSES.includes(over.id)) {
          const p = prospects.find((pp) => pp.id === active.id)
          if (p && p.statut !== over.id) onStatusChange(p, over.id)
        }
      }}
    >
      <div className="kanban-board">
        {STATUSES.map((s) => (
          <Column key={s} status={s} items={byStatus[s]} onOpen={onOpen} />
        ))}
      </div>
      <DragOverlay>
        {activeProspect ? (
          <div className="kanban-card dragging">
            <div className="kc-title">{activeProspect.nom}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
