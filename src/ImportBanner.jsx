import { useState } from 'react'
import { supabase } from './supabaseClient'

const BATCH = 500

export default function ImportBanner({ onDone }) {
  const [status, setStatus] = useState('idle') // idle | running | error
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [err, setErr] = useState('')

  async function runImport() {
    setStatus('running')
    setErr('')
    try {
      const res = await fetch('/prospects_import.json')
      const data = await res.json()
      setTotal(data.length)
      for (let i = 0; i < data.length; i += BATCH) {
        const chunk = data.slice(i, i + BATCH)
        const { error } = await supabase.from('prospects').insert(chunk)
        if (error) throw error
        setProgress(i + chunk.length)
      }
      setStatus('idle')
      onDone()
    } catch (e) {
      setErr(e.message || String(e))
      setStatus('error')
    }
  }

  return (
    <div className="import-banner">
      <p>
        La base est vide. Importer les {total || '7 650'} prospects initiaux (issus des fichiers Excel B2B / B2B2C) ?
      </p>
      {status === 'running' ? (
        <p>Import en cours... {progress} / {total}</p>
      ) : (
        <button className="btn-primary" onClick={runImport}>Importer les données initiales</button>
      )}
      {err && <p className="error">Erreur : {err}</p>}
    </div>
  )
}
