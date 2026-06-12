import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma.service';
import Stripe from 'stripe';

// Mock Stripe library
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      paymentIntents: {
        create: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };
  });
});

const mockPayment = {
  id: 1,
  bookingId: 2,
  clientId: 3,
  amount: 100.0,
  currency: 'usd',
  paymentIntentId: 'pi_mock_123',
  status: 'PENDING',
  createdAt: new Date(),
};

const mockPrismaService = {
  payment: {
    findMany: jest.fn().mockResolvedValue([mockPayment]),
    findUnique: jest.fn().mockResolvedValue(mockPayment),
    create: jest.fn().mockResolvedValue(mockPayment),
    update: jest.fn(),
  },
  booking: {
    update: jest.fn(),
  },
  $transaction: jest.fn((promises) => Promise.all(promises)),
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;
  let mockStripeInstance: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
    mockStripeInstance = (service as any).stripe;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublishableKey', () => {
    it('should return publishable key', () => {
      const originalKey = process.env.STRIPE_PUBLISHABLE_KEY;
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_env_key';

      expect(service.getPublishableKey()).toEqual({ publishableKey: 'pk_test_env_key' });

      process.env.STRIPE_PUBLISHABLE_KEY = originalKey;
    });

    it('should return placeholder key if env is not defined', () => {
      const originalKey = process.env.STRIPE_PUBLISHABLE_KEY;
      delete process.env.STRIPE_PUBLISHABLE_KEY;

      expect(service.getPublishableKey()).toEqual({ publishableKey: 'pk_test_placeholder' });

      process.env.STRIPE_PUBLISHABLE_KEY = originalKey;
    });
  });

  describe('findForUser', () => {
    it('should retrieve payments for user with relations', async () => {
      const result = await service.findForUser(3);
      expect(result).toEqual([mockPayment]);
      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: { clientId: 3 },
        include: {
          booking: {
            include: {
              specialistProfile: {
                include: { user: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createPaymentIntent', () => {
    it('should create Stripe payment intent and db payment log', async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_mock_123',
        client_secret: 'pi_mock_secret_123',
      });

      const result = await service.createPaymentIntent(2, 3, 50.0);

      expect(result).toEqual({ clientSecret: 'pi_mock_secret_123' });
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'usd',
        metadata: { bookingId: '2', clientId: '3' },
      });
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          bookingId: 2,
          clientId: 3,
          amount: 50.0,
          paymentIntentId: 'pi_mock_123',
          status: 'PENDING',
        },
      });
    });
  });

  describe('handleWebhook', () => {
    const rawBody = Buffer.from('raw_body_bytes');
    const signature = 'stripe_sig';

    it('should handle payment_intent.succeeded and update status to CONFIRMED', async () => {
      mockStripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_mock_123',
          },
        },
      });

      prisma.payment.findUnique = jest.fn().mockResolvedValue(mockPayment);
      prisma.payment.update = jest.fn().mockReturnValue('update_payment');
      prisma.booking.update = jest.fn().mockReturnValue('update_booking');

      const result = await service.handleWebhook(rawBody, signature);

      expect(result).toEqual({ received: true });
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        rawBody,
        signature,
        expect.any(String),
      );
      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { paymentIntentId: 'pi_mock_123' },
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: { status: 'SUCCEEDED' },
      });
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: mockPayment.bookingId },
        data: { status: 'CONFIRMED' },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle payment_intent.payment_failed and update status to CANCELLED', async () => {
      mockStripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_mock_123',
          },
        },
      });

      prisma.payment.findUnique = jest.fn().mockResolvedValue(mockPayment);
      prisma.payment.update = jest.fn().mockReturnValue('update_payment');
      prisma.booking.update = jest.fn().mockReturnValue('update_booking');

      const result = await service.handleWebhook(rawBody, signature);

      expect(result).toEqual({ received: true });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: { status: 'FAILED' },
      });
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: mockPayment.bookingId },
        data: { status: 'CANCELLED' },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if signature validation fails', async () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(service.handleWebhook(rawBody, signature)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
