'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, User, ArrowRight } from 'lucide-react'
import { useUser } from '@/lib/hooks/useUser'

export default function WelcomePage() {
  const router = useRouter()
  const { saveUserId } = useUser()
  const [userId, setUserId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId.trim()) return
    
    setIsSubmitting(true)
    
    // Save userId and redirect
    saveUserId(userId.trim())
    
    // Small delay for smooth transition
    setTimeout(() => {
      router.push('/dashboard')
    }, 500)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shadow-lg shadow-brand/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">ENSAM OS</h1>
            <p className="text-sm text-text-tertiary">Student Dashboard</p>
          </div>
        </div>

        {/* Welcome Card */}
        <div className="bg-surface rounded-2xl p-6 border border-border shadow-2xl">
          <h2 className="text-xl font-bold text-text-primary mb-2">Welcome!</h2>
          <p className="text-text-tertiary text-sm mb-6">
            Enter your student ID to access your personalized dashboard. We'll sync your timetable automatically.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Student ID
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g., john.doe"
                  className="w-full bg-bg-secondary text-text-primary rounded-xl pl-12 pr-4 py-3
                           border border-border focus:border-brand focus:outline-none
                           placeholder:text-text-muted transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!userId.trim() || isSubmitting}
              className={`
                w-full flex items-center justify-center gap-2 py-3 rounded-xl
                font-semibold transition-all
                ${!userId.trim() || isSubmitting
                  ? 'bg-bg-tertiary text-text-muted cursor-not-allowed'
                  : 'bg-brand hover:bg-brand-hover text-white shadow-lg shadow-brand/20'}
              `}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-text-muted text-center">
              Your data is stored securely and synced with ENSAM's LISE system.
              <br />
              We never store your password.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
