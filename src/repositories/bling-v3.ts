import axios, { AxiosError, AxiosInstance } from 'axios'
import { config } from 'dotenv'
import { prisma } from '../database/prismaClient'
import { blingRequestQueue } from './blingRequestQueue'
config()
export class BlingV3 {
  private accessToken: string
  private refreshToken: string
  private integrationId: number
  private client: AxiosInstance
  constructor(
    accessToken: string,
    refreshToken: string,
    integrationId: number,
  ) {
    this.refreshToken = refreshToken
    this.accessToken = accessToken
    this.integrationId = integrationId
    this.client = axios.create({
      baseURL: `https://bling.com.br/Api/v3`,
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use(async (config) => {
      console.log('[BLING V3] - ADDING TO QUEUE')
      await blingRequestQueue.add(() => Promise.resolve())
      console.log('[BLING V3] - QUEUE SIZE: ', blingRequestQueue.size)
      console.log(`[BLING V3 ${this.integrationId}]  - REQUEST: ${config.url}`)
      return config
    })

    /* this.client.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        if (error.response.status === 401) {
          console.log(`[BLING V3 ${this.integrationId}] - REFRESHING TOKEN`)
          return await this.updateToken()
            .then(async (data) => {
              console.log(`[BLING V3 ${this.integrationId}] - TOKEN REFRESHED`)
              error.config.headers.authorization = `Bearer ${data.access_token}`
              this.client.defaults.headers.authorization = `Bearer ${data.access_token}`

              return Promise.resolve(this.client.request(error.config))
            })
            .catch(async () => {
              return Promise.resolve(() => {
                return {
                  data: {
                    error: 'Integração desativada por erro na configuração',
                  },
                }
              })
            })
        } else if (error.response.status === 429) {
          console.log(`[BLING V3 ${this.integrationId}] - RATE LIMIT EXCEEDED`)
          console.log(
            `[BLING V3 ${this.integrationId}] - ADDING TO RETRY QUEUE`,
          )

          await blingRequestQueue.add(() => Promise.resolve())
          return Promise.resolve(this.client.request(error.config))
        }
        return await Promise.reject(error)
      },
    ) */
  }

  async getProducts({
    pagina,
    limite,
    criterio,
    tipo,
    codigo,
    idsProdutos,
  }: any) {
    const params = {
      pagina: pagina || 1,
      limite: limite || 100,
      criterio: criterio || 5,
      tipo: tipo || 'T',
      codigo: codigo || undefined,
      idsProdutos: idsProdutos || undefined,
    }
    console.log('params', params)
    return await this.client.get('/produtos', { params }).then((response) => {
      return response.data
    })
  }

  async getSellOrders({
    page,
    limit,
    contactId,
    situations,
    initDate,
    endDate,
    initUpdateDate,
    endUpdateDate,
    initExpectedDate,
    endExpectedDate,
    number,
    storeId,
    cashierControlId,
    sellerId,
    storesOrders,
  }: any) {
    const params = {
      pagina: page || 1,
      limite: limit || 100,
      idContato: contactId || undefined,
      idsSituacoes: situations || undefined,
      dataInclusaoInicial: initDate || undefined,
      dataInclusaoFinal: endDate || undefined,
      dataAlteracaoInicial: initUpdateDate || undefined,
      dataAlteracaoFinal: endUpdateDate || undefined,
      dataPrevistaInicial: initExpectedDate || undefined,
      dataPrevistaFinal: endExpectedDate || undefined,
      numero: number || undefined,
      idLoja: storeId || undefined,
      idVendedor: sellerId || undefined,
      idControleCaixa: cashierControlId || undefined,
      numerosLojas: storesOrders || undefined,
    }
    console.log('params', params)

    return (
      (await this.client
        .get('/pedidos/vendas', { params })
        .then((response) => {
          return response.data
        })
        .catch((error) => {
          console.log(error.response.data)
          return error.response.data
        })) || { data: [] }
    )
  }

  async createProduct(data: any) {
    return await this.client
      .post('/produtos', data)
      .then((response) => {
        return response.data
      })
      .catch(async (error: AxiosError) => {
        return error.response.data
      })
  }

  async updateProduct(data: any) {
    return await this.client
      .put(`/produtos/${data.id}`, data)
      .then((response) => {
        return response.data
      })
      .catch(async (error: AxiosError) => {
        return error.response.data
      })
  }

  async getWarehouses() {
    return await this.client.get('/depositos').then((response) => {
      return response.data
    })
  }

  async updateStock(data: any) {
    return await this.client
      .post('/estoques', data)
      .then((response) => {
        return response.data
      })
      .catch(async (error: AxiosError) => {
        return {
          isError: true,
          error: error?.response?.data ? error.response.data : error,
        }
      })
  }

  async updateToken() {
    const now = new Date()
    now.setHours(now.getHours() - 3)
    const base64Auth = Buffer.from(
      `${process.env.BLING_CLIENTID}:${process.env.BLING_CLIENTSECRET}`,
    )
    const bling = axios.create({
      baseURL: 'https://bling.com.br/Api/v3',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: '1.0',
        Authorization: `Basic ${base64Auth.toString('base64')}}`,
      },
    })
    if (!this.refreshToken || this.refreshToken === '') {
      console.log('Refresh token not found')
      const isIntegrationExists = await prisma.integrations.findFirst({
        where: {
          id: this.integrationId,
        },
      })
      if (!isIntegrationExists) {
        await prisma.user_stock_result.create({
          data: {
            integration_id: this.integrationId,
            created_at: now,
            result: 'INTEGRATION_NOT_FOUND',
          },
        })

        return false
      }

      await prisma.user_stock_result.create({
        data: {
          integration_id: this.integrationId,
          created_at: now,
          result: 'REFRESH_TOKEN_NOT_FOUND',
        },
      })
      await prisma.integrations.update({
        where: {
          id: this.integrationId,
        },
        data: {
          status: 0,
        },
      })
      throw Error('Refresh token not found')
    }

    /* bling.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response.status === 429) {
          console.log(`[BLING V3 ${this.integrationId}] - RATE LIMIT EXCEEDED`)
          console.log(
            `[BLING V3 ${this.integrationId}] - ADDING TO RETRY QUEUE`,
          )

          await blingRequestQueue.add(() => Promise.resolve())
          return Promise.resolve(bling.request(error.config))
        }
      },
    ) */
    bling.interceptors.request.use(async (config) => {
      console.log('[BLING V3 REFRESH TOKEN] - ADDING TO QUEUE')
      await blingRequestQueue.add(() => Promise.resolve())
      console.log(
        '[BLING V3 REFRESH TOKEN] - QUEUE SIZE: ',
        blingRequestQueue.size,
      )
      console.log(
        `[BLING V3 REFRESH TOKEN ${this.integrationId}]  - REQUEST: ${config.url}`,
      )
      return config
    })
    return await bling
      .post('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: this?.refreshToken?.trim(),
      })
      .then(async (response) => {
        console.log('response', response.data)
        await prisma.integrations.update({
          where: {
            id: this.integrationId,
          },
          data: {
            params: JSON.stringify({
              access_token: response.data.access_token,
              refresh_token: response.data.refresh_token,
            }),
            update_date: now,
          },
        })
        this.refreshToken = response.data.refresh_token
        this.accessToken = response.data.access_token
        return response.data
      })
      .catch(async (error) => {
        console.log(
          `[BLING V3 REFRESH TOKEN ${this.integrationId}] ERROR ON REFRESH TOKEN`,
          error?.response?.data,
        )
        console.log(error?.response.data)
        await prisma.user_stock_result.create({
          data: {
            integration_id: this.integrationId,
            created_at: now,
            params: JSON.stringify({
              paramsUsed: {
                grant_type: 'refresh_token',
                refresh_token: this?.refreshToken?.trim(),
              },
              ...error?.response?.data,
            }),
            result: 'ERROR_ON_REFRESH_TOKEN',
          },
        })
        await prisma.integrations.update({
          where: {
            id: this.integrationId,
          },
          data: {
            status: 0,
          },
        })
        throw Error('Error on refreshing token')
      })
  }

  async getOrder(id: number) {
    return await this.client
      .get(`/pedidos/vendas/${id}`)
      .then((response) => {
        return response.data
      })
      .catch(() => {
        return false
      })
  }

  async getProduct(id: number) {
    return await this.client
      .get(`/produtos/${id}`)
      .then((response) => {
        return response.data.data
      })
      .catch(async () => {
        return false
      })
  }

  async apiError(error: any) {
    return Promise.reject(error)
  }

  async addProductToStore({ codigo, preco, produto, loja }) {
    return await this.client
      .post('/produtos/lojas', {
        codigo,
        preco,
        produto,
        loja,
      })
      .then((response) => {
        return response.data
      })
      .catch(async (error: AxiosError) => {
        console.log('error on add product to store', error.response.data)
        return { isError: true, error: error.response.data }
      })
  }
}
