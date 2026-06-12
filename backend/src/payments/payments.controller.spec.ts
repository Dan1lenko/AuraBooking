import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

const mockPaymentsService = {
  getPublishableKey: jest.fn().mockReturnValue({ publishableKey: 'pk_test_123' }),
  findForUser: jest.fn().mockResolvedValue([{ id: 1, amount: 100 }]),
  handleWebhook: jest.fn().mockResolvedValue({ received: true }),
};

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPublishableKey', () => {
    it('should return client configuration from paymentsService', () => {
      const result = controller.getPublishableKey();
      expect(result).toEqual({ publishableKey: 'pk_test_123' });
      expect(service.getPublishableKey).toHaveBeenCalled();
    });
  });

  describe('getMyPayments', () => {
    it('should query payments service using request user ID', async () => {
      const mockReq = { user: { id: 3 } };
      const result = await controller.getMyPayments(mockReq);
      expect(result).toEqual([{ id: 1, amount: 100 }]);
      expect(service.findForUser).toHaveBeenCalledWith(3);
    });
  });

  describe('handleWebhook', () => {
    it('should invoke webhook parsing on paymentsService when stripe-signature header is present', async () => {
      const rawBodyBuffer = Buffer.from('raw_payload_bytes');
      const mockReq = { rawBody: rawBodyBuffer } as any;
      const signature = 'stripe_sig_123';

      const result = await controller.handleWebhook(mockReq, signature);
      expect(result).toEqual({ received: true });
      expect(service.handleWebhook).toHaveBeenCalledWith(rawBodyBuffer, signature);
    });

    it('should throw BadRequestException if stripe-signature header is missing', async () => {
      const mockReq = { rawBody: Buffer.from('raw_payload_bytes') } as any;
      await expect(controller.handleWebhook(mockReq, '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
