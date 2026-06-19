import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createD1SupabaseFacade, shouldUseSupabase } from '@/lib/cloudflare/supabaseFacade'

/**
 * Service-role client — bypasses RLS entirely.
 * Use ONLY for trusted server-side writes (e.g. ES-DCS Dispatcher).
 * Never expose this client to user-facing code paths.
 */
export function createServiceClient(): SupabaseClient {
  if (!shouldUseSupabase()) {
    return createD1SupabaseFacade() as unknown as SupabaseClient
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  if (!shouldUseSupabase()) {
    return createD1SupabaseFacade(cookieStore) as unknown as SupabaseClient
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - cookies can only be set in Server Actions or Route Handlers
          }
        },
      },
    }
  )
}
