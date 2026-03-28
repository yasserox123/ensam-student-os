'use client'

import { Suspense, lazy } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'

// Lazy load Timetable for performance
const Timetable = lazy(() => import('@/components/Timetable'))

function TimetableSkeleton() {
  return (
    <div className="bg-surface rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/40">
      <div className="p-5 border-b border-border">
        <div className="h-7 w-48 bg-surface-hover rounded-lg animate-pulse" />
        <div className="h-4 w-32 bg-surface-hover rounded-lg mt-2 animate-pulse" />
      </div>
      <div className="p-4">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-7 gap-2 mb-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-12 bg-surface-hover rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="space-y-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className="h-16 bg-surface-hover rounded-xl animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TimetablePage() {
  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Calendar className="w-6 h-6 text-brand" />
            Full Timetable
          </h1>
          <p className="text-text-tertiary mt-1">Your complete weekly schedule</p>
        </div>

        <Suspense fallback={<TimetableSkeleton />}>
          <Timetable />
        </Suspense>
      </motion.div>
    </AppLayout>
  )
}
