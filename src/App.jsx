import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import ProspectsTable from './ProspectsTable'
import Dashboard from './Dashboard'
import StaleFollowups from './StaleFollowups'
import EditModal from './EditModal'
import ImportBanner from './ImportBanner'
import Settings from './Settings'
import { TYPES_B2B, TYPES_B2B2C } from './constants'
import './App.css'

const PAGE_FETCH = 1000

export default function App() {
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const [selected, setSelected] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const channelRef = useRef(null)

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

  // Realtime: reflect changes made from other accounts instantly
  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel('prospects-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prospects' }, (payload) => {
        setProspects((prev) => {
          if (payload.eventType === 'DELETE') {
            return prev.filter((p) => p.id !== payload.old.id)
          }
          const exists = prev.some((p) => p.id === payload.new.id)
          if (exists) return prev.map((p) => (p.id === payload.new.id ? payload.new : p))
          return [...prev, payload.new]
        })
      })
      .subscribe()
    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [session])

  function handleLocalUpdate(updated) {
    setProspects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  function handleSaved(updated) {
    handleLocalUpdate(updated)
    setSelected(null)
  }

  const b2bProspects = useMemo(() => prospects.filter((p) => p.segment === 'B2B'), [prospects])
  const b2b2cProspects = useMemo(() => prospects.filter((p) => p.segment === 'B2B2C'), [prospects])

  if (checkingSession) return <div className="loading-screen">Chargement...</div>
  if (!session) return <Login />

  let mainContent
  if (!loading && prospects.length === 0) {
    mainContent = <ImportBanner onDone={fetchAll} />
  } else if (tab === 'dashboard') {
    mainContent = <Dashboard prospects={prospects} />
  } else if (tab === 'b2b') {
    mainContent = <ProspectsTable prospects={b2bProspects} types={TYPES_B2B} segmentLabel="B2B" onOpen={setSelected} onLocalUpdate={handleLocalUpdate} />
  } else if (tab === 'b2b2c') {
    mainContent = <ProspectsTable prospects={b2b2cProspects} types={TYPES_B2B2C} segmentLabel="B2B2C" onOpen={setSelected} onLocalUpdate={handleLocalUpdate} />
  } else if (tab === 'relances') {
    mainContent = <StaleFollowups prospects={prospects} onOpen={setSelected} onLocalUpdate={handleLocalUpdate} />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src="/logo-recyclace-blanc.png" alt="Recycl'ace" className="header-logo" />
        <h1>CRM</h1>
        <nav className="tab-nav">
          <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Dashboard</button>
          <button className={tab === 'b2b' ? 'active' : ''} onClick={() => setTab('b2b')}>B2B</button>
          <button className={tab === 'b2b2c' ? 'active' : ''} onClick={() => setTab('b2b2c')}>B2B2C</button>
          <button className={tab === 'relances' ? 'active' : ''} onClick={() => setTab('relances')}>Relances en retard</button>
        </nav>
        {loading && <span className="loading-pill">Chargement...</span>}
        <div className="user-info header-user">
          {session.user.email} · <button className="link-btn" onClick={() => setShowSettings(true)}>Paramètres</button> · <button className="link-btn" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
        </div>
      </header>
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
