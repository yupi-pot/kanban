export type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
export type Role = 'OWNER' | 'MEMBER'

export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}

export interface WorkspaceMember {
  id: string
  userId: string
  role: Role
  user: User
}

export interface Workspace {
  id: string
  name: string
  slug: string
  ownerId: string
  members: WorkspaceMember[]
  boards?: Board[]
  _count?: { boards: number }
}

export interface Board {
  id: string
  name: string
  workspaceId: string
  columns?: Column[]
}

export interface Column {
  id: string
  name: string
  order: number
  color: string
  boardId: string
  cards: Card[]
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface CardLabel {
  label: Label
}

export interface CardAssignee {
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>
}

export interface Card {
  id: string
  title: string
  description?: string | null
  order: number
  columnId: string
  priority: Priority
  dueDate?: string | null
  createdById: string
  createdAt: string
  assignees: CardAssignee[]
  labels: CardLabel[]
}
