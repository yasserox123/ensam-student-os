'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Clock, BookOpen, TrendingUp, Calendar } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { useUser } from '@/lib/hooks/useUser'
import WorkloadChart from '@/components/WorkloadChart'
import { EmptyAnalytics } from '@/components/EmptyState'

interface TimetableSlot {
  id: string
  course: string
  date: string
  start: string
  end: string
  room: string
  teacher?: string
  teachingType?: string
}

export default function AnalyticsPage() {
  const { userId } = useUser()
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSlots = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/timetable?userId=${userId}`)
      const data = await res.json()
      if (data.success) setSlots(data.slots)
    } catch (err) {
      console.error('Failed to fetch slots:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  const analytics = useMemo(() => {
    const weekStart = new Date()
    const day = weekStart.getDay()
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    
    const weekSlots = slots.filter((s: TimetableSlot) => {
      const slotDate = new Date(s.date)
      return slotDate >= weekStart && slotDate <= weekEnd
    })

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const hoursPerDay = days.map((day, index) => {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + index)
      const dateStr = date.toISOString().split('T')[0]
      
      const daySlots = weekSlots.filter((s: TimetableSlot) => s.date === dateStr)
      let hours = 0
      daySlots.forEach((slot: TimetableSlot) => {
        const [startH, startM] = slot.start.split(':').map(Number)
        const [endH, endM] = slot.end.split(':').map(Number)
        hours += (endH + endM / 60) - (startH + startM / 60)
      })
      
      return { day, hours: Math.round(hours * 10) / 10, fullDate: dateStr }
    })

    const subjectHours: Record<string, number> = {}
    weekSlots.forEach((slot: TimetableSlot) => {
      const [startH, startM] = slot.start.split(':').map(Number)
      const [endH, endM] = slot.end.split(':').map(Number)
      const duration = (endH + endM / 60) - (startH + startM / 60)
      subjectHours[slot.course] = (subjectHours[slot.course] || 0) + duration
    })

    const subjectDistribution = Object.entries(subjectHours)
      .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)

    const totalHours = hoursPerDay.reduce((sum, d) => sum + d.hours, 0)
    const uniqueCourses = Object.keys(subjectHours).length
    const busiestDay = hoursPerDay.reduce((max, d) => d.hours > max.hours ? d : max, hoursPerDay[0])

    return {
      hoursPerDay,
      subjectDistribution,
      totalHours: Math.round(totalHours * 10) / 10,
      uniqueCourses,
      busiestDay
    }
  }, [slots])

  const hasData = !loading && slots.length > 0

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-brand" />
              Analytics
            </h1>
            <p className="text-text-tertiary mt-1">Insights into your academic workload</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Calendar className="w-4 h-4" />
            <span>This week</span>
          </div>
        </div>

        {!hasData ? (
          <EmptyAnalytics />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-surface rounded-2xl p-5 border border-border"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-brand" />
                  </div>
                  <span className="text-text-tertiary text-sm">Total Hours</span>
                </div>
                <p className="text-3xl font-bold text-text-primary">{analytics.totalHours}h</p>
                <p className="text-text-muted text-sm mt-1">This week</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface rounded-2xl p-5 border border-border"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-accent-green" />
                  </div>
                  <span className="text-text-tertiary text-sm">Courses</span>
                </div>
                <p className="text-3xl font-bold text-text-primary">{analytics.uniqueCourses}</p>
                <p className="text-text-muted text-sm mt-1">Unique subjects</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-surface rounded-2xl p-5 border border-border sm:col-span-2 lg:col-span-1"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-yellow/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent-yellow" />
                  </div>
                  <span className="text-text-tertiary text-sm">Busiest Day</span>
                </div>
                <p className="text-3xl font-bold text-text-primary">{analytics.busiestDay?.day || '-'}</p>
                <p className="text-text-muted text-sm mt-1">{analytics.busiestDay?.hours || 0} hours</p>
              </motion.div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-surface rounded-2xl p-5 border border-border"
              >
                <h3 className="text-lg font-semibold text-text-primary mb-4">Weekly Workload</h3>
                <WorkloadChart data={analytics.hoursPerDay} />
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-surface rounded-2xl p-5 border border-border"
              >
                <h3 className="text-lg font-semibold text-text-primary mb-4">Time by Subject</h3>
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                  {analytics.subjectDistribution.map((subject, index) => (
                    <div key={subject.name} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-text-primary font-medium text-sm truncate pr-2">{subject.name}</span>
                          <span className="text-text-tertiary text-sm flex-shrink-0">{subject.hours}h</span>
                        </div>
                        <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(subject.hours / (analytics.subjectDistribution[0]?.hours || 1)) * 100}%` }}
                            transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                            className="h-full bg-gradient-to-r from-brand to-brand-light rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </motion.div>
    </AppLayout>
  )
}
