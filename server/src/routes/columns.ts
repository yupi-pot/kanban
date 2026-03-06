import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { io } from '../index'

export const columnRouter = Router()
columnRouter.use(authMiddleware)

const createSchema = z.object({
  name: z.string().min(1).max(50),
  boardId: z.string(),
})

columnRouter.post('/', async (req: AuthRequest, res: Response) => {
  const result = createSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message })
    return
  }

  const board = await prisma.board.findFirst({
    where: {
      id: result.data.boardId,
      workspace: { members: { some: { userId: req.userId } } },
    },
    include: { _count: { select: { columns: true } } },
  })
  if (!board) {
    res.status(403).json({ error: 'Access denied' })
    return
  }

  const column = await prisma.column.create({
    data: {
      name: result.data.name,
      boardId: result.data.boardId,
      order: board._count.columns,
    },
    include: { cards: true },
  })

  io.to(result.data.boardId).emit('column:created', column)
  res.status(201).json({ column })
})

columnRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { name, color } = req.body

  const column = await prisma.column.findFirst({
    where: {
      id: req.params.id,
      board: { workspace: { members: { some: { userId: req.userId } } } },
    },
    include: { board: true },
  })
  if (!column) {
    res.status(404).json({ error: 'Column not found' })
    return
  }

  const updated = await prisma.column.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(color && { color }) },
    include: { cards: true },
  })

  io.to(column.boardId).emit('column:updated', updated)
  res.json({ column: updated })
})

columnRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const column = await prisma.column.findFirst({
    where: {
      id: req.params.id,
      board: { workspace: { members: { some: { userId: req.userId } } } },
    },
  })
  if (!column) {
    res.status(404).json({ error: 'Column not found' })
    return
  }

  await prisma.column.delete({ where: { id: req.params.id } })
  io.to(column.boardId).emit('column:deleted', { id: req.params.id, boardId: column.boardId })
  res.json({ ok: true })
})

const reorderSchema = z.object({
  boardId: z.string(),
  columns: z.array(z.object({ id: z.string(), order: z.number() })),
})

columnRouter.post('/reorder', async (req: AuthRequest, res: Response) => {
  const result = reorderSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: 'Invalid data' })
    return
  }

  const board = await prisma.board.findFirst({
    where: {
      id: result.data.boardId,
      workspace: { members: { some: { userId: req.userId } } },
    },
  })
  if (!board) {
    res.status(403).json({ error: 'Access denied' })
    return
  }

  await Promise.all(
    result.data.columns.map(({ id, order }) =>
      prisma.column.update({ where: { id }, data: { order } })
    )
  )

  io.to(result.data.boardId).emit('columns:reordered', result.data.columns)
  res.json({ ok: true })
})
