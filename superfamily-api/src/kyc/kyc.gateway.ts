import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { KYC_STATUS_CHANGED_EVENT, KycStatusChangedEvent } from './kyc.service';

/**
 * Socket.IO gateway that streams KYC status updates to connected users.
 *
 * Namespace: `/kyc`
 * Room convention: `user:{profileId}` — one room per user
 * Client message: `kyc:status-updated` with payload `{ status, confidenceScore }`
 *
 * Client expected to connect with `?profileId=<uuid>` in the handshake
 * query string (same pattern as `MessagingGateway`). Clients use this
 * stream to drive their desktop UI while the user is completing the flow
 * on their phone — no polling needed.
 *
 * Security note: the handshake query is trusted as-is. A malicious client
 * could claim any profileId and subscribe to events it shouldn't see. If
 * that matters for your threat model, add JWT verification in
 * `handleConnection` and reject mismatches. (The messaging gateway has the
 * same property, so we match the existing conventions.)
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/kyc',
})
export class KycGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(KycGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket): void {
    const profileId = client.handshake.query.profileId as string | undefined;
    if (!profileId) {
      this.logger.debug(
        `KYC socket ${client.id} connected without profileId — idle`,
      );
      return;
    }
    client.join(`user:${profileId}`);
    this.logger.debug(`KYC socket ${client.id} joined user:${profileId}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`KYC socket ${client.id} disconnected`);
  }

  /**
   * Bridge the in-process EventEmitter to the Socket.IO room. `KycService`
   * emits `kyc.status.changed` on every status transition; we translate
   * that into a `kyc:status-updated` frame scoped to the target user.
   */
  @OnEvent(KYC_STATUS_CHANGED_EVENT)
  handleStatusChanged(payload: KycStatusChangedEvent): void {
    this.server.to(`user:${payload.userId}`).emit('kyc:status-updated', {
      status: payload.status,
      confidence_score: payload.confidenceScore,
    });
    this.logger.log(
      `Pushed kyc:status-updated to user:${payload.userId} (status=${payload.status})`,
    );
  }
}
