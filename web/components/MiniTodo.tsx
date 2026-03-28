'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, memo } from 'react'
import { Plus, Check, Trash2, CheckCircle2 } from 'lucide-react'

interface Todo {
  id: string
  text: string
  done: boolean
}

const MiniTodo = memo(function MiniTodo() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: '1', text: 'Review math notes', done: false },
    { id: '2', text: 'Submit lab report', done: true },
  ])
  const [newTodo, setNewTodo] = useState('')

  const addTodo = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodo.trim()) return
    
    setTodos(prev => [...prev, {
      id: Date.now().toString(),
      text: newTodo,
      done: false
    }])
    setNewTodo('')
  }, [newTodo])

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, done: !t.done } : t
    ))
  }, [])

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }, [])

  const remainingCount = todos.filter(t => !t.done).length
  const completedCount = todos.filter(t => t.done).length

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-surface rounded-2xl p-5 border border-border"
    >
      <div className="mb-4">
        <h3 className="text-lg font-bold text-text-primary">Tasks</h3>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-sm text-text-tertiary">{remainingCount} remaining</p>
          {completedCount > 0 && (
            <span className="text-xs text-accent-green flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {completedCount} done
            </span>
          )}
        </div>
      </div>
      
      {/* Add new */}
      <form onSubmit={addTodo} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodo}
            onChange={e => setNewTodo(e.target.value)}
            placeholder="Add a task..."
            className="flex-1 bg-bg-secondary text-text-primary text-sm rounded-xl px-4 py-2.5 
                       border border-border focus:border-brand focus:outline-none
                       placeholder:text-text-muted transition-colors"
          />
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="bg-brand hover:bg-brand-hover text-white w-10 h-10 rounded-xl 
                       flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>
      </form>

      {/* List */}
      <div className="space-y-2 max-h-[200px] overflow-y-auto hide-scrollbar">
        <AnimatePresence mode="popLayout">
          {todos.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-text-muted" />
              </div>
              <p className="text-text-tertiary text-sm">No tasks yet</p>
              <p className="text-text-muted text-xs mt-1">Add your first task above</p>
            </motion.div>
          ) : todos.filter(t => !t.done).length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-accent-green/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-accent-green" />
              </div>
              <p className="text-accent-green font-medium text-sm">All caught up!</p>
              <p className="text-text-muted text-xs mt-1">You have no pending tasks</p>
            </motion.div>
          ) : (
            todos.filter(t => !t.done).map(todo => (
              <motion.div 
                key={todo.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                layout
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-bg-secondary/50 transition-colors group"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleTodo(todo.id)}
                  className={`
                    w-5 h-5 rounded-lg border flex items-center justify-center
                    transition-all duration-200
                    ${todo.done 
                      ? 'bg-accent-green border-accent-green text-white' 
                      : 'border-border hover:border-brand'}
                  `}
                >
                  {todo.done && <Check className="w-3 h-3" />}
                </motion.button>
                <span className={`
                  flex-1 text-sm truncate
                  ${todo.done ? 'text-text-muted line-through' : 'text-text-primary'}
                `}>
                  {todo.text}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => deleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red 
                             transition-all p-1 rounded-lg hover:bg-accent-red/10"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
})

export default MiniTodo
