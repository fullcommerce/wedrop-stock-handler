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
exports.ensureAuthenticateUser = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
function ensureAuthenticateUser(request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new Error('Token missing');
        }
        const [, token] = authHeader.split(' ');
        try {
            const { sub } = (0, jsonwebtoken_1.verify)(token, 'vendersemestoque');
            request.body.userId = parseInt(sub);
            request.body.wedropToken = token;
            return next();
        }
        catch (err) {
            throw new Error('Invalid token');
        }
    });
}
exports.ensureAuthenticateUser = ensureAuthenticateUser;
//# sourceMappingURL=ensureAuthenticateUser.js.map