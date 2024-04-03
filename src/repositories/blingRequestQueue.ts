import PQueue from 'p-queue'
export const blingRequestQueue = new PQueue({
  interval: 1000,
  intervalCap: 2,
  concurrency: 1,
})

export const blingV2RequestQueue = new PQueue({
  interval: 1000,
  intervalCap: 3,
  concurrency: 1,
})
