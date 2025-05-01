import { createClient } from "@supabase/supabase-js"

// Environment variables are already available from the Supabase integration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for browser usage (limited permissions)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server operations (full permissions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Type definitions for our database tables
export type Movie = {
  id: string
  title: string
  description: string
  poster_url: string
  stream_link: string
  download_link: string
  screenshots: string[]
  created_at?: string
}

export type Series = {
  id: string
  title: string
  description: string
  poster_url: string
  created_at?: string
}

export type Episode = {
  id: string
  series_id: string
  season: number
  episode: number
  title: string
  stream_link: string
  download_link: string
  screenshots: string[]
  created_at?: string
}
