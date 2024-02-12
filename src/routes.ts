import { Router, Request, Response } from 'express'
import blingController from './controllers/blingController'
const routes = Router()

routes.get('/', (request: Request, response: Response) => {
  return response.json({ message: 'Hello World' })
})

routes.post('/update', blingController.update)

export default routes
