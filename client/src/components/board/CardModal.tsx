import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '../../api/client'
import { useBoardStore } from '../../store/boardStore'
import { useT } from '../../store/langStore'
import type { Card, Priority } from '../../types'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { PriorityBadge } from '../ui/Badge'

const PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

interface Props {
  card: Card
  boardId: string
  open: boolean
  onClose: () => void
}

export function CardModal({ card, boardId, open, onClose }: Props) {
  const { updateCard, removeCard } = useBoardStore()
  const t = useT()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [priority, setPriority] = useState<Priority>(card.priority)
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.split('T')[0] : '')

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/cards/${card.id}`, { title, description, priority, dueDate: dueDate || null, boardId }),
    onSuccess: (res) => updateCard(res.data.card),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/cards/${card.id}`, { data: { boardId } }),
    onSuccess: () => { removeCard(card.id, card.columnId); onClose() },
  })

  function handleSave() {
    updateMutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          className="bg-transparent text-[17px] font-semibold text-[#E8E8F0] outline-none border-b border-transparent focus:border-[#7C5CFC] pb-1 transition-colors w-full"
          placeholder="Card title"
        />

        {/* Priority */}
        <div>
          <p className="text-[11px] font-semibold text-[#6B6B80] uppercase tracking-wider mb-2">{t.priority}</p>
          <div className="flex gap-2 flex-wrap">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => { setPriority(p); setTimeout(handleSave, 0) }}
                className={`transition-all cursor-pointer rounded-[4px] ${priority === p ? 'ring-2 ring-[#7C5CFC] ring-offset-1 ring-offset-[#1A1A24]' : 'opacity-50 hover:opacity-100'}`}
              >
                <PriorityBadge priority={p} />
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div>
          <p className="text-[11px] font-semibold text-[#6B6B80] uppercase tracking-wider mb-2">{t.dueDate}</p>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            onBlur={handleSave}
            className="bg-[#0F0F13] border border-[#2A2A38] rounded-[8px] px-3 py-2 text-[13px] text-[#E8E8F0] outline-none focus:border-[#7C5CFC] transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <p className="text-[11px] font-semibold text-[#6B6B80] uppercase tracking-wider mb-2">{t.description}</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSave}
            rows={4}
            placeholder={t.addDescription}
            className="w-full bg-[#0F0F13] border border-[#2A2A38] rounded-[8px] px-3 py-2 text-[13px] text-[#E8E8F0] placeholder:text-[#6B6B80] outline-none focus:border-[#7C5CFC] transition-colors resize-none"
          />
        </div>

        {/* Assignees */}
        {card.assignees?.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[#6B6B80] uppercase tracking-wider mb-2">{t.assignees}</p>
            <div className="flex gap-2 flex-wrap">
              {card.assignees.map(({ user }) => (
                <div key={user.id} className="flex items-center gap-1.5 bg-[#2A2A38] px-2 py-1 rounded-[6px]">
                  <div className="w-5 h-5 rounded-full bg-[#7C5CFC]/20 flex items-center justify-center text-[9px] text-[#7C5CFC] font-bold">
                    {user.name[0].toUpperCase()}
                  </div>
                  <span className="text-[12px] text-[#E8E8F0]">{user.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between pt-2 border-t border-[#2A2A38]">
          <Button
            variant="danger"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {t.deleteCard}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? t.saving : t.save}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
