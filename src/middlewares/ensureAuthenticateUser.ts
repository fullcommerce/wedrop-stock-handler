import { NextFunction, Request, Response } from 'express'
import { verify } from 'jsonwebtoken'

interface IPayload {
  sub: string
}

export async function ensureAuthenticateUser(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authHeader = request.headers.authorization

  if (!authHeader) {
    throw new Error('Token missing')
  }

  const [, token] = authHeader.split(' ')

  try {
    const { sub } = verify(token, 'vendersemestoque') as IPayload
    request.body.userId = parseInt(sub)
    request.body.wedropToken = token
    return next()
  } catch (err) {
    throw new Error('Invalid token')
  }
}
