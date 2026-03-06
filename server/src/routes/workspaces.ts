import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

export const workspaceRouter = Router()
workspaceRouter.use(authMiddleware)

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2, 6)
}

workspaceRouter.get('/', async (req: AuthRequest, res: Response) => {
  const workspaces = await prisma.workspace.findMany({
    where: {
      members: { some: { userId: req.userId } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      _count: { select: { boards: true } },
    },
  })
  res.json({ workspaces })
})

const createSchema = z.object({ name: z.string().min(1).max(50) })

workspaceRouter.post('/', async (req: AuthRequest, res: Response) => {
  const result = createSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message })
    return
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: result.data.name,
      slug: slugify(result.data.name),
      ownerId: req.userId!,
      members: {
        create: { userId: req.userId!, role: 'OWNER' },
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      _count: { select: { boards: true } },
    },
  })

  res.status(201).json({ workspace })
})

workspaceRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: req.params.id,
      members: { some: { userId: req.userId } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      boards: true,
    },
  })

  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  res.json({ workspace })
})

workspaceRouter.post('/:id/invite', async (req: AuthRequest, res: Response) => {
  const { email } = req.body
  if (!email) {
    res.status(400).json({ error: 'Email required' })
    return
  }

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId: req.params.id, userId: req.userId, role: 'OWNER' },
  })
  if (!member) {
    res.status(403).json({ error: 'Only owners can invite members' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.params.id, userId: user.id } },
  })
  if (existing) {
    res.status(409).json({ error: 'User already a member' })
    return
  }

  await prisma.workspaceMember.create({
    data: { workspaceId: req.params.id, userId: user.id, role: 'MEMBER' },
  })

  res.json({ ok: true })
})
