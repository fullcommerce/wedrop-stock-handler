import PQueue from 'p-queue'
export const blingRequestQueue = new PQueue({
  interval: 1000,
  intervalCap: 2,
  concurrency: 2,
})

export const blingV2RequestQueue = new PQueue({
  interval: 1000,
  intervalCap: 1,
  concurrency: 3,
})
