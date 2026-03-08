import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

export const boardRouter = Router()
boardRouter.use(authMiddleware)

boardRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const board = await prisma.board.findFirst({
    where: {
      id: req.params.id,
      workspace: { members: { some: { userId: req.userId } } },
    },
    include: {
      workspace: { select: { ownerId: true } },
      columns: {
        orderBy: { order: 'asc' },
        include: {
          cards: {
            orderBy: { order: 'asc' },
            include: {
              assignees: {
                include: { user: { select: { id: true, name: true, avatarUrl: true } } },
              },
              labels: { include: { label: true } },
            },
          },
        },
      },
    },
  })

  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  res.json({ board })
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  workspaceId: z.string(),
})

boardRouter.post('/', async (req: AuthRequest, res: Response) => {
  const result = createSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message })
    return
  }

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId: result.data.workspaceId, userId: req.userId },
  })
  if (!member) {
    res.status(403).json({ error: 'Not a member of this workspace' })
    return
  }

  const board = await prisma.board.create({
    data: {
      name: result.data.name,
      workspaceId: result.data.workspaceId,
      columns: {
        create: [
          { name: 'To Do', order: 0, color: '#6B6B80' },
          { name: 'In Progress', order: 1, color: '#7C5CFC' },
          { name: 'Done', order: 2, color: '#06D6A0' },
        ],
      },
    },
  })

  res.status(201).json({ board })
})

boardRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const board = await prisma.board.findFirst({
    where: {
      id: req.params.id,
      workspace: { members: { some: { userId: req.userId, role: 'OWNER' } } },
    },
  })
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  await prisma.board.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})
