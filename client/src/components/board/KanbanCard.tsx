import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../../types'
import { PriorityBadge } from '../ui/Badge'
import { CardModal } from './CardModal'

interface Props {
  card: Card
  boardId: string
  isDragging?: boolean
  isActiveCard?: boolean
}

export function KanbanCard({ card, boardId, isDragging, isActiveCard }: Props) {
  const [open, setOpen] = useState(false)

  const { setNodeRef, transform, transition, attributes, listeners } = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.columnId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const overdue = card.dueDate && new Date(card.dueDate) < new Date()

  // Ghost: same div, just shows placeholder styling
  if (isActiveCard && !isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="rounded-[8px] border-2 border-dashed border-[#7C5CFC]/30 bg-[#7C5CFC]/5 h-[72px]"
      />
    )
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => !isDragging && setOpen(true)}
        className={`
          bg-[#1A1A24] border border-[#2A2A38] rounded-[8px] p-3 select-none
          transition-all duration-150
          ${isDragging
            ? 'shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_#7C5CFC] border-[#7C5CFC]/60 rotate-1 cursor-grabbing scale-[1.02]'
            : 'hover:border-[#7C5CFC]/40 hover:shadow-[0_0_12px_rgba(124,92,252,0.15)] cursor-grab'
          }
        `}
      >
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <PriorityBadge priority={card.priority} />
          {card.labels?.map(({ label }) => (
            <span
              key={label.id}
              className="text-[11px] px-1.5 py-0.5 rounded-[4px]"
              style={{ backgroundColor: label.color + '22', color: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>

        <p className="text-[13px] text-[#E8E8F0] leading-snug mb-1">{card.title}</p>
        {card.description && (
          <p className="text-[11px] text-[#6B6B80] leading-snug mb-2 line-clamp-2">{card.description}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          {card.dueDate && (
            <span className={`text-[11px] ${overdue ? 'text-[#FF4D6A]' : 'text-[#6B6B80]'}`}>
              {new Date(card.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {card.assignees?.length > 0 && (
            <div className="flex -space-x-1.5 ml-auto">
              {card.assignees.slice(0, 3).map(({ user }) => (
                <div
                  key={user.id}
                  className="w-5 h-5 rounded-full bg-[#7C5CFC]/20 border border-[#1A1A24] flex items-center justify-center text-[9px] text-[#7C5CFC] font-bold"
                  title={user.name}
                >
                  {user.name[0].toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isDragging && (
        <CardModal card={card} boardId={boardId} open={open} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
