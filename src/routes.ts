import { Router, Request, Response } from 'express'
import 'express-async-errors'
import blingController from './controllers/blingController'
import blingV3Controller from './controllers/blingV3Controller'
import { ensureAuthenticateUser } from './middlewares/ensureAuthenticateUser'
import rateLimitMiddleware, { rateLimiter } from './middlewares/rateLimiter'
const routes = Router()

routes.get('/', async (request: Request, response: Response) => {
  /* const ip = await axios
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
    }) */

  return response.json({
    message: 'Hello World',
  })
})

routes.post('/update', rateLimitMiddleware, blingController.update)
routes.post('/v3-update', blingV3Controller.updateStock)
routes.get(
  '/bling-v3/wedrop-products',
  ensureAuthenticateUser,
  blingV3Controller.getWeDropProducts,
)

routes.get('/bling-v3/find-new-orders', blingV3Controller.findNewOrders)
routes.get('/bling-v3/import-order', blingV3Controller.importOrder)

routes.post(
  '/bling-v3/send-product',
  ensureAuthenticateUser,
  blingV3Controller.sendProduct,
)
routes.get('/bling-v3/get-product', blingV3Controller.getProduct)
routes.post(
  '/bling-v3/send-custom-product',
  ensureAuthenticateUser,
  blingV3Controller.sendProductWithStructure,
)

routes.post(
  '/bling-v3/add-product-to-store',
  blingV3Controller.addProductToStore,
)
routes.post(
  '/bling-v3/send-variation',
  ensureAuthenticateUser,
  blingV3Controller.sendVariation,
)
routes.post(
  '/bling-v3/send-kit',
  ensureAuthenticateUser,
  blingV3Controller.sendKit,
)
routes.post('/bling-v3/find-product', blingV3Controller.findProduct)
export default routes
