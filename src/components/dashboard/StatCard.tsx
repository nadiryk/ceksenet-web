'use client'

// ============================================
// ÇekSenet Web - StatCard Component
// Dashboard istatistik kartları
// ============================================

import {
  BanknotesIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils/format'

// ============================================
// Types
// ============================================

interface StatCardProps {
  title: string
  value: number | string
  subValue?: string
  icon: 'banknotes' | 'warning' | 'error' | 'success' | 'clock' | 'document'
  color: 'blue' | 'amber' | 'red' | 'green' | 'violet' | 'orange'
  onClick?: () => void
}

// ============================================
// Icon Mapping
// ============================================

const iconMap = {
  banknotes: BanknotesIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
  success: CheckCircleIcon,
  clock: ClockIcon,
  document: DocumentTextIcon,
}

// ============================================
// Color Mapping
// ============================================

const colorClasses: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600' },
  red: { bg: 'bg-red-50', icon: 'text-red-600' },
  green: { bg: 'bg-green-50', icon: 'text-green-600' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600' },
}

// ============================================
// StatCard Component
// ============================================

export function StatCard({ title, value, subValue, icon, color, onClick }: StatCardProps) {
  const Icon = iconMap[icon]
  const colors = colorClasses[color] || colorClasses.blue

  return (
    <div
      className={`
        rounded-xl border border-zinc-200 bg-white p-6
        ${onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
          {subValue && (
            <p className="mt-1 text-sm text-zinc-600">{subValue}</p>
          )}
        </div>
        <div className={`rounded-lg p-3 ${colors.bg}`}>
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
      </div>
    </div>
  )
}

// ============================================
// StatCardSkeleton
// ============================================

export function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-24 rounded bg-zinc-200" />
          <div className="mt-3 h-8 w-16 rounded bg-zinc-200" />
          <div className="mt-2 h-4 w-32 rounded bg-zinc-200" />
        </div>
        <div className="h-12 w-12 rounded-lg bg-zinc-200" />
      </div>
    </div>
  )
}

export default StatCard
