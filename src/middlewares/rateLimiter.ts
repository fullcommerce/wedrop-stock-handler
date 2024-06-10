import PQueue from 'p-queue'
import { Request, Response, NextFunction } from 'express'
const requestQueue = new PQueue({
  interval: 1000,
  intervalCap: 1,
  concurrency: 1,
})

const rateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  requestQueue.add(() => Promise.resolve()).then(next)
}

export default rateLimitMiddleware
