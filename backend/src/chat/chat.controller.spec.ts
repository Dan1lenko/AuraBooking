import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

const mockChatService = {
  getChatsForUser: jest.fn().mockResolvedValue([{ id: 1 }]),
  getMessageHistory: jest.fn().mockResolvedValue([{ id: 10, text: 'Hello' }]),
};

describe('ChatController', () => {
  let controller: ChatController;
  let service: ChatService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: mockChatService },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyChats', () => {
    it('should query chat list using the request user ID', async () => {
      const mockReq = { user: { id: 3 } };
      const result = await controller.getMyChats(mockReq);

      expect(result).toEqual([{ id: 1 }]);
      expect(service.getChatsForUser).toHaveBeenCalledWith(3);
    });
  });

  describe('getChatMessages', () => {
    it('should query message history using the parsed chatId and request user ID', async () => {
      const mockReq = { user: { id: 3 } };
      const result = await controller.getChatMessages(mockReq, 1);

      expect(result).toEqual([{ id: 10, text: 'Hello' }]);
      expect(service.getMessageHistory).toHaveBeenCalledWith(1, 3);
    });
  });
});
