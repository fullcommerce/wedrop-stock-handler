import PQueue from 'p-queue'
export const blingRequestQueue = new PQueue({
  interval: 1000,
  intervalCap: 3,
  concurrency: 1,
})
