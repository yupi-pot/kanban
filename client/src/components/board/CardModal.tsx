import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useBoardStore } from '../../store/boardStore'
import { useT } from '../../store/langStore'
import type { Card, Priority, WorkspaceMember, ChecklistItem } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { PriorityBadge } from '../ui/Badge'
import { DatePicker } from '../ui/DatePicker'

const PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

const LABEL_COLORS = [
  '#FF4D6A', '#FF8A00', '#FFD700', '#06D6A0',
  '#00B4D8', '#7C5CFC', '#FF6B9D', '#9B59B6',
]

interface Comment {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string; avatarUrl?: string | null }
}

interface Props {
  card: Card
  boardId: string
  open: boolean
  onClose: () => void
}

export function CardModal({ card, boardId, open, onClose }: Props) {
  const { board, updateCard, removeCard } = useBoardStore()
  const t = useT()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [priority, setPriority] = useState<Priority>(card.priority)
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.split('T')[0] : '')
  const [saved, setSaved] = useState(false)

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(card.checklistItems ?? [])
  const [newItemText, setNewItemText] = useState('')

  // Label add state
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [labelName, setLabelName] = useState('')
  const [labelColor, setLabelColor] = useState(LABEL_COLORS[0])

  // Comment state
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    setTitle(card.title)
    setDescription(card.description || '')
    setPriority(card.priority)
    setDueDate(card.dueDate ? card.dueDate.split('T')[0] : '')
    setChecklistItems(card.checklistItems ?? [])
  }, [card])

  // Fetch workspace members
  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', board?.workspaceId],
    queryFn: () => api.get(`/workspaces/${board!.workspaceId}`).then(r => r.data.workspace),
    enabled: !!board?.workspaceId && open,
    staleTime: 60_000,
  })
  const members: WorkspaceMember[] = workspaceData?.members ?? []

  // Fetch comments
  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['comments', card.id],
    queryFn: () => api.get(`/cards/${card.id}/comments`).then(r => r.data.comments as Comment[]),
    enabled: open,
    staleTime: 0,
  })
  const comments = commentsData ?? []

  const assignedIds = new Set(card.assignees?.map(a => a.user.id) ?? [])

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/cards/${card.id}`, {
      title,
      description,
      priority,
      dueDate: dueDate || null,
      checklistItems,
      boardId,
    }),
    onSuccess: (res) => {
      updateCard(res.data.card)
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 900)
    },
  })

  const assignMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/cards/${card.id}/assign`, { userId, boardId }),
    onSuccess: (res) => updateCard(res.data.card),
  })

  const unassignMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/cards/${card.id}/assign/${userId}`, { data: { boardId } }),
    onSuccess: (res) => updateCard(res.data.card),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/cards/${card.id}`, { data: { boardId } }),
    onSuccess: () => { removeCard(card.id, card.columnId); onClose() },
  })

  const addLabelMutation = useMutation({
    mutationFn: () => api.post(`/cards/${card.id}/labels`, { name: labelName.trim(), color: labelColor, boardId }),
    onSuccess: (res) => {
      updateCard(res.data.card)
      setLabelName('')
      setShowLabelForm(false)
    },
  })

  const removeLabelMutation = useMutation({
    mutationFn: (labelId: string) => api.delete(`/cards/${card.id}/labels/${labelId}`, { data: { boardId } }),
    onSuccess: (res) => updateCard(res.data.card),
  })

  const addCommentMutation = useMutation({
    mutationFn: () => api.post(`/cards/${card.id}/comments`, { content: commentText.trim(), boardId }),
    onSuccess: () => {
      setCommentText('')
      refetchComments()
    },
  })

  function toggleAssignee(userId: string) {
    if (assignedIds.has(userId)) {
      unassignMutation.mutate(userId)
    } else {
      assignMutation.mutate(userId)
    }
  }

  function addChecklistItem() {
    if (!newItemText.trim()) return
    const item: ChecklistItem = { id: Date.now().toString(), text: newItemText.trim(), done: false }
    setChecklistItems(prev => [...prev, item])
    setNewItemText('')
  }

  function toggleChecklistItem(id: string) {
    setChecklistItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item))
  }

  function removeChecklistItem(id: string) {
    setChecklistItems(prev => prev.filter(item => item.id !== id))
  }

  const doneCnt = checklistItems.filter(i => i.done).length
  const totalCnt = checklistItems.length
  const checklistPct = totalCnt > 0 ? Math.round((doneCnt / totalCnt) * 100) : 0

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
                onClick={() => setPriority(p)}
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
          <DatePicker value={dueDate} onChange={setDueDate} />
        </div>

        {/* Description */}
        <div>
          <p className="text-[11px] font-semibold text-[#6B6B80] uppercase tracking-wider mb-2">{t.description}</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder={t.addDescription}
            className="w-full bg-[#0F0F13] border border-[#2A2A38] rounded-[8px] px-3 py-2 text-[13px] text-[#E8E8F0] placeholder:text-[#6B6B80] outline-none focus:border-[#7C5CFC] transition-colors resize-none"
          />
        </div>

        {/* Assignees */}
        {members.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[#6B6B80] uppercase tracking-wider mb-2">{t.assignees}</p>
            <div className="flex flex-col gap-1">
              {members.map(({ user }) => {
                const isAssigned = assignedIds.has(user.id)
                const isPending = assignMutation.isPending || unassignMutation.isPending
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleAssignee(user.id)}
                    disabled={isPending}
                    className={`
                      flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] transition-all text-left cursor-pointer disabled:opacity-60
                      ${isAssigned
                        ? 'bg-[#7C5CFC]/10 border border-[#7C5CFC]/30 hover:bg-[#7C5CFC]/15'
                        : 'bg-[#0F0F13] border border-[#2A2A38] hover:border-[#3A3A50] hover:bg-[#2A2A38]/40'
                      }
                    `}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isAssigned ? 'bg-[#7C5CFC] text-white' : 'bg-[#2A2A38] text-[#6B6B80]'}`}>
                      {user.name[0].toUpperCase()}
                    </div>
                    <span className={`text-[13px] flex-1 ${isAssigned ? 'text-[#E8E8F0]' : 'text-[#9B9BAA]'}`}>
                      {user.name}
                    </span>
                    {isAssigned && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Labels */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-[#6B6B80] uppercase tracking-wider">{t.labels}</p>
            <button
              onClick={() => setShowLabelForm(!showLabelForm)}
              className="text-[11px] text-[#7C5CFC] hover:text-[#9B7FFF] transition-colors cursor-pointer"
            >
              + {t.addLabel}
            </button>
          </div>

          {/* Existing labels */}
          {card.labels && card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {card.labels.map(({ label }) => (
                <span
                  key={label.id}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[4px] text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                  <button
                    onClick={() => removeLabelMutation.mutate(label.id)}
                    disabled={removeLabelMutation.isPending}
                    className="hover:opacity-70 transition-opacity cursor-pointer ml-0.5 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add label form */}
          {showLabelForm && (
            <div className="bg-[#0F0F13] border border-[#2A2A38] rounded-[8px] p-3 flex flex-col gap-2">
              <input
                type="text"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                placeholder={t.labelName}
                className="bg-[#1A1A24] border border-[#2A2A38] rounded-[6px] px-2.5 py-1.5 text-[13px] text-[#E8E8F0] placeholder:text-[#6B6B80] outline-none focus:border-[#7C5CFC] transition-colors"
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setLabelColor(c)}
                    className={`w-6 h-6 rounded-full transition-all cursor-pointer ${labelColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0F0F13] scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addLabelMutation.mutate()}
                  disabled={!labelName.trim() || addLabelMutation.isPending}
                  className="flex-1 bg-[#7C5CFC] hover:bg-[#9B7FFF] text-white text-[12px] py-1.5 rounded-[6px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {t.add}
                </button>
                <button
                  onClick={() => { setShowLabelForm(false); setLabelName('') }}
                  className="flex-1 bg-[#2A2A38] text-[#6B6B80] hover:text-[#E8E8F0] text-[12px] py-1.5 rounded-[6px] transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-[#6B6B80] uppercase tracking-wider">{t.checklist}</p>
            {totalCnt > 0 && (
              <span className="text-[11px] text-[#6B6B80]">{doneCnt}/{totalCnt}</span>
            )}
          </div>

          {totalCnt > 0 && (
            <div className="mb-3">
              <div className="w-full bg-[#2A2A38] rounded-full h-1.5 mb-0.5">
                <div
                  className="bg-[#06D6A0] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${checklistPct}%` }}
                />
              </div>
              <span className="text-[10px] text-[#6B6B80]">{checklistPct}%</span>
            </div>
          )}

          <div className="flex flex-col gap-1 mb-2">
            {checklistItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 group/item">
                <button
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    item.done
                      ? 'bg-[#06D6A0] border-[#06D6A0]'
                      : 'border-[#3A3A50] hover:border-[#7C5CFC]'
                  }`}
                >
                  {item.done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
                <span className={`text-[13px] flex-1 ${item.done ? 'line-through text-[#6B6B80]' : 'text-[#E8E8F0]'}`}>
                  {item.text}
                </span>
                <button
                  onClick={() => removeChecklistItem(item.id)}
                  className="opacity-0 group-hover/item:opacity-100 text-[#6B6B80] hover:text-[#FF4D6A] transition-all cursor-pointer text-[14px] leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
              placeholder={t.addItem}
              className="flex-1 bg-[#0F0F13] border border-[#2A2A38] rounded-[6px] px-2.5 py-1.5 text-[13px] text-[#E8E8F0] placeholder:text-[#6B6B80] outline-none focus:border-[#7C5CFC] transition-colors"
            />
            <button
              onClick={addChecklistItem}
              disabled={!newItemText.trim()}
              className="px-3 py-1.5 bg-[#2A2A38] text-[#6B6B80] hover:text-[#E8E8F0] hover:bg-[#3A3A50] text-[13px] rounded-[6px] transition-colors cursor-pointer disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        {/* Comments */}
        <div>
          <p className="text-[11px] font-semibold text-[#6B6B80] uppercase tracking-wider mb-2">{t.comments}</p>

          {comments.length > 0 && (
            <div className="flex flex-col gap-2 mb-3 max-h-40 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#7C5CFC]/20 flex items-center justify-center text-[#7C5CFC] text-[10px] font-bold shrink-0 mt-0.5">
                    {c.user.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[12px] font-medium text-[#E8E8F0]">{c.user.name}</span>
                      <span className="text-[10px] text-[#6B6B80]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#C8C8D8] mt-0.5 break-words">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && commentText.trim() && addCommentMutation.mutate()}
              placeholder={t.addComment}
              className="flex-1 bg-[#0F0F13] border border-[#2A2A38] rounded-[6px] px-2.5 py-1.5 text-[13px] text-[#E8E8F0] placeholder:text-[#6B6B80] outline-none focus:border-[#7C5CFC] transition-colors"
            />
            <button
              onClick={() => addCommentMutation.mutate()}
              disabled={!commentText.trim() || addCommentMutation.isPending}
              className="px-3 py-1.5 bg-[#7C5CFC] hover:bg-[#9B7FFF] text-white text-[13px] rounded-[6px] transition-colors cursor-pointer disabled:opacity-50"
            >
              {t.send}
            </button>
          </div>
        </div>

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
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || saved}
            style={saved ? { background: '#06D6A0' } : undefined}
          >
            {saved ? t.saved : updateMutation.isPending ? t.saving : t.save}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
