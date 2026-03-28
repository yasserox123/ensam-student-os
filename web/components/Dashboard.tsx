'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useCallback, memo } from 'react'
import { Sparkles, Calendar } from 'lucide-react'
import Timetable from './Timetable'
import AnalyticsCards from './AnalyticsCards'
import QuickActions from './QuickActions'
import MiniTodo from './MiniTodo'
import { EmptyTimetable } from './EmptyState'

interface TimetableSlot {
  id: string
  course: string
  date: string
  start: string
  end: string
  room: string
  teacher?: string
  teachingType?: string
  status?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
}

const Dashboard = memo(function Dashboard() {
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch('/api/timetable?userId=test')
      const data = await res.json()
      if (data.success) setSlots(data.slots)
    } catch (err) {
      console.error('Failed to fetch slots:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSlots()
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [fetchSlots])

  const greeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{greeting()}</h1>
          <p className="text-text-tertiary text-sm mt-0.5">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-2xl font-bold text-text-primary">
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </p>
        </div>
      </motion.div>

      {/* Analytics */}
      <motion.div variants={itemVariants}>
        <AnalyticsCards slots={slots} />
      </motion.div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Timetable */}
        <motion.div variants={itemVariants} className="xl:col-span-2">
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand" />
                <h2 className="font-semibold text-text-primary">Weekly Timetable</h2>
              </div>
              <span className="text-xs text-text-tertiary">
                {slots.length} classes this week
              </span>
            </div>
            
            {!loading && slots.length === 0 ? (
              <EmptyTimetable />
            ) : (
              <div className="p-4">
                <Timetable />
              </div>
            )}
          </div>
        </motion.div>

        {/* Sidebar */}
        <motion.div variants={itemVariants} className="space-y-6">
          <QuickActions />
          <MiniTodo />
        </motion.div>
      </div>
    </motion.div>
  )
})

export default Dashboard
