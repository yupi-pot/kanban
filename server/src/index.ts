import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import passport from 'passport'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { authRouter } from './routes/auth'
import { workspaceRouter } from './routes/workspaces'
import { boardRouter } from './routes/boards'
import { columnRouter } from './routes/columns'
import { cardRouter } from './routes/cards'
import { oauthRouter } from './routes/oauth'
import { initSocket } from './socket'

const app = express()
const httpServer = createServer(app)

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? [CLIENT_URL]
      : true,
    credentials: true,
  },
})

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [CLIENT_URL]
    : true,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())
app.use(passport.initialize())

app.use('/api/auth', authRouter)
app.use('/api/auth', oauthRouter)
app.use('/api/workspaces', workspaceRouter)
app.use('/api/boards', boardRouter)
app.use('/api/columns', columnRouter)
app.use('/api/cards', cardRouter)

initSocket(io)

const PORT = process.env.PORT || 5000
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})
