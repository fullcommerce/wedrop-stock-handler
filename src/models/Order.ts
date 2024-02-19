import { prisma } from '../database/prismaClient'
import { MercadoLivre } from '../repositories/mercadolivre'

export class Order {
  private userId: number

  constructor(userId: any) {
    this.userId = userId
  }

  async verifyIfOrderIsFlex(order: any) {
    const ml = new MercadoLivre(
      order?.integration?.params?.access_token,
      order?.integration?.params?.refresh_token,
      order?.integration?.id,
    )
    const orderMl = await ml.getOrder(order?.numeroPedidoLoja)
    if (!orderMl?.shipping?.id)
      return {
        type: false,
        shippingId: false,
      }
    const orderMlShipping = await ml.getShipment(orderMl?.shipping?.id)
    return orderMlShipping.logistic_type
  }

  async verifyIfOrderExists({ id, userId }: any) {
    const order = await prisma.orders.findFirst({
      where: {
        id,
        user_id: userId,
      },
    })

    return !!order
  }

  async verifyIfOrderFromChannelExists({ id, userId }: any) {
    if (!id) return false
    const order = await prisma.orders.findFirst({
      where: {
        channel_order: id,
        user_id: userId,
      },
    })
    return !!order
  }

  async verifyBlingOrderProduct(product: any) {
    return !!product.codigo
  }

  async verifyBlingOrderProducts(products: any) {
    if (!products)
      return [
        {
          item: {
            productExists: false,
            kit: null,
            alias: null,
            product: null,
          },
        },
      ]
    products = await Promise.all(
      products.map(async (product: any) => {
        const kit = await this.getProductIfIsAKit(product.item)
        const alias = await this.getProductIfIsAAlias(product.item)
        const pProduct = await this.getProductIfIsAProduct(product.item)

        if (kit.length === 0 && alias === null && pProduct === null) {
          return {
            item: {
              ...product.item,
              kit,
              alias,
              product: pProduct,
              productExists: false,
            },
          }
        }
        return {
          item: {
            ...product.item,
            kit,
            alias,
            product: pProduct,
            productExists: true,
          },
        }
      }),
    )

    return products
  }

  async verifyBlingOrdersProducts(orders: any) {
    orders = await Promise.all(
      orders.map(async (order: any) => {
        const products = await this.verifyBlingOrderProducts(order.itens)

        if (order.tipoIntegracao === 'MercadoLivre' && order.integration?.id) {
          const shipmentType = await this.verifyIfOrderIsFlex(order)
          const pickupName =
            shipmentType === 'self_service'
              ? 'Flex'
              : shipmentType === 'xd_drop_off'
                ? 'Agência'
                : shipmentType === 'drop_off'
                  ? 'Correios'
                  : shipmentType === 'cross_docking'
                    ? 'Coleta'
                    : 'MercadoLivre'

          const isFlex = shipmentType === 'self_service'
          return { ...order, shipmentType: pickupName, itens: products, isFlex }
        }
        if (
          order?.integration?.params?.wedropLabels === 'true' &&
          order?.integration.user_id === 12160
        ) {
          const flexCeps = [
            {
              init: Number('01000000'),
              end: Number('06519999'),
            },
            {
              init: Number('06530000'),
              end: Number('06855999'),
            },
            {
              init: Number('07000000'),
              end: Number('07299999'),
            },
            {
              init: Number('08000000'),
              end: Number('08699999'),
            },
            {
              init: Number('09000000'),
              end: Number('09820999'),
            },
            {
              init: Number('09850000'),
              end: Number('09920999'),
            },
          ]

          const customerCep = Number(order.cliente.cep.replace('-', ''))
          const isFlex = flexCeps.find((cep: any) => {
            return customerCep >= cep.init && customerCep <= cep.end
          })
          if (isFlex) {
            return { ...order, itens: products, isFlex: true }
          }
          return { ...order, itens: products, isFlex: false }
        }

        return { ...order, itens: products, isFlex: false }
      }),
    )

    return orders
  }

  async getBlingOrderIntegration(order: any) {
    if (!order.loja) return false
    const integration = await prisma.integrations.findFirst({
      where: {
        bling_id: Number(order.loja),
      },
    })
    if (!integration) return false

    return { ...integration, params: JSON.parse(integration?.params as string) }
  }

  async getBlingOrdersIntegration(orders: any) {
    orders = await Promise.all(
      orders.map(async (order: any) => {
        const integration = (await this.getBlingOrderIntegration(order)) || {
          integration: false,
        }
        return {
          ...order,
          integration,
        }
      }),
    )
    return orders
  }

  async getProductIfIsAKit(item: any) {
    const kit = await prisma.kits.findMany({
      where: {
        user_id: this.userId,
        sku: item.codigo,
      },
    })
    if (kit) {
      const products = await Promise.all(
        kit.map(async (kitItem: any) => {
          const product = await prisma.products.findFirst({
            where: {
              id: kitItem.product_id,
            },
          })
          if (!product) return null

          const totalQtd =
            Number(parseInt(item.quantidade)) * Number(kitItem.qtd)
          return {
            ...product,
            customQtd: kitItem.qtd,
            totalQtd,
            cost: Number(product.price) * totalQtd,
          }
        }),
      )
      return products
    }
    return null
  }

  async getProductIfIsAProduct(item: any) {
    const product = await prisma.products.findFirst({
      where: {
        sku: item.codigo,
      },
    })
    if (!product) return null
    const totalQtd = Number(parseInt(item.quantidade)) * 1
    return { ...product, cost: product.price * totalQtd, totalQtd }
  }

  async getProductIfIsAAlias(item: any) {
    const alias = await prisma.product_alias.findFirst({
      where: {
        user_id: this.userId,
        alias: item.codigo,
        product_id: {
          not: 0,
        },
      },
    })
    if (alias) {
      const product = await prisma.products.findFirst({
        where: {
          id: alias.product_id,
          OR: [
            {
              sku: alias.sku,
            },
          ],
        },
      })
      if (!product) return null
      const totalQtd = Number(parseInt(item.quantidade)) * Number(alias.qtd)
      return {
        ...product,
        customQtd: alias.qtd,
        totalQtd,
        cost: Number(product.price) * totalQtd,
      }
    }
    return null
  }

  async updateTotalCostsFromCosts({ orderId }: any) {
    const orderCosts = await prisma.order_costs.findMany({
      where: {
        order_id: orderId,
      },
    })
    let totalCost = 0
    await Promise.all(
      orderCosts.map((cost: any) => {
        totalCost += Number(cost.value)
        return cost
      }),
    )

    const order = await prisma.orders.update({
      where: {
        id: orderId,
      },
      data: {
        total_custo: totalCost,
      },
    })

    return { totalCost, order }
  }

  async sumTotalCostOfProducts(products: any, isFlex = false) {
    let totalCost = 0

    // search on every products.item to see if productExists is true, if have one that is false return 0
    const productExists = products.find((product: any) => {
      return product.item.productExists === false
    })
    if (productExists) return 0

    products = await Promise.all(
      products.map(async (product: any) => {
        if (product.item.productExists) {
          if (product.item.kit) {
            product.item.kit = await Promise.all(
              product.item.kit.map(async (kitItem: any) => {
                totalCost += kitItem.cost
                return kitItem
              }),
            )
          }
          if (product.item.alias) {
            totalCost += product.item.alias.cost
          }
          if (product.item.product) {
            totalCost += product.item.product.cost
          }
        }
        return product
      }),
    )
    if (totalCost > 0) {
      return isFlex ? totalCost + Number(12.99) : totalCost
    } else {
      return 0
    }
  }

  async createOrders(orders: any) {
    orders = await Promise.all(
      orders.map(async (order: any) => {
        const totalCost = await this.sumTotalCostOfProducts(
          order.itens,
          order.isFlex,
        )
        if (
          ['Em aberto', 'Atendido', 'Em Andamento'].includes(order.situacao) &&
          totalCost > 0 &&
          order?.integration?.id
        ) {
          const orderCreated = await this.createOrder({ ...order, totalCost })
          return { orderData: { ...order, totalCost }, orderCreated }
        } else {
          return { orderData: { ...order, totalCost }, orderCreated: null }
        }
      }),
    )
    return orders
  }

  async createOrder(order: any) {
    let status = 1

    // find productExists === false
    order.itens.find((item: any) => {
      if (item.item.productExists === false) {
        status = 9
        return item
      }
      return null
    })

    /* order.itens = await Promise.all(
      order.itens.map(async (item: any) => {
        if (item.item.productExists) {
          status = 1
          return item
        } else {
          status = 9
          return item
        }
      }),
    ) */

    const date = new Date()
    const now = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours() - 3,
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    )

    const orderCreated = await prisma.orders.create({
      data: {
        create_date: new Date(order.data),
        insert_date: now,
        user_id: this.userId,
        user_blingid: Number(order.numero),
        integration_id: order.integration.id,
        suplier_id: 13,
        total: Number(order.totalvenda),
        total_frete: Number(order.valorfrete),
        total_itens: Number(order.totalprodutos),
        total_custo: Number(order.totalCost),
        channel_id: order.loja,
        channel_order: order.numeroPedidoLoja,
        string_channel: order.tipoIntegracao,
        pickup_name: order.shipmentType
          ? order.shipmentType
          : order.tipoIntegracao,
        isflex: order.isFlex ? 1 : 0,
        customer_name: JSON.stringify({
          ...(order?.cliente || { nome: 'Cliente não informado' }),
          ...(order.enderecoEntrega || { endereco: 'Endereço não informado' }),
        }),
        status,
      },
    })

    const orderProducts = await this.createOrderProducts(
      orderCreated,
      order.itens,
    )

    if (status === 9) {
      await prisma.order_history.create({
        data: {
          order_id: orderCreated.id,
          user_id: this.userId,
          type: 'order_created_incomplete',
          insert_date: now,
        },
      })
    } else {
      await prisma.order_history.create({
        data: {
          order_id: orderCreated.id,
          user_id: this.userId,
          type: 'order_created',
          insert_date: now,
        },
      })
    }
    return {
      ...orderCreated,
      customer_name: order.cliente,
      orderProducts,
    }
  }

  async createOrderProducts(order: any, itens: any) {
    if (order.isflex === 1) {
      await prisma.order_costs.create({
        data: {
          order_id: order.id,
          product_id: 0,
          cost: 'flex',
          value: 12.99,
        },
      })
    }

    const items = await Promise.all(
      itens.map(async (item: any) => {
        if (item.item.productExists) {
          if (item.item.kit.length > 0) {
            await Promise.all(
              item.item.kit.map(async (kitItem: any) => {
                const kitProduct = await prisma.order_products.create({
                  data: {
                    order_id: order.id,
                    product_id: kitItem.id,
                    user_id: this.userId,
                    qtd: kitItem.totalQtd,
                    suplier_id: 13,
                  },
                })
                await prisma.order_costs.create({
                  data: {
                    order_id: order.id,
                    product_id: kitItem.id,
                    cost: 'product',
                    value: kitItem.cost,
                  },
                })
                return kitProduct
              }),
            )
          }
          if (item.item.alias?.id) {
            const aliasProduct = await prisma.order_products.create({
              data: {
                order_id: order.id,
                product_id: item.item.alias.id,
                user_id: this.userId,
                qtd: item.item.alias.totalQtd,
                suplier_id: 13,
              },
            })
            await prisma.order_costs.create({
              data: {
                order_id: order.id,
                product_id: item.item.alias.id,
                cost: 'product',
                value: item.item.alias.cost,
              },
            })
            return aliasProduct
          }
          if (item.item.product?.id) {
            const productProduct = await prisma.order_products.create({
              data: {
                order_id: order.id,
                product_id: item.item.product.id,
                user_id: this.userId,
                qtd: item.item.product.totalQtd || 1,
                suplier_id: 13,
              },
            })
            await prisma.order_costs.create({
              data: {
                order_id: order.id,
                product_id: item.item.product.id,
                cost: 'product',
                value: item.item.product.cost,
              },
            })
            return productProduct
          }
        }
      }),
    )
    return items
  }

  async inputOrderError(order: any) {
    const errors: any = [] // se a situação for diferente de Em Aberto
    order?.integration?.params?.autoImport === false &&
      errors.push({
        id: errors.length + 1,
        code: 'autoimporf_off',
        message:
          'A Integração dessa loja não está configurada para importar automaticamente, clique no botão para importar ou configure a integração para importar automaticamente',
      })

    order?.situacao !== 'Em aberto' &&
      errors.push({
        id: errors.length + 1,
        code: 'order_status',
        message:
          'Pedido no Bling não está com a situação Em Aberto, importe o pedido apenas se você tiver certeza de que precisa envia-lo',
      })
    !order?.integration?.id &&
      errors.push({
        id: errors.length + 1,
        code: 'integration_not_found',
        message:
          'O pedido foi vendido em uma loja que não está integrada ao WeDrop, faça a integração da loja para importar esse pedido',
      })

    !order?.itens &&
      errors.push({
        id: errors.length + 1,
        code: 'product_not_found',
        message: `O Pedido ${order.numeroPedidoLoja} não possui produtos, complete o pedido`,
      })

    order?.itens?.length > 0 &&
      (await Promise.all(
        order?.itens?.map(async (item: any) => {
          !item.item.productExists &&
            errors.push({
              id: errors.length + 1,
              code: 'product_not_found',
              message: `O Produto ${item.item.descricao} que está nesse pedido não foi encontrado no WeDrop, importe e complete o pedido`,
            })
        }),
      ))

    return errors
  }

  async inputOrderErrors(orders: any) {
    orders = await Promise.all(
      orders.map(async (order: any) => {
        return {
          ...order,
          orderData: {
            ...order?.orderData,
            errors: await this.inputOrderError(order.orderData),
          },
        }
      }),
    )
    return orders
  }

  async filterOnlyNewOrders(orders: any) {
    const newOrders = []
    for (const order of orders) {
      order.numeroPedidoLoja =
        order.numeroPedidoLoja === '' ||
        order.numeroPedidoLoja === null ||
        !order.numeroPedidoLoja
          ? 'WEDROP-' + Math.floor(Math.random() * 1000)
          : order.numeroPedidoLoja

      const orderExists = await this.verifyIfOrderFromChannelExists({
        id: order.numeroPedidoLoja,
        userId: this.userId,
      })

      if (!orderExists) {
        newOrders.push(order)
      }
    }

    return newOrders
  }
}
