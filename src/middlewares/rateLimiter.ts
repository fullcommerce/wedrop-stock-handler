import PQueue from 'p-queue'
import { Request, Response, NextFunction } from 'express'
const requestQueue = new PQueue({
  interval: 1000,
  intervalCap: 5,
  concurrency: 1,
})
let count = 0

const rateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  /* console.log('[BLING V2] - QUEUE SIZE: ', requestQueue.size)
  console.log('[BLING V2] - ADDING REQUEST TO QUEUE ' + req.url) */
  requestQueue.on('add', () => {
    console.log(
      `[BLING V2] Working on item #${++count}.  Size: ${requestQueue.size}  Pending: ${requestQueue.pending}`,
    )
  })
  requestQueue.add(() => Promise.resolve()).then(next)
}

export default rateLimitMiddleware
