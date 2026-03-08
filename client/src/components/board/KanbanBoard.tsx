import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { api } from '../../api/client'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useBoardSocket, useSocketStatus } from '../../hooks/useSocket'
import { useT } from '../../store/langStore'
import type { Board, Card, WorkspaceMember } from '../../types'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import { FilterBar } from './FilterBar'
import type { FilterState } from './FilterBar'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'

const DEFAULT_FILTERS: FilterState = { search: '', priorities: [], assigneeIds: [], dueDate: '' }

function isOverdue(dueDate: string | null | undefined) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
}

function isToday(dueDate: string | null | undefined) {
  if (!dueDate) return false
  const d = new Date(dueDate)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isThisWeek(dueDate: string | null | undefined) {
  if (!dueDate) return false
  const d = new Date(dueDate)
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + 7)
  weekEnd.setHours(23, 59, 59, 999)
  return d >= new Date(now.setHours(0, 0, 0, 0)) && d <= weekEnd
}

function filterCard(card: Card, f: FilterState): boolean {
  if (f.search && !card.title.toLowerCase().includes(f.search.toLowerCase())) return false
  if (f.priorities.length > 0 && !f.priorities.includes(card.priority)) return false
  if (f.assigneeIds.length > 0) {
    const cardUserIds = card.assignees?.map((a) => a.user.id) ?? []
    if (!f.assigneeIds.some((id) => cardUserIds.includes(id))) return false
  }
  if (f.dueDate === 'overdue' && !isOverdue(card.dueDate)) return false
  if (f.dueDate === 'today' && !isToday(card.dueDate)) return false
  if (f.dueDate === 'week' && !isThisWeek(card.dueDate)) return false
  return true
}

export function KanbanBoard() {
  const { boardId } = useParams<{ boardId: string }>()
  const { board, columns, setBoard, setColumns, moveCard } = useBoardStore()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const t = useT()
  const isOwner = !!board && !!currentUser && board.workspace?.ownerId === currentUser.id
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [activeFromColId, setActiveFromColId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [addColOpen, setAddColOpen] = useState(false)
  const [colName, setColName] = useState('')
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  useBoardSocket(boardId)
  const socketConnected = useSocketStatus()

  const { data, isLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => api.get(`/boards/${boardId}`).then((r) => r.data.board as Board),
    enabled: !!boardId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  // Fetch workspace members for filter
  const { data: wsData } = useQuery({
    queryKey: ['workspace', board?.workspaceId],
    queryFn: () => api.get(`/workspaces/${board!.workspaceId}`).then((r) => r.data.workspace),
    enabled: !!board?.workspaceId,
    staleTime: 60_000,
  })
  const members: WorkspaceMember[] = wsData?.members ?? []

  // Only sync store on initial board load, not on every re-render
  const initializedRef = useRef(false)
  useEffect(() => {
    if (data && !initializedRef.current) {
      initializedRef.current = true
      setBoard(data)
      setColumns(data.columns || [])
    }
  }, [data])

  // Reset when switching boards and clear cache so we always fetch fresh data on return
  useEffect(() => {
    initializedRef.current = false
    setFilters(DEFAULT_FILTERS)
    return () => {
      queryClient.removeQueries({ queryKey: ['board', boardId] })
    }
  }, [boardId])

  const addColMutation = useMutation({
    mutationFn: (name: string) => api.post('/columns', { name, boardId }),
    onSuccess: () => { setAddColOpen(false); setColName('') },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function onDragStart({ active }: DragStartEvent) {
    const col = columns.find((c) => c.cards.some((k) => k.id === active.id))
    const card = col?.cards.find((k) => k.id === active.id)
    if (card && col) {
      setActiveCard(card)
      setActiveFromColId(col.id)
    }
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) { setOverId(null); return }
    setOverId(String(over.id))

    if (active.id === over.id) return

    const fromCol = columns.find((c) => c.cards.some((k) => k.id === active.id))
    const toCol = columns.find((c) => c.id === over.id || c.cards.some((k) => k.id === over.id))

    if (!fromCol || !toCol) return

    if (fromCol.id !== toCol.id) {
      // Cross-column: move card to destination at hover position
      const toIndex = over.id === toCol.id
        ? toCol.cards.length
        : toCol.cards.findIndex((k) => k.id === over.id)
      moveCard(String(active.id), fromCol.id, toCol.id, toIndex >= 0 ? toIndex : toCol.cards.length)
    } else {
      // Same column: reposition card within the column
      if (over.id === toCol.id) {
        // Hovering over column empty area → move to end
        const fromIndex = fromCol.cards.findIndex((k) => k.id === active.id)
        if (fromIndex !== fromCol.cards.length - 1) {
          moveCard(String(active.id), fromCol.id, toCol.id, fromCol.cards.length)
        }
      } else {
        const fromIndex = fromCol.cards.findIndex((k) => k.id === active.id)
        const toIndex = fromCol.cards.findIndex((k) => k.id === over.id)
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          moveCard(String(active.id), fromCol.id, toCol.id, toIndex)
        }
      }
    }
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    const sourceColId = activeFromColId
    setActiveCard(null)
    setActiveFromColId(null)
    setOverId(null)
    if (!over || !sourceColId) return
    if (active.id === over.id) return

    // Store already has final state from onDragOver — just read it and save
    const toCol = columns.find((c) => c.cards.some((k) => k.id === active.id))
    if (!toCol) return

    const toIndex = toCol.cards.findIndex((k) => k.id === active.id)

    await api.post(`/cards/${active.id}/move`, {
      boardId,
      columnId: toCol.id,
      order: toIndex >= 0 ? toIndex : 0,
      sourceColumnId: sourceColId,
    }).catch(console.error)
  }

  const hasActiveFilters = filters.search !== '' || filters.priorities.length > 0 || filters.assigneeIds.length > 0 || filters.dueDate !== ''

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#7C5CFC] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 py-4 border-b border-[#2A2A38] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[17px] font-semibold text-[#E8E8F0]">{board?.name}</h1>
          <div
            title={socketConnected ? 'Realtime connected' : 'Realtime disconnected'}
            className={`w-2 h-2 rounded-full transition-colors duration-500 ${socketConnected ? 'bg-[#06D6A0]' : 'bg-[#6B6B80]'}`}
          />
        </div>
        <Button size="sm" onClick={() => setAddColOpen(true)}>{t.addColumn}</Button>
      </div>

      <FilterBar filters={filters} onChange={setFilters} members={members} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 p-6 h-full">
            <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              {columns.map((col) => {
                const filteredCards = hasActiveFilters
                  ? col.cards.filter((card) => filterCard(card, filters))
                  : undefined
                return (
                  <KanbanColumn
                    key={col.id}
                    column={col}
                    boardId={boardId!}
                    activeCardId={activeCard?.id ?? null}
                    overId={overId}
                    canDelete={isOwner}
                    filteredCards={filteredCards}
                  />
                )
              })}
            </SortableContext>
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.4,0,0.2,1)' }}>
          {activeCard && (
            <KanbanCard card={activeCard} boardId={boardId!} isDragging />
          )}
        </DragOverlay>
      </DndContext>

      <Modal open={addColOpen} onClose={() => setAddColOpen(false)} title={t.addColumnTitle}>
        <form onSubmit={(e) => { e.preventDefault(); addColMutation.mutate(colName) }} className="flex flex-col gap-4">
          <Input label={t.columnName} placeholder="To Do" value={colName} onChange={(e) => setColName(e.target.value)} autoFocus />
          <Button type="submit" disabled={!colName || addColMutation.isPending} className="w-full justify-center">
            {addColMutation.isPending ? t.adding : t.add}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
