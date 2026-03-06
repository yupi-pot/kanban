import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'

function parseCookieToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    if (key === 'accessToken') {
      return trimmed.slice(eqIdx + 1).trim()
    }
  }
  return null
}

export function initSocket(io: Server) {
  io.use((socket, next) => {
    // Try auth.token first (sent explicitly from client if available)
    // Then fall back to cookie header
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      parseCookieToken(socket.handshake.headers.cookie)

    if (!token) {
      console.log('[socket] no token found, headers:', socket.handshake.headers.cookie?.slice(0, 50))
      return next(new Error('Unauthorized'))
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      socket.data.userId = payload.userId
      next()
    } catch (err) {
      console.log('[socket] token invalid:', err)
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket: Socket) => {
    console.log('[socket] connected:', socket.id, 'user:', socket.data.userId)

    socket.on('board:join', (boardId: string) => {
      socket.join(boardId)
      console.log('[socket] joined board:', boardId)
    })

    socket.on('board:leave', (boardId: string) => {
      socket.leave(boardId)
    })

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', socket.id, reason)
    })
  })
}
