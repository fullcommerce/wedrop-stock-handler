import PQueue from 'p-queue'
export const blingRequestQueue = new PQueue({
  interval: 1700,
  intervalCap: 1,
  concurrency: 1,
})
