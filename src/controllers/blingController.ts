import { Bling } from 'bling-erp-api'
import { Request, Response } from 'express'

export default {
  async update(request: Request, response: Response) {
    const { sku, apikey, stock } = request.body
    const blingConnection = new Bling(apikey)
    // disable typescript verification

    const sdata: any = {
      estoque: stock,
      codigo: sku,
    }

    const blingResponse = await blingConnection
      .products()
      .update(sku, sdata)
      .then(() => {
        return { success: true }
      })
      .catch((err) => {
        const errors = err.data?.errors[0]
        const code = errors?.code * 1
        return {
          success: false,
          code,
          data: err,
        }
      })

    if (blingResponse.success === false) {
      return response.status(400).json(blingResponse)
    }
    return response.json({
      blingResponse,
    })
  },
}
