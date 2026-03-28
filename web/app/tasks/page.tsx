'use client'

import { motion } from 'framer-motion'
import { CheckSquare, Plus } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import MiniTodo from '@/components/MiniTodo'

export default function TasksPage() {
  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <CheckSquare className="w-6 h-6 text-brand" />
            Tasks
          </h1>
          <p className="text-text-tertiary mt-1">Manage your academic tasks and to-dos</p>
        </div>

        <div className="max-w-2xl">
          <MiniTodo />
        </div>
      </motion.div>
    </AppLayout>
  )
}
