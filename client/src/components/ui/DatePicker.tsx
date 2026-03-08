import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  value: string // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void
  placeholder?: string
}

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function parseDate(value: string): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(value: string): string {
  const d = parseDate(value)
  if (!d) return ''
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  // Monday = 0
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export function DatePicker({ value, onChange, placeholder = 'Выбрать дату' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const today = new Date()
  const selected = parseDate(value)

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  // Sync view when value changes externally
  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear())
      setViewMonth(selected.getMonth())
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day)
    onChange(toYMD(d))
    setOpen(false)
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
  const todayYMD = toYMD(today)

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`
          flex items-center gap-2 w-full px-3 py-2 rounded-[8px] border text-[13px] transition-colors text-left cursor-pointer
          ${open ? 'border-[#7C5CFC] bg-[#0F0F13]' : 'border-[#2A2A38] bg-[#0F0F13] hover:border-[#3A3A50]'}
        `}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6B6B80] shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className={`flex-1 ${value ? 'text-[#E8E8F0]' : 'text-[#6B6B80]'}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && (
          <span
            onClick={clear}
            className="text-[#6B6B80] hover:text-[#E8E8F0] transition-colors leading-none cursor-pointer select-none"
          >
            ✕
          </span>
        )}
      </button>

      {/* Calendar dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 top-full mt-2 left-0 bg-[#1A1A24] border border-[#2A2A38] rounded-[12px] shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-4 w-[272px]"
          >
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#6B6B80] hover:text-[#E8E8F0] hover:bg-[#2A2A38] transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <span className="text-[13px] font-semibold text-[#E8E8F0]">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#6B6B80] hover:text-[#E8E8F0] hover:bg-[#2A2A38] transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[11px] font-medium text-[#6B6B80] py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />

                const cellYMD = toYMD(new Date(viewYear, viewMonth, day))
                const isSelected = cellYMD === value
                const isToday = cellYMD === todayYMD
                const isPast = cellYMD < todayYMD

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`
                      h-8 w-8 mx-auto flex items-center justify-center rounded-[6px] text-[13px] transition-all cursor-pointer
                      ${isSelected
                        ? 'bg-[#7C5CFC] text-white font-semibold'
                        : isToday
                          ? 'border border-[#7C5CFC] text-[#7C5CFC] font-semibold hover:bg-[#7C5CFC]/20'
                          : isPast
                            ? 'text-[#4A4A58] hover:bg-[#2A2A38] hover:text-[#E8E8F0]'
                            : 'text-[#E8E8F0] hover:bg-[#2A2A38]'
                      }
                    `}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Footer — today shortcut */}
            <div className="mt-3 pt-3 border-t border-[#2A2A38]">
              <button
                type="button"
                onClick={() => { onChange(todayYMD); setOpen(false) }}
                className="w-full text-center text-[12px] text-[#7C5CFC] hover:text-[#9B7FFF] transition-colors cursor-pointer py-0.5"
              >
                Сегодня
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
