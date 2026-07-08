import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://efugddifeqyvhbrtefid.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdWdkZGlmZXF5dmhicnRlZmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTk1MzksImV4cCI6MjA5ODM3NTUzOX0.8A93mgkt0uHQZCjC65tMNzeYrZRHvKKcQmMoG4XmNJI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
