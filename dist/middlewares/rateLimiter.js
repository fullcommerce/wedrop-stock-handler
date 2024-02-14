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
exports.rateLimiter = void 0;
const queue = [];
let isProcessing = false;
let processedRequests = 0; // Adiciona um contador para controlar o número de requests processadas
function rateLimiter(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const processRequest = () => {
            if (isProcessing)
                return;
            const nextRequest = queue.shift();
            if (!nextRequest)
                return;
            isProcessing = true;
            nextRequest();
            // Incrementa o contador de requests processadas
            processedRequests++;
            // Agora, verifica se processou 3 requests para então aguardar 1 segundo
            if (processedRequests % 3 === 0) {
                setTimeout(() => {
                    isProcessing = false;
                    processRequest(); // Chama processRequest para continuar processando a fila
                }, 1000);
            }
            else {
                isProcessing = false;
                processRequest(); // Se não atingiu 3 requests, continua processando sem esperar
            }
        };
        queue.push(() => next());
        processRequest();
    });
}
exports.rateLimiter = rateLimiter;
//# sourceMappingURL=rateLimiter.js.map