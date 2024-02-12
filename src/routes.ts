import { Router, Request, Response } from 'express'
import blingController from './controllers/blingController'
import axios from 'axios'
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

  return response.json({
    message: 'Hello World',
    ip,
  })
})

routes.post('/update', blingController.update)

export default routes
