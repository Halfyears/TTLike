import Link from 'next/link'
import { Zap } from 'lucide-react'
import { SignupForm } from './SignupForm'

export const metadata = { title: 'Create Account · TTLike' }

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-violet-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Zap className="h-7 w-7 text-pink-500" />
            TTLike
          </Link>
          <p className="text-gray-600 text-sm mt-2">Create your free account</p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-pink-50 text-pink-600 text-xs font-medium px-3 py-1.5 rounded-full border border-pink-100">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse" />
            Beta: 100% free, no credit card
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <SignupForm />

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-pink-500 font-medium hover:text-pink-600">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
