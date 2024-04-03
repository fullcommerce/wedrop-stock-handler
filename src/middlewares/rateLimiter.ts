import PQueue from 'p-queue'
import { Request, Response, NextFunction } from 'express'
const requestQueue = new PQueue({
  interval: 1000,
  intervalCap: 3,
  concurrency: 1,
})

const rateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log('v2 queue size', requestQueue.size)
  requestQueue.add(() => Promise.resolve()).then(next)
}

export default rateLimitMiddleware
