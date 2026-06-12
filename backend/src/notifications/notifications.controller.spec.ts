import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

const mockNotificationsService = {
  getNotificationsForUser: jest.fn().mockResolvedValue([{ id: 1, text: 'Hello' }]),
  markAllAsRead: jest.fn().mockResolvedValue({ count: 5 }),
  markAsRead: jest.fn().mockResolvedValue({ id: 1, isRead: true }),
};

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyNotifications', () => {
    it('should query notification history using request user ID', async () => {
      const mockReq = { user: { id: 3 } };
      const result = await controller.getMyNotifications(mockReq);

      expect(result).toEqual([{ id: 1, text: 'Hello' }]);
      expect(service.getNotificationsForUser).toHaveBeenCalledWith(3);
    });
  });

  describe('readAllMyNotifications', () => {
    it('should trigger read-all updates using request user ID', async () => {
      const mockReq = { user: { id: 3 } };
      const result = await controller.readAllMyNotifications(mockReq);

      expect(result).toEqual({ count: 5 });
      expect(service.markAllAsRead).toHaveBeenCalledWith(3);
    });
  });

  describe('readNotification', () => {
    it('should mark a specific notification as read using parsed ID and request user ID', async () => {
      const mockReq = { user: { id: 3 } };
      const result = await controller.readNotification(mockReq, 1);

      expect(result).toEqual({ id: 1, isRead: true });
      expect(service.markAsRead).toHaveBeenCalledWith(1, 3);
    });
  });
});
