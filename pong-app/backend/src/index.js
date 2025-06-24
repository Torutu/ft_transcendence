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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fastify_1 = require("fastify");
var fastify_plugin_1 = require("fastify-plugin");
var bcrypt_1 = require("bcrypt");
var jsonwebtoken_1 = require("jsonwebtoken");
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var app = (0, fastify_1.default)();
// Register Prisma plugin
app.register((0, fastify_plugin_1.default)(function (fastify) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        fastify.decorate('prisma', prisma);
        fastify.addHook('onClose', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.$disconnect()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); }));
// POST /register
app.post('/register', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, name, hashedPassword, user;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.body, email = _a.email, password = _a.password, name = _a.name;
                return [4 /*yield*/, bcrypt_1.default.hash(password, 10)];
            case 1:
                hashedPassword = _b.sent();
                return [4 /*yield*/, prisma.user.create({
                        data: { email: email, password: hashedPassword, name: name },
                    })];
            case 2:
                user = _b.sent();
                reply.send(user);
                return [2 /*return*/];
        }
    });
}); });
// POST /login
app.post('/login', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, _b, token;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = request.body, email = _a.email, password = _a.password;
                return [4 /*yield*/, prisma.user.findUnique({ where: { email: email } })];
            case 1:
                user = _c.sent();
                _b = user;
                if (!_b) return [3 /*break*/, 3];
                return [4 /*yield*/, bcrypt_1.default.compare(password, user.password)];
            case 2:
                _b = (_c.sent());
                _c.label = 3;
            case 3:
                if (_b) {
                    token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
                    reply.send({ token: token });
                }
                else {
                    reply.status(401).send({ message: 'Invalid credentials' });
                }
                return [2 /*return*/];
        }
    });
}); });
// PUT /profile
app.put('/profile', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, name, avatarUrl, user;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.body, userId = _a.userId, name = _a.name, avatarUrl = _a.avatarUrl;
                return [4 /*yield*/, prisma.user.update({
                        where: { id: userId },
                        data: { name: name, avatarUrl: avatarUrl },
                    })];
            case 1:
                user = _b.sent();
                reply.send(user);
                return [2 /*return*/];
        }
    });
}); });
// POST /match
app.post('/match', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, player1Id, player2Id, winnerId, match;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.body, player1Id = _a.player1Id, player2Id = _a.player2Id, winnerId = _a.winnerId;
                return [4 /*yield*/, prisma.match.create({
                        data: { player1Id: player1Id, player2Id: player2Id, winnerId: winnerId },
                    })];
            case 1:
                match = _b.sent();
                reply.send(match);
                return [2 /*return*/];
        }
    });
}); });
// GET /matches/:userId
app.get('/matches/:userId', function (request, reply) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, matches;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = request.params.userId;
                return [4 /*yield*/, prisma.match.findMany({
                        where: {
                            OR: [
                                { player1Id: userId },
                                { player2Id: userId },
                            ],
                        },
                    })];
            case 1:
                matches = _a.sent();
                reply.send(matches);
                return [2 /*return*/];
        }
    });
}); });
// Start the server
app.listen({ port: 3000 }, function () {
    console.log('Server running at http://localhost:3000');
});
