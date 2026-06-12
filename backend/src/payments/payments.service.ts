import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: any;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
      apiVersion: '2025-01-27.acacia' as any,
    });
  }

  getPublishableKey() {
    return { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder' };
  }

  async findForUser(userId: number) {
    return this.prisma.payment.findMany({
      where: { clientId: userId },
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
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
      );
    } catch (err: any) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as any;
      const paymentIntentId = pi.id;

      const payment = await this.prisma.payment.findUnique({
        where: { paymentIntentId },
      });

      if (payment) {
        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'SUCCEEDED' },
          }),
          this.prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CONFIRMED' },
          }),
        ]);
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as any;
      const paymentIntentId = pi.id;

      const payment = await this.prisma.payment.findUnique({
        where: { paymentIntentId },
      });

      if (payment) {
        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          }),
          this.prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CANCELLED' },
          }),
        ]);
      }
    }

    return { received: true };
  }

  async createPaymentIntent(bookingId: number, clientId: number, amount: number) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency: 'usd',
      metadata: { bookingId: bookingId.toString(), clientId: clientId.toString() },
    });

    await this.prisma.payment.create({
      data: {
        bookingId,
        clientId,
        amount,
        paymentIntentId: paymentIntent.id,
        status: 'PENDING',
      },
    });

    return { clientSecret: paymentIntent.client_secret };
  }
}
