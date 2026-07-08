import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import FiltersBar from './FiltersBar'
import Kanban from './Kanban'
import ListView from './ListView'
import EditModal from './EditModal'
import ImportBanner from './ImportBanner'
import Settings from './Settings'
import './App.css'

const PAGE_FETCH = 1000

export default function App() {
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('kanban')
  const [selected, setSelected] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [filters, setFilters] = useState({ segment: '', type: '', region: '', search: '', onlyFlagged: false })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCheckingSession(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    let all = []
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .range(from, from + PAGE_FETCH - 1)
        .order('nom', { ascending: true })
      if (error) { console.error(error); break }
      all = all.concat(data)
      if (data.length < PAGE_FETCH) break
      from += PAGE_FETCH
    }
    setProspects(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (session) fetchAll()
  }, [session, fetchAll])

  const regions = useMemo(() => {
    const set = new Set()
    prospects.forEach((p) => { if (p.region) set.add(p.region) })
    return Array.from(set).sort()
  }, [prospects])

  const filtered = useMemo(() => {
    const s = filters.search.trim().toLowerCase()
    return prospects.filter((p) => {
      if (filters.segment && p.segment !== filters.segment) return false
      if (filters.type && p.type !== filters.type) return false
      if (filters.region && p.region !== filters.region) return false
      if (filters.onlyFlagged && !p.doublon_potentiel && !p.a_verifier) return false
      if (s) {
        const hay = [p.nom, p.contact, p.email, p.ville, p.region].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [prospects, filters])

  async function handleStatusChange(prospect, newStatus) {
    setProspects((prev) => prev.map((p) => (p.id === prospect.id ? { ...p, statut: newStatus } : p)))
    const { error } = await supabase
      .from('prospects')
      .update({ statut: newStatus, derniere_maj: new Date().toISOString().slice(0, 10) })
      .eq('id', prospect.id)
    if (error) console.error(error)
  }

  function handleSaved(updated) {
    setProspects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelected(null)
  }

  if (checkingSession) return <div className="loading-screen">Chargement...</div>
  if (!session) return <Login />

  let mainContent
  if (!loading && prospects.length === 0) {
    mainContent = <ImportBanner onDone={fetchAll} />
  } else if (view === 'kanban') {
    mainContent = <Kanban prospects={filtered} onOpen={setSelected} onStatusChange={handleStatusChange} />
  } else {
    mainContent = <ListView prospects={filtered} onOpen={setSelected} onStatusChange={handleStatusChange} />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src="/logo-recyclace-blanc.png" alt="Recycl'ace" className="header-logo" />
        <h1>CRM</h1>
        {loading && <span className="loading-pill">Chargement des données...</span>}
      </header>
      <FiltersBar
        filters={filters}
        setFilters={setFilters}
        regions={regions}
        view={view}
        setView={setView}
        total={prospects.length}
        filteredCount={filtered.length}
        userEmail={session.user.email}
        onLogout={() => supabase.auth.signOut()}
        onSettings={() => setShowSettings(true)}
      />
      <main className="app-main">
        {mainContent}
      </main>
      {selected && (
        <EditModal prospect={selected} onClose={() => setSelected(null)} onSaved={handleSaved} />
      )}
      {showSettings && (
        <Settings userEmail={session.user.email} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
