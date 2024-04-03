import PQueue from 'p-queue'
export const blingRequestQueue = new PQueue({
  interval: 2000,
  intervalCap: 1,
  concurrency: 1,
})
