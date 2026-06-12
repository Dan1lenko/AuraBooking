import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { RedisService } from './redis.service';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

const mockJwtService = {
  verify: jest.fn(),
};

const mockChatService = {
  getChatsForUser: jest.fn().mockResolvedValue([]),
  getChatParticipants: jest.fn().mockResolvedValue([3, 4]),
  saveMessage: jest.fn().mockResolvedValue({ id: 10, text: 'Hello', senderId: 3 }),
};

const mockRedisService = {
  isUserOnline: jest.fn().mockResolvedValue(false),
  addUserSocket: jest.fn(),
  removeUserSocket: jest.fn(),
};

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let jwtService: JwtService;
  let chatService: ChatService;
  let redisService: RedisService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ChatService, useValue: mockChatService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    jwtService = module.get<JwtService>(JwtService);
    chatService = module.get<ChatService>(ChatService);
    redisService = module.get<RedisService>(RedisService);
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    let mockClient: Partial<Socket>;

    beforeEach(() => {
      mockClient = {
        id: 'socket_123',
        handshake: {
          query: { token: 'jwt_token_abc' },
          headers: {},
        } as any,
        join: jest.fn(),
        disconnect: jest.fn(),
        data: {},
      };
    });

    it('should verify JWT token, join user room and track online socket', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 3 });
      redisService.isUserOnline.mockResolvedValue(false);

      await gateway.handleConnection(mockClient as Socket);

      expect(jwtService.verify).toHaveBeenCalledWith('jwt_token_abc');
      expect(mockClient.join).toHaveBeenCalledWith('user_3');
      expect(redisService.addUserSocket).toHaveBeenCalledWith(3, 'socket_123');
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client if JWT token is missing', async () => {
      mockClient.handshake!.query = {};

      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(redisService.addUserSocket).not.toHaveBeenCalled();
    });

    it('should disconnect client if JWT verification fails', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid JWT');
      });

      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(redisService.addUserSocket).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove socket tracking and trigger user_offline event if user has no more sockets', async () => {
      const mockClient = {
        id: 'socket_123',
        data: { userId: 3 },
      } as any;

      redisService.isUserOnline.mockResolvedValue(false); // completely offline
      chatService.getChatsForUser.mockResolvedValue([{ id: 1 }]);
      chatService.getChatParticipants.mockResolvedValue([3, 4]);

      await gateway.handleDisconnect(mockClient);

      expect(redisService.removeUserSocket).toHaveBeenCalledWith(3, 'socket_123');
      expect(gateway.server.to).toHaveBeenCalledWith('user_4');
      expect(gateway.server.emit).toHaveBeenCalledWith('user_offline', { userId: 3 });
    });
  });

  describe('handleJoinChat', () => {
    it('should join the chat room if user is a participant', async () => {
      const mockClient = {
        id: 'socket_123',
        data: { userId: 3 },
        join: jest.fn(),
        emit: jest.fn(),
      } as any;

      chatService.getChatParticipants.mockResolvedValue([3, 4]);

      await gateway.handleJoinChat(mockClient, { chatId: 1 });

      expect(mockClient.join).toHaveBeenCalledWith('chat_1');
      expect(mockClient.emit).not.toHaveBeenCalledWith('error', expect.any(Object));
    });

    it('should emit error and not join room if user is not a participant', async () => {
      const mockClient = {
        id: 'socket_123',
        data: { userId: 99 },
        join: jest.fn(),
        emit: jest.fn(),
      } as any;

      chatService.getChatParticipants.mockResolvedValue([3, 4]);

      await gateway.handleJoinChat(mockClient, { chatId: 1 });

      expect(mockClient.join).not.toHaveBeenCalled();
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Unauthorized access to chat room',
      });
    });
  });

  describe('handleSendMessage', () => {
    it('should save message and broadcast to room and direct user notify event', async () => {
      const mockClient = {
        id: 'socket_123',
        data: { userId: 3 },
        emit: jest.fn(),
      } as any;

      chatService.getChatParticipants.mockResolvedValue([3, 4]);

      await gateway.handleSendMessage(mockClient, { chatId: 1, text: 'Hello' });

      expect(chatService.saveMessage).toHaveBeenCalledWith(1, 3, 'Hello');
      expect(gateway.server.to).toHaveBeenCalledWith('chat_1');
      expect(gateway.server.to).toHaveBeenCalledWith('user_4');
      expect(gateway.server.emit).toHaveBeenCalledWith('new_message', expect.any(Object));
      expect(gateway.server.emit).toHaveBeenCalledWith('new_message_notification', expect.any(Object));
    });
  });
});
