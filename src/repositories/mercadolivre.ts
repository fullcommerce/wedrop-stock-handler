import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import rateLimit from 'axios-rate-limit'
import { prisma } from '../database/prismaClient'
export class MercadoLivre {
  private apikey: string
  private refreshToken: string
  private integrationId: number
  private client: AxiosInstance

  constructor(apikey: string, refreshToken: string, integrationId: number) {
    this.apikey = apikey
    this.refreshToken = refreshToken
    this.integrationId = integrationId
    this.client = rateLimit(
      axios.create({
        baseURL: 'https://api.mercadolibre.com',
        headers: {
          Authorization: `Bearer ${apikey}`,
        },
      }),
      { maxRequests: 1, perMilliseconds: 1 },
    )

    this.client.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        if (error.response.status === 401 || error.response.status === 403) {
          const newTokenData = await this.refreshAccessToken(this.refreshToken)
          if (!newTokenData?.params?.access_token) {
            error = { ...error, doNotRetry: true }
            return Promise.reject(error)
          }
          error.config.headers.Authorization = `Bearer ${newTokenData.params.access_token}`
          return await this.client.request(error.config)
        }
        return Promise.reject(error)
      },
    )
  }

  async getItemList({ userId, offset = 0, limit = 50 }: any) {
    const itemList = await this.client
      .get(`/users/${userId}/items/search?offset=${offset}&limit=${limit}`)
      .then((response: any) => response.data)
      .catch((error: any) => {
        return error.response.data
      })

    return itemList
  }

  async getCategoryByTitle(title: string) {
    const predictedCategories = await this.client
      .get(`/sites/MLB/domain_discovery/search?limit=4&q=${title}`)
      .then((response: any) => {
        return response.data
      })
      .catch((error: any) => {
        console.log(error.response.data)
      })

    const categories = await Promise.all(
      predictedCategories.map(async (predictedCategory: any) => {
        const categoryInfo = await this.client
          .get(`/categories/${predictedCategory?.category_id}`)
          .then((response: any) => {
            return { ...response.data, attributes: [] }
          })
          .catch((error: any) => {
            console.log(error.response.data)
          })

        categoryInfo.attributes = await this.client
          .get(`/categories/${categoryInfo.id}/attributes`)
          .then((response: any) => {
            return response.data.filter((attribute: any) => {
              return (
                !attribute?.tags?.fixed === true &&
                !attribute.tags?.hidden === true &&
                !attribute.tags?.others === true &&
                !attribute.tags?.read_only === true
              )
            })
          })
          .catch((error: any) => {
            console.log(error.response.data)
          })

        return categoryInfo
      }),
    )

    return categories
  }

  async getOrder(orderId: string) {
    const order = await this.client
      .get(`/orders/${orderId}`)
      .then((response: any) => response.data)
      .catch((error: AxiosError) => {
        console.log(error)
        return error
      })

    return order
  }

  async updateImages(itemId: string, images: any) {
    const updatedItem = await this.client
      .put(`/items/${itemId}`, { pictures: images })
      .then((response: any) => response.data)
      .catch((error: any) => {
        return error.response.data
      })

    return updatedItem
  }

  async sendImages(images) {
    const pictures = await this.client
      .post(`/pictures`, images)
      .then((response: AxiosResponse) => response.data)
      .catch((error: AxiosError) => {
        return {
          isError: true,
          response: error.response.data,
        }
      })
    return { pictures, images }
  }

  async getShipment(shipmentId: string) {
    const shipment = await this.client
      .get(`/shipments/${shipmentId}`)
      .then((response: any) => response.data)
      .catch((error: any) => {
        return error.response.data
      })

    return shipment
  }

  async getItem(itemId: string) {
    const item = await this.client
      .get(`/items/${itemId}`)
      .then((response: any) => response.data)
      .catch((error: any) => {
        return error.response.data
      })

    return item
  }

  async createItem(item: any) {
    const newItem = await this.client
      .post('/items', item)
      .then((response: any) => response.data)
      .catch((error: any) => {
        return error.response.data
      })
    return newItem
  }

  async refreshAccessToken(refreshToken: string) {
    const newTokenData: any = await this.client
      .post('/oauth/token', {
        grant_type: 'refresh_token',
        client_id: process.env.MERCADOLIVRE_CLIENT_ID,
        client_secret: process.env.MERCADOLIVRE_CLIENT_SECRET,
        refresh_token: refreshToken,
      })
      .then(async (response: any) => {
        const newIntegration = await prisma.integrations.update({
          where: {
            id: this.integrationId,
          },
          data: {
            params: JSON.stringify(response.data),
          },
        })
        newIntegration.params = JSON.parse(newIntegration.params)

        return { ...newIntegration, isError: false }
      })
      .catch(async (err: AxiosError) => {
        const errorResponse: any = err.response?.data
        if (
          errorResponse.error === 'invalid_grant' ||
          errorResponse.error === 'not_found' ||
          errorResponse.error === ''
        ) {
          await prisma.integrations.update({
            where: {
              id: this.integrationId,
            },
            data: {
              status: 0,
            },
          })
        }
        return { isError: true, params: { access_token: null } }
      })

    return newTokenData
  }

  async getIfSellerIsCrossDocking() {
    const seller = await this.client
      .get('/users/me')
      .then((res) => res.data)
      .catch((error: AxiosError) => {
        console.log('Error getting seller data')
        console.log('Error: ', error.response?.data)
        return { isError: true }
      })

    if (seller.isError) return false

    const shippingPreferentes = await this.client
      .get('/users/' + seller.id + '/shipping_preferences')
      .then((res) => res.data)

    const me2 = shippingPreferentes.logistics.find((logistic: any) => {
      return logistic.mode === 'me2'
    })

    if (!me2) return false

    const crossDocking = me2.types.find((type: any) => {
      return type.type === 'cross_docking'
    })

    return !!crossDocking
  }

  async getItemFreeShippingCost(id: string) {
    const item = await this.client
      .get(`/items/${id}/shipping_options?zip_code=40020-000`)
      .then((response: any) => {
        return response.data.options.reduce((acc: any, option: any) => {
          return acc + (option.cost / response.data.options.length) * 0.5
        }, 0)
      })
      .catch((error: any) => {
        return error.response.data
      })

    return item
  }

  async createDescription({ id, description }: any) {
    const descriptionCreated = await this.client
      .put(`/items/${id}/description`, { plain_text: description })
      .then((response: any) => response.data)
      .catch((error: any) => {
        return error.response.data
      })

    return descriptionCreated
  }

  async getTaxes(categoryId: string, price: number) {
    const taxes = await this.client
      .get(`/sites/MLB/listing_prices`, {
        params: { category_id: categoryId, price },
      })
      .then((response: any) =>
        // need to filter taxes by listing_type_id and reduce to return an object with the listing_type_id and sale_fee_amount
        response.data
          .filter((tax: any) => {
            return (
              tax.listing_type_id === 'gold_pro' ||
              tax.listing_type_id === 'gold_special'
            )
          })
          .reduce((acc: any, tax: any) => {
            acc[tax.listing_type_id] = tax.sale_fee_amount
            return acc
          }, {}),
      )

      .catch((error: any) => {
        return error.response.data
      })

    return taxes
  }

  async getAllUserItems(userId: string) {
    const onlyToGetPagingTotal = await this.client
      .get(
        `/users/${userId}/items/search?search_type=scan&orders=start_time_asc`,
      )
      .then((response: any) => response.data.paging.total)
      .catch((error: any) => {
        return error.response.data
      })

    const allItems: any = []
    for (let i = 0; i < onlyToGetPagingTotal; i += 50) {
      const items = await this.client
        .get(`/users/${userId}/items/search?offset=${i}`)
        .then((response: any) => response.data.results)
        .catch((error: any) => {
          return error.response.data
        })
      allItems.push(...items)
    }

    return allItems
  }

  async getTrendsFromCategory(categoryId: string) {
    const trends = await this.client
      .get(`/trends/MLB/${categoryId}`)
      .then((response: any) => response.data)
      .catch((error: any) => {
        return error.response.data
      })

    return trends
  }

  gerarCodigoEAN13(): string {
    const prefixo = '789'

    // Gerar 9 dígitos aleatórios
    let codigo = ''
    for (let i = 0; i < 9; i++) {
      codigo += Math.floor(Math.random() * 10).toString()
    }

    // Combinar o prefixo e os dígitos aleatórios
    codigo = prefixo + codigo

    // Calcular o dígito verificador
    const digitos = codigo.split('').map(Number)
    let soma = 0
    for (let i = 0; i < 12; i++) {
      soma += i % 2 === 0 ? digitos[i] : digitos[i] * 3
    }
    const digitoVerificador = (10 - (soma % 10)) % 10

    // Combinar os dígitos e o dígito verificador para formar o código EAN-13 completo
    codigo += digitoVerificador.toString()

    return codigo
  }

  async authorize({ code }) {
    const params = {
      grant_type: 'authorization_code',
      client_id: process.env.MERCADOLIVRE_CLIENT_ID,
      client_secret: process.env.MERCADOLIVRE_CLIENT_SECRET,
      code,
      redirect_uri: process.env.MERCADOLIVRE_REDIRECT_URI,
    }
    const response = await this.client
      .post('/oauth/token', { ...params })
      .then((res) => {
        return res.data
      })
      .catch((err: AxiosError) => {
        return {
          isError: true,
          response: err.response.data,
        }
      })
    return response
  }
}
