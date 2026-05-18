import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

export const metadata = { title: 'Sign In · TTLike' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-violet-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 mb-2">
            <Zap className="h-7 w-7 text-pink-500" />
            TTLike
          </Link>
          <p className="text-gray-600 text-sm mt-2">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <Suspense fallback={<div className="h-48 animate-pulse bg-gray-50 rounded-lg" />}>
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-pink-500 font-medium hover:text-pink-600">
              Sign up free
            </Link>
          </p>

          <p className="mt-2 text-center text-sm text-gray-600">
            <Link href="/auth/reset-password" className="text-gray-500 hover:text-gray-700 underline underline-offset-2">
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
