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
exports.BlingV3 = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = require("dotenv");
const prismaClient_1 = require("../database/prismaClient");
(0, dotenv_1.config)();
class BlingV3 {
    constructor(accessToken, refreshToken, integrationId) {
        this.refreshToken = refreshToken;
        this.accessToken = accessToken;
        this.integrationId = integrationId;
        this.client = axios_1.default.create({
            baseURL: `https://bling.com.br/Api/v3`,
            headers: {
                authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        this.client.interceptors.response.use((response) => response, (error) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (error.response.status === 401) {
                return yield this.updateToken()
                    .then((data) => __awaiter(this, void 0, void 0, function* () {
                    error.config.headers.authorization = `Bearer ${data.access_token}`;
                    return Promise.resolve(this.client.request(error.config));
                }))
                    .catch((error) => {
                    return Promise.reject(error);
                });
            }
            else if (error.response.status === 429) {
                if (!((_b = (_a = error === null || error === void 0 ? void 0 : error.config) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b.retries)) {
                    error.config.headers.retries = 0;
                }
                if (error.config.headers.retries < 5) {
                    error.config.headers.retries = error.config.headers.retries + 1;
                    return yield new Promise((resolve) => {
                        setTimeout(() => {
                            resolve(this.client.request(error.config));
                        }, 1000 * error.config.headers.retries);
                    });
                }
                else {
                    return yield Promise.reject(error);
                }
            }
            return yield Promise.reject(error);
        }));
    }
    getProducts({ pagina, limite, criterio, tipo, codigo, idsProdutos, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = {
                pagina: pagina || 1,
                limite: limite || 100,
                criterio: criterio || 5,
                tipo: tipo || 'T',
                codigo: codigo || undefined,
                idsProdutos: idsProdutos || undefined,
            };
            console.log('params', params);
            return yield this.client
                .get('/produtos', { params })
                .then((response) => {
                return response.data;
            })
                .catch((error) => __awaiter(this, void 0, void 0, function* () {
                yield this.apiError(error);
            }));
        });
    }
    getSellOrders({ page, limit, contactId, situations, initDate, endDate, initUpdateDate, endUpdateDate, initExpectedDate, endExpectedDate, number, storeId, cashierControlId, sellerId, storesOrders, }) {
        return __awaiter(this, void 0, void 0, function* () {
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
            };
            console.log('params', params);
            return yield this.client
                .get('/pedidos/vendas', { params })
                .then((response) => {
                return response.data;
            });
        });
    }
    createProduct(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.client
                .post('/produtos', data)
                .then((response) => {
                return response.data;
            })
                .catch((error) => __awaiter(this, void 0, void 0, function* () {
                return error.response.data;
            }));
        });
    }
    updateProduct(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.client
                .put(`/produtos/${data.id}`, data)
                .then((response) => {
                return response.data;
            })
                .catch((error) => __awaiter(this, void 0, void 0, function* () {
                return error.response.data;
            }));
        });
    }
    getWarehouses() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.client.get('/depositos').then((response) => {
                return response.data;
            });
        });
    }
    updateStock(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.client.post('/estoques', data).then((response) => {
                return response.data;
            });
        });
    }
    updateToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const base64Auth = Buffer.from(`${process.env.BLING_CLIENTID}:${process.env.BLING_CLIENTSECRET}`);
            const bling = axios_1.default.create({
                baseURL: 'https://bling.com.br/Api/v3',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: '1.0',
                    Authorization: `Basic ${base64Auth.toString('base64')}}`,
                },
            });
            return yield bling
                .postForm('/oauth/token', {
                grant_type: 'refresh_token',
                refresh_token: this.refreshToken.trim(),
            })
                .then((response) => __awaiter(this, void 0, void 0, function* () {
                yield prismaClient_1.prisma.integrations.update({
                    where: {
                        id: this.integrationId,
                    },
                    data: {
                        params: JSON.stringify({
                            access_token: response.data.access_token,
                            refresh_token: response.data.refresh_token,
                        }),
                    },
                });
                this.refreshToken = response.data.refresh_token;
                this.accessToken = response.data.access_token;
                console.log('renovou o token');
                return response.data;
            }))
                .catch((error) => __awaiter(this, void 0, void 0, function* () {
                console.log('error on refresh token', error.response.data);
                // await this.apiError(error)
            }));
        });
    }
    getOrder(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.client
                .get(`/pedidos/vendas/${id}`)
                .then((response) => {
                return response.data;
            })
                .catch(() => {
                return false;
            });
        });
    }
    getProduct(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.client
                .get(`/produtos/${id}`)
                .then((response) => {
                return response.data.data;
            })
                .catch(() => __awaiter(this, void 0, void 0, function* () {
                return false;
            }));
        });
    }
    apiError(error) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.reject(error);
        });
    }
}
exports.BlingV3 = BlingV3;
//# sourceMappingURL=bling-v3.js.map