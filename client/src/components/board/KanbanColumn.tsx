import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../../api/client'
import { useBoardStore } from '../../store/boardStore'
import { useT } from '../../store/langStore'
import type { Card, Column } from '../../types'
import { KanbanCard } from './KanbanCard'
import { Input } from '../ui/Input'

interface Props {
  column: Column
  boardId: string
  activeCardId: string | null
  overId: string | null
  canDelete?: boolean
  filteredCards?: Card[]
}

export function KanbanColumn({ column, boardId, activeCardId, overId, canDelete, filteredCards }: Props) {
  const displayCards = filteredCards ?? column.cards
  const [addingCard, setAddingCard] = useState(false)
  const [cardTitle, setCardTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { removeColumn } = useBoardStore()
  const t = useT()

  const deleteColMutation = useMutation({
    mutationFn: () => api.delete(`/columns/${column.id}`),
    onSuccess: () => removeColumn(column.id),
    onError: () => setConfirmDelete(false),
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column' },
  })

  const isDraggingOver = isOver && activeCardId !== null

  const addCardMutation = useMutation({
    mutationFn: (title: string) => api.post('/cards', { title, columnId: column.id, boardId }),
    onSuccess: () => { setCardTitle(''); setAddingCard(false) },
  })

  function handleAddCard(e: React.FormEvent) {
    e.preventDefault()
    if (!cardTitle.trim()) return
    addCardMutation.mutate(cardTitle.trim())
  }

  return (
    <div className="flex flex-col w-72 shrink-0 h-full max-h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1 group/header">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
        <span className="text-[13px] font-semibold text-[#E8E8F0] flex-1">{column.name}</span>
        <span className="text-[11px] text-[#6B6B80] bg-[#2A2A38] px-1.5 py-0.5 rounded-[4px]">
          {filteredCards ? `${filteredCards.length}/${column.cards.length}` : column.cards.length}
        </span>
        {canDelete && (
          confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => deleteColMutation.mutate()}
                disabled={deleteColMutation.isPending}
                className="text-[11px] text-[#FF4D6A] hover:text-white bg-[#FF4D6A]/10 hover:bg-[#FF4D6A] border border-[#FF4D6A]/40 px-2 py-0.5 rounded-[4px] transition-all cursor-pointer disabled:opacity-50"
              >
                {deleteColMutation.isPending ? '...' : t.deleteColumnConfirm}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] text-[#6B6B80] hover:text-[#E8E8F0] px-1.5 py-0.5 rounded-[4px] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="opacity-0 group-hover/header:opacity-100 text-[#6B6B80] hover:text-[#FF4D6A] transition-all cursor-pointer p-0.5 rounded-[4px] hover:bg-[#FF4D6A]/10"
              title={t.deleteColumn}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          )
        )}
      </div>

      {/* Cards area */}
      <div
        ref={setDropRef}
        className={`
          flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1 rounded-[8px] transition-colors duration-150 min-h-[48px]
          ${isDraggingOver && column.cards.length === 0
            ? 'bg-[#7C5CFC]/5 border border-dashed border-[#7C5CFC]/30'
            : ''}
        `}
      >
        <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {displayCards.map((card, index) => {
            const showDropLine = overId === card.id && activeCardId !== card.id

            return (
              <div key={card.id}>
                {showDropLine && (
                  <div className="h-0.5 rounded-full bg-[#7C5CFC] mx-1 my-0.5 shadow-[0_0_8px_rgba(124,92,252,0.6)]" />
                )}
                <KanbanCard
                  card={card}
                  boardId={boardId}
                  isActiveCard={activeCardId === card.id}
                />
                {index === displayCards.length - 1 && isDraggingOver && overId === column.id && (
                  <div className="h-0.5 rounded-full bg-[#7C5CFC] mx-1 my-0.5 shadow-[0_0_8px_rgba(124,92,252,0.6)]" />
                )}
              </div>
            )
          })}
        </SortableContext>

        {displayCards.length === 0 && isDraggingOver && (
          <div className="flex-1 flex items-center justify-center text-[12px] text-[#7C5CFC]/60 py-4">
            {t.dropHere}
          </div>
        )}

        {/* Add card */}
        <AnimatePresence>
          {addingCard ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddCard}
              className="flex flex-col gap-2 overflow-hidden"
            >
              <Input
                placeholder={t.cardTitle}
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Escape' && setAddingCard(false)}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!cardTitle || addCardMutation.isPending}
                  className="flex-1 bg-[#7C5CFC] hover:bg-[#9B7FFF] text-white text-[13px] py-1.5 rounded-[6px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {t.add}
                </button>
                <button
                  type="button"
                  onClick={() => setAddingCard(false)}
                  className="flex-1 bg-[#2A2A38] text-[#6B6B80] hover:text-[#E8E8F0] text-[13px] py-1.5 rounded-[6px] transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.button
              key="btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setAddingCard(true)}
              className="w-full flex items-center gap-2 px-2 py-2 text-[13px] text-[#6B6B80] hover:text-[#E8E8F0] hover:bg-[#2A2A38]/50 rounded-[6px] transition-colors cursor-pointer"
            >
              <span>+</span>
              <span>{t.addCard}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
