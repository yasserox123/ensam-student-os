'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'

export default function Home() {
  const router = useRouter()
  const { userId, isLoading } = useUser()

  useEffect(() => {
    if (!isLoading) {
      if (userId) {
        router.push('/dashboard')
      } else {
        router.push('/welcome')
      }
    }
  }, [userId, isLoading, router])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="animate-pulse">
        <div className="w-12 h-12 rounded-xl bg-brand/20 border border-brand/30" />
      </div>
    </div>
  )
}
