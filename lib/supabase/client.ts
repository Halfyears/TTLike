'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // The committed .env file ships non-empty placeholder values for the
  // Cloudflare/D1 build (see root .env) — treat the known placeholder as
  // "not configured" rather than attempting a real Supabase client against it.
  const isPlaceholder = url === 'https://placeholder.supabase.co'

  if (!url || !anonKey || isPlaceholder) {
    const authUnavailable = {
      message: 'Supabase browser auth is disabled in the Cloudflare-only build.',
    }
    const queryResult = Promise.resolve({ data: null, error: authUnavailable, count: 0 })
    const queryBuilder = {
      select: () => queryBuilder,
      insert: () => queryBuilder,
      update: () => queryBuilder,
      upsert: () => queryBuilder,
      delete: () => queryBuilder,
      eq: () => queryBuilder,
      neq: () => queryBuilder,
      is: () => queryBuilder,
      in: () => queryBuilder,
      order: () => queryBuilder,
      limit: () => queryBuilder,
      range: () => queryBuilder,
      single: () => queryResult,
      maybeSingle: () => queryResult,
      then: queryResult.then.bind(queryResult),
    }

    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: authUnavailable }),
        signInWithOAuth: async () => ({ data: { provider: null, url: null }, error: authUnavailable }),
        signUp: async () => ({ data: { user: null, session: null }, error: authUnavailable }),
        resetPasswordForEmail: async () => ({ data: null, error: authUnavailable }),
        signOut: async () => ({ error: null }),
      },
      from: () => queryBuilder,
      storage: {
        from: () => ({
          getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
        }),
      },
    } as unknown as SupabaseClient
  }

  return createBrowserClient(
    url,
    anonKey
  )
}
