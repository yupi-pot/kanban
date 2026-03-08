import { useT } from '../../store/langStore'
import type { Priority, WorkspaceMember } from '../../types'

export interface FilterState {
  search: string
  priorities: Priority[]
  assigneeIds: string[]
  dueDate: '' | 'overdue' | 'today' | 'week'
}

interface Props {
  filters: FilterState
  onChange: (f: FilterState) => void
  members: WorkspaceMember[]
}

const PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

const PRIORITY_COLORS: Record<Priority, string> = {
  URGENT: '#FF4D6A',
  HIGH: '#FF8A00',
  MEDIUM: '#7C5CFC',
  LOW: '#06D6A0',
}

const PRIORITY_LABELS: Record<Priority, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

function hasActiveFilters(f: FilterState) {
  return f.search !== '' || f.priorities.length > 0 || f.assigneeIds.length > 0 || f.dueDate !== ''
}

export function FilterBar({ filters, onChange, members }: Props) {
  const t = useT()

  function setSearch(search: string) {
    onChange({ ...filters, search })
  }

  function togglePriority(p: Priority) {
    const set = new Set(filters.priorities)
    if (set.has(p)) set.delete(p)
    else set.add(p)
    onChange({ ...filters, priorities: Array.from(set) })
  }

  function toggleAssignee(id: string) {
    const set = new Set(filters.assigneeIds)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onChange({ ...filters, assigneeIds: Array.from(set) })
  }

  function setDueDate(dueDate: FilterState['dueDate']) {
    onChange({ ...filters, dueDate: filters.dueDate === dueDate ? '' : dueDate })
  }

  function clear() {
    onChange({ search: '', priorities: [], assigneeIds: [], dueDate: '' })
  }

  return (
    <div className="px-6 py-2 border-b border-[#2A2A38] flex items-center gap-3 flex-wrap shrink-0">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B6B80]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          className="pl-8 pr-3 py-1.5 bg-[#0F0F13] border border-[#2A2A38] rounded-[6px] text-[13px] text-[#E8E8F0] placeholder:text-[#6B6B80] outline-none focus:border-[#7C5CFC] transition-colors w-44"
        />
      </div>

      {/* Priority filters */}
      <div className="flex items-center gap-1">
        {PRIORITIES.map((p) => {
          const active = filters.priorities.includes(p)
          return (
            <button
              key={p}
              onClick={() => togglePriority(p)}
              title={PRIORITY_LABELS[p]}
              className={`text-[11px] font-medium px-2 py-1 rounded-[4px] transition-all cursor-pointer border ${
                active
                  ? 'text-white border-transparent'
                  : 'text-[#6B6B80] border-[#2A2A38] hover:border-[#3A3A50] hover:text-[#E8E8F0]'
              }`}
              style={active ? { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] } : undefined}
            >
              {PRIORITY_LABELS[p][0]}
            </button>
          )
        })}
      </div>

      {/* Due date filters */}
      <div className="flex items-center gap-1">
        {(['overdue', 'today', 'week'] as const).map((key) => {
          const label = key === 'overdue' ? t.overdue : key === 'today' ? t.today : t.thisWeek
          const active = filters.dueDate === key
          return (
            <button
              key={key}
              onClick={() => setDueDate(key)}
              className={`text-[11px] px-2 py-1 rounded-[4px] transition-all cursor-pointer border ${
                active
                  ? 'bg-[#7C5CFC]/20 text-[#7C5CFC] border-[#7C5CFC]/40'
                  : 'text-[#6B6B80] border-[#2A2A38] hover:border-[#3A3A50] hover:text-[#E8E8F0]'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Assignee filters */}
      {members.length > 0 && (
        <div className="flex items-center gap-1">
          {members.map(({ user }) => {
            const active = filters.assigneeIds.includes(user.id)
            return (
              <button
                key={user.id}
                onClick={() => toggleAssignee(user.id)}
                title={user.name}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer ring-offset-1 ring-offset-[#0F0F13] ${
                  active
                    ? 'bg-[#7C5CFC] text-white ring-2 ring-[#7C5CFC]'
                    : 'bg-[#2A2A38] text-[#6B6B80] hover:bg-[#3A3A50] hover:text-[#E8E8F0]'
                }`}
              >
                {user.name[0].toUpperCase()}
              </button>
            )
          })}
        </div>
      )}

      {/* Clear */}
      {hasActiveFilters(filters) && (
        <button
          onClick={clear}
          className="text-[11px] text-[#6B6B80] hover:text-[#FF4D6A] transition-colors cursor-pointer ml-auto"
        >
          {t.clearFilters} ✕
        </button>
      )}
    </div>
  )
}
