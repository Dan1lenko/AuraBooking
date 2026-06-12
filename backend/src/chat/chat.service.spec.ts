import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma.service';

const mockChat = {
  id: 1,
  clientId: 3,
  specialistProfileId: 5,
  specialistProfile: { id: 5, userId: 4 },
};

const mockMessage = {
  id: 10,
  chatId: 1,
  senderId: 3,
  text: 'Hello',
  isRead: false,
  createdAt: new Date(),
};

const mockPrismaService = {
  chat: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  message: {
    count: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

describe('ChatService', () => {
  let service: ChatService;
  let prisma: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateChat', () => {
    it('should return existing chat if it exists', async () => {
      mockPrismaService.chat.findUnique.mockResolvedValue(mockChat);

      const result = await service.findOrCreateChat(3, 5);

      expect(result).toEqual(mockChat);
      expect(prisma.chat.findUnique).toHaveBeenCalledWith({
        where: {
          clientId_specialistProfileId: { clientId: 3, specialistProfileId: 5 },
        },
      });
      expect(prisma.chat.create).not.toHaveBeenCalled();
    });

    it('should create and return new chat if not found', async () => {
      mockPrismaService.chat.findUnique.mockResolvedValue(null);
      mockPrismaService.chat.create.mockResolvedValue(mockChat);

      const result = await service.findOrCreateChat(3, 5);

      expect(result).toEqual(mockChat);
      expect(prisma.chat.create).toHaveBeenCalledWith({
        data: { clientId: 3, specialistProfileId: 5 },
      });
    });
  });

  describe('getChatsForUser', () => {
    it('should retrieve chats and count unread messages for participants', async () => {
      const mockChatsList = [
        {
          ...mockChat,
          client: { id: 3, name: 'Client' },
          specialistProfile: { id: 5, user: { id: 4, name: 'Specialist' } },
          messages: [mockMessage],
        },
      ];
      mockPrismaService.chat.findMany.mockResolvedValue(mockChatsList);
      mockPrismaService.message.count.mockResolvedValue(2);

      const result = await service.getChatsForUser(3);

      expect(result).toEqual([
        {
          ...mockChatsList[0],
          unreadCount: 2,
        },
      ]);
      expect(prisma.chat.findMany).toHaveBeenCalled();
      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          chatId: 1,
          isRead: false,
          senderId: { not: 3 },
        },
      });
    });
  });

  describe('getMessageHistory', () => {
    it('should throw NotFoundException if chat does not exist', async () => {
      mockPrismaService.chat.findUnique.mockResolvedValue(null);

      await expect(service.getMessageHistory(99, 3)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not in chat', async () => {
      mockPrismaService.chat.findUnique.mockResolvedValue(mockChat);

      await expect(service.getMessageHistory(1, 99)).rejects.toThrow(ForbiddenException);
    });

    it('should mark other user messages as read and return message history', async () => {
      mockPrismaService.chat.findUnique.mockResolvedValue(mockChat);
      mockPrismaService.message.findMany.mockResolvedValue([mockMessage]);

      const result = await service.getMessageHistory(1, 3);

      expect(result).toEqual([mockMessage]);
      expect(prisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          chatId: 1,
          senderId: { not: 3 },
          isRead: false,
        },
        data: { isRead: true },
      });
      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { chatId: 1 },
        include: {
          sender: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('saveMessage', () => {
    it('should save a new message to the database', async () => {
      mockPrismaService.message.create.mockResolvedValue(mockMessage);

      const result = await service.saveMessage(1, 3, 'Hello');

      expect(result).toEqual(mockMessage);
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          chatId: 1,
          senderId: 3,
          text: 'Hello',
          isRead: false,
        },
        include: {
          sender: { select: { id: true, name: true, email: true } },
        },
      });
    });
  });

  describe('getChatParticipants', () => {
    it('should return client user ID and specialist user ID', async () => {
      mockPrismaService.chat.findUnique.mockResolvedValue(mockChat);

      const result = await service.getChatParticipants(1);

      expect(result).toEqual([3, 4]);
    });

    it('should return empty list if chat not found', async () => {
      mockPrismaService.chat.findUnique.mockResolvedValue(null);

      const result = await service.getChatParticipants(99);

      expect(result).toEqual([]);
    });
  });
});
