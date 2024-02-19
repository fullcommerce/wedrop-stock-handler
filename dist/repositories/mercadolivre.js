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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoLivre = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_rate_limit_1 = __importDefault(require("axios-rate-limit"));
const prismaClient_1 = require("../database/prismaClient");
class MercadoLivre {
    constructor(apikey, refreshToken, integrationId) {
        this.apikey = apikey;
        this.refreshToken = refreshToken;
        this.integrationId = integrationId;
        this.client = (0, axios_rate_limit_1.default)(axios_1.default.create({
            baseURL: 'https://api.mercadolibre.com',
            headers: {
                Authorization: `Bearer ${apikey}`,
            },
        }), { maxRequests: 1, perMilliseconds: 1 });
        this.client.interceptors.response.use((response) => response, (error) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (error.response.status === 401 || error.response.status === 403) {
                const newTokenData = yield this.refreshAccessToken(this.refreshToken);
                if (!((_a = newTokenData === null || newTokenData === void 0 ? void 0 : newTokenData.params) === null || _a === void 0 ? void 0 : _a.access_token)) {
                    error = Object.assign(Object.assign({}, error), { doNotRetry: true });
                    return Promise.reject(error);
                }
                error.config.headers.Authorization = `Bearer ${newTokenData.params.access_token}`;
                return yield this.client.request(error.config);
            }
            return Promise.reject(error);
        }));
    }
    getItemList({ userId, offset = 0, limit = 50 }) {
        return __awaiter(this, void 0, void 0, function* () {
            const itemList = yield this.client
                .get(`/users/${userId}/items/search?offset=${offset}&limit=${limit}`)
                .then((response) => response.data)
                .catch((error) => {
                return error.response.data;
            });
            return itemList;
        });
    }
    getCategoryByTitle(title) {
        return __awaiter(this, void 0, void 0, function* () {
            const predictedCategories = yield this.client
                .get(`/sites/MLB/domain_discovery/search?limit=4&q=${title}`)
                .then((response) => {
                return response.data;
            })
                .catch((error) => {
                console.log(error.response.data);
            });
            const categories = yield Promise.all(predictedCategories.map((predictedCategory) => __awaiter(this, void 0, void 0, function* () {
                const categoryInfo = yield this.client
                    .get(`/categories/${predictedCategory === null || predictedCategory === void 0 ? void 0 : predictedCategory.category_id}`)
                    .then((response) => {
                    return Object.assign(Object.assign({}, response.data), { attributes: [] });
                })
                    .catch((error) => {
                    console.log(error.response.data);
                });
                categoryInfo.attributes = yield this.client
                    .get(`/categories/${categoryInfo.id}/attributes`)
                    .then((response) => {
                    return response.data.filter((attribute) => {
                        var _a, _b, _c, _d;
                        return (!((_a = attribute === null || attribute === void 0 ? void 0 : attribute.tags) === null || _a === void 0 ? void 0 : _a.fixed) === true &&
                            !((_b = attribute.tags) === null || _b === void 0 ? void 0 : _b.hidden) === true &&
                            !((_c = attribute.tags) === null || _c === void 0 ? void 0 : _c.others) === true &&
                            !((_d = attribute.tags) === null || _d === void 0 ? void 0 : _d.read_only) === true);
                    });
                })
                    .catch((error) => {
                    console.log(error.response.data);
                });
                return categoryInfo;
            })));
            return categories;
        });
    }
    getOrder(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield this.client
                .get(`/orders/${orderId}`)
                .then((response) => response.data)
                .catch((error) => {
                console.log(error);
                return error;
            });
            return order;
        });
    }
    updateImages(itemId, images) {
        return __awaiter(this, void 0, void 0, function* () {
            const updatedItem = yield this.client
                .put(`/items/${itemId}`, { pictures: images })
                .then((response) => response.data)
                .catch((error) => {
                return error.response.data;
            });
            return updatedItem;
        });
    }
    sendImages(images) {
        return __awaiter(this, void 0, void 0, function* () {
            const pictures = yield this.client
                .post(`/pictures`, images)
                .then((response) => response.data)
                .catch((error) => {
                return {
                    isError: true,
                    response: error.response.data,
                };
            });
            return { pictures, images };
        });
    }
    getShipment(shipmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const shipment = yield this.client
                .get(`/shipments/${shipmentId}`)
                .then((response) => response.data)
                .catch((error) => {
                return error.response.data;
            });
            return shipment;
        });
    }
    getItem(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield this.client
                .get(`/items/${itemId}`)
                .then((response) => response.data)
                .catch((error) => {
                return error.response.data;
            });
            return item;
        });
    }
    createItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const newItem = yield this.client
                .post('/items', item)
                .then((response) => response.data)
                .catch((error) => {
                return error.response.data;
            });
            return newItem;
        });
    }
    refreshAccessToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const newTokenData = yield this.client
                .post('/oauth/token', {
                grant_type: 'refresh_token',
                client_id: process.env.MERCADOLIVRE_CLIENT_ID,
                client_secret: process.env.MERCADOLIVRE_CLIENT_SECRET,
                refresh_token: refreshToken,
            })
                .then((response) => __awaiter(this, void 0, void 0, function* () {
                const newIntegration = yield prismaClient_1.prisma.integrations.update({
                    where: {
                        id: this.integrationId,
                    },
                    data: {
                        params: JSON.stringify(response.data),
                    },
                });
                newIntegration.params = JSON.parse(newIntegration.params);
                return Object.assign(Object.assign({}, newIntegration), { isError: false });
            }))
                .catch((err) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const errorResponse = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data;
                if (errorResponse.error === 'invalid_grant' ||
                    errorResponse.error === 'not_found' ||
                    errorResponse.error === '') {
                    yield prismaClient_1.prisma.integrations.update({
                        where: {
                            id: this.integrationId,
                        },
                        data: {
                            status: 0,
                        },
                    });
                }
                return { isError: true, params: { access_token: null } };
            }));
            return newTokenData;
        });
    }
    getIfSellerIsCrossDocking() {
        return __awaiter(this, void 0, void 0, function* () {
            const seller = yield this.client
                .get('/users/me')
                .then((res) => res.data)
                .catch((error) => {
                var _a;
                console.log('Error getting seller data');
                console.log('Error: ', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
                return { isError: true };
            });
            if (seller.isError)
                return false;
            const shippingPreferentes = yield this.client
                .get('/users/' + seller.id + '/shipping_preferences')
                .then((res) => res.data);
            const me2 = shippingPreferentes.logistics.find((logistic) => {
                return logistic.mode === 'me2';
            });
            if (!me2)
                return false;
            const crossDocking = me2.types.find((type) => {
                return type.type === 'cross_docking';
            });
            return !!crossDocking;
        });
    }
    getItemFreeShippingCost(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield this.client
                .get(`/items/${id}/shipping_options?zip_code=40020-000`)
                .then((response) => {
                return response.data.options.reduce((acc, option) => {
                    return acc + (option.cost / response.data.options.length) * 0.5;
                }, 0);
            })
                .catch((error) => {
                return error.response.data;
            });
            return item;
        });
    }
    createDescription({ id, description }) {
        return __awaiter(this, void 0, void 0, function* () {
            const descriptionCreated = yield this.client
                .put(`/items/${id}/description`, { plain_text: description })
                .then((response) => response.data)
                .catch((error) => {
                return error.response.data;
            });
            return descriptionCreated;
        });
    }
    getTaxes(categoryId, price) {
        return __awaiter(this, void 0, void 0, function* () {
            const taxes = yield this.client
                .get(`/sites/MLB/listing_prices`, {
                params: { category_id: categoryId, price },
            })
                .then((response) => 
            // need to filter taxes by listing_type_id and reduce to return an object with the listing_type_id and sale_fee_amount
            response.data
                .filter((tax) => {
                return (tax.listing_type_id === 'gold_pro' ||
                    tax.listing_type_id === 'gold_special');
            })
                .reduce((acc, tax) => {
                acc[tax.listing_type_id] = tax.sale_fee_amount;
                return acc;
            }, {}))
                .catch((error) => {
                return error.response.data;
            });
            return taxes;
        });
    }
    getAllUserItems(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const onlyToGetPagingTotal = yield this.client
                .get(`/users/${userId}/items/search?search_type=scan&orders=start_time_asc`)
                .then((response) => response.data.paging.total)
                .catch((error) => {
                return error.response.data;
            });
            const allItems = [];
            for (let i = 0; i < onlyToGetPagingTotal; i += 50) {
                const items = yield this.client
                    .get(`/users/${userId}/items/search?offset=${i}`)
                    .then((response) => response.data.results)
                    .catch((error) => {
                    return error.response.data;
                });
                allItems.push(...items);
            }
            return allItems;
        });
    }
    getTrendsFromCategory(categoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            const trends = yield this.client
                .get(`/trends/MLB/${categoryId}`)
                .then((response) => response.data)
                .catch((error) => {
                return error.response.data;
            });
            return trends;
        });
    }
    gerarCodigoEAN13() {
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
    authorize({ code }) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = {
                grant_type: 'authorization_code',
                client_id: process.env.MERCADOLIVRE_CLIENT_ID,
                client_secret: process.env.MERCADOLIVRE_CLIENT_SECRET,
                code,
                redirect_uri: process.env.MERCADOLIVRE_REDIRECT_URI,
            };
            const response = yield this.client
                .post('/oauth/token', Object.assign({}, params))
                .then((res) => {
                return res.data;
            })
                .catch((err) => {
                return {
                    isError: true,
                    response: err.response.data,
                };
            });
            return response;
        });
    }
}
exports.MercadoLivre = MercadoLivre;
//# sourceMappingURL=mercadolivre.js.map