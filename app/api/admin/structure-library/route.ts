/**
 * GET /api/admin/structure-library
 * Returns all 8 pre-built structure definitions for admin inspection.
 */

import { NextResponse } from 'next/server'
import { getStructureLibrary } from '@/lib/engines/structure-library'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

export async function GET() {
  if (!await isCurrentUserAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ structures: getStructureLibrary() })
}
