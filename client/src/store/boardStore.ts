import { create } from 'zustand'
import type { Board, Column, Card } from '../types'

interface BoardState {
  board: Board | null
  columns: Column[]
  setBoard: (board: Board) => void
  setColumns: (columns: Column[]) => void
  addColumn: (column: Column) => void
  updateColumn: (column: Column) => void
  removeColumn: (id: string) => void
  addCard: (card: Card, columnId: string) => void
  updateCard: (card: Card) => void
  removeCard: (id: string, columnId: string) => void
  moveCard: (cardId: string, fromColumnId: string, toColumnId: string, order: number) => void
}

export const useBoardStore = create<BoardState>((set) => ({
  board: null,
  columns: [],

  setBoard: (board) => set({ board }),
  setColumns: (columns) => set({ columns }),

  addColumn: (column) =>
    set((s) => ({ columns: [...s.columns, { ...column, cards: [] }] })),

  updateColumn: (column) =>
    set((s) => ({
      columns: s.columns.map((c) => (c.id === column.id ? { ...c, ...column } : c)),
    })),

  removeColumn: (id) =>
    set((s) => ({ columns: s.columns.filter((c) => c.id !== id) })),

  addCard: (card, columnId) =>
    set((s) => ({
      columns: s.columns.map((c) =>
        c.id === columnId ? { ...c, cards: [...c.cards, card] } : c
      ),
    })),

  updateCard: (card) =>
    set((s) => ({
      columns: s.columns.map((c) => ({
        ...c,
        cards: c.cards.map((k) => (k.id === card.id ? card : k)),
      })),
    })),

  removeCard: (id, columnId) =>
    set((s) => ({
      columns: s.columns.map((c) =>
        c.id === columnId ? { ...c, cards: c.cards.filter((k) => k.id !== id) } : c
      ),
    })),

  moveCard: (cardId, fromColumnId, toColumnId, order) =>
    set((s) => {
      const fromColumn = s.columns.find((c) => c.id === fromColumnId)
      const card = fromColumn?.cards.find((k) => k.id === cardId)
      if (!card) return s

      // Same column reorder
      if (fromColumnId === toColumnId) {
        return {
          columns: s.columns.map((c) => {
            if (c.id !== fromColumnId) return c
            const filtered = c.cards.filter((k) => k.id !== cardId)
            filtered.splice(order, 0, { ...card, order })
            return { ...c, cards: filtered }
          }),
        }
      }

      // Cross-column move
      return {
        columns: s.columns.map((c) => {
          if (c.id === fromColumnId) {
            return { ...c, cards: c.cards.filter((k) => k.id !== cardId) }
          }
          if (c.id === toColumnId) {
            const newCards = [...c.cards]
            newCards.splice(order, 0, { ...card, columnId: toColumnId, order })
            return { ...c, cards: newCards }
          }
          return c
        }),
      }
    }),
}))
