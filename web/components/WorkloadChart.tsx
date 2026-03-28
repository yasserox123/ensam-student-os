'use client'

import { useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface WorkloadData {
  day: string
  hours: number
  fullDate: string
}

interface WorkloadChartProps {
  data: WorkloadData[]
}

const COLORS = [
  '#6366f1', // brand
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#a855f7', // purple
  '#22d3ee', // cyan
]

const WorkloadChart = memo(function WorkloadChart({ data }: WorkloadChartProps) {
  const chartData = useMemo(() => {
    return data.map((d, i) => ({
      ...d,
      color: COLORS[i % COLORS.length]
    }))
  }, [data])

  const maxHours = useMemo(() => {
    return Math.max(...data.map(d => d.hours), 8)
  }, [data])

  // Animation config for bars
  const barAnimation = {
    isAnimationActive: true,
    animationDuration: 800,
    animationBegin: 200,
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#27272a" 
            vertical={false}
            opacity={0.5}
          />
          <XAxis 
            dataKey="day" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
            dy={8}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 11 }}
            domain={[0, maxHours]}
            tickFormatter={(value: number) => `${value}h`}
            dx={-4}
          />
          <Tooltip
            cursor={{ fill: 'rgba(99, 102, 241, 0.1)', radius: 6 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as WorkloadData & { color: string }
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-surface border border-border rounded-xl p-3 shadow-2xl shadow-black/50"
                  >
                    <p className="text-text-primary font-semibold text-sm">{item.day}</p>
                    <p className="text-brand font-bold text-lg" style={{ color: item.color }}>
                      {item.hours} hours
                    </p>
                    <p className="text-text-tertiary text-xs">{item.fullDate}</p>
                  </motion.div>
                )
              }
              return null
            }}
          />
          <Bar 
            dataKey="hours" 
            radius={[8, 8, 0, 0]}
            {...barAnimation}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                className="transition-all duration-300 hover:opacity-80"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

export default WorkloadChart
