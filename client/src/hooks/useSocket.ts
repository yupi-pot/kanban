import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useBoardStore } from '../store/boardStore'
import type { Card, Column } from '../types'

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['polling', 'websocket'], // polling first so cookies work reliably
    })

    socket.on('connect', () => console.log('[socket] connected', socket?.id))
    socket.on('connect_error', (err) => console.warn('[socket] connect error:', err.message))
    socket.on('disconnect', (reason) => console.log('[socket] disconnected:', reason))
  }
  return socket
}

export function useSocketStatus() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const s = getSocket()
    setConnected(s.connected)
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
    }
  }, [])

  return connected
}

export function useBoardSocket(boardId: string | undefined) {
  const {
    addColumn, updateColumn, removeColumn,
    addCard, updateCard, removeCard, moveCard, setColumns,
  } = useBoardStore()

  const boardIdRef = useRef(boardId)
  boardIdRef.current = boardId

  useEffect(() => {
    if (!boardId) return

    const s = getSocket()

    function joinBoard() {
      console.log('[socket] joining board:', boardIdRef.current)
      s.emit('board:join', boardIdRef.current)
    }

    if (s.connected) joinBoard()
    s.on('connect', joinBoard)

    const onColumnCreated = (column: Column) => addColumn(column)
    const onColumnUpdated = (column: Column) => updateColumn(column)
    const onColumnDeleted = ({ id }: { id: string }) => removeColumn(id)
    const onColumnsReordered = (cols: { id: string; order: number }[]) => {
      const current = useBoardStore.getState().columns
      setColumns(
        current
          .map((c) => ({ ...c, order: cols.find((x) => x.id === c.id)?.order ?? c.order }))
          .sort((a, b) => a.order - b.order)
      )
    }
    const onCardCreated = ({ card, columnId }: { card: Card; columnId: string }) => {
      const exists = useBoardStore.getState().columns
        .find(c => c.id === columnId)?.cards.some(k => k.id === card.id)
      if (!exists) addCard(card, columnId)
    }
    const onCardUpdated = (card: Card) => updateCard(card)
    const onCardDeleted = ({ id, columnId }: { id: string; columnId: string }) => removeCard(id, columnId)
    const onCardMoved = ({ card, sourceColumnId }: { card: Card; sourceColumnId: string }) => {
      const inSource = useBoardStore.getState().columns
        .find(c => c.id === sourceColumnId)?.cards.some(k => k.id === card.id)
      if (inSource) {
        // Another user moved this card — apply the full move
        moveCard(card.id, sourceColumnId, card.columnId, card.order)
      } else {
        // Current user moved this card optimistically — sync server-authoritative order
        updateCard(card)
      }
    }

    s.on('column:created', onColumnCreated)
    s.on('column:updated', onColumnUpdated)
    s.on('column:deleted', onColumnDeleted)
    s.on('columns:reordered', onColumnsReordered)
    s.on('card:created', onCardCreated)
    s.on('card:updated', onCardUpdated)
    s.on('card:deleted', onCardDeleted)
    s.on('card:moved', onCardMoved)

    return () => {
      s.off('connect', joinBoard)
      s.off('column:created', onColumnCreated)
      s.off('column:updated', onColumnUpdated)
      s.off('column:deleted', onColumnDeleted)
      s.off('columns:reordered', onColumnsReordered)
      s.off('card:created', onCardCreated)
      s.off('card:updated', onCardUpdated)
      s.off('card:deleted', onCardDeleted)
      s.off('card:moved', onCardMoved)
      s.emit('board:leave', boardId)
    }
  }, [boardId])
}
