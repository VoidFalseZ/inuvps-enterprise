import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    // Basic in-memory track, in a real env use Redis tracking
    private activeUsers = new Map<string, any>();

    constructor(private readonly prisma: PrismaService) { }

    async handleConnection(client: Socket) {
        // Determine user from ID or create guest
        const userId = client.handshake.query.userId || `guest_${client.id.substring(0, 5)}`;
        let user = await this.prisma.user.findUnique({ where: { username: userId as string } });

        if (!user) {
            user = await this.prisma.user.create({
                data: { username: userId as string },
            });
        }

        this.activeUsers.set(client.id, user);

        // Send recent history
        const history = await this.prisma.message.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: { user: true },
        });

        client.emit('chat_history', history.reverse());
        this.server.emit('user_count', this.activeUsers.size);
    }

    handleDisconnect(client: Socket) {
        this.activeUsers.delete(client.id);
        this.server.emit('user_count', '1+'); // broadcast generic count
    }

    @SubscribeMessage('send_message')
    async handleMessage(
        @MessageBody() data: { msg: string; username?: string; color?: string; type?: string },
        @ConnectedSocket() client: Socket,
    ) {
        let user = this.activeUsers.get(client.id);

        // update user color/name if provided ad-hoc
        if (user && (data.username || data.color)) {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    username: data.username || user.username,
                    color: data.color || user.color,
                },
            });
            this.activeUsers.set(client.id, user);
        }

        const savedMessage = await this.prisma.message.create({
            data: {
                content: data.msg,
                type: data.type || 'text',
                userId: user.id,
            },
            include: { user: true },
        });

        this.server.emit('receive_message', savedMessage);
    }
}
