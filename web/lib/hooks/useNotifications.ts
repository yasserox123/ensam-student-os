'use client'

import { useState, useCallback, useEffect } from 'react'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

const STORAGE_KEY = 'ensam-notifications'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Load notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored).map((n: Notification) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }))
      setNotifications(parsed)
      setUnreadCount(parsed.filter((n: Notification) => !n.read).length)
    }
  }, [])

  // Save notifications
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    }
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)) // Keep last 50
    
    // Browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      })
    }
    
    return newNotification.id
  }, [])

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Clear all
  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }, [])

  // Check for schedule changes (compare old vs new slots)
  const detectChanges = useCallback((oldSlots: any[], newSlots: any[]) => {
    const changes: string[] = []
    
    // Find new courses
    const oldIds = new Set(oldSlots.map(s => s.id))
    const newCourses = newSlots.filter(s => !oldIds.has(s.id))
    
    if (newCourses.length > 0) {
      const courseNames = [...new Set(newCourses.map(c => c.course))]
      changes.push(`New: ${courseNames.join(', ')}`)
      
      addNotification({
        type: 'info',
        title: 'New courses detected',
        message: `${newCourses.length} new classes added to your schedule`
      })
    }
    
    return changes
  }, [addNotification])

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    requestPermission,
    detectChanges
  }
}
