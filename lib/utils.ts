import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number | bigint): string {
  const num = typeof n === 'bigint' ? Number(n) : n
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').trim()
}

export function truncate(text: string, length: number): string {
  return text.length <= length ? text : `${text.slice(0, length)}...`
}

export function getViralScoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Viral', color: 'text-red-500' }
  if (score >= 70) return { label: 'Hot', color: 'text-orange-500' }
  if (score >= 50) return { label: 'Rising', color: 'text-yellow-500' }
  return { label: 'Normal', color: 'text-gray-500' }
}
