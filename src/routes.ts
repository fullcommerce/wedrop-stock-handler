import { Router, Request, Response } from 'express'
import blingController from './controllers/blingController'
import axios from 'axios'
import { rateLimiter } from './middlewares/rateLimiter'
const routes = Router()

routes.get('/', async (request: Request, response: Response) => {
  const ip = await axios
    .get('https://api.ipify.org?format=json')
    .then((response) => {
      return response.data.ip
    })
    .catch(() => {
      return 'Não foi possível obter o IP'
    })

  const simpleRequest = await axios
    .get('https://webhook.site/1be97876-50c7-48af-959a-2dce1af28063')
    .then((response) => {
      return response.data
    })

  return response.json({
    message: 'Hello World',
    ip,
    simpleRequest,
  })
})

routes.post('/update', blingController.update)

export default routes
