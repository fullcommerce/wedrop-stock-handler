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
const bling_erp_api_1 = require("bling-erp-api");
exports.default = {
    update(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const { sku, apikey, stock } = request.body;
            const blingConnection = new bling_erp_api_1.Bling(apikey);
            // disable typescript verification
            const sdata = {
                estoque: stock,
                codigo: sku,
            };
            const blingResponse = yield blingConnection
                .products()
                .update(sku, sdata)
                .then(() => {
                return { success: true };
            })
                .catch((err) => {
                var _a;
                const errors = (_a = err.data) === null || _a === void 0 ? void 0 : _a.errors[0];
                const code = (errors === null || errors === void 0 ? void 0 : errors.code) * 1;
                return {
                    success: false,
                    code,
                    data: err,
                };
            });
            if (blingResponse.success === false) {
                return response.status(400).json(blingResponse);
            }
            return response.json({
                blingResponse,
            });
        });
    },
};
//# sourceMappingURL=blingController.js.map