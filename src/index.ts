import express, { Request, Response, NextFunction } from 'express'
import 'express-async-errors'
import routes from './routes'
import { config } from 'dotenv'
import cors from 'cors'
import { prisma } from './database/prismaClient'
import { BlingV3 } from './repositories/bling-v3'
config()
const app = express()
app.use(cors())
app.use(
  express.json({
    limit: '200mb',
  }),
)
app.use(
  (err: Error, request: Request, response: Response, next: NextFunction) => {
    if (err instanceof SyntaxError) {
      return response.status(400).json({
        error: 'Invalid JSON',
        response: response?.data,
      })
    }
    if (err instanceof Error) {
      return response.status(400).json({
        error: err.message,
        err,
      })
    }

    return response.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
      err,
    })
  },
)
app.use(routes)

const now = new Date()
now.setHours(now.getHours() - 3)
app.listen(process.env.PORT, () => {
  console.log(
    `Server started on port ${process.env.PORT} at ${now.toLocaleString('pt-BR')}`,
  )
  console.log('Press Ctrl+C to quit!!!!!')
})

async function updateAllTokens() {
  const now = new Date()
  now.setHours(now.getHours() - 3)
  const twohoursbefore = new Date(now)
  twohoursbefore.setHours(twohoursbefore.getHours() - 2)

  const integrations = await prisma.integrations.findMany({
    where: {
      keyword: 'blingv3',
      update_date: {
        lte: twohoursbefore,
      },
    },
    orderBy: {
      id: 'desc',
    },
  })
  console.log(`${integrations.length} integrações no total`)
  let i = 0
  for (const integration of integrations) {
    const params = JSON.parse(integration?.params)
    if (!params?.access_token || !params?.refresh_token) {
      console.log('No tokens found for integration', integration.id)
      continue
    }
    const blingClient = new BlingV3(
      params.access_token,
      params.refresh_token,
      Number(integration.id),
    )

    await blingClient.updateToken().catch()
    i++
    console.log(`Token ${i} of ${integrations.length} updated`)
    // wait random between 5 and 10 seconds
    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * 5000) + 1000),
    )
  }
}
updateAllTokens()
