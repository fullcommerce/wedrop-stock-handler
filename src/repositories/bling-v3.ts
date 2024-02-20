import axios, { AxiosError, AxiosInstance } from 'axios'
import { config } from 'dotenv'
import { prisma } from '../database/prismaClient'
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

    this.client.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        if (error.response.status === 401) {
          return await this.updateToken()
            .then(async (data) => {
              error.config.headers.authorization = `Bearer ${data.access_token}`
              return Promise.resolve(this.client.request(error.config))
            })
            .catch((error) => {
              return Promise.reject(error)
            })
        } else if (error.response.status === 429) {
          if (!error?.config?.headers?.retries) {
            error.config.headers.retries = 0
          }
          if (error.config.headers.retries < 5) {
            error.config.headers.retries = error.config.headers.retries + 1
            return await new Promise((resolve) => {
              setTimeout(() => {
                resolve(this.client.request(error.config))
              }, 1000 * error.config.headers.retries)
            })
          } else {
            return await Promise.reject(error)
          }
        }
        return await Promise.reject(error)
      },
    )
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
    return await this.client
      .get('/produtos', { params })
      .then((response) => {
        return response.data
      })
      .catch(async (error: AxiosError) => {
        await this.apiError(error)
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

    return await this.client
      .get('/pedidos/vendas', { params })
      .then((response) => {
        return response.data
      })
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
      .catch(async (error: any) => {
        console.log('error on update stock', error.response.data)
        return { isError: true, ...error?.response?.data }
      })
  }

  async updateToken() {
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
    return await bling
      .postForm('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken.trim(),
      })
      .then(async (response) => {
        await prisma.integrations.update({
          where: {
            id: this.integrationId,
          },
          data: {
            params: JSON.stringify({
              access_token: response.data.access_token,
              refresh_token: response.data.refresh_token,
            }),
          },
        })
        this.refreshToken = response.data.refresh_token
        this.accessToken = response.data.access_token
        console.log('renovou o token')
        return response.data
      })
      .catch(async (error: AxiosError) => {
        console.log('error on refresh token', error.response.data)
        // await this.apiError(error)
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

  async apiError(error: AxiosError) {
    return Promise.reject(error)
  }
}
