'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import { Clock, MapPin, User, X, ChevronLeft, ChevronRight } from 'lucide-react'

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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

const COURSE_COLORS = [
  { bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-400', gradient: 'from-rose-500/20 to-rose-600/10', shadow: 'shadow-rose-500/10' },
  { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-600/10', shadow: 'shadow-amber-500/10' },
  { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-600/10', shadow: 'shadow-emerald-500/10' },
  { bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-400', gradient: 'from-cyan-500/20 to-cyan-600/10', shadow: 'shadow-cyan-500/10' },
  { bg: 'bg-violet-500/15', border: 'border-violet-500/30', text: 'text-violet-400', gradient: 'from-violet-500/20 to-violet-600/10', shadow: 'shadow-violet-500/10' },
  { bg: 'bg-fuchsia-500/15', border: 'border-fuchsia-500/30', text: 'text-fuchsia-400', gradient: 'from-fuchsia-500/20 to-fuchsia-600/10', shadow: 'shadow-fuchsia-500/10' },
  { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400', gradient: 'from-orange-500/20 to-orange-600/10', shadow: 'shadow-orange-500/10' },
  { bg: 'bg-sky-500/15', border: 'border-sky-500/30', text: 'text-sky-400', gradient: 'from-sky-500/20 to-sky-600/10', shadow: 'shadow-sky-500/10' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } }
}

export default function Timetable() {
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchTimetable()
  }, [currentWeek])

  async function fetchTimetable() {
    setLoading(true)
    try {
      const res = await fetch('/api/timetable?userId=test')
      const data = await res.json()
      if (data.success) setSlots(data.slots)
    } catch (err) {
      console.error('Failed to fetch timetable:', err)
    } finally {
      setLoading(false)
    }
  }

  const courseColors = useMemo(() => {
    const colors = new Map<string, typeof COURSE_COLORS[0]>()
    const uniqueCourses = [...new Set(slots.map((s) => s.course))]
    uniqueCourses.forEach((course, i) => {
      colors.set(course, COURSE_COLORS[i % COURSE_COLORS.length])
    })
    return colors
  }, [slots])

  function getWeekDays() {
    const start = new Date(currentWeek)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(start.setDate(diff))
    
    return DAYS.map((_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d.toISOString().split('T')[0]
    })
  }

  function getSlotsForDay(date: string) {
    return slots.filter((s) => s.date === date)
  }

  function formatDateLabel(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function isToday(dateStr: string) {
    const today = new Date().toISOString().split('T')[0]
    return dateStr === today
  }

  const timeIndicatorPosition = useMemo(() => {
    const hour = currentTime.getHours()
    const minute = currentTime.getMinutes()
    if (hour < 8 || hour > 20) return null
    const hourIndex = HOURS.indexOf(hour)
    if (hourIndex === -1) return null
    return hourIndex * 80 + (minute / 60) * 80
  }, [currentTime])

  const analytics = useMemo(() => {
    const weekDays = getWeekDays()
    const weekSlots = slots.filter((s) => weekDays.includes(s.date))
    const uniqueCourses = new Set(weekSlots.map((s) => s.course)).size
    
    const hoursPerDay = weekDays.map(date => {
      const daySlots = weekSlots.filter(s => s.date === date)
      let hours = 0
      daySlots.forEach((slot) => {
        const [startH, startM] = slot.start.split(':').map(Number)
        const [endH, endM] = slot.end.split(':').map(Number)
        hours += (endH + endM / 60) - (startH + startM / 60)
      })
      return { date, hours, slotCount: daySlots.length }
    })
    
    const busiestDay = hoursPerDay.reduce((max, day) => day.hours > max.hours ? day : max, hoursPerDay[0])
    
    let totalHours = 0
    weekSlots.forEach((slot) => {
      const [startH, startM] = slot.start.split(':').map(Number)
      const [endH, endM] = slot.end.split(':').map(Number)
      totalHours += (endH + endM / 60) - (startH + startM / 60)
    })
    
    return { totalHours: Math.round(totalHours * 10) / 10, uniqueCourses, busiestDay }
  }, [slots, currentWeek])

  const weekDays = getWeekDays()

  if (loading) return <SkeletonLoader />

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-surface rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/40"
      >
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-surface to-surface-active">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Weekly Timetable</h2>
            <div className="flex items-center gap-3 mt-1.5 text-sm">
              <span className="text-text-secondary">{analytics.uniqueCourses} courses</span>
              <span className="text-text-muted">•</span>
              <span className="text-brand-light font-medium">{analytics.totalHours}h this week</span>
              <span className="text-text-muted">•</span>
              <span className="text-accent font-medium">{DAYS[new Date(analytics.busiestDay.date).getDay() === 0 ? 5 : new Date(analytics.busiestDay.date).getDay() - 1]} busiest</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-bg-secondary rounded-xl p-1">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const d = new Date(currentWeek)
                d.setDate(d.getDate() - 7)
                setCurrentWeek(d)
              }}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-text-secondary hover:text-text-primary"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <span className="text-sm font-semibold text-text-primary min-w-[140px] text-center">
              {formatDateLabel(weekDays[0])} - {formatDateLabel(weekDays[4])}
            </span>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const d = new Date(currentWeek)
                d.setDate(d.getDate() + 7)
                setCurrentWeek(d)
              }}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-text-secondary hover:text-text-primary"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="overflow-x-auto hide-scrollbar">
          <div className="min-w-[900px] p-4">
            <div className="grid grid-cols-7 gap-2 mb-3">
              <div className="p-3 text-xs font-medium text-text-muted uppercase tracking-wider">Time</div>
              {DAYS.map((day, i) => (
                <div 
                  key={day} 
                  className={`p-3 text-center rounded-xl transition-all ${isToday(weekDays[i]) ? 'bg-brand/10 border border-brand/30' : ''}`}
                >
                  <div className={`text-sm font-bold ${isToday(weekDays[i]) ? 'text-brand' : 'text-text-primary'}`}>{day}</div>
                  <div className={`text-xs mt-0.5 ${isToday(weekDays[i]) ? 'text-brand-light' : 'text-text-tertiary'}`}>{formatDateLabel(weekDays[i])}</div>
                </div>
              ))}
            </div>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-1 relative"
            >
              {timeIndicatorPosition !== null && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: timeIndicatorPosition }}
                >
                  <div className="flex items-center">
                    <div className="w-16 text-right pr-2">
                      <span className="text-xs font-bold text-accent-red">{currentTime.getHours()}:{String(currentTime.getMinutes()).padStart(2, '0')}</span>
                    </div>
                    <div className="flex-1 h-px bg-accent-red/50 relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-accent-red rounded-full -translate-x-1" />
                    </div>
                  </div>
                </motion.div>
              )}

              {HOURS.map(hour => (
                <motion.div key={hour} variants={itemVariants} className="grid grid-cols-7 gap-2">
                  <div className="p-3 text-xs text-text-tertiary font-medium flex items-center">
                    {hour}:00
                  </div>
                  {DAYS.map((_, dayIndex) => {
                    const daySlots = getSlotsForDay(weekDays[dayIndex])
                    const slot = daySlots.find((s) => parseInt(s.start.split(':')[0]) === hour)

                    return (
                      <div 
                        key={dayIndex} 
                        className="min-h-[70px] rounded-xl bg-bg-secondary/50 border border-border/30 hover:border-border/60 transition-colors"
                      >
                        {slot && (
                          <motion.div
                            whileHover={{ scale: 1.03 }}
                            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                            onClick={() => setSelectedSlot(slot)}
                            className={`
                              h-full rounded-xl p-2.5 text-xs cursor-pointer
                              border relative overflow-hidden group
                              bg-gradient-to-br ${courseColors.get(slot.course)?.gradient}
                              ${courseColors.get(slot.course)?.border}
                              ${courseColors.get(slot.course)?.shadow}
                            `}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className={`font-bold truncate relative z-10 ${courseColors.get(slot.course)?.text}`}>
                              {slot.course}
                            </div>
                            <div className="text-text-secondary mt-1 flex items-center gap-1 relative z-10">
                              <Clock className="w-3 h-3" />
                              {slot.start} - {slot.end}
                            </div>
                            <div className="text-text-tertiary mt-1 flex items-center gap-1 truncate relative z-10">
                              <MapPin className="w-3 h-3" />
                              {slot.room}
                            </div>
                            {slot.teachingType && (
                              <span className={`inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-black/20 ${courseColors.get(slot.course)?.text}`}>
                                {slot.teachingType}
                              </span>
                            )}
                          </motion.div>
                        )}
                      </div>
                    )
                  })}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedSlot && (
          <CourseModal slot={selectedSlot} colors={courseColors.get(selectedSlot.course)!} onClose={() => setSelectedSlot(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

function CourseModal({ slot, colors, onClose }: { slot: TimetableSlot; colors: typeof COURSE_COLORS[0]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl bg-gradient-to-br ${colors.gradient} ${colors.border}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className={`text-2xl font-bold ${colors.text}`}>{slot.course}</h3>
            {slot.teachingType && (
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-black/20 ${colors.text}`}>
                {slot.teachingType}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/20 rounded-xl transition-colors text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-text-primary">
            <div className={`p-2 rounded-xl bg-black/20 ${colors.text}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-text-tertiary">Time</div>
              <div className="font-semibold">{slot.start} - {slot.end}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-text-primary">
            <div className={`p-2 rounded-xl bg-black/20 ${colors.text}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-text-tertiary">Room</div>
              <div className="font-semibold">{slot.room}</div>
            </div>
          </div>

          {slot.teacher && (
            <div className="flex items-center gap-3 text-text-primary">
              <div className={`p-2 rounded-xl bg-black/20 ${colors.text}`}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-text-tertiary">Teacher</div>
                <div className="font-semibold">{slot.teacher}</div>
              </div>
            </div>
          )}

          {slot.status && (
            <div className="mt-4 p-3 rounded-xl bg-accent-red/10 border border-accent-red/30">
              <div className="text-accent-red font-semibold text-sm">{slot.status}</div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function SkeletonLoader() {
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
