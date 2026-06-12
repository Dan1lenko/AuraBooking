import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { RedisService } from './redis.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private redisService: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from query or authorization headers
      let token = client.handshake.query?.token as string;
      if (!token && client.handshake.headers?.authorization) {
        const parts = client.handshake.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          token = parts[1];
        }
      }

      if (!token) {
        this.logger.warn(`Connection rejected: missing JWT token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      client.data.userId = userId;

      // Join individual room for direct targeting
      await client.join(`user_${userId}`);

      const wasOnline = await this.redisService.isUserOnline(userId);
      await this.redisService.addUserSocket(userId, client.id);

      // Notify other participants of chats if the user just went online
      if (!wasOnline) {
        const chats = await this.chatService.getChatsForUser(userId);
        for (const chat of chats) {
          const participants = await this.chatService.getChatParticipants(chat.id);
          const otherId = participants.find((id) => id !== userId);
          if (otherId) {
            this.server.to(`user_${otherId}`).emit('user_online', { userId });
          }
        }
      }

      this.logger.log(`User ${userId} connected with socket ${client.id}`);
    } catch (err: any) {
      this.logger.warn(`Connection rejected: token verification failed (${err.message})`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    await this.redisService.removeUserSocket(userId, client.id);
    const isStillOnline = await this.redisService.isUserOnline(userId);

    // Notify other participants if the user is completely offline
    if (!isStillOnline) {
      const chats = await this.chatService.getChatsForUser(userId);
      for (const chat of chats) {
        const participants = await this.chatService.getChatParticipants(chat.id);
        const otherId = participants.find((id) => id !== userId);
        if (otherId) {
          this.server.to(`user_${otherId}`).emit('user_offline', { userId });
        }
      }
    }

    this.logger.log(`User ${userId} disconnected from socket ${client.id}`);
  }

  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: number },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.chatId) return;

    const participants = await this.chatService.getChatParticipants(data.chatId);
    if (!participants.includes(userId)) {
      client.emit('error', { message: 'Unauthorized access to chat room' });
      return;
    }

    await client.join(`chat_${data.chatId}`);
    this.logger.log(`Socket ${client.id} (user ${userId}) joined room chat_${data.chatId}`);
  }

  @SubscribeMessage('leave_chat')
  async handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: number },
  ) {
    if (!data?.chatId) return;
    await client.leave(`chat_${data.chatId}`);
    this.logger.log(`Socket ${client.id} left room chat_${data.chatId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: number; text: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.chatId || !data?.text) return;

    const participants = await this.chatService.getChatParticipants(data.chatId);
    if (!participants.includes(userId)) {
      client.emit('error', { message: 'Unauthorized to post messages in this chat' });
      return;
    }

    const savedMsg = await this.chatService.saveMessage(data.chatId, userId, data.text);

    // Broadcast message to the chat room
    this.server.to(`chat_${data.chatId}`).emit('new_message', savedMsg);

    // Notify other participant directly if they are online but not in the chat room
    const otherId = participants.find((id) => id !== userId);
    if (otherId) {
      // Send notification payload to user room
      this.server.to(`user_${otherId}`).emit('new_message_notification', {
        chatId: data.chatId,
        message: savedMsg,
      });
    }
  }
}
