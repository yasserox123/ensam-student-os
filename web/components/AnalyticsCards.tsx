'use client'

import { motion } from 'framer-motion'
import { Clock, BookOpen, Calendar, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'

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

interface AnalyticsCardsProps {
  slots: TimetableSlot[]
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  })
}

export default function AnalyticsCards({ slots }: AnalyticsCardsProps) {
  const analytics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const weekStart = new Date()
    const day = weekStart.getDay()
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    
    const weekSlots = slots.filter(s => {
      const slotDate = new Date(s.date)
      return slotDate >= weekStart && slotDate <= weekEnd
    })
    
    const uniqueCourses = new Set(weekSlots.map(s => s.course)).size
    
    let totalHours = 0
    weekSlots.forEach(slot => {
      const [startH, startM] = slot.start.split(':').map(Number)
      const [endH, endM] = slot.end.split(':').map(Number)
      totalHours += (endH + endM / 60) - (startH + startM / 60)
    })
    
    // Find busiest day
    const hoursPerDay: Record<string, number> = {}
    weekSlots.forEach(slot => {
      const [startH, startM] = slot.start.split(':').map(Number)
      const [endH, endM] = slot.end.split(':').map(Number)
      const duration = (endH + endM / 60) - (startH + startM / 60)
      hoursPerDay[slot.date] = (hoursPerDay[slot.date] || 0) + duration
    })
    
    const busiestDate = Object.entries(hoursPerDay).sort((a, b) => b[1] - a[1])[0]
    const busiestDay = busiestDate ? {
      day: new Date(busiestDate[0]).toLocaleDateString('en-US', { weekday: 'short' }),
      hours: Math.round(busiestDate[1] * 10) / 10
    } : null
    
    // Today's classes
    const todaySlots = slots.filter(s => s.date === today)
    
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      uniqueCourses,
      busiestDay,
      todayCount: todaySlots.length,
      weekCount: weekSlots.length
    }
  }, [slots])

  const cards = [
    {
      title: 'Total Hours',
      value: analytics.totalHours,
      suffix: 'h',
      icon: Clock,
      color: 'from-brand/20 to-brand-dark/10',
      borderColor: 'border-brand/30',
      textColor: 'text-brand-light',
      description: 'This week'
    },
    {
      title: 'Courses',
      value: analytics.uniqueCourses,
      suffix: '',
      icon: BookOpen,
      color: 'from-accent-green/20 to-emerald-600/10',
      borderColor: 'border-accent-green/30',
      textColor: 'text-accent-green',
      description: 'Unique subjects'
    },
    {
      title: 'Busiest Day',
      value: analytics.busiestDay?.hours || 0,
      suffix: 'h',
      icon: TrendingUp,
      color: 'from-accent-purple/20 to-purple-600/10',
      borderColor: 'border-accent-purple/30',
      textColor: 'text-accent-purple',
      description: analytics.busiestDay ? `${analytics.busiestDay.day} is packed` : 'No data'
    },
    {
      title: 'Today',
      value: analytics.todayCount,
      suffix: '',
      icon: Calendar,
      color: 'from-accent/20 to-cyan-600/10',
      borderColor: 'border-accent/30',
      textColor: 'text-accent',
      description: `${analytics.weekCount} this week`
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className={`relative overflow-hidden rounded-2xl border ${card.borderColor} bg-gradient-to-br ${card.color} p-5 cursor-pointer group`}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-text-tertiary text-sm font-medium">{card.title}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-3xl font-bold ${card.textColor}`}>
                    {card.value}{card.suffix}
                  </span>
                </div>
                <p className="text-text-secondary text-xs mt-1">{card.description}</p>
              </div>
              <div className={`p-2.5 rounded-xl bg-black/20 ${card.textColor}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
