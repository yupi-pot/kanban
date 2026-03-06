import { Router, Request, Response } from 'express'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma/client'

export const oauthRouter = Router()

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' })
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' })
  return { accessToken, refreshToken }
}

function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
  })
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: REFRESH_TOKEN_TTL_MS,
  })
}

async function findOrCreateUser(profile: {
  provider: string
  providerId: string
  email: string
  name: string
  avatarUrl?: string
}) {
  // Try to find by provider ID stored in email field pattern or by email
  let user = await prisma.user.findFirst({
    where: { email: profile.email },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        passwordHash: '', // OAuth users have no password
        avatarUrl: profile.avatarUrl,
      },
    })
  } else if (profile.avatarUrl && !user.avatarUrl) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: profile.avatarUrl },
    })
  }

  return user
}

// Google Strategy
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value
      if (!email) return done(new Error('No email from Google'))

      const user = await findOrCreateUser({
        provider: 'google',
        providerId: profile.id,
        email,
        name: profile.displayName || email.split('@')[0],
        avatarUrl: profile.photos?.[0]?.value,
      })

      done(null, user)
    } catch (e) {
      done(e as Error)
    }
  }
))

// GitHub Strategy
passport.use(new GitHubStrategy(
  {
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/github/callback`,
    scope: ['user:email'],
  },
  async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value || `github_${profile.id}@placeholder.com`

      const user = await findOrCreateUser({
        provider: 'github',
        providerId: profile.id,
        email,
        name: profile.displayName || profile.username || email.split('@')[0],
        avatarUrl: profile.photos?.[0]?.value,
      })

      done(null, user)
    } catch (e) {
      done(e as Error)
    }
  }
))

// Google routes
oauthRouter.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}))

oauthRouter.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=oauth` }),
  async (req: Request, res: Response) => {
    const user = req.user as any
    const { accessToken, refreshToken } = generateTokens(user.id)

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    })

    setTokenCookies(res, accessToken, refreshToken)
    res.redirect(CLIENT_URL)
  }
)

// GitHub routes
oauthRouter.get('/github', passport.authenticate('github', {
  scope: ['user:email'],
  session: false,
}))

oauthRouter.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${CLIENT_URL}/login?error=oauth` }),
  async (req: Request, res: Response) => {
    const user = req.user as any
    const { accessToken, refreshToken } = generateTokens(user.id)

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    })

    setTokenCookies(res, accessToken, refreshToken)
    res.redirect(CLIENT_URL)
  }
)
