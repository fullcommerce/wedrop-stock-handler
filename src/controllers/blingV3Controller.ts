import { Request, Response } from 'express'
import { prisma } from '../database/prismaClient'
import { BlingV3 } from '../repositories/bling-v3'
import { Order } from '../models/Order'

export default {
  async getWeDropProducts(req: Request, res: Response) {
    const { integrationId } = req.query
    const { userId } = req.body

    const weDropProducts = await prisma.products.findMany()

    const integration = await prisma.integrations.findFirst({
      where: {
        id: Number(integrationId),
        user_id: Number(userId),
      },
    })
    const params = JSON.parse(integration?.params)

    const blingClient = new BlingV3(
      params.access_token,
      params.refresh_token,
      Number(integrationId),
    )

    const products = []

    for (let i = 1; i < 100; i++) {
      const responseProducts = await blingClient.getProducts({
        tipo: 'PS',
        pagina: i,
        criterio: 2,
      })
      if (responseProducts.data.length === 0) {
        break
      }
      responseProducts.data.forEach((product: any) => {
        products.push(product)
      })
    }
    const filtredProducts = products.filter((product: any) =>
      weDropProducts.find(
        (weDropProduct) => weDropProduct.sku === product.codigo,
      ),
    )
    const warehouse = await blingClient.getWarehouses().then((response) => {
      return response.data[0]
    })

    const formattedProductsToDb = filtredProducts.map((product: any) => {
      const weDropProduct = weDropProducts.find(
        (weDropProduct) => weDropProduct.sku === product.codigo,
      )

      return {
        user_id: Number(userId),
        integration_id: Number(integrationId),
        product_id: weDropProduct.id,
        bling_product_id: product.id * 1,
        bling_warehouse_id: warehouse.id,
        status: 1,
      }
    })

    await prisma.bling_user_products.deleteMany({
      where: {
        user_id: Number(userId),
      },
    })

    await prisma.bling_user_products.createMany({
      data: formattedProductsToDb,
    })

    return res.json({
      total: filtredProducts.length,
      results: filtredProducts,
    })
  },

  async findNewOrders(req: Request, res: Response) {
    const { integrationId, startDate, endDate } = req.query
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const initDate = startDate
      ? new Date(startDate as string).toISOString().split('T')[0]
      : yesterday.toISOString().split('T')[0]
    const stopDate = endDate
      ? new Date(endDate as string).toISOString().split('T')[0]
      : today.toISOString().split('T')[0]

    const integration = await prisma.integrations.findFirst({
      where: {
        id: Number(integrationId),
      },
    })
    const userId = integration.user_id
    const params = JSON.parse(integration?.params)
    const blingClient = new BlingV3(
      params.access_token,
      params.refresh_token,
      Number(integrationId),
    )
    const orders = []

    for (let i = 1; i < 10; i++) {
      const responseOrders = await blingClient.getSellOrders({
        initDate,
        endDate: stopDate,
        // situations: [6, 15],
        page: i,
      })
      responseOrders.data.forEach((order: any) => {
        orders.push(order)
      })
      if (responseOrders.data.length < 100) {
        break
      }
    }
    const userOrders = await prisma.orders.findMany({
      where: {
        user_id: Number(userId),
        channel_order: {
          in: orders.map((order) =>
            String(order.numeroLoja !== '' ? order.numeroLoja : order.numero),
          ),
        },
      },
      select: {
        channel_order: true,
      },
    })

    const filtredOrders = orders.filter(
      (order: any) =>
        !userOrders.find((userOrder) => {
          const channelOrder = String(
            order.numeroLoja !== '' ? order.numeroLoja : order.numero,
          )
          return (
            userOrder.channel_order === channelOrder ||
            !(new Date(order.data) >= new Date(initDate))
          )
        }),
    )

    return res.json(filtredOrders)
  },

  async sendVariation(req: Request, res: Response) {
    const { integrationId, variationId, userId } = req.body

    const integration = await prisma.integrations.findFirst({
      where: {
        id: Number(integrationId),
      },
    })
    const params = JSON.parse(integration?.params)
    const blingClient = new BlingV3(
      params.access_token,
      params.refresh_token,
      Number(integrationId),
    )

    const dbVariation = await prisma.variations.findFirst({
      where: {
        id: Number(variationId),
        user_id: Number(userId),
      },
      include: {
        variation_products: true,
      },
    })

    const blingUserProducts = await prisma.bling_user_products.findMany({
      where: {
        user_id: Number(userId),
        integration_id: Number(integrationId),
        product_id: {
          in: dbVariation.variation_products.map(
            (product) => product.product_id,
          ),
        },
      },
      include: {
        products: true,
      },
    })
    const checkedBlingUserProducts = []

    for (const product of blingUserProducts) {
      const isBlingUserProductExists = await blingClient.getProduct(
        product.bling_product_id,
      )
      if (
        isBlingUserProductExists?.id === product.bling_product_id &&
        isBlingUserProductExists?.situacao === 'A'
      ) {
        checkedBlingUserProducts.push(product)
      } else {
        await prisma.bling_user_products.delete({
          where: {
            id: product.id,
          },
        })
      }
    }
    const filteredBlingUserProducts: any =
      checkedBlingUserProducts.filter(Boolean)

    const variationWithProducts: any = dbVariation.variation_products.map(
      (variationProduct) => {
        const product = filteredBlingUserProducts.find(
          (blingUserProduct) =>
            blingUserProduct.product_id === variationProduct.product_id,
        )
        return {
          ...variationProduct,
          bling_product_id: product?.bling_product_id,
          bling_warehouse_id: product?.bling_warehouse_id,
          product: product?.products,
        }
      },
    )

    const variation = {
      ...dbVariation,
      variation_products: variationWithProducts,
    }
    console.log(variation)

    const productData = {
      nome: variation.name,
      codigo: variation.sku,
      preco: variation?.variation_products[0].price,
      tipo: 'P',
      situacao: 'A',
      formato: 'V',
      descricaoCurta: variation?.variation_products[0]?.product.description,
      dataValidade: undefined,
      unidade: 'UN',
      pesoLiquido: variation?.variation_products[0]?.product.weight,
      pesoBruto: variation?.variation_products[0]?.product.weight,
      volumes: 1,
      itensPorCaixa: 1,
      gtin: variation?.variation_products[0]?.product.ean,
      gtinEmbalagem: variation?.variation_products[0]?.product.ean,
      tipoProducao: 'P',
      condicao: 0,
      freteGratis: false,
      marca: variation?.variation_products[0]?.product.brand,
      descricaoComplementar: undefined,
      linkExterno: undefined,
      observacoes: undefined,
      descricaoEmbalagemDiscreta: undefined,
      dimensoes: {
        largura: variation?.variation_products[0]?.product?.width,
        altura: variation?.variation_products[0]?.product?.height,
        profundidade: variation?.variation_products[0]?.product.length,
        unidadeMedida: 1,
      },
      tributacao: {
        origem: 0,
        ncm: variation?.variation_products[0]?.product?.ncm,
        cest: variation?.variation_products[0]?.product?.cest,
      },
      /* midia: {
        imagens: {
          externas: images.map((img) => ({
            link: `https://app.wedropbr.com.br/img/1000x1000/13/${img}`,
          })),
        },
      }, */
      linhaProduto: {
        id: 1,
      },
      variacoes: variation.variation_products.map((variationProduct, index) => {
        return {
          nome: variationProduct.name,
          codigo: variationProduct.sku,
          preco: variationProduct.price,
          tipo: 'P',
          situacao: 'A',
          formato: 'S',
          descricaoCurta: variationProduct.product.description,
          dataValidade: undefined,
          unidade: 'UN',
          pesoLiquido: variationProduct.product.weight,
          pesoBruto: variationProduct.product.weight,
          volumes: 1,
          itensPorCaixa: 1,
          gtin: variationProduct.product.ean,
          gtinEmbalagem: variationProduct.product.ean,
          tipoProducao: 'P',
          condicao: 0,
          freteGratis: false,
          marca: variationProduct.product.brand,
          descricaoComplementar: undefined,
          linkExterno: undefined,
          observacoes: undefined,
          descricaoEmbalagemDiscreta: undefined,
          dimensoes: {
            largura: variationProduct.product.width,
            altura: variationProduct.product.height,
            profundidade: variationProduct.product.length,
            unidadeMedida: 1,
          },
          tributacao: {
            origem: 0,
            ncm: variationProduct.product.ncm,
            cest: variationProduct.product.cest,
          },
          linhaProduto: {
            id: 1,
          },
          variacao: {
            nome: variationProduct.name,
            ordem: index + 1,
            produtoPai: {
              cloneInfo: false,
            },
          },
        }
      }),
    }

    const blingVariation = await blingClient.createProduct(productData)
    const updatedVariations = []
    if (blingVariation?.data?.variations?.saved) {
      const { saved } = blingVariation.data.variations

      for (const s of saved) {
        const productDataVariation = productData.variacoes.find(
          (v) => v.nome === s.nomeVariacao,
        )
        const variationProduct = variation.variation_products.find(
          (v) => v.name === s.nomeVariacao,
        )
        const newProductData = {
          id: s.id,
          ...productDataVariation,
          formato: 'E',
          estrutura: {
            tipoEstoque: 'V',
            componentes: [
              {
                produto: {
                  id: variationProduct.bling_product_id,
                },
                quantidade: 1,
              },
            ],
          },
        }
        updatedVariations.push(await blingClient.updateProduct(newProductData))
      }
    }

    return res.json({ blingVariation, updatedVariations })
  },

  async sendKit(req: Request, res: Response) {
    const { integrationId, kit, userId } = req.body

    const integration = await prisma.integrations.findFirst({
      where: {
        id: Number(integrationId),
      },
    })
    const params = JSON.parse(integration?.params)
    const blingClient = new BlingV3(
      params.access_token,
      params.refresh_token,
      Number(integrationId),
    )

    const blingUserProducts = await prisma.bling_user_products.findMany({
      where: {
        user_id: Number(userId),
        integration_id: Number(integrationId),
        product_id: {
          in: kit.products.map((product) => product.id),
        },
      },
    })

    function gerarCodigoEAN13(): string {
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

    const productData = {
      nome: kit.name ? kit.name : kit.title,
      codigo: kit.sku,
      preco: kit.cost,
      tipo: 'P',
      situacao: 'A',
      formato: 'E',
      descricaoCurta: kit?.description,
      dataValidade: undefined,
      unidade: 'UN',
      pesoLiquido: kit.weight,
      pesoBruto: kit.weight,
      volumes: 1,
      itensPorCaixa: 1,
      gtin: gerarCodigoEAN13(),
      gtinEmbalagem: gerarCodigoEAN13(),
      tipoProducao: 'P',
      condicao: 0,
      freteGratis: false,
      marca: kit?.brand ? kit.brand : 'Sem Marca',
      descricaoComplementar: undefined,
      linkExterno: undefined,
      observacoes: undefined,
      descricaoEmbalagemDiscreta: undefined,
      dimensoes: {
        largura: kit.width,
        altura: kit.height,
        profundidade: kit.length,
        unidadeMedida: 1,
      },
      tributacao: {
        origem: 0,
        ncm: kit.ncm,
        cest: kit.cest,
      },
      midia: {
        imagens: {
          externas: {
            link: `https://app.wedropbr.com.br/img/1000x1000/13/${kit.products[0].image}`,
          },
        },
      },
      linhaProduto: {
        id: 1,
      },
      estrutura: {
        tipoEstoque: 'V',
        componentes: kit.products.map((product) => {
          return {
            produto: {
              id: blingUserProducts.find(
                (blingUserProduct) =>
                  blingUserProduct.product_id === product.id,
              )?.bling_product_id,
            },
            quantidade: product.qtd,
          }
        }),
      },
    }

    const blingKit = await blingClient.createProduct(productData)
    return res.json({ blingKit, productData })
  },

  async sendProduct(req: Request, res: Response) {
    const { integrationId, productId, userId } = req.body

    const integration = await prisma.integrations.findFirst({
      where: {
        id: Number(integrationId),
      },
    })
    const params = JSON.parse(integration?.params)
    const blingClient = new BlingV3(
      params.access_token,
      params.refresh_token,
      Number(integrationId),
    )

    const isBlingUserProductExists = await prisma.bling_user_products.findFirst(
      {
        where: {
          user_id: Number(userId),
          product_id: Number(productId),
          integration_id: Number(integrationId),
        },
      },
    )
    if (isBlingUserProductExists) {
      const responseBlingProduct = await blingClient.getProduct(
        isBlingUserProductExists.bling_product_id,
      )
      if (
        responseBlingProduct?.id ===
          isBlingUserProductExists.bling_product_id &&
        responseBlingProduct?.situacao === 'A'
      ) {
        return res.json(responseBlingProduct)
      } else if (
        (isBlingUserProductExists?.bling_product_id &&
          !responseBlingProduct?.id) ||
        (isBlingUserProductExists?.bling_product_id &&
          responseBlingProduct?.situacao !== 'A')
      ) {
        await prisma.bling_user_products.delete({
          where: {
            id: isBlingUserProductExists.id,
          },
        })
      }
    }

    const product = await prisma.products.findFirst({
      where: {
        id: Number(productId),
      },
    })
    const plusImgs = product.plusimgs.split(',')
    const images = [product.img, ...plusImgs].filter((img) => img !== '')

    const productData = {
      nome: product?.name.replace('WE DROP -', '').replace('WEDROP', '').trim(),
      codigo: product?.sku,
      preco: product?.price,
      tipo: 'P',
      situacao: 'A',
      formato: 'S',
      descricaoCurta: product?.description,
      dataValidade: undefined,
      unidade: 'UN',
      pesoLiquido: product.weight,
      pesoBruto: product.weight,
      volumes: 1,
      itensPorCaixa: 1,
      gtin: product.ean,
      gtinEmbalagem: product.ean,
      tipoProducao: 'P',
      condicao: 0,
      freteGratis: false,
      marca: product.brand,
      descricaoComplementar: undefined,
      linkExterno: undefined,
      observacoes: undefined,
      descricaoEmbalagemDiscreta: undefined,
      dimensoes: {
        largura: product.width,
        altura: product.height,
        profundidade: product.length,
        unidadeMedida: 1,
      },
      tributacao: {
        origem: 0,
        ncm: product.ncm,
        cest: product.cest,
      },
      midia: {
        imagens: {
          externas: images.map((img) => ({
            link: `https://app.wedropbr.com.br/img/1000x1000/13/${img}`,
          })),
        },
      },
      linhaProduto: {
        id: 1,
      },
    }
    const warehouse = await blingClient.getWarehouses().then((response) => {
      return response.data[0]
    })

    const responseProduct = await blingClient
      .createProduct(productData)
      .catch((error) => {
        return error.response.data
      })

    if (responseProduct?.error) {
      return res.status(400).json({
        ...responseProduct,
        message: responseProduct?.error?.fields?.[0]?.msg.includes(
          'já foi cadastrado para o produto',
        )
          ? 'Produto já cadastrado'
          : responseProduct?.error?.message,
      })
    }

    if (responseProduct.data?.id) {
      await prisma.bling_user_products.create({
        data: {
          user_id: Number(userId),
          integration_id: Number(integrationId),
          product_id: Number(productId),
          bling_product_id: responseProduct.data.id,
          bling_warehouse_id: warehouse.id,
          status: 1,
        },
      })

      const stock = await blingClient.updateStock({
        produto: {
          id: responseProduct.data.id,
        },
        deposito: {
          id: warehouse.id,
        },
        operacao: 'B',
        preco: product.price,
        custo: product.price,
        quantidade: product.stock,
        observacoes: 'Estoque inicial by WeDrop',
      })
      return res.json({ product: responseProduct.data, stock, productData })
    }
    return res.status(400).json({ responseProduct, productData })
  },

  async importOrder(req: Request, res: Response) {
    const { erpId, integrationId, blingId } = req.query
    const erp = await prisma.integrations.findFirst({
      where: {
        id: Number(erpId),
      },
    })
    if (!erp) {
      return res.status(400).json({ message: 'ERP not found' })
    }
    if (!erp?.user_id) {
      return res.status(400).json({ message: 'User not found' })
    }
    const params = JSON.parse(erp?.params)
    const integration = await prisma.integrations.findFirst({
      where: {
        user_id: erp.user_id,
        id: Number(integrationId),
      },
    })
    const blingClient = new BlingV3(
      params.access_token,
      params.refresh_token,
      Number(integrationId),
    )

    const blingOrder = await blingClient
      .getOrder(Number(blingId))
      .then((res) => {
        return res.data
      })

    const customer = {
      nome: blingOrder?.contato?.nome,
      cnpj: blingOrder?.contato?.numeroDocumento,
      ie: null,
      indIEDest: '9',
      rg: '',
      endereco: 'Endereço não informado',
      numero: '0',
      complemento: '',
      cidade: 'Não informado',
      bairro: 'Não informado',
      cep: 'Não informado',
      uf: 'XX',
      email: '',
      celular: '',
      fone: '',
    }

    const integrationsNames = [
      {
        name: 'Shopee',
        keyword: 'shopee',
      },
      {
        name: 'MercadoLivre',
        keyword: 'mercadolivre',
      },
      {
        name: 'Americanas',
        keyword: 'americanas',
      },
      {
        name: 'Aliexpress',
        keyword: 'aliexpress',
      },
      {
        name: 'Magalu',
        keyword: 'magalu',
      },
      {
        name: 'Amazon',
        keyword: 'amazon',
      },
      {
        name: 'ViaVarejo',
        keyword: 'viavarejo',
      },
      {
        name: 'Shopify',
        keyword: 'shopify',
      },
      {
        name: 'Nuvemshop',
        keyword: 'nuvemshop',
      },
      {
        name: 'Vtex',
        keyword: 'vtex',
      },
      {
        name: 'Outro',
        keyword: 'outro',
      },
      {
        name: 'Outra Plataforma',
        keyword: 'outraplataforma',
      },
      {
        name: 'Outro marketplace',
        keyword: 'outromarketplace',
      },
    ]

    const newOrderData = {
      user_id: erp.user_id,
      integration_id: Number(integrationId),
      channel_order: String(
        blingOrder.numeroLoja ? blingOrder.numeroLoja : blingOrder.numero,
      ),
      total: Number(blingOrder.total),
      total_custo: 0,
      string_channel:
        integrationsNames.find((i) => integration.keyword === i.keyword)
          ?.name || 'Não informado',
      pickup_name:
        integrationsNames.find((i) => integration.keyword === i.keyword)
          ?.name || 'Não informado',
      user_blingid: Number(blingOrder.id),
      customer_name: JSON.stringify(customer),
      status: 0,
      isflex: 0,
    }
    const orderProducts = []
    const orderCosts = []
    const orderModel = new Order(Number(erp.user_id))
    let totalCost = 0
    let isNotFound = false
    for (const item of blingOrder.itens) {
      const isKit = await orderModel.getProductIfIsAKit(item)
      const isAlias = await orderModel.getProductIfIsAAlias(item)
      const isProduct = await orderModel.getProductIfIsAProduct(item)

      if (!isProduct && !isAlias && !isKit) {
        isNotFound = true
      }

      if (isKit.length > 0) {
        for (const kitItem of isKit) {
          const isOrderProductProducExists = orderProducts.find(
            (product) => product.product_id === kitItem.id,
          )

          if (isOrderProductProducExists) {
            isOrderProductProducExists.qtd =
              isOrderProductProducExists.qtd + kitItem.totalQtd
            totalCost = totalCost + kitItem.cost

            const isOrderProductCostExists = orderCosts.find(
              (cost) => cost.product_id === kitItem.id,
            )
            if (isOrderProductCostExists) {
              isOrderProductCostExists.value =
                isOrderProductCostExists.value + kitItem.cost
            } else {
              orderCosts.push({
                product_id: kitItem.id,
                cost: 'product',
                value: kitItem.cost,
              })
            }
          } else {
            orderProducts.push({
              product_id: kitItem.id,
              user_id: Number(erp.user_id),
              qtd: kitItem.totalQtd,
              suplier_id: 13,
            })
            orderCosts.push({
              product_id: kitItem.id,
              cost: 'product',
              value: kitItem.cost,
            })
            totalCost = totalCost + kitItem.cost
          }
        }
      } else if (isAlias?.id) {
        const isOrderProductAliasExists = orderProducts.find(
          (product) => product.product_id === isAlias.id,
        )
        if (isOrderProductAliasExists) {
          isOrderProductAliasExists.qtd =
            isOrderProductAliasExists.qtd + isAlias.totalQtd
          totalCost = totalCost + isAlias.cost

          const isOrderProductCostExists = orderCosts.find(
            (cost) => cost.product_id === isAlias.id,
          )
          if (isOrderProductCostExists) {
            isOrderProductCostExists.value =
              isOrderProductCostExists.value + isAlias.cost
          } else {
            orderCosts.push({
              product_id: isAlias.id,
              cost: 'product',
              value: isAlias.cost,
            })
          }
        } else {
          orderProducts.push({
            product_id: isAlias.id,
            user_id: Number(erp.user_id),
            qtd: isAlias.totalQtd,
            suplier_id: 13,
          })
          orderCosts.push({
            product_id: isAlias.id,
            cost: 'product',
            value: isAlias.cost,
          })
          totalCost = totalCost + isAlias.cost
        }
      } else if (isProduct?.id) {
        const isOrderProductProducExists = orderProducts.find(
          (product) => product.product_id === isProduct.id,
        )
        if (isOrderProductProducExists) {
          isOrderProductProducExists.qtd =
            isOrderProductProducExists.qtd + item.quantidade
          totalCost = totalCost + isProduct.cost

          const isOrderProductCostExists = orderCosts.find(
            (cost) => cost.product_id === isProduct.id,
          )
          if (isOrderProductCostExists) {
            isOrderProductCostExists.value =
              isOrderProductCostExists.value + isProduct.cost
          } else {
            orderCosts.push({
              product_id: isProduct.id,
              cost: 'product',
              value: isProduct.cost,
            })
          }
        } else {
          orderProducts.push({
            product_id: isProduct.id,
            user_id: Number(erp.user_id),
            qtd: item.quantidade,
            suplier_id: 13,
          })
          orderCosts.push({
            product_id: isProduct.id,
            cost: 'product',
            value: isProduct.cost,
          })
          totalCost = totalCost + isProduct.cost
        }
      }
    }

    newOrderData.total_custo = totalCost
    newOrderData.status = isNotFound ? 9 : 1

    if (integration.keyword === 'mercadolivre') {
      const dataToVerify = {
        integration: {
          id: integration.id,
          params: JSON.parse(integration.params),
        },
        numeroPedidoLoja: blingOrder.numeroLoja,
      }

      const shipmentType = await orderModel.verifyIfOrderIsFlex(dataToVerify)
      console.log('shipmentType', shipmentType)
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
      newOrderData.isflex = isFlex ? 1 : 0
      newOrderData.pickup_name = pickupName
    }

    const newOrder = await prisma.orders.create({
      data: newOrderData,
    })

    if (!newOrder?.id) {
      return res.status(400).json({ erro: newOrder })
    }

    const newOrderCosts = await Promise.all(
      orderCosts.map((costs) => {
        return {
          order_id: newOrder.id,
          ...costs,
        }
      }),
    )

    console.log('newOrderCosts', newOrderCosts)

    const transaction = await prisma
      .$transaction([
        prisma.order_products.createMany({
          data: orderProducts.map((product) => {
            return {
              order_id: newOrder.id,
              ...product,
            }
          }),
        }),
        prisma.order_costs.createMany({
          data: orderCosts.map((costs) => {
            return {
              order_id: newOrder.id,
              ...costs,
            }
          }),
        }),
      ])
      .catch(async (error) => {
        return await prisma.orders
          .delete({
            where: {
              id: newOrder.id,
            },
          })
          .then(() => {
            return {
              ...error,
              message: 'Order not created',
            }
          })
      })

    return res.json({ ...newOrder, transaction })
  },

  async updateStock(req: Request, res: Response) {
    const { integrationId, warehouseId, blingProductId, stock } = req.body
    const now = new Date()
    now.setHours(now.getHours() - 3)
    const integration = await prisma.integrations.findFirst({
      where: {
        id: Number(integrationId),
        status: 1,
      },
    })
    const params = JSON.parse(integration?.params)

    const blingClient = new BlingV3(
      params.access_token,
      params.refresh_token,
      Number(integrationId),
    )

    const responseBling = await blingClient.updateStock({
      produto: {
        id: blingProductId,
      },
      deposito: {
        id: warehouseId,
      },
      operacao: 'B',
      quantidade: stock,
      observacoes: `Estoque atualizado pelo WeDrop ${now.toLocaleString('pt-BR')}`,
    })

    return res.json({ responseBling })
  },

  async getProduct(req: Request, res: Response) {
    const { integrationId, blingProductId } = req.query
    const integration = await prisma.integrations.findFirst({
      where: {
        id: Number(integrationId),
      },
    })
    const params = JSON.parse(integration?.params)
    const blingClient = new BlingV3(
      params.access_token,
      params.refresh_token,
      Number(integrationId),
    )

    const responseBling = await blingClient.getProduct(Number(blingProductId))

    return res.json({ ...responseBling })
  },

  async sendProductWithStructure(req: Request, res: Response) {
    const { productData, integrationId, userId } = req.body

    const integration = await prisma.integrations.findFirst({
      where: {
        id: Number(integrationId),
        user_id: Number(userId),
      },
    })
    const params = JSON.parse(integration?.params)
    const blingClient = new BlingV3(
      params.access_token,
      params.refresh_token,
      Number(integrationId),
    )

    const responseProduct = await blingClient.createProduct(productData)
    return res.json({ product: responseProduct, productData })
  },

  async addProductToStore(req: Request, res: Response) {
    const { integrationId, customProduct, userId } = req.body

    const integration = await prisma.integrations.findFirst({
      where: {
        id: Number(integrationId),
        user_id: Number(userId),
      },
    })
    const params = JSON.parse(integration?.params)
    const blingClient = new BlingV3(
      params.access_token,
      params.refresh_token,
      Number(integrationId),
    )

    const storeData = {
      codigo: customProduct.codigo,
      preco: customProduct.preco,
      produto: {
        id: customProduct.id,
      },
      loja: {
        id: customProduct.bling_store_id,
      },
    }
    const responseStore = await blingClient.addProductToStore(storeData)

    return res.json(responseStore)
  },

  async findProduct(req: Request, res: Response) {
    const { integrationId, sku } = req.body
    console.log(integrationId, sku)
    if (!integrationId || !sku) {
      return res
        .status(400)
        .json({ message: 'IntegrationId and sku are required' })
    }
    const integration = await prisma.integrations.findFirst({
      where: {
        id: Number(integrationId),
      },
    })
    const params = JSON.parse(integration?.params)
    console.log(params)
    const blingClient = new BlingV3(
      params.access_token,
      params.refresh_token,
      Number(integrationId),
    )

    const products = []

    for (let i = 1; i < 100; i++) {
      const responseProducts = await blingClient.getProducts({
        tipo: 'T',
        pagina: i,
        criterio: 2,
      })
      if (responseProducts.data.length === 0) {
        break
      }
      responseProducts.data.forEach((product: any) => {
        products.push(product)
      })
    }

    const product = products.find((product) => product.codigo === sku)
    return res.json(product)
  },
}
