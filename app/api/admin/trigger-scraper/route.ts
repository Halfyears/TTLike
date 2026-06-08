import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const WORKFLOW_FILE = 'fetch_tiktok.yml'
const REPO          = 'Halfyears/TTLike'

export async function POST() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let isAdmin = user.email === process.env.ADMIN_EMAIL
  try {
    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (dbUser) isAdmin = dbUser.role === 'ADMIN'
  } catch { /* DB not connected — fall back to env check */ }

  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── GH_TOKEN guard ────────────────────────────────────────────────────────
  const token = process.env.GH_TOKEN
  if (!token) {
    return NextResponse.json(
      {
        error: 'GH_TOKEN not configured.',
        hint:  'Add GH_TOKEN to Vercel environment variables. It needs "workflow" scope (classic PAT) or Actions:write (fine-grained PAT).',
      },
      { status: 503 }
    )
  }

  // ── Dispatch GitHub Actions workflow ──────────────────────────────────────
  const url = `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`

  let ghRes: Response
  try {
    ghRes = await fetch(url, {
      method:  'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:        'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    })
  } catch (e) {
    return NextResponse.json(
      { error: `Network error reaching GitHub API: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    )
  }

  // GitHub returns 204 No Content on success
  if (ghRes.status === 204) {
    return NextResponse.json({ success: true })
  }

  // ── Translate common GitHub error codes ───────────────────────────────────
  let body = ''
  try { body = await ghRes.text() } catch { /* ignore */ }

  const hints: Record<number, string> = {
    401: 'GH_TOKEN is invalid or expired. Generate a new token with "workflow" scope at github.com/settings/tokens.',
    403: 'GH_TOKEN lacks permissions. Ensure it has "workflow" scope (classic) or Actions:write (fine-grained).',
    404: `Workflow file "${WORKFLOW_FILE}" not found in ${REPO}, or the repo is private and the token has no access.`,
    422: 'Workflow dispatch rejected — check that the workflow has a "workflow_dispatch" trigger and the "main" branch exists.',
  }

  const hint = hints[ghRes.status] ?? null

  return NextResponse.json(
    {
      error: `GitHub API returned ${ghRes.status}`,
      detail: body.slice(0, 300),
      ...(hint ? { hint } : {}),
    },
    { status: 502 }
  )
}
