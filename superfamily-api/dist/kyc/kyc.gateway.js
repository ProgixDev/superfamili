"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var KycGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KycGateway = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const kyc_service_1 = require("./kyc.service");
let KycGateway = KycGateway_1 = class KycGateway {
    logger = new common_1.Logger(KycGateway_1.name);
    server;
    handleConnection(client) {
        const profileId = client.handshake.query.profileId;
        if (!profileId) {
            this.logger.debug(`KYC socket ${client.id} connected without profileId — idle`);
            return;
        }
        client.join(`user:${profileId}`);
        this.logger.debug(`KYC socket ${client.id} joined user:${profileId}`);
    }
    handleDisconnect(client) {
        this.logger.debug(`KYC socket ${client.id} disconnected`);
    }
    handleStatusChanged(payload) {
        this.server.to(`user:${payload.userId}`).emit('kyc:status-updated', {
            status: payload.status,
            confidence_score: payload.confidenceScore,
        });
        this.logger.log(`Pushed kyc:status-updated to user:${payload.userId} (status=${payload.status})`);
    }
};
exports.KycGateway = KycGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], KycGateway.prototype, "server", void 0);
__decorate([
    (0, event_emitter_1.OnEvent)(kyc_service_1.KYC_STATUS_CHANGED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KycGateway.prototype, "handleStatusChanged", null);
exports.KycGateway = KycGateway = KycGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        namespace: '/kyc',
    })
], KycGateway);
//# sourceMappingURL=kyc.gateway.js.map