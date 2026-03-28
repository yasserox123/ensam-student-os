'use client'

import { motion } from 'framer-motion'
import { CalendarX, Plus } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-bg-secondary border border-border flex items-center justify-center mb-4">
        {icon || <CalendarX className="w-8 h-8 text-text-muted" />}
      </div>
      
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        {title}
      </h3>
      
      <p className="text-text-tertiary text-sm max-w-xs mb-6">
        {description}
      </p>
      
      {action && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
}

// Pre-built empty states
export function EmptyTimetable() {
  return (
    <EmptyState
      icon={<CalendarX className="w-8 h-8 text-text-muted" />}
      title="No classes this week"
      description="Your timetable is empty. Sync with LISE to import your schedule."
      action={{
        label: "Sync Now",
        onClick: () => window.location.reload()
      }}
    />
  )
}

export function EmptyTasks() {
  return (
    <EmptyState
      icon={<span className="text-2xl">✓</span>}
      title="All caught up!"
      description="You have no pending tasks. Add one when you need to track something."
    />
  )
}

export function EmptyAnalytics() {
  return (
    <EmptyState
      icon={<span className="text-2xl">📊</span>}
      title="No data yet"
      description="Analytics will appear once you have timetable data. Sync your schedule to see insights."
      action={{
        label: "Sync Timetable",
        onClick: () => window.location.reload()
      }}
    />
  )
}
