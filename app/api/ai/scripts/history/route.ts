import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() ?? ''
    const niche  = searchParams.get('niche')?.trim() ?? ''
    const hook   = searchParams.get('hook')?.trim() ?? ''
    const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit  = 20
    const offset = (page - 1) * limit

    let query = supabase
      .from('generated_scripts')
      .select('id, product_name, niche, hook_type, script_count, keywords, brand_name, offer, created_at, scripts', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null)          // hide soft-deleted rows
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) query = query.ilike('product_name', `%${search}%`)
    if (niche)  query = query.eq('niche', niche)
    if (hook)   query = query.eq('hook_type', hook)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ items: data ?? [], total: count ?? 0, page, limit })
  } catch (err) {
    console.error('History fetch error:', err)
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Soft delete — sets deleted_at timestamp; row is never hard-deleted.
    // The script data remains in the system as a shared resource.
    const { error } = await supabase
      .from('generated_scripts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('History delete error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
