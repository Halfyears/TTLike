import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  
  // 1. 安全清除 Supabase 的登录状态
  await supabase.auth.signOut()
  
  // 2. 干净地一键重定向回到登录页面
  return NextResponse.redirect(
    new URL('/auth/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
  )
}