import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token as string;

      if (!token) {
        client.emit('error', 'Authentication required');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      client.data.userId = payload.sub;

      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub).add(client.id);

      client.join(`user:${payload.sub}`);
      this.server.emit('user:online', { userId: payload.sub });

      this.logger.log(`User ${payload.sub} connected (socket: ${client.id})`);
    } catch (error) {
      client.emit('error', 'Invalid token');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          this.server.emit('user:offline', { userId });
        }
      }
      this.logger.log(`User ${userId} disconnected (socket: ${client.id})`);
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; text?: string; type?: string; fileMetadata?: any; clientId?: string },
  ) {
    try {
      const message = await this.chatService.sendMessage(data.chatId, client.data.userId, data);

      const chat = await this.chatService['chatRepository'].findOne({
        where: { id: data.chatId },
        relations: ['userOne', 'userTwo', 'group', 'group.members'],
      });

      if (chat) {
        const recipientId = chat.userOne?.id === client.data.userId
          ? chat.userTwo?.id
          : chat.userOne?.id;

        if (recipientId) {
          this.server.to(`user:${recipientId}`).emit('message:new', message);
        }

        if (chat.group) {
          const members = await this.chatService['groupMemberRepository'].find({
            where: { group: { id: chat.group.id } },
          });
          members.forEach((member) => {
            if (member.user.id !== client.data.userId) {
              this.server.to(`user:${member.user.id}`).emit('message:new', message);
            }
          });
        }
      }

      client.emit('message:sent', message);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('message:typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ) {
    const chat = await this.chatService['chatRepository'].findOne({
      where: { id: data.chatId },
      relations: ['userOne', 'userTwo'],
    });

    if (chat) {
      const recipientId = chat.userOne?.id === client.data.userId
        ? chat.userTwo?.id
        : chat.userOne?.id;

      if (recipientId) {
        this.server.to(`user:${recipientId}`).emit('message:typing', {
          chatId: data.chatId,
          userId: client.data.userId,
          isTyping: data.isTyping,
        });
      }
    }
  }

  @SubscribeMessage('message:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; messageIds: string[] },
  ) {
    await this.chatService.markAsRead(data.chatId, client.data.userId, data.messageIds);

    const chat = await this.chatService['chatRepository'].findOne({
      where: { id: data.chatId },
      relations: ['userOne', 'userTwo'],
    });

    if (chat) {
      const recipientId = chat.userOne?.id === client.data.userId
        ? chat.userTwo?.id
        : chat.userOne?.id;

      if (recipientId) {
        this.server.to(`user:${recipientId}`).emit('message:read', {
          chatId: data.chatId,
          messageIds: data.messageIds,
        });
      }
    }
  }

  @SubscribeMessage('user:online')
  async checkOnline(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const isOnline = this.userSockets.has(data.userId);
    client.emit('user:online', { userId: data.userId, online: isOnline });
  }
}
