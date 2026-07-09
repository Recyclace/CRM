import { useEffect, useRef, useState } from 'react'

export default function MultiSelectDropdown({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(value) {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value))
    else onChange([...selected, value])
  }

  const summary = selected.length === 0 ? label : `${label} (${selected.length})`

  return (
    <div className="multiselect" ref={ref}>
      <button type="button" className={`multiselect-btn ${selected.length ? 'active' : ''}`} onClick={() => setOpen((o) => !o)}>
        {summary} ▾
      </button>
      {open && (
        <div className="multiselect-panel">
          <div className="multiselect-actions">
            <button type="button" onClick={() => onChange(options.slice())}>Tout</button>
            <button type="button" onClick={() => onChange([])}>Aucun</button>
          </div>
          <div className="multiselect-list">
            {options.map((opt) => (
              <label key={opt} className="multiselect-item">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
                {opt}
              </label>
            ))}
            {options.length === 0 && <div className="multiselect-empty">Aucune option</div>}
          </div>
        </div>
      )}
    </div>
  )
}
