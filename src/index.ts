import express, { Request, Response, NextFunction } from 'express'
import routes from './routes'
import { config } from  'dotenv'
config()
const app = express()
app.use(
  express.json({
    limit: '200mb',
  }),
)
app.use(routes)
app.use(
  (err: Error, request: Request, response: Response, next: NextFunction) => {
    console.log('teste')
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
app.listen(process.env.PORT, () => {
  console.log(`Server started on port ${process.env.PORT}`)
})
