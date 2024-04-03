import PQueue from 'p-queue'
export const blingRequestQueue = new PQueue({
  interval: 1000,
  intervalCap: 2,
  concurrency: 1,
})
let count = 0

blingRequestQueue.on('add', () => {
  console.log(
    `[BLING V3] Working on item #${++count}.  Size: ${blingRequestQueue.size}  Pending: ${blingRequestQueue.pending}`,
  )
})
