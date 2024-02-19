"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const prismaClient_1 = require("../database/prismaClient");
const bling_v3_1 = require("../repositories/bling-v3");
const Order_1 = require("../models/Order");
exports.default = {
    getWeDropProducts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { integrationId } = req.query;
            const { userId } = req.body;
            const weDropProducts = yield prismaClient_1.prisma.products.findMany();
            const integration = yield prismaClient_1.prisma.integrations.findFirst({
                where: {
                    id: Number(integrationId),
                    user_id: Number(userId),
                },
            });
            const params = JSON.parse(integration === null || integration === void 0 ? void 0 : integration.params);
            const blingClient = new bling_v3_1.BlingV3(params.access_token, params.refresh_token, Number(integrationId));
            const products = [];
            for (let i = 1; i < 100; i++) {
                const responseProducts = yield blingClient.getProducts({
                    tipo: 'PS',
                    pagina: i,
                    criterio: 2,
                });
                if (responseProducts.data.length === 0) {
                    break;
                }
                responseProducts.data.forEach((product) => {
                    products.push(product);
                });
            }
            const filtredProducts = products.filter((product) => weDropProducts.find((weDropProduct) => weDropProduct.sku === product.codigo));
            const warehouse = yield blingClient.getWarehouses().then((response) => {
                return response.data[0];
            });
            const formattedProductsToDb = filtredProducts.map((product) => {
                const weDropProduct = weDropProducts.find((weDropProduct) => weDropProduct.sku === product.codigo);
                return {
                    user_id: Number(userId),
                    integration_id: Number(integrationId),
                    product_id: weDropProduct.id,
                    bling_product_id: product.id * 1,
                    bling_warehouse_id: warehouse.id,
                    status: 1,
                };
            });
            yield prismaClient_1.prisma.bling_user_products.deleteMany({
                where: {
                    user_id: Number(userId),
                },
            });
            yield prismaClient_1.prisma.bling_user_products.createMany({
                data: formattedProductsToDb,
            });
            return res.json({
                total: filtredProducts.length,
                results: filtredProducts,
            });
        });
    },
    findNewOrders(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { integrationId, startDate, endDate } = req.query;
            const { userId } = req.body;
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const initDate = startDate
                ? new Date(startDate).toISOString().split('T')[0]
                : yesterday.toISOString().split('T')[0];
            const stopDate = endDate
                ? new Date(endDate).toISOString().split('T')[0]
                : today.toISOString().split('T')[0];
            const integration = yield prismaClient_1.prisma.integrations.findFirst({
                where: {
                    id: Number(integrationId),
                },
            });
            const params = JSON.parse(integration === null || integration === void 0 ? void 0 : integration.params);
            const blingClient = new bling_v3_1.BlingV3(params.access_token, params.refresh_token, Number(integrationId));
            const orders = [];
            for (let i = 1; i < 10; i++) {
                const responseOrders = yield blingClient.getSellOrders({
                    initDate,
                    endDate: stopDate,
                    situations: [6, 15],
                    page: i,
                });
                responseOrders.data.forEach((order) => {
                    orders.push(order);
                });
                if (responseOrders.data.length < 100) {
                    break;
                }
            }
            const userOrders = yield prismaClient_1.prisma.orders.findMany({
                where: {
                    user_id: Number(userId),
                    channel_order: {
                        in: orders.map((order) => String(order.numeroLoja !== '' ? order.numeroLoja : order.numero)),
                    },
                },
                select: {
                    channel_order: true,
                },
            });
            const filtredOrders = orders.filter((order) => !userOrders.find((userOrder) => {
                const channelOrder = String(order.numeroLoja !== '' ? order.numeroLoja : order.numero);
                return (userOrder.channel_order === channelOrder ||
                    !(new Date(order.data) >= new Date(initDate)));
            }));
            return res.json(filtredOrders);
        });
    },
    sendVariation(req, res) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        return __awaiter(this, void 0, void 0, function* () {
            const { integrationId, variationId, userId } = req.body;
            const integration = yield prismaClient_1.prisma.integrations.findFirst({
                where: {
                    id: Number(integrationId),
                },
            });
            const params = JSON.parse(integration === null || integration === void 0 ? void 0 : integration.params);
            const blingClient = new bling_v3_1.BlingV3(params.access_token, params.refresh_token, Number(integrationId));
            const dbVariation = yield prismaClient_1.prisma.variations.findFirst({
                where: {
                    id: Number(variationId),
                    user_id: Number(userId),
                },
                include: {
                    variation_products: true,
                },
            });
            const blingUserProducts = yield prismaClient_1.prisma.bling_user_products.findMany({
                where: {
                    user_id: Number(userId),
                    integration_id: Number(integrationId),
                    product_id: {
                        in: dbVariation.variation_products.map((product) => product.product_id),
                    },
                },
                include: {
                    products: true,
                },
            });
            const checkedBlingUserProducts = [];
            for (const product of blingUserProducts) {
                const isBlingUserProductExists = yield blingClient.getProduct(product.bling_product_id);
                if ((isBlingUserProductExists === null || isBlingUserProductExists === void 0 ? void 0 : isBlingUserProductExists.id) === product.bling_product_id &&
                    (isBlingUserProductExists === null || isBlingUserProductExists === void 0 ? void 0 : isBlingUserProductExists.situacao) === 'A') {
                    checkedBlingUserProducts.push(product);
                }
                else {
                    yield prismaClient_1.prisma.bling_user_products.delete({
                        where: {
                            id: product.id,
                        },
                    });
                }
            }
            const filteredBlingUserProducts = checkedBlingUserProducts.filter(Boolean);
            const variationWithProducts = dbVariation.variation_products.map((variationProduct) => {
                const product = filteredBlingUserProducts.find((blingUserProduct) => blingUserProduct.product_id === variationProduct.product_id);
                return Object.assign(Object.assign({}, variationProduct), { bling_product_id: product === null || product === void 0 ? void 0 : product.bling_product_id, bling_warehouse_id: product === null || product === void 0 ? void 0 : product.bling_warehouse_id, product: product === null || product === void 0 ? void 0 : product.products });
            });
            const variation = Object.assign(Object.assign({}, dbVariation), { variation_products: variationWithProducts });
            console.log(variation);
            const productData = {
                nome: variation.name,
                codigo: variation.sku,
                preco: variation === null || variation === void 0 ? void 0 : variation.variation_products[0].price,
                tipo: 'P',
                situacao: 'A',
                formato: 'V',
                descricaoCurta: (_a = variation === null || variation === void 0 ? void 0 : variation.variation_products[0]) === null || _a === void 0 ? void 0 : _a.product.description,
                dataValidade: undefined,
                unidade: 'UN',
                pesoLiquido: (_b = variation === null || variation === void 0 ? void 0 : variation.variation_products[0]) === null || _b === void 0 ? void 0 : _b.product.weight,
                pesoBruto: (_c = variation === null || variation === void 0 ? void 0 : variation.variation_products[0]) === null || _c === void 0 ? void 0 : _c.product.weight,
                volumes: 1,
                itensPorCaixa: 1,
                gtin: (_d = variation === null || variation === void 0 ? void 0 : variation.variation_products[0]) === null || _d === void 0 ? void 0 : _d.product.ean,
                gtinEmbalagem: (_e = variation === null || variation === void 0 ? void 0 : variation.variation_products[0]) === null || _e === void 0 ? void 0 : _e.product.ean,
                tipoProducao: 'P',
                condicao: 0,
                freteGratis: false,
                marca: (_f = variation === null || variation === void 0 ? void 0 : variation.variation_products[0]) === null || _f === void 0 ? void 0 : _f.product.brand,
                descricaoComplementar: undefined,
                linkExterno: undefined,
                observacoes: undefined,
                descricaoEmbalagemDiscreta: undefined,
                dimensoes: {
                    largura: (_h = (_g = variation === null || variation === void 0 ? void 0 : variation.variation_products[0]) === null || _g === void 0 ? void 0 : _g.product) === null || _h === void 0 ? void 0 : _h.width,
                    altura: (_k = (_j = variation === null || variation === void 0 ? void 0 : variation.variation_products[0]) === null || _j === void 0 ? void 0 : _j.product) === null || _k === void 0 ? void 0 : _k.height,
                    profundidade: (_l = variation === null || variation === void 0 ? void 0 : variation.variation_products[0]) === null || _l === void 0 ? void 0 : _l.product.length,
                    unidadeMedida: 1,
                },
                tributacao: {
                    origem: 0,
                    ncm: (_o = (_m = variation === null || variation === void 0 ? void 0 : variation.variation_products[0]) === null || _m === void 0 ? void 0 : _m.product) === null || _o === void 0 ? void 0 : _o.ncm,
                    cest: (_q = (_p = variation === null || variation === void 0 ? void 0 : variation.variation_products[0]) === null || _p === void 0 ? void 0 : _p.product) === null || _q === void 0 ? void 0 : _q.cest,
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
                    };
                }),
            };
            const blingVariation = yield blingClient.createProduct(productData);
            const updatedVariations = [];
            if ((_s = (_r = blingVariation === null || blingVariation === void 0 ? void 0 : blingVariation.data) === null || _r === void 0 ? void 0 : _r.variations) === null || _s === void 0 ? void 0 : _s.saved) {
                const { saved } = blingVariation.data.variations;
                for (const s of saved) {
                    const productDataVariation = productData.variacoes.find((v) => v.nome === s.nomeVariacao);
                    const variationProduct = variation.variation_products.find((v) => v.name === s.nomeVariacao);
                    const newProductData = Object.assign(Object.assign({ id: s.id }, productDataVariation), { formato: 'E', estrutura: {
                            tipoEstoque: 'V',
                            componentes: [
                                {
                                    produto: {
                                        id: variationProduct.bling_product_id,
                                    },
                                    quantidade: 1,
                                },
                            ],
                        } });
                    updatedVariations.push(yield blingClient.updateProduct(newProductData));
                }
            }
            return res.json({ blingVariation, updatedVariations });
        });
    },
    sendKit(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { integrationId, kit, userId } = req.body;
            const integration = yield prismaClient_1.prisma.integrations.findFirst({
                where: {
                    id: Number(integrationId),
                },
            });
            const params = JSON.parse(integration === null || integration === void 0 ? void 0 : integration.params);
            const blingClient = new bling_v3_1.BlingV3(params.access_token, params.refresh_token, Number(integrationId));
            const blingUserProducts = yield prismaClient_1.prisma.bling_user_products.findMany({
                where: {
                    user_id: Number(userId),
                    integration_id: Number(integrationId),
                    product_id: {
                        in: kit.products.map((product) => product.id),
                    },
                },
            });
            function gerarCodigoEAN13() {
                const prefixo = '789';
                // Gerar 9 dígitos aleatórios
                let codigo = '';
                for (let i = 0; i < 9; i++) {
                    codigo += Math.floor(Math.random() * 10).toString();
                }
                // Combinar o prefixo e os dígitos aleatórios
                codigo = prefixo + codigo;
                // Calcular o dígito verificador
                const digitos = codigo.split('').map(Number);
                let soma = 0;
                for (let i = 0; i < 12; i++) {
                    soma += i % 2 === 0 ? digitos[i] : digitos[i] * 3;
                }
                const digitoVerificador = (10 - (soma % 10)) % 10;
                // Combinar os dígitos e o dígito verificador para formar o código EAN-13 completo
                codigo += digitoVerificador.toString();
                return codigo;
            }
            const productData = {
                nome: kit.name ? kit.name : kit.title,
                codigo: kit.sku,
                preco: kit.cost,
                tipo: 'P',
                situacao: 'A',
                formato: 'E',
                descricaoCurta: kit === null || kit === void 0 ? void 0 : kit.description,
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
                marca: (kit === null || kit === void 0 ? void 0 : kit.brand) ? kit.brand : 'Sem Marca',
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
                        var _a;
                        return {
                            produto: {
                                id: (_a = blingUserProducts.find((blingUserProduct) => blingUserProduct.product_id === product.id)) === null || _a === void 0 ? void 0 : _a.bling_product_id,
                            },
                            quantidade: product.qtd,
                        };
                    }),
                },
            };
            const blingKit = yield blingClient.createProduct(productData);
            return res.json({ blingKit, productData });
        });
    },
    sendProduct(req, res) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            const { integrationId, productId, userId } = req.body;
            const integration = yield prismaClient_1.prisma.integrations.findFirst({
                where: {
                    id: Number(integrationId),
                },
            });
            const params = JSON.parse(integration === null || integration === void 0 ? void 0 : integration.params);
            const blingClient = new bling_v3_1.BlingV3(params.access_token, params.refresh_token, Number(integrationId));
            const isBlingUserProductExists = yield prismaClient_1.prisma.bling_user_products.findFirst({
                where: {
                    user_id: Number(userId),
                    product_id: Number(productId),
                    integration_id: Number(integrationId),
                },
            });
            if (isBlingUserProductExists) {
                const responseBlingProduct = yield blingClient.getProduct(isBlingUserProductExists.bling_product_id);
                if ((responseBlingProduct === null || responseBlingProduct === void 0 ? void 0 : responseBlingProduct.id) ===
                    isBlingUserProductExists.bling_product_id &&
                    (responseBlingProduct === null || responseBlingProduct === void 0 ? void 0 : responseBlingProduct.situacao) === 'A') {
                    return res.json(responseBlingProduct);
                }
                else if (((isBlingUserProductExists === null || isBlingUserProductExists === void 0 ? void 0 : isBlingUserProductExists.bling_product_id) &&
                    !(responseBlingProduct === null || responseBlingProduct === void 0 ? void 0 : responseBlingProduct.id)) ||
                    ((isBlingUserProductExists === null || isBlingUserProductExists === void 0 ? void 0 : isBlingUserProductExists.bling_product_id) &&
                        (responseBlingProduct === null || responseBlingProduct === void 0 ? void 0 : responseBlingProduct.situacao) !== 'A')) {
                    yield prismaClient_1.prisma.bling_user_products.delete({
                        where: {
                            id: isBlingUserProductExists.id,
                        },
                    });
                }
            }
            const product = yield prismaClient_1.prisma.products.findFirst({
                where: {
                    id: Number(productId),
                },
            });
            const plusImgs = product.plusimgs.split(',');
            const images = [product.img, ...plusImgs].filter((img) => img !== '');
            const productData = {
                nome: product === null || product === void 0 ? void 0 : product.name.replace('WE DROP -', '').replace('WEDROP', '').trim(),
                codigo: product === null || product === void 0 ? void 0 : product.sku,
                preco: product === null || product === void 0 ? void 0 : product.price,
                tipo: 'P',
                situacao: 'A',
                formato: 'S',
                descricaoCurta: product === null || product === void 0 ? void 0 : product.description,
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
            };
            const warehouse = yield blingClient.getWarehouses().then((response) => {
                return response.data[0];
            });
            const responseProduct = yield blingClient
                .createProduct(productData)
                .catch((error) => {
                return error.response.data;
            });
            if (responseProduct === null || responseProduct === void 0 ? void 0 : responseProduct.error) {
                return res.status(400).json(Object.assign(Object.assign({}, responseProduct), { message: ((_c = (_b = (_a = responseProduct === null || responseProduct === void 0 ? void 0 : responseProduct.error) === null || _a === void 0 ? void 0 : _a.fields) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.msg.includes('já foi cadastrado para o produto'))
                        ? 'Produto já cadastrado'
                        : (_d = responseProduct === null || responseProduct === void 0 ? void 0 : responseProduct.error) === null || _d === void 0 ? void 0 : _d.message }));
            }
            if ((_e = responseProduct.data) === null || _e === void 0 ? void 0 : _e.id) {
                yield prismaClient_1.prisma.bling_user_products.create({
                    data: {
                        user_id: Number(userId),
                        integration_id: Number(integrationId),
                        product_id: Number(productId),
                        bling_product_id: responseProduct.data.id,
                        bling_warehouse_id: warehouse.id,
                        status: 1,
                    },
                });
                const stock = yield blingClient.updateStock({
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
                });
                return res.json({ responseProduct, stock, productData });
            }
            return res.status(400).json({ responseProduct, productData });
        });
    },
    importOrder(req, res) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const { erpId, integrationId, blingId } = req.query;
            const { userId } = req.body;
            const erp = yield prismaClient_1.prisma.integrations.findFirst({
                where: {
                    user_id: Number(userId),
                    id: Number(erpId),
                },
            });
            const params = JSON.parse(erp === null || erp === void 0 ? void 0 : erp.params);
            const integration = yield prismaClient_1.prisma.integrations.findFirst({
                where: {
                    user_id: Number(userId),
                    id: Number(integrationId),
                },
            });
            const blingClient = new bling_v3_1.BlingV3(params.access_token, params.refresh_token, Number(integrationId));
            const blingOrder = yield blingClient
                .getOrder(Number(blingId))
                .then((res) => {
                return res.data;
            });
            const customer = {
                nome: (_a = blingOrder === null || blingOrder === void 0 ? void 0 : blingOrder.contato) === null || _a === void 0 ? void 0 : _a.nome,
                cnpj: (_b = blingOrder === null || blingOrder === void 0 ? void 0 : blingOrder.contato) === null || _b === void 0 ? void 0 : _b.numeroDocumento,
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
            };
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
            ];
            const newOrderData = {
                user_id: Number(userId),
                integration_id: Number(integrationId),
                channel_order: String(blingOrder.numeroLoja ? blingOrder.numeroLoja : blingOrder.numero),
                total: Number(blingOrder.total),
                total_custo: 0,
                string_channel: ((_c = integrationsNames.find((i) => integration.keyword === i.keyword)) === null || _c === void 0 ? void 0 : _c.name) || 'Não informado',
                pickup_name: ((_d = integrationsNames.find((i) => integration.keyword === i.keyword)) === null || _d === void 0 ? void 0 : _d.name) || 'Não informado',
                user_blingid: Number(blingOrder.id),
                customer_name: JSON.stringify(customer),
                status: 0,
                isflex: 0,
            };
            const orderProducts = [];
            const orderCosts = [];
            const orderModel = new Order_1.Order(Number(userId));
            let totalCost = 0;
            let isNotFound = false;
            for (const item of blingOrder.itens) {
                const isKit = yield orderModel.getProductIfIsAKit(item);
                const isAlias = yield orderModel.getProductIfIsAAlias(item);
                const isProduct = yield orderModel.getProductIfIsAProduct(item);
                if (!isProduct && !isAlias && !isKit) {
                    isNotFound = true;
                }
                if (isKit.length > 0) {
                    for (const kitItem of isKit) {
                        const isOrderProductProducExists = orderProducts.find((product) => product.product_id === kitItem.id);
                        if (isOrderProductProducExists) {
                            isOrderProductProducExists.qtd =
                                isOrderProductProducExists.qtd + kitItem.totalQtd;
                            totalCost = totalCost + kitItem.cost;
                            const isOrderProductCostExists = orderCosts.find((cost) => cost.product_id === kitItem.id);
                            if (isOrderProductCostExists) {
                                isOrderProductCostExists.value =
                                    isOrderProductCostExists.value + kitItem.cost;
                            }
                            else {
                                orderCosts.push({
                                    product_id: kitItem.id,
                                    cost: 'product',
                                    value: kitItem.cost,
                                });
                            }
                        }
                        else {
                            orderProducts.push({
                                product_id: kitItem.id,
                                user_id: Number(userId),
                                qtd: kitItem.totalQtd,
                                suplier_id: 13,
                            });
                            orderCosts.push({
                                product_id: kitItem.id,
                                cost: 'product',
                                value: kitItem.cost,
                            });
                            totalCost = totalCost + kitItem.cost;
                        }
                    }
                }
                else if (isAlias === null || isAlias === void 0 ? void 0 : isAlias.id) {
                    const isOrderProductAliasExists = orderProducts.find((product) => product.product_id === isAlias.id);
                    if (isOrderProductAliasExists) {
                        isOrderProductAliasExists.qtd =
                            isOrderProductAliasExists.qtd + isAlias.totalQtd;
                        totalCost = totalCost + isAlias.cost;
                        const isOrderProductCostExists = orderCosts.find((cost) => cost.product_id === isAlias.id);
                        if (isOrderProductCostExists) {
                            isOrderProductCostExists.value =
                                isOrderProductCostExists.value + isAlias.cost;
                        }
                        else {
                            orderCosts.push({
                                product_id: isAlias.id,
                                cost: 'product',
                                value: isAlias.cost,
                            });
                        }
                    }
                    else {
                        orderProducts.push({
                            product_id: isAlias.id,
                            user_id: Number(userId),
                            qtd: isAlias.totalQtd,
                            suplier_id: 13,
                        });
                        orderCosts.push({
                            product_id: isAlias.id,
                            cost: 'product',
                            value: isAlias.cost,
                        });
                        totalCost = totalCost + isAlias.cost;
                    }
                }
                else if (isProduct === null || isProduct === void 0 ? void 0 : isProduct.id) {
                    const isOrderProductProducExists = orderProducts.find((product) => product.product_id === isProduct.id);
                    if (isOrderProductProducExists) {
                        isOrderProductProducExists.qtd =
                            isOrderProductProducExists.qtd + item.quantidade;
                        totalCost = totalCost + isProduct.cost;
                        const isOrderProductCostExists = orderCosts.find((cost) => cost.product_id === isProduct.id);
                        if (isOrderProductCostExists) {
                            isOrderProductCostExists.value =
                                isOrderProductCostExists.value + isProduct.cost;
                        }
                        else {
                            orderCosts.push({
                                product_id: isProduct.id,
                                cost: 'product',
                                value: isProduct.cost,
                            });
                        }
                    }
                    else {
                        orderProducts.push({
                            product_id: isProduct.id,
                            user_id: Number(userId),
                            qtd: item.quantidade,
                            suplier_id: 13,
                        });
                        orderCosts.push({
                            product_id: isProduct.id,
                            cost: 'product',
                            value: isProduct.cost,
                        });
                        totalCost = totalCost + isProduct.cost;
                    }
                }
            }
            newOrderData.total_custo = totalCost;
            newOrderData.status = isNotFound ? 9 : 1;
            if (integration.keyword === 'mercadolivre') {
                const dataToVerify = {
                    integration: {
                        id: integration.id,
                        params: JSON.parse(integration.params),
                    },
                    numeroPedidoLoja: blingOrder.numeroLoja,
                };
                const shipmentType = yield orderModel.verifyIfOrderIsFlex(dataToVerify);
                console.log('shipmentType', shipmentType);
                const pickupName = shipmentType === 'self_service'
                    ? 'Flex'
                    : shipmentType === 'xd_drop_off'
                        ? 'Agência'
                        : shipmentType === 'drop_off'
                            ? 'Correios'
                            : shipmentType === 'cross_docking'
                                ? 'Coleta'
                                : 'MercadoLivre';
                const isFlex = shipmentType === 'self_service';
                newOrderData.isflex = isFlex ? 1 : 0;
                newOrderData.pickup_name = pickupName;
            }
            const newOrder = yield prismaClient_1.prisma.orders.create({
                data: newOrderData,
            });
            if (!(newOrder === null || newOrder === void 0 ? void 0 : newOrder.id)) {
                return res.status(400).json({ erro: newOrder });
            }
            const newOrderCosts = yield Promise.all(orderCosts.map((costs) => {
                return Object.assign({ order_id: newOrder.id }, costs);
            }));
            console.log('newOrderCosts', newOrderCosts);
            const transaction = yield prismaClient_1.prisma
                .$transaction([
                prismaClient_1.prisma.order_products.createMany({
                    data: orderProducts.map((product) => {
                        return Object.assign({ order_id: newOrder.id }, product);
                    }),
                }),
                prismaClient_1.prisma.order_costs.createMany({
                    data: orderCosts.map((costs) => {
                        return Object.assign({ order_id: newOrder.id }, costs);
                    }),
                }),
            ])
                .catch((error) => __awaiter(this, void 0, void 0, function* () {
                return yield prismaClient_1.prisma.orders
                    .delete({
                    where: {
                        id: newOrder.id,
                    },
                })
                    .then(() => {
                    return Object.assign(Object.assign({}, error), { message: 'Order not created' });
                });
            }));
            return res.json(Object.assign(Object.assign({}, newOrder), { transaction }));
        });
    },
};
//# sourceMappingURL=blingV3Controller.js.map