import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import { PaymentsService } from '../payments/payments.service';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockBooking = {
  id: 1,
  clientId: 3,
  specialistProfileId: 1,
  startTime: new Date('2026-06-15T09:30:00.000Z'),
  endTime: new Date('2026-06-15T10:00:00.000Z'),
  status: 'PENDING',
};

const mockSpecialist = {
  id: 1,
  userId: 2,
  price: 50.0,
  user: { email: 'specialist@test.com', name: 'Dr. Specialist' },
};

const mockClient = {
  id: 3,
  email: 'client@test.com',
};

const mockPrismaService = {
  booking: {
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue({ ...mockBooking, specialistProfile: { userId: 2 } }),
    findMany: jest.fn().mockResolvedValue([mockBooking]),
    create: jest.fn().mockResolvedValue(mockBooking),
    update: jest.fn().mockResolvedValue({
      ...mockBooking,
      status: 'CONFIRMED',
      client: { id: 3, name: 'Client', email: 'client@test.com' },
      specialistProfile: { id: 1, userId: 2, user: { id: 2, name: 'Dr. Specialist', email: 'specialist@test.com' } },
    }),
  },
  specialistProfile: {
    findUnique: jest.fn().mockResolvedValue(mockSpecialist),
  },
  user: {
    findUnique: jest.fn().mockResolvedValue(mockClient),
  },
};

const mockMailService = {
  sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
};

const mockPaymentsService = {
  createPaymentIntent: jest.fn().mockResolvedValue({ clientSecret: 'pi_test_secret' }),
};

const mockChatService = {
  findOrCreateChat: jest.fn().mockResolvedValue({ id: 1 }),
};

const mockNotificationsService = {
  scheduleReminders: jest.fn().mockResolvedValue(undefined),
  cancelReminders: jest.fn().mockResolvedValue(undefined),
  createNotification: jest.fn().mockResolvedValue(undefined),
};

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MailService, useValue: mockMailService },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: ChatService, useValue: mockChatService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should create a booking and send emails', async () => {
    const result = await service.create(3, {
      specialistProfileId: 1,
      startTime: '2026-06-15T09:30:00.000Z',
      endTime: '2026-06-15T10:00:00.000Z',
    });
    expect(result).toEqual({ booking: mockBooking, clientSecret: 'pi_test_secret' });
    expect(mockPrismaService.booking.create).toHaveBeenCalled();
    expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(1, 3, 50.0);
    expect(mockChatService.findOrCreateChat).toHaveBeenCalledWith(3, 1);
    expect(mockMailService.sendBookingConfirmation).toHaveBeenCalledWith(
      'client@test.com',
      'specialist@test.com',
      'Dr. Specialist',
      new Date('2026-06-15T09:30:00.000Z'),
    );
  });

  it('should find bookings for client', async () => {
    const result = await service.findForUser(3, 'CLIENT');
    expect(result).toEqual([mockBooking]);
    expect(mockPrismaService.booking.findMany).toHaveBeenCalledWith({
      where: { clientId: 3 },
      include: {
        specialistProfile: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
        review: true,
        payment: true,
      },
      orderBy: { startTime: 'asc' },
    });
  });

  it('should find bookings for specialist', async () => {
    const result = await service.findForUser(2, 'SPECIALIST');
    expect(result).toEqual([mockBooking]);
    expect(mockPrismaService.specialistProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 2 },
    });
  });

  it('should update status to CONFIRMED by specialist', async () => {
    const result = await service.updateStatus(2, 'SPECIALIST', 1, 'CONFIRMED');
    expect(result.status).toEqual('CONFIRMED');
    expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'CONFIRMED' },
      include: {
        client: true,
        specialistProfile: { include: { user: true } },
      },
    });
    expect(mockNotificationsService.scheduleReminders).toHaveBeenCalled();
    expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(2);
  });
});
