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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const messaging_service_1 = require("./messaging.service");
let MessagingGateway = class MessagingGateway {
    messagingService;
    server;
    connectedUsers = new Map();
    constructor(messagingService) {
        this.messagingService = messagingService;
    }
    handleConnection(client) {
        const profileId = client.handshake.query.profileId;
        if (profileId) {
            this.connectedUsers.set(client.id, profileId);
            client.join(`user:${profileId}`);
        }
    }
    handleDisconnect(client) {
        this.connectedUsers.delete(client.id);
    }
    handleJoinConversation(client, data) {
        client.join(`conversation:${data.conversationId}`);
    }
    handleLeaveConversation(client, data) {
        client.leave(`conversation:${data.conversationId}`);
    }
    async handleMessage(client, data) {
        const profileId = this.connectedUsers.get(client.id);
        if (!profileId)
            return;
        const message = await this.messagingService.sendMessage(profileId, data.role, data.educatorProfileId, { content: data.content });
        if (message) {
            this.server
                .to(`conversation:${message.conversation_id}`)
                .emit('new_message', message);
        }
    }
    handleTyping(client, data) {
        const profileId = this.connectedUsers.get(client.id);
        client.to(`conversation:${data.conversationId}`).emit('user_typing', {
            profileId,
            conversationId: data.conversationId,
        });
    }
    sendToUser(profileId, event, data) {
        this.server.to(`user:${profileId}`).emit(event, data);
    }
};
exports.MessagingGateway = MessagingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], MessagingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], MessagingGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], MessagingGateway.prototype, "handleLeaveConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MessagingGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], MessagingGateway.prototype, "handleTyping", null);
exports.MessagingGateway = MessagingGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        namespace: '/messaging',
    }),
    __metadata("design:paramtypes", [messaging_service_1.MessagingService])
], MessagingGateway);
//# sourceMappingURL=messaging.gateway.js.map