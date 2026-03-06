import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { io } from '../index'

export const cardRouter = Router()
cardRouter.use(authMiddleware)

const cardInclude = {
  assignees: {
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  },
  labels: { include: { label: true } },
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  columnId: z.string(),
  boardId: z.string(),
})

cardRouter.post('/', async (req: AuthRequest, res: Response) => {
  const result = createSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message })
    return
  }

  const column = await prisma.column.findFirst({
    where: {
      id: result.data.columnId,
      board: { workspace: { members: { some: { userId: req.userId } } } },
    },
    include: { _count: { select: { cards: true } } },
  })
  if (!column) {
    res.status(403).json({ error: 'Access denied' })
    return
  }

  const card = await prisma.card.create({
    data: {
      title: result.data.title,
      columnId: result.data.columnId,
      order: column._count.cards,
      createdById: req.userId!,
    },
    include: cardInclude,
  })

  io.to(result.data.boardId).emit('card:created', { card, columnId: result.data.columnId })
  res.status(201).json({ card })
})

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  dueDate: z.string().nullable().optional(),
  boardId: z.string(),
})

cardRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  const result = updateSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message })
    return
  }

  const card = await prisma.card.findFirst({
    where: {
      id: req.params.id,
      column: { board: { workspace: { members: { some: { userId: req.userId } } } } },
    },
  })
  if (!card) {
    res.status(404).json({ error: 'Card not found' })
    return
  }

  const { boardId, dueDate, ...rest } = result.data
  const updated = await prisma.card.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    },
    include: cardInclude,
  })

  io.to(boardId).emit('card:updated', updated)
  res.json({ card: updated })
})

cardRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const { boardId } = req.body
  const card = await prisma.card.findFirst({
    where: {
      id: req.params.id,
      column: { board: { workspace: { members: { some: { userId: req.userId } } } } },
    },
  })
  if (!card) {
    res.status(404).json({ error: 'Card not found' })
    return
  }

  await prisma.card.delete({ where: { id: req.params.id } })
  io.to(boardId).emit('card:deleted', { id: req.params.id, columnId: card.columnId })
  res.json({ ok: true })
})

const moveSchema = z.object({
  boardId: z.string(),
  columnId: z.string(),
  order: z.number(),
  sourceColumnId: z.string(),
})

cardRouter.post('/:id/move', async (req: AuthRequest, res: Response) => {
  const result = moveSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: 'Invalid data' })
    return
  }

  const card = await prisma.card.findFirst({
    where: {
      id: req.params.id,
      column: { board: { workspace: { members: { some: { userId: req.userId } } } } },
    },
  })
  if (!card) {
    res.status(404).json({ error: 'Card not found' })
    return
  }

  const { boardId, columnId, order, sourceColumnId } = result.data

  // Shift cards in target column
  await prisma.card.updateMany({
    where: { columnId, order: { gte: order }, id: { not: req.params.id } },
    data: { order: { increment: 1 } },
  })

  const updated = await prisma.card.update({
    where: { id: req.params.id },
    data: { columnId, order },
    include: cardInclude,
  })

  // Reorder source column
  const sourceCards = await prisma.card.findMany({
    where: { columnId: sourceColumnId },
    orderBy: { order: 'asc' },
  })
  await Promise.all(
    sourceCards.map((c, i) => prisma.card.update({ where: { id: c.id }, data: { order: i } }))
  )

  io.to(boardId).emit('card:moved', { card: updated, sourceColumnId })
  res.json({ card: updated })
})

cardRouter.post('/:id/assign', async (req: AuthRequest, res: Response) => {
  const { userId, boardId } = req.body
  if (!userId || !boardId) {
    res.status(400).json({ error: 'userId and boardId required' })
    return
  }

  const card = await prisma.card.findFirst({
    where: {
      id: req.params.id,
      column: { board: { workspace: { members: { some: { userId: req.userId } } } } },
    },
  })
  if (!card) {
    res.status(404).json({ error: 'Card not found' })
    return
  }

  await prisma.cardAssignee.upsert({
    where: { cardId_userId: { cardId: req.params.id, userId } },
    create: { cardId: req.params.id, userId },
    update: {},
  })

  const updated = await prisma.card.findUnique({ where: { id: req.params.id }, include: cardInclude })
  io.to(boardId).emit('card:updated', updated)
  res.json({ card: updated })
})

cardRouter.delete('/:id/assign/:userId', async (req: AuthRequest, res: Response) => {
  const { boardId } = req.body
  await prisma.cardAssignee.deleteMany({
    where: { cardId: req.params.id, userId: req.params.userId },
  })
  const updated = await prisma.card.findUnique({ where: { id: req.params.id }, include: cardInclude })
  if (boardId) io.to(boardId).emit('card:updated', updated)
  res.json({ card: updated })
})
