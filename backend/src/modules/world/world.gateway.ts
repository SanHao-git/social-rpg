import { Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
    EVENTS,
    type ChatMessage,
    type ChatRequest,
    type MoveRequest,
    type WelcomePayload,
} from './world.events.js';
import { WorldService, ZONE_ID } from './world.service.js';
import { ALLOWED_ORIGINS } from '../../config.js';

const ROOM = `zone:${ZONE_ID}`;

@WebSocketGateway({
    cors: { origin: ALLOWED_ORIGINS },
})
export class WorldGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(WorldGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(private readonly world: WorldService) { }

    handleConnection(client: Socket) {
        this.logger.log(`Client kết nối: ${client.id}`);

        const me = this.world.addPlayer(client.id, client.handshake.auth?.name);
        void client.join(ROOM);

        const welcome: WelcomePayload = {
            socketId: client.id,
            message: 'Đã kết nối server',
        };
        client.emit(EVENTS.SERVER_WELCOME, welcome);
        client.emit(EVENTS.ZONE_STATE, this.world.getAll());
        client.to(ROOM).emit(EVENTS.PLAYER_JOINED, me);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client ngắt kết nối: ${client.id}`);
        this.world.removePlayer(client.id);
        this.server.to(ROOM).emit(EVENTS.PLAYER_LEFT, client.id);
    }

    @SubscribeMessage(EVENTS.PLAYER_MOVE)
    onMove(@ConnectedSocket() client: Socket, @MessageBody() body: MoveRequest) {
        const result = this.world.tryMove(client.id, body?.dx, body?.dy);

        if (result.ok) {
            client.to(ROOM).emit(EVENTS.PLAYER_MOVED, result.state);
        } else if (result.state) {
            client.emit(EVENTS.PLAYER_CORRECT, result.state);
        }
    }

    @SubscribeMessage(EVENTS.CHAT_SEND)
    onChat(@ConnectedSocket() client: Socket, @MessageBody() body: ChatRequest) {
        const text = this.world.tryChat(client.id, body?.text);
        if (!text) return;

        const msg: ChatMessage = { id: client.id, text };
        this.server.to(ROOM).emit(EVENTS.CHAT_MESSAGE, msg);
    }

    @SubscribeMessage(EVENTS.ZONE_REQUEST)
    onZoneRequest(@ConnectedSocket() client: Socket) {
        client.emit(EVENTS.ZONE_STATE, this.world.getAll());
    }
}