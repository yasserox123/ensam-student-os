'use client'

import { motion } from 'framer-motion'
import Sidebar from '@/components/layout/Sidebar'
import { useNotifications } from '@/lib/hooks/useNotifications'
import ErrorBoundary from '@/components/ErrorBoundary'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { unreadCount } = useNotifications()

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg flex">
        <Sidebar unreadNotifications={unreadCount} />
        
        <main className="flex-1 ml-64 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="p-4 sm:p-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
