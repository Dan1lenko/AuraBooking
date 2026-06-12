import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async findOrCreateChat(clientId: number, specialistProfileId: number) {
    // Check if chat already exists
    let chat = await this.prisma.chat.findUnique({
      where: {
        clientId_specialistProfileId: {
          clientId,
          specialistProfileId,
        },
      },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: {
          clientId,
          specialistProfileId,
        },
      });
    }

    return chat;
  }

  async getChatsForUser(userId: number) {
    const chats = await this.prisma.chat.findMany({
      where: {
        OR: [
          { clientId: userId },
          { specialistProfile: { userId } },
        ],
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        specialistProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            chatId: chat.id,
            isRead: false,
            senderId: { not: userId },
          },
        });
        return {
          ...chat,
          unreadCount,
        };
      }),
    );
  }

  async getMessageHistory(chatId: number, userId: number) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { specialistProfile: true },
    });

    if (!chat) {
      throw new NotFoundException('Chat session not found');
    }

    if (chat.clientId !== userId && chat.specialistProfile.userId !== userId) {
      throw new ForbiddenException('You do not have access to this chat session');
    }

    // Mark other participant's messages as read
    await this.prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return this.prisma.message.findMany({
      where: { chatId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async saveMessage(chatId: number, senderId: number, text: string) {
    return this.prisma.message.create({
      data: {
        chatId,
        senderId,
        text,
        isRead: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getChatParticipants(chatId: number): Promise<number[]> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { specialistProfile: true },
    });
    if (!chat) {
      return [];
    }
    return [chat.clientId, chat.specialistProfile.userId];
  }

  async markChatAsRead(chatId: number, userId: number) {
    await this.prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });
    return { success: true };
  }
}

