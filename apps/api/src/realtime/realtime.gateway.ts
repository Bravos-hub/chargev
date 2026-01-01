import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { PubSubService } from '../integrations/redis/pubsub.service'

@WebSocketGateway({
    cors: {
        origin: '*', // Configure properly for production
    },
    namespace: '/realtime',
})
export class RealtimeGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server

    private readonly logger = new Logger(RealtimeGateway.name)

    constructor(private pubsub: PubSubService) { }

    afterInit(server: Server) {
        this.logger.log('Realtime WebSocket Gateway initialized')

        // Subscribe to Redis channels and broadcast to connected clients
        this.pubsub.psubscribe('charger:*', (channel, message) => {
            // Broadcast charger updates to all connected clients
            this.server.emit('charger:update', {
                channel,
                data: message,
            })
        })

        this.pubsub.subscribe('chargers:status', (message) => {
            this.server.emit('chargers:status', message)
        })
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`)
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`)
    }

    @SubscribeMessage('subscribe:charger')
    handleSubscribeCharger(client: Socket, payload: { chargerId: string }) {
        const room = `charger:${payload.chargerId}`
        client.join(room)
        this.logger.log(`Client ${client.id} subscribed to ${room}`)

        return {
            event: 'subscribed',
            data: { room },
        }
    }

    @SubscribeMessage('unsubscribe:charger')
    handleUnsubscribeCharger(client: Socket, payload: { chargerId: string }) {
        const room = `charger:${payload.chargerId}`
        client.leave(room)
        this.logger.log(`Client ${client.id} unsubscribed from ${room}`)

        return {
            event: 'unsubscribed',
            data: { room },
        }
    }

    /**
     * Broadcast message to specific charger room
     */
    broadcastToCharger(chargerId: string, event: string, data: any) {
        this.server.to(`charger:${chargerId}`).emit(event, data)
    }

    /**
     * Broadcast message to all clients
     */
    broadcast(event: string, data: any) {
        this.server.emit(event, data)
    }
}
