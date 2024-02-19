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
const express_1 = require("express");
const blingController_1 = __importDefault(require("./controllers/blingController"));
const blingV3Controller_1 = __importDefault(require("./controllers/blingV3Controller"));
const ensureAuthenticateUser_1 = require("./middlewares/ensureAuthenticateUser");
const routes = (0, express_1.Router)();
routes.get('/', (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    /* const ip = await axios
      .get('https://api.ipify.org?format=json')
      .then((response) => {
        return response.data.ip
      })
      .catch(() => {
        return 'Não foi possível obter o IP'
      })
  
    const simpleRequest = await axios
      .get('https://webhook.site/1be97876-50c7-48af-959a-2dce1af28063')
      .then((response) => {
        return response.data
      }) */
    return response.json({
        message: 'Hello World',
    });
}));
routes.post('/update', blingController_1.default.update);
routes.get('/bling-v3/wedrop-products', ensureAuthenticateUser_1.ensureAuthenticateUser, blingV3Controller_1.default.getWeDropProducts);
routes.get('/bling-v3/find-new-orders', ensureAuthenticateUser_1.ensureAuthenticateUser, blingV3Controller_1.default.findNewOrders);
routes.get('/bling-v3/import-order', ensureAuthenticateUser_1.ensureAuthenticateUser, blingV3Controller_1.default.importOrder);
routes.post('/bling-v3/send-product', ensureAuthenticateUser_1.ensureAuthenticateUser, blingV3Controller_1.default.sendProduct);
routes.post('/bling-v3/send-variation', ensureAuthenticateUser_1.ensureAuthenticateUser, blingV3Controller_1.default.sendVariation);
routes.post('/bling-v3/send-kit', ensureAuthenticateUser_1.ensureAuthenticateUser, blingV3Controller_1.default.sendKit);
exports.default = routes;
//# sourceMappingURL=routes.js.map