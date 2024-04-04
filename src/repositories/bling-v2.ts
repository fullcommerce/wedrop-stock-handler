import axios, { AxiosInstance } from 'axios'
import { js2xml } from 'xml-js'
export class Bling {
  private token: string
  private client: AxiosInstance
  constructor(token: string) {
    this.client = axios.create({
      baseURL: 'https://bling.com.br/Api/v2/',
      params: {
        apikey: token,
      },

      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        Pragma: 'no-cache',
      },
    })
  }

  async updateStock({ product }: any) {
    const xml = js2xml(
      {
        produto: {
          estoque: product.stock,
        },
      },
      { compact: true, spaces: 4 },
    )
    const response = await this.client
      .postForm(`/produto/${product.sku}/json`, {
        xml,
        apikey: this.token,
      })
      .then((response: any) => {
        return response.data
      })
      .catch((error: any) => {
        return {
          erro: true,
          status: error.code,
          message: 'Error on update stock from Bling',
          error: error.response.data,
        }
      })
    return response
  }
}
