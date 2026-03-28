'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { RefreshCw, GraduationCap, Mail, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

const ACTIONS = [
  { id: 'sync', label: 'Sync Timetable', icon: RefreshCw, color: 'bg-brand', description: 'Refresh from LISE' },
  { id: 'grades', label: 'Grades', icon: GraduationCap, color: 'bg-accent-green', description: 'View results' },
  { id: 'email', label: 'Email', icon: Mail, color: 'bg-accent', description: 'Check inbox' },
  { id: 'docs', label: 'Documents', icon: FileText, color: 'bg-accent-yellow', description: 'Files & notes' },
]

export default function QuickActions() {
  const [syncing, setSyncing] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  function showToast(message: string, type: Toast['type'] = 'info') {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    showToast('Syncing timetable...', 'info')
    
    try {
      const res = await fetch('/api/timetable/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'test' }),
      })
      const data = await res.json()
      
      if (data.success) {
        showToast(`Synced ${data.stored} courses`, 'success')
        setTimeout(() => window.location.reload(), 500)
      } else {
        showToast(data.error || 'Sync failed', 'error')
      }
    } catch (err) {
      showToast('Network error', 'error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      {/* Toasts */}
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`
              fixed bottom-6 right-6 z-50
              px-4 py-3 rounded-xl shadow-2xl
              flex items-center gap-3 min-w-[280px]
              backdrop-blur-md border
              ${toast.type === 'success' ? 'bg-accent-green/90 border-accent-green/40 text-white' : ''}
              ${toast.type === 'error' ? 'bg-accent-red/90 border-accent-red/40 text-white' : ''}
              ${toast.type === 'info' ? 'bg-brand/90 border-brand/40 text-white' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5" />}
            <span className="font-medium text-sm">{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-surface rounded-2xl p-5 border border-border"
      >
        <div className="mb-5">
          <h3 className="text-lg font-bold text-text-primary">Quick Actions</h3>
          <p className="text-sm text-text-tertiary mt-0.5">Frequently used shortcuts</p>
        </div>
        
        <div className="space-y-2">
          {ACTIONS.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => action.id === 'sync' && handleSync()}
              disabled={action.id === 'sync' && syncing}
              className={`
                w-full flex items-center gap-4 p-3.5 rounded-xl
                transition-all duration-200 group
                ${action.id === 'sync' && syncing 
                  ? 'opacity-70 cursor-not-allowed bg-bg-secondary' 
                  : 'hover:bg-bg-secondary cursor-pointer'}
              `}
            >
              {/* Icon */}
              <div className={`
                ${action.color} 
                w-11 h-11 rounded-xl flex items-center justify-center
                shadow-lg transition-transform duration-200
                ${action.id === 'sync' && syncing ? '' : 'group-hover:scale-110'}
              `}>
                {action.id === 'sync' && syncing ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <action.icon className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Text */}
              <div className="text-left flex-1">
                <div className="font-semibold text-text-primary text-sm">
                  {action.id === 'sync' && syncing ? 'Syncing...' : action.label}
                </div>
                <div className="text-xs text-text-tertiary">{action.description}</div>
              </div>

              {/* Arrow */}
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-text-muted group-hover:text-text-secondary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </>
  )
}
