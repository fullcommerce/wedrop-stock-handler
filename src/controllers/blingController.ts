import { Request, Response } from 'express'
import { Bling } from '../repositories/bling-v2'
import { prisma } from '../database/prismaClient'

export default {
  async update(request: Request, response: Response) {
    const { sku, apikey, stock } = request.body

    const blingConnection = new Bling(apikey)
    const dbIntegrations = await prisma.integrations.findMany({
      where: {
        keyword: 'bling',
        status: 1,
      },
    })

    const integrations = dbIntegrations.map((integration) => {
      const params: any = JSON.parse(integration.params)
      return {
        ...integration,
        params,
      }
    })

    const integration = integrations.find((i) => {
      return i.params.apikey === apikey
    })
    if (!integration) {
      return response.status(400).json({ erro: 'apikey não encontrada' })
    }

    const blingResponse = await blingConnection.updateStock({
      product: { sku, stock },
    })

    if (blingResponse === 'excedeu o espaço') {
      await prisma.integrations.update({
        where: {
          id: integration.id,
        },
        data: {
          status: 0,
        },
      })
      return response
        .status(200)
        .json({ success: true, erro: 'excedeu o espaço' })
    }

    if (blingResponse?.erro) {
      if (blingResponse.error?.retorno?.erros?.erro?.cod === 3) {
        await prisma.integrations.update({
          where: {
            id: integration.id,
          },
          data: {
            status: 0,
          },
        })
        return response
          .status(200)
          .json({ success: true, erro: 'apikey inválida' })
      }

      if (blingResponse.error?.retorno?.erros?.erro?.cod === 16) {
        await prisma.integrations.update({
          where: {
            id: integration.id,
          },
          data: {
            status: 0,
          },
        })
        return response
          .status(200)
          .json({ success: true, erro: 'conta inativa' })
      }

      return response.status(400).json(blingResponse)
    }
    return response.json({ success: true, ...blingResponse })

    /* 
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
        return {
          success: true,
          remoteAddress: request.connection.remoteAddress || 'Não informado',
        }
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
    return response.json(blingResponse) */
  },
}
