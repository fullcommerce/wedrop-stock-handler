"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes"));
const dotenv_1 = require("dotenv");
const cors_1 = __importDefault(require("cors"));
(0, dotenv_1.config)();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({
    limit: '200mb',
}));
app.use((err, request, response, next) => {
    if (err instanceof Error) {
        return response.status(400).json({
            error: err.message,
            err,
        });
    }
    return response.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
        err,
    });
});
app.use(routes_1.default);
app.listen(process.env.PORT, () => {
    console.log(`Server started on port ${process.env.PORT} at ${new Date().toLocaleString('pt-BR')}`);
});
//# sourceMappingURL=index.js.map