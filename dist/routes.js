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
const axios_1 = __importDefault(require("axios"));
const rateLimiter_1 = require("./middlewares/rateLimiter");
const routes = (0, express_1.Router)();
routes.get('/', (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    const ip = yield axios_1.default
        .get('https://api.ipify.org?format=json')
        .then((response) => {
        return response.data.ip;
    })
        .catch(() => {
        return 'Não foi possível obter o IP';
    });
    const simpleRequest = yield axios_1.default
        .get('https://webhook.site/1be97876-50c7-48af-959a-2dce1af28063')
        .then((response) => {
        return response.data;
    });
    return response.json({
        message: 'Hello World',
        ip,
        simpleRequest,
    });
}));
routes.post('/update', rateLimiter_1.rateLimiter, blingController_1.default.update);
exports.default = routes;
//# sourceMappingURL=routes.js.map