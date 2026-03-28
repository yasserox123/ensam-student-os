'use client'

import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Calendar, 
  BarChart3, 
  CheckSquare,
  LogOut,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  WifiOff
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSync } from '@/lib/hooks/useSync'
import { memo } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/timetable', label: 'Timetable', icon: Calendar },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
]

interface SidebarProps {
  unreadNotifications?: number
}

function formatLastSync(date: Date | null): string {
  if (!date) return 'Never synced'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const Sidebar = memo(function Sidebar({ unreadNotifications = 0 }: SidebarProps) {
  const pathname = usePathname()
  const { userId, lastSync, clearUser } = useUser()
  const { status, sync, isStale, error } = useSync(userId)

  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'bg-brand animate-pulse',
          text: 'text-brand',
          label: 'Syncing...',
          bgColor: 'bg-brand/10'
        }
      case 'error':
        return {
          icon: WifiOff,
          color: 'bg-accent-red',
          text: 'text-accent-red',
          label: error || 'Sync failed',
          bgColor: 'bg-accent-red/10'
        }
      case 'success':
        return {
          icon: CheckCircle2,
          color: isStale ? 'bg-accent-yellow' : 'bg-accent-green',
          text: isStale ? 'text-accent-yellow' : 'text-accent-green',
          label: isStale ? 'Update needed' : 'Up to date',
          bgColor: isStale ? 'bg-accent-yellow/10' : 'bg-accent-green/10'
        }
      default:
        return {
          icon: Clock,
          color: 'bg-text-muted',
          text: 'text-text-muted',
          label: 'Ready',
          bgColor: 'bg-bg-tertiary'
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-border z-50 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shadow-lg shadow-brand/20 group-hover:shadow-brand/30 transition-shadow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">ENSAM OS</h1>
            <p className="text-[11px] text-text-tertiary uppercase tracking-wider">Student Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-brand/10 text-brand' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'}
              `}
            >
              <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-brand' : 'text-text-tertiary group-hover:text-text-secondary'}`} />
              <span className="font-medium text-sm">{item.label}</span>
              {item.label === 'Tasks' && unreadNotifications > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] flex items-center justify-center bg-accent-red text-white text-[10px] font-bold px-1.5 rounded-full">
                  {unreadNotifications}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Sync Status Widget */}
      <div className="p-3">
        <motion.div 
          layout
          className={`rounded-xl p-3 border border-border/50 ${statusConfig.bgColor}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
            <span className={`text-xs font-medium ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
            {status === 'error' && (
              <button
                onClick={() => sync()}
                disabled={status === 'syncing'}
                className="ml-auto text-[10px] text-accent-red hover:text-accent-red/80 font-medium transition-colors"
              >
                Retry
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <StatusIcon className={`w-3 h-3 ${status === 'syncing' ? 'animate-spin' : ''}`} />
              {formatLastSync(lastSync)}
            </div>
            
            {status !== 'error' && (
              <button
                onClick={() => sync()}
                disabled={status === 'syncing'}
                className="text-text-muted hover:text-text-secondary transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* User */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-bg-secondary transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-brand flex items-center justify-center text-white font-semibold text-xs">
            {userId?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{userId || 'Student'}</p>
            <p className="text-[11px] text-text-tertiary">ENSAM Student</p>
          </div>
          <button 
            onClick={clearUser}
            className="p-1.5 text-text-muted hover:text-accent-red rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
})

export default Sidebar
