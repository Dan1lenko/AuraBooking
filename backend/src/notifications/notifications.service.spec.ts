import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { getQueueToken } from '@nestjs/bull';

const mockNotification = {
  id: 1,
  userId: 3,
  type: 'BOOKING_CONFIRMED',
  text: 'Confirmed',
  isRead: false,
  createdAt: new Date(),
};

const mockPrismaService = {
  notification: {
    create: jest.fn().mockResolvedValue(mockNotification),
    findMany: jest.fn().mockResolvedValue([mockNotification]),
    findUnique: jest.fn().mockResolvedValue(mockNotification),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockChatGateway = {
  server: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  },
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job_123' }),
  getJob: jest.fn(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;
  let chatGateway: ChatGateway;
  let queue: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ChatGateway, useValue: mockChatGateway },
        { provide: getQueueToken('reminders'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
    chatGateway = module.get<ChatGateway>(ChatGateway);
    queue = module.get(getQueueToken('reminders'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should insert notification and emit new_notification websocket event', async () => {
      const result = await service.createNotification(3, 'BOOKING_CONFIRMED', 'Confirmed');

      expect(result).toEqual(mockNotification);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 3,
          type: 'BOOKING_CONFIRMED',
          text: 'Confirmed',
          isRead: false,
        },
      });
      expect(chatGateway.server.to).toHaveBeenCalledWith('user_3');
      expect(chatGateway.server.emit).toHaveBeenCalledWith('new_notification', mockNotification);
    });
  });

  describe('getNotificationsForUser', () => {
    it('should query all notifications for a given user ordered by date', async () => {
      const result = await service.getNotificationsForUser(3);

      expect(result).toEqual([mockNotification]);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 3 },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException if notification does not exist', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead(99, 3)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if notification belongs to another user', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        userId: 99,
      });

      await expect(service.markAsRead(1, 3)).rejects.toThrow(ForbiddenException);
    });

    it('should update unread state to read', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const result = await service.markAsRead(1, 3);

      expect(result.isRead).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isRead: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for a user to read status', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead(3);

      expect(result).toEqual({ count: 5 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 3, isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('scheduleReminders', () => {
    it('should add delayed reminder jobs to the queue', async () => {
      const startTime = new Date(Date.now() + 30 * 60 * 60 * 1000); // 30h in future

      await service.scheduleReminders(10, startTime, 3, 4);

      expect(queue.add).toHaveBeenCalledTimes(2);
      expect(queue.add).toHaveBeenCalledWith(
        'send_reminder',
        { bookingId: 10, clientId: 3, specialistId: 4, hoursBefore: 24 },
        expect.objectContaining({ jobId: 'reminder-24h-10' }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'send_reminder',
        { bookingId: 10, clientId: 3, specialistId: 4, hoursBefore: 1 },
        expect.objectContaining({ jobId: 'reminder-1h-10' }),
      );
    });
  });

  describe('cancelReminders', () => {
    it('should query queue and remove existing scheduled reminder jobs', async () => {
      const mockJob = { remove: jest.fn().mockResolvedValue(undefined) };
      queue.getJob.mockResolvedValue(mockJob);

      await service.cancelReminders(10);

      expect(queue.getJob).toHaveBeenCalledWith('reminder-24h-10');
      expect(queue.getJob).toHaveBeenCalledWith('reminder-1h-10');
      expect(mockJob.remove).toHaveBeenCalledTimes(2);
    });
  });
});
