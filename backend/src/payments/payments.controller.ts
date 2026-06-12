import { Controller, Get, Post, Req, Headers, BadRequestException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Public()
  @Get('config')
  getPublishableKey() {
    return this.paymentsService.getPublishableKey();
  }

  @Get('me')
  async getMyPayments(@Req() req: any) {
    return this.paymentsService.findForUser(req.user.id);
  }

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    return this.paymentsService.handleWebhook(req.rawBody!, signature);
  }
}
