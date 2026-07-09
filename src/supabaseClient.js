import { createClient } from '@supabase/supabase-js'

// Les identifiants Supabase sont fournis via des variables d'environnement.
// - En local : fichier .env (voir .env.example) — non versionné.
// - Sur Vercel : Settings > Environment Variables.
// La clé "anon" est publique par nature (protégée par les Row Level Security
// de Supabase), il est donc normal qu'elle se retrouve dans le bundle client.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Configuration Supabase manquante. Définis VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY " +
    "(fichier .env en local, variables d'environnement sur Vercel)."
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
