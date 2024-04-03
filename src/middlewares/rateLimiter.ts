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
  console.log('[BLING V2] - QUEUE SIZE: ', requestQueue.size)
  console.log('[BLING V2] - ADDING REQUEST TO QUEUE ' + req.url)

  requestQueue.add(() => Promise.resolve()).then(next)
}

export default rateLimitMiddleware
