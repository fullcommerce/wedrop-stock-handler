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
exports.Order = void 0;
const prismaClient_1 = require("../database/prismaClient");
const mercadolivre_1 = require("../repositories/mercadolivre");
class Order {
    constructor(userId) {
        this.userId = userId;
    }
    verifyIfOrderIsFlex(order) {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function* () {
            const ml = new mercadolivre_1.MercadoLivre((_b = (_a = order === null || order === void 0 ? void 0 : order.integration) === null || _a === void 0 ? void 0 : _a.params) === null || _b === void 0 ? void 0 : _b.access_token, (_d = (_c = order === null || order === void 0 ? void 0 : order.integration) === null || _c === void 0 ? void 0 : _c.params) === null || _d === void 0 ? void 0 : _d.refresh_token, (_e = order === null || order === void 0 ? void 0 : order.integration) === null || _e === void 0 ? void 0 : _e.id);
            const orderMl = yield ml.getOrder(order === null || order === void 0 ? void 0 : order.numeroPedidoLoja);
            if (!((_f = orderMl === null || orderMl === void 0 ? void 0 : orderMl.shipping) === null || _f === void 0 ? void 0 : _f.id))
                return {
                    type: false,
                    shippingId: false,
                };
            const orderMlShipping = yield ml.getShipment((_g = orderMl === null || orderMl === void 0 ? void 0 : orderMl.shipping) === null || _g === void 0 ? void 0 : _g.id);
            return orderMlShipping.logistic_type;
        });
    }
    verifyIfOrderExists({ id, userId }) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield prismaClient_1.prisma.orders.findFirst({
                where: {
                    id,
                    user_id: userId,
                },
            });
            return !!order;
        });
    }
    verifyIfOrderFromChannelExists({ id, userId }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!id)
                return false;
            const order = yield prismaClient_1.prisma.orders.findFirst({
                where: {
                    channel_order: id,
                    user_id: userId,
                },
            });
            return !!order;
        });
    }
    verifyBlingOrderProduct(product) {
        return __awaiter(this, void 0, void 0, function* () {
            return !!product.codigo;
        });
    }
    verifyBlingOrderProducts(products) {
        return __awaiter(this, void 0, void 0, function* () {
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
                ];
            products = yield Promise.all(products.map((product) => __awaiter(this, void 0, void 0, function* () {
                const kit = yield this.getProductIfIsAKit(product.item);
                const alias = yield this.getProductIfIsAAlias(product.item);
                const pProduct = yield this.getProductIfIsAProduct(product.item);
                if (kit.length === 0 && alias === null && pProduct === null) {
                    return {
                        item: Object.assign(Object.assign({}, product.item), { kit,
                            alias, product: pProduct, productExists: false }),
                    };
                }
                return {
                    item: Object.assign(Object.assign({}, product.item), { kit,
                        alias, product: pProduct, productExists: true }),
                };
            })));
            return products;
        });
    }
    verifyBlingOrdersProducts(orders) {
        return __awaiter(this, void 0, void 0, function* () {
            orders = yield Promise.all(orders.map((order) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                const products = yield this.verifyBlingOrderProducts(order.itens);
                if (order.tipoIntegracao === 'MercadoLivre' && ((_a = order.integration) === null || _a === void 0 ? void 0 : _a.id)) {
                    const shipmentType = yield this.verifyIfOrderIsFlex(order);
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
                    return Object.assign(Object.assign({}, order), { shipmentType: pickupName, itens: products, isFlex });
                }
                if (((_c = (_b = order === null || order === void 0 ? void 0 : order.integration) === null || _b === void 0 ? void 0 : _b.params) === null || _c === void 0 ? void 0 : _c.wedropLabels) === 'true' &&
                    (order === null || order === void 0 ? void 0 : order.integration.user_id) === 12160) {
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
                    ];
                    const customerCep = Number(order.cliente.cep.replace('-', ''));
                    const isFlex = flexCeps.find((cep) => {
                        return customerCep >= cep.init && customerCep <= cep.end;
                    });
                    if (isFlex) {
                        return Object.assign(Object.assign({}, order), { itens: products, isFlex: true });
                    }
                    return Object.assign(Object.assign({}, order), { itens: products, isFlex: false });
                }
                return Object.assign(Object.assign({}, order), { itens: products, isFlex: false });
            })));
            return orders;
        });
    }
    getBlingOrderIntegration(order) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!order.loja)
                return false;
            const integration = yield prismaClient_1.prisma.integrations.findFirst({
                where: {
                    bling_id: Number(order.loja),
                },
            });
            if (!integration)
                return false;
            return Object.assign(Object.assign({}, integration), { params: JSON.parse(integration === null || integration === void 0 ? void 0 : integration.params) });
        });
    }
    getBlingOrdersIntegration(orders) {
        return __awaiter(this, void 0, void 0, function* () {
            orders = yield Promise.all(orders.map((order) => __awaiter(this, void 0, void 0, function* () {
                const integration = (yield this.getBlingOrderIntegration(order)) || {
                    integration: false,
                };
                return Object.assign(Object.assign({}, order), { integration });
            })));
            return orders;
        });
    }
    getProductIfIsAKit(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const kit = yield prismaClient_1.prisma.kits.findMany({
                where: {
                    user_id: this.userId,
                    sku: item.codigo,
                },
            });
            if (kit) {
                const products = yield Promise.all(kit.map((kitItem) => __awaiter(this, void 0, void 0, function* () {
                    const product = yield prismaClient_1.prisma.products.findFirst({
                        where: {
                            id: kitItem.product_id,
                        },
                    });
                    if (!product)
                        return null;
                    const totalQtd = Number(parseInt(item.quantidade)) * Number(kitItem.qtd);
                    return Object.assign(Object.assign({}, product), { customQtd: kitItem.qtd, totalQtd, cost: Number(product.price) * totalQtd });
                })));
                return products;
            }
            return null;
        });
    }
    getProductIfIsAProduct(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = yield prismaClient_1.prisma.products.findFirst({
                where: {
                    sku: item.codigo,
                },
            });
            if (!product)
                return null;
            const totalQtd = Number(parseInt(item.quantidade)) * 1;
            return Object.assign(Object.assign({}, product), { cost: product.price * totalQtd, totalQtd });
        });
    }
    getProductIfIsAAlias(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const alias = yield prismaClient_1.prisma.product_alias.findFirst({
                where: {
                    user_id: this.userId,
                    alias: item.codigo,
                    product_id: {
                        not: 0,
                    },
                },
            });
            if (alias) {
                const product = yield prismaClient_1.prisma.products.findFirst({
                    where: {
                        id: alias.product_id,
                        OR: [
                            {
                                sku: alias.sku,
                            },
                        ],
                    },
                });
                if (!product)
                    return null;
                const totalQtd = Number(parseInt(item.quantidade)) * Number(alias.qtd);
                return Object.assign(Object.assign({}, product), { customQtd: alias.qtd, totalQtd, cost: Number(product.price) * totalQtd });
            }
            return null;
        });
    }
    updateTotalCostsFromCosts({ orderId }) {
        return __awaiter(this, void 0, void 0, function* () {
            const orderCosts = yield prismaClient_1.prisma.order_costs.findMany({
                where: {
                    order_id: orderId,
                },
            });
            let totalCost = 0;
            yield Promise.all(orderCosts.map((cost) => {
                totalCost += Number(cost.value);
                return cost;
            }));
            const order = yield prismaClient_1.prisma.orders.update({
                where: {
                    id: orderId,
                },
                data: {
                    total_custo: totalCost,
                },
            });
            return { totalCost, order };
        });
    }
    sumTotalCostOfProducts(products, isFlex = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let totalCost = 0;
            // search on every products.item to see if productExists is true, if have one that is false return 0
            const productExists = products.find((product) => {
                return product.item.productExists === false;
            });
            if (productExists)
                return 0;
            products = yield Promise.all(products.map((product) => __awaiter(this, void 0, void 0, function* () {
                if (product.item.productExists) {
                    if (product.item.kit) {
                        product.item.kit = yield Promise.all(product.item.kit.map((kitItem) => __awaiter(this, void 0, void 0, function* () {
                            totalCost += kitItem.cost;
                            return kitItem;
                        })));
                    }
                    if (product.item.alias) {
                        totalCost += product.item.alias.cost;
                    }
                    if (product.item.product) {
                        totalCost += product.item.product.cost;
                    }
                }
                return product;
            })));
            if (totalCost > 0) {
                return isFlex ? totalCost + Number(12.99) : totalCost;
            }
            else {
                return 0;
            }
        });
    }
    createOrders(orders) {
        return __awaiter(this, void 0, void 0, function* () {
            orders = yield Promise.all(orders.map((order) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const totalCost = yield this.sumTotalCostOfProducts(order.itens, order.isFlex);
                if (['Em aberto', 'Atendido', 'Em Andamento'].includes(order.situacao) &&
                    totalCost > 0 &&
                    ((_a = order === null || order === void 0 ? void 0 : order.integration) === null || _a === void 0 ? void 0 : _a.id)) {
                    const orderCreated = yield this.createOrder(Object.assign(Object.assign({}, order), { totalCost }));
                    return { orderData: Object.assign(Object.assign({}, order), { totalCost }), orderCreated };
                }
                else {
                    return { orderData: Object.assign(Object.assign({}, order), { totalCost }), orderCreated: null };
                }
            })));
            return orders;
        });
    }
    createOrder(order) {
        return __awaiter(this, void 0, void 0, function* () {
            let status = 1;
            // find productExists === false
            order.itens.find((item) => {
                if (item.item.productExists === false) {
                    status = 9;
                    return item;
                }
                return null;
            });
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
            const date = new Date();
            const now = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() - 3, date.getMinutes(), date.getSeconds(), date.getMilliseconds());
            const orderCreated = yield prismaClient_1.prisma.orders.create({
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
                    customer_name: JSON.stringify(Object.assign(Object.assign({}, ((order === null || order === void 0 ? void 0 : order.cliente) || { nome: 'Cliente não informado' })), (order.enderecoEntrega || { endereco: 'Endereço não informado' }))),
                    status,
                },
            });
            const orderProducts = yield this.createOrderProducts(orderCreated, order.itens);
            if (status === 9) {
                yield prismaClient_1.prisma.order_history.create({
                    data: {
                        order_id: orderCreated.id,
                        user_id: this.userId,
                        type: 'order_created_incomplete',
                        insert_date: now,
                    },
                });
            }
            else {
                yield prismaClient_1.prisma.order_history.create({
                    data: {
                        order_id: orderCreated.id,
                        user_id: this.userId,
                        type: 'order_created',
                        insert_date: now,
                    },
                });
            }
            return Object.assign(Object.assign({}, orderCreated), { customer_name: order.cliente, orderProducts });
        });
    }
    createOrderProducts(order, itens) {
        return __awaiter(this, void 0, void 0, function* () {
            if (order.isflex === 1) {
                yield prismaClient_1.prisma.order_costs.create({
                    data: {
                        order_id: order.id,
                        product_id: 0,
                        cost: 'flex',
                        value: 12.99,
                    },
                });
            }
            const items = yield Promise.all(itens.map((item) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                if (item.item.productExists) {
                    if (item.item.kit.length > 0) {
                        yield Promise.all(item.item.kit.map((kitItem) => __awaiter(this, void 0, void 0, function* () {
                            const kitProduct = yield prismaClient_1.prisma.order_products.create({
                                data: {
                                    order_id: order.id,
                                    product_id: kitItem.id,
                                    user_id: this.userId,
                                    qtd: kitItem.totalQtd,
                                    suplier_id: 13,
                                },
                            });
                            yield prismaClient_1.prisma.order_costs.create({
                                data: {
                                    order_id: order.id,
                                    product_id: kitItem.id,
                                    cost: 'product',
                                    value: kitItem.cost,
                                },
                            });
                            return kitProduct;
                        })));
                    }
                    if ((_a = item.item.alias) === null || _a === void 0 ? void 0 : _a.id) {
                        const aliasProduct = yield prismaClient_1.prisma.order_products.create({
                            data: {
                                order_id: order.id,
                                product_id: item.item.alias.id,
                                user_id: this.userId,
                                qtd: item.item.alias.totalQtd,
                                suplier_id: 13,
                            },
                        });
                        yield prismaClient_1.prisma.order_costs.create({
                            data: {
                                order_id: order.id,
                                product_id: item.item.alias.id,
                                cost: 'product',
                                value: item.item.alias.cost,
                            },
                        });
                        return aliasProduct;
                    }
                    if ((_b = item.item.product) === null || _b === void 0 ? void 0 : _b.id) {
                        const productProduct = yield prismaClient_1.prisma.order_products.create({
                            data: {
                                order_id: order.id,
                                product_id: item.item.product.id,
                                user_id: this.userId,
                                qtd: item.item.product.totalQtd || 1,
                                suplier_id: 13,
                            },
                        });
                        yield prismaClient_1.prisma.order_costs.create({
                            data: {
                                order_id: order.id,
                                product_id: item.item.product.id,
                                cost: 'product',
                                value: item.item.product.cost,
                            },
                        });
                        return productProduct;
                    }
                }
            })));
            return items;
        });
    }
    inputOrderError(order) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            const errors = []; // se a situação for diferente de Em Aberto
            ((_b = (_a = order === null || order === void 0 ? void 0 : order.integration) === null || _a === void 0 ? void 0 : _a.params) === null || _b === void 0 ? void 0 : _b.autoImport) === false &&
                errors.push({
                    id: errors.length + 1,
                    code: 'autoimporf_off',
                    message: 'A Integração dessa loja não está configurada para importar automaticamente, clique no botão para importar ou configure a integração para importar automaticamente',
                });
            (order === null || order === void 0 ? void 0 : order.situacao) !== 'Em aberto' &&
                errors.push({
                    id: errors.length + 1,
                    code: 'order_status',
                    message: 'Pedido no Bling não está com a situação Em Aberto, importe o pedido apenas se você tiver certeza de que precisa envia-lo',
                });
            !((_c = order === null || order === void 0 ? void 0 : order.integration) === null || _c === void 0 ? void 0 : _c.id) &&
                errors.push({
                    id: errors.length + 1,
                    code: 'integration_not_found',
                    message: 'O pedido foi vendido em uma loja que não está integrada ao WeDrop, faça a integração da loja para importar esse pedido',
                });
            !(order === null || order === void 0 ? void 0 : order.itens) &&
                errors.push({
                    id: errors.length + 1,
                    code: 'product_not_found',
                    message: `O Pedido ${order.numeroPedidoLoja} não possui produtos, complete o pedido`,
                });
            ((_d = order === null || order === void 0 ? void 0 : order.itens) === null || _d === void 0 ? void 0 : _d.length) > 0 &&
                (yield Promise.all((_e = order === null || order === void 0 ? void 0 : order.itens) === null || _e === void 0 ? void 0 : _e.map((item) => __awaiter(this, void 0, void 0, function* () {
                    !item.item.productExists &&
                        errors.push({
                            id: errors.length + 1,
                            code: 'product_not_found',
                            message: `O Produto ${item.item.descricao} que está nesse pedido não foi encontrado no WeDrop, importe e complete o pedido`,
                        });
                }))));
            return errors;
        });
    }
    inputOrderErrors(orders) {
        return __awaiter(this, void 0, void 0, function* () {
            orders = yield Promise.all(orders.map((order) => __awaiter(this, void 0, void 0, function* () {
                return Object.assign(Object.assign({}, order), { orderData: Object.assign(Object.assign({}, order === null || order === void 0 ? void 0 : order.orderData), { errors: yield this.inputOrderError(order.orderData) }) });
            })));
            return orders;
        });
    }
    filterOnlyNewOrders(orders) {
        return __awaiter(this, void 0, void 0, function* () {
            const newOrders = [];
            for (const order of orders) {
                order.numeroPedidoLoja =
                    order.numeroPedidoLoja === '' ||
                        order.numeroPedidoLoja === null ||
                        !order.numeroPedidoLoja
                        ? 'WEDROP-' + Math.floor(Math.random() * 1000)
                        : order.numeroPedidoLoja;
                const orderExists = yield this.verifyIfOrderFromChannelExists({
                    id: order.numeroPedidoLoja,
                    userId: this.userId,
                });
                if (!orderExists) {
                    newOrders.push(order);
                }
            }
            return newOrders;
        });
    }
}
exports.Order = Order;
//# sourceMappingURL=Order.js.map