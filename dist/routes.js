"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const routes = (0, express_1.Router)();
routes.get('/', (request, response) => {
    return response.json({ message: 'Hello World' });
});
exports.default = routes;
//# sourceMappingURL=routes.js.map