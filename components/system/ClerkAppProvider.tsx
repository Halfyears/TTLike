import { ClerkProvider } from '@clerk/nextjs'

/**
 * Clerk is only used for the Cloudflare/D1 auth path (Google login bridge).
 * On Vercel/Supabase, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is unset, so this
 * renders children directly — zero impact on the existing Supabase auth flow.
 */
export function ClerkAppProvider({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>
  }
  return <ClerkProvider>{children}</ClerkProvider>
}
