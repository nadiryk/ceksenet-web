'use client'

// ============================================
// ÇekSenet Web - DurumPieChart Component
// Evrak durumlarının dağılımı (Pie/Donut Chart)
// ============================================

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatCurrency, getDurumLabel } from '@/lib/utils/format'

// ============================================
// Types
// ============================================

interface DurumData {
  durum: string
  adet: number
  tutar: number
}

interface DurumPieChartProps {
  data: DurumData[]
  isLoading?: boolean
  height?: number
}

// ============================================
// Durum Colors
// ============================================

const durumColors: Record<string, string> = {
  portfoy: '#3B82F6',    // blue-500
  bankada: '#8B5CF6',    // violet-500
  ciro: '#F97316',       // orange-500
  tahsil: '#22C55E',     // green-500
  karsiliksiz: '#EF4444', // red-500
}

// ============================================
// Custom Tooltip
// ============================================

function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
      <p className="font-medium text-zinc-900">{getDurumLabel(data.durum)}</p>
      <p className="mt-1 text-sm text-zinc-600">
        Adet: <span className="font-semibold">{data.adet}</span>
      </p>
      <p className="text-sm text-zinc-600">
        Tutar: <span className="font-semibold">{formatCurrency(data.tutar)}</span>
      </p>
    </div>
  )
}

// ============================================
// Custom Legend
// ============================================

function CustomLegend({ payload }: { payload?: any[] }) {
  if (!payload) return null

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-zinc-600">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================
// DurumPieChart Component
// ============================================

export function DurumPieChart({
  data,
  isLoading = false,
  height = 280,
}: DurumPieChartProps) {
  if (isLoading) {
    return (
      <div className="flex animate-pulse items-center justify-center" style={{ height }}>
        <div className="h-48 w-48 rounded-full bg-zinc-200" />
      </div>
    )
  }

  // Veri yoksa veya tüm değerler 0 ise
  const hasData = data.length > 0 && data.some((d) => d.adet > 0)

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50"
        style={{ height }}
      >
        <p className="text-sm text-zinc-500">Henüz evrak bulunmuyor</p>
      </div>
    )
  }

  // Recharts için data formatı (sadece adet > 0 olanlar)
  const chartData = data
    .filter((d) => d.adet > 0)
    .map((d) => ({
      ...d,
      name: getDurumLabel(d.durum),
      value: d.adet,
      color: durumColors[d.durum] || '#71717A',
    }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default DurumPieChart
