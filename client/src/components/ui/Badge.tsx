import type { Priority } from '../../types'

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  URGENT: { label: 'Urgent', color: '#FF4D6A', bg: 'rgba(255,77,106,0.12)' },
  HIGH:   { label: 'High',   color: '#FF8C42', bg: 'rgba(255,140,66,0.12)' },
  MEDIUM: { label: 'Medium', color: '#FFD166', bg: 'rgba(255,209,102,0.12)' },
  LOW:    { label: 'Low',    color: '#06D6A0', bg: 'rgba(6,214,160,0.12)' },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, color, bg } = PRIORITY_CONFIG[priority]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium"
      style={{ color, backgroundColor: bg }}
    >
      {label}
    </span>
  )
}
