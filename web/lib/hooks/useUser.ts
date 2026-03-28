'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'ensam-user-id'
const LAST_SYNC_KEY = 'ensam-last-sync'
const AUTO_SYNC_KEY = 'ensam-auto-sync'

export function useUser() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [autoSync, setAutoSync] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const lastSyncStr = localStorage.getItem(LAST_SYNC_KEY)
    const autoSyncStr = localStorage.getItem(AUTO_SYNC_KEY)
    
    if (stored) {
      setUserId(stored)
    }
    
    if (lastSyncStr) {
      setLastSync(new Date(lastSyncStr))
    }
    
    if (autoSyncStr !== null) {
      setAutoSync(autoSyncStr === 'true')
    }
    
    setIsLoading(false)
  }, [])

  // Save userId
  const saveUserId = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setUserId(id)
  }, [])

  // Clear user
  const clearUser = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LAST_SYNC_KEY)
    setUserId(null)
    setLastSync(null)
  }, [])

  // Update last sync time
  const updateLastSync = useCallback(() => {
    const now = new Date()
    localStorage.setItem(LAST_SYNC_KEY, now.toISOString())
    setLastSync(now)
  }, [])

  // Toggle auto sync
  const toggleAutoSync = useCallback(() => {
    const newValue = !autoSync
    localStorage.setItem(AUTO_SYNC_KEY, String(newValue))
    setAutoSync(newValue)
  }, [autoSync])

  // Check if sync is stale (> 6 hours)
  const isSyncStale = useCallback(() => {
    if (!lastSync) return true
    const sixHoursMs = 6 * 60 * 60 * 1000
    return Date.now() - lastSync.getTime() > sixHoursMs
  }, [lastSync])

  // Format last sync time
  const formatLastSync = useCallback(() => {
    if (!lastSync) return 'Never'
    
    const now = new Date()
    const diff = now.getTime() - lastSync.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return lastSync.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }, [lastSync])

  return {
    userId,
    isLoading,
    lastSync,
    autoSync,
    saveUserId,
    clearUser,
    updateLastSync,
    toggleAutoSync,
    isSyncStale,
    formatLastSync,
    isAuthenticated: !!userId
  }
}
