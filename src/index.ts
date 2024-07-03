import express, { Request, Response, NextFunction } from 'express'
import 'express-async-errors'
import routes from './routes'
import { config } from 'dotenv'
import cors from 'cors'
import { verifyOrders } from './verifyNotInformedChannelsOrders'
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
setInterval(verifyOrders, 1000)
