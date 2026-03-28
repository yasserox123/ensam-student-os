'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface SyncState {
  isSyncing: boolean
  lastSync: Date | null
  error: string | null
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'stale'

export function useSync(userId: string | null) {
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    error: null
  })
  const [status, setStatus] = useState<SyncStatus>('idle')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check sync status based on last sync time
  useEffect(() => {
    if (!state.lastSync) {
      setStatus('stale')
      return
    }
    
    const sixHoursMs = 6 * 60 * 60 * 1000
    const isStale = Date.now() - state.lastSync.getTime() > sixHoursMs
    setStatus(isStale ? 'stale' : 'success')
  }, [state.lastSync])

  // Perform sync
  const sync = useCallback(async (force = false): Promise<boolean> => {
    if (!userId || state.isSyncing) return false
    
    setState(prev => ({ ...prev, isSyncing: true, error: null }))
    setStatus('syncing')
    
    try {
      const res = await fetch('/api/timetable/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      
      const data = await res.json()
      
      if (data.success) {
        setState(prev => ({ 
          ...prev, 
          isSyncing: false, 
          lastSync: new Date(),
          error: null 
        }))
        setStatus('success')
        return true
      } else {
        throw new Error(data.error || 'Sync failed')
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Sync failed'
      setState(prev => ({ ...prev, isSyncing: false, error }))
      setStatus('error')
      return false
    }
  }, [userId, state.isSyncing])

  // Auto-sync on mount and every 6 hours
  useEffect(() => {
    if (!userId) return
    
    // Initial sync if stale
    const lastSync = localStorage.getItem('ensam-last-sync')
    const sixHoursMs = 6 * 60 * 60 * 1000
    const shouldSync = !lastSync || (Date.now() - new Date(lastSync).getTime() > sixHoursMs)
    
    if (shouldSync) {
      sync()
    }
    
    // Set up 6-hour interval
    intervalRef.current = setInterval(() => {
      sync()
    }, sixHoursMs)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [userId, sync])

  // Manual sync trigger
  const manualSync = useCallback(() => sync(true), [sync])

  // Format sync status text
  const getStatusText = useCallback(() => {
    switch (status) {
      case 'syncing': return 'Syncing...'
      case 'success': return 'Up to date'
      case 'error': return 'Sync failed'
      case 'stale': return 'Sync needed'
      default: return 'Ready'
    }
  }, [status])

  // Get status color
  const getStatusColor = useCallback(() => {
    switch (status) {
      case 'syncing': return 'text-brand animate-pulse'
      case 'success': return 'text-accent-green'
      case 'error': return 'text-accent-red'
      case 'stale': return 'text-accent-yellow'
      default: return 'text-text-tertiary'
    }
  }, [status])

  return {
    ...state,
    status,
    sync: manualSync,
    getStatusText,
    getStatusColor,
    isStale: status === 'stale'
  }
}
