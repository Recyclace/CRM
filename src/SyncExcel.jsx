import { useState } from 'react'
import { supabase } from './supabaseClient'

function norm(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

const FILL_FIELDS = ['email', 'telephone', 'contact', 'departement', 'region']

export default function SyncExcel() {
  const [state, setState] = useState('idle') // idle | running | done | error
  const [msg, setMsg] = useState('')
  const [report, setReport] = useState(null)

  async function loadAllB2B() {
    let all = []
    let from = 0
    const PAGE = 1000
    while (true) {
      const { data, error } = await supabase
        .from('prospects')
        .select('id, nom, statut, email, telephone, contact, departement, region, fft_engage, lead_chaud, stand_by')
        .eq('segment', 'B2B')
        .range(from, from + PAGE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      all = all.concat(data)
      from += data.length
      if (data.length < PAGE) break
    }
    return all
  }

  async function run() {
    if (!window.confirm('Synchroniser le CRM avec le dernier Excel B2B ? Les statuts et champs vides seront mis à jour ; les attributions, cases cochées, actions et commentaires du CRM ne seront pas touchés.')) return
    setState('running'); setMsg('Chargement des données...'); setReport(null)
    try {
      const res = await fetch('/b2b_sync.json')
      if (!res.ok) throw new Error("Fichier b2b_sync.json introuvable (déploie l'app après l'avoir ajouté).")
      const records = await res.json()
      const existing = await loadAllB2B()
      const map = new Map()
      existing.forEach((p) => { map.set(norm(p.nom), p) })

      const updates = []
      const inserts = []
      let unmatchedLigues = 0
      const today = new Date().toISOString().slice(0, 10)

      for (const r of records) {
        const ex = map.get(norm(r.nom))
        if (ex) {
          const patch = {}
          if (r.statut && ex.statut !== r.statut) patch.statut = r.statut
          for (const f of FILL_FIELDS) {
            if ((ex[f] === null || ex[f] === undefined || ex[f] === '') && r[f]) patch[f] = r[f]
          }
          if (r.fft_engage === 'Oui' && ex.fft_engage !== 'Oui') patch.fft_engage = 'Oui'
          if (r.flag === 'lead_chaud' && !ex.lead_chaud) patch.lead_chaud = true
          if (r.flag === 'stand_by' && !ex.stand_by) patch.stand_by = true
          if (Object.keys(patch).length > 0) {
            patch.id = ex.id
            patch.derniere_maj = today
            updates.push(patch)
          }
        } else if (r.kind === 'club') {
          inserts.push({
            segment: 'B2B', type: r.type || 'Club de tennis', nom: r.nom, statut: r.statut,
            email: r.email || null, telephone: r.telephone || null, contact: r.contact || null,
            departement: r.departement || null, region: r.region || null,
            fft_engage: r.fft_engage || null,
            lead_chaud: r.flag === 'lead_chaud', stand_by: r.flag === 'stand_by',
            derniere_maj: today,
          })
        } else {
          unmatchedLigues++
        }
      }

      // Écritures par lots
      let doneU = 0, doneI = 0
      for (let i = 0; i < updates.length; i += 200) {
        const chunk = updates.slice(i, i + 200)
        const { error } = await supabase.from('prospects').upsert(chunk, { onConflict: 'id', defaultToNull: false })
        if (error) throw error
        doneU += chunk.length
        setMsg(`Mises à jour : ${doneU}/${updates.length}...`)
      }
      for (let i = 0; i < inserts.length; i += 300) {
        const chunk = inserts.slice(i, i + 300)
        const { error } = await supabase.from('prospects').insert(chunk)
        if (error) throw error
        doneI += chunk.length
        setMsg(`Ajouts : ${doneI}/${inserts.length}...`)
      }

      setReport({ total: records.length, updated: updates.length, inserted: inserts.length, unmatchedLigues })
      setState('done'); setMsg('')
    } catch (e) {
      setMsg(e.message || String(e)); setState('error')
    }
  }

  return (
    <div className="sync-excel">
      <hr className="settings-sep" />
      <h3 className="settings-subtitle">Synchronisation depuis l'Excel B2B</h3>
      <p className="hint">Met à jour les statuts et complète les champs vides à partir du dernier fichier Excel, sans écraser tes attributions, cases, actions et commentaires.</p>
      <button className="btn-primary" onClick={run} disabled={state === 'running'}>
        {state === 'running' ? 'Synchronisation...' : 'Synchroniser depuis l\'Excel'}
      </button>
      {msg && <p className={state === 'error' ? 'error' : 'hint'} style={{ marginTop: 8 }}>{msg}</p>}
      {report && (
        <p className="success-msg" style={{ marginTop: 8 }}>
          Terminé — {report.updated} ligne(s) mise(s) à jour, {report.inserted} ajoutée(s)
          {report.unmatchedLigues ? `, ${report.unmatchedLigues} ligue(s) non retrouvée(s)` : ''}. Recharge la page pour voir les changements.
        </p>
      )}
    </div>
  )
}
