import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import { PaymentsService } from '../payments/payments.service';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private paymentsService: PaymentsService,
    private chatService: ChatService,
    private notificationsService: NotificationsService,
  ) {}

  async create(clientId: number, data: { specialistProfileId: number; startTime: string; endTime: string }) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    const specialist = await this.prisma.specialistProfile.findUnique({
      where: { id: data.specialistProfileId },
      include: { user: true },
    });
    if (!specialist) {
      throw new NotFoundException('Specialist profile not found');
    }

    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Check overlap with pending or confirmed bookings
    const overlap = await this.prisma.booking.findFirst({
      where: {
        specialistProfileId: data.specialistProfileId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });
    if (overlap) {
      throw new BadRequestException('This time slot is already booked or requested');
    }

    const booking = await this.prisma.booking.create({
      data: {
        clientId,
        specialistProfileId: data.specialistProfileId,
        startTime: start,
        endTime: end,
        status: 'PENDING',
      },
      include: {
        client: true,
        specialistProfile: { include: { user: true } },
      },
    });

    try {
      const amount = specialist.price;
      const { clientSecret } = await this.paymentsService.createPaymentIntent(booking.id, clientId, amount);

      // Create chat automatically when client books a specialist
      await this.chatService.findOrCreateChat(clientId, data.specialistProfileId).catch(() => {});

      // Send email confirmation async
      this.mailService.sendBookingConfirmation(
        client.email,
        specialist.user.email,
        specialist.user.name || 'Specialist',
        start,
      ).catch(() => {});

      return { booking, clientSecret };
    } catch (error) {
      await this.prisma.booking.delete({ where: { id: booking.id } }).catch(() => {});
      throw error;
    }
  }

  async findForUser(userId: number, role: string) {
    if (role === 'SPECIALIST') {
      const profile = await this.prisma.specialistProfile.findUnique({
        where: { userId },
      });
      if (!profile) {
        throw new NotFoundException('Specialist profile not found');
      }
      return this.prisma.booking.findMany({
        where: { specialistProfileId: profile.id },
        include: {
          client: { select: { id: true, email: true, name: true } },
          payment: true,
        },
        orderBy: { startTime: 'asc' },
      });
    } else {
      return this.prisma.booking.findMany({
        where: { clientId: userId },
        include: {
          specialistProfile: {
            include: { user: { select: { id: true, email: true, name: true } } },
          },
          review: true,
          payment: true,
        },
        orderBy: { startTime: 'asc' },
      });
    }
  }

  async updateStatus(userId: number, role: string, bookingId: number, status: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { specialistProfile: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Authorization checks
    if (role === 'CLIENT') {
      if (booking.clientId !== userId) {
        throw new ForbiddenException('You cannot manage this booking');
      }
      if (status !== 'CANCELLED') {
        throw new BadRequestException('Clients can only cancel bookings');
      }
    } else if (role === 'SPECIALIST') {
      if (booking.specialistProfile.userId !== userId) {
        throw new ForbiddenException('You cannot manage this booking');
      }
      if (!['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
        throw new BadRequestException('Invalid booking status');
      }
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        client: true,
        specialistProfile: { include: { user: true } },
      },
    });

    const timeStr = new Date(updatedBooking.startTime).toLocaleString('uk-UA', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Europe/Kyiv',
    });

    if (status === 'CONFIRMED') {
      // Schedule email reminders (24h and 1h)
      await this.notificationsService.scheduleReminders(
        bookingId,
        updatedBooking.startTime,
        updatedBooking.clientId,
        updatedBooking.specialistProfile.userId,
      );

      // Create in-app notifications for both client and specialist
      await this.notificationsService.createNotification(
        updatedBooking.clientId,
        'BOOKING_CONFIRMED',
        `Your booking with ${updatedBooking.specialistProfile.user.name || 'Specialist'} on ${timeStr} is confirmed.`,
      ).catch(() => {});

      await this.notificationsService.createNotification(
        updatedBooking.specialistProfile.userId,
        'BOOKING_CONFIRMED',
        `Booking with ${updatedBooking.client.name || updatedBooking.client.email} on ${timeStr} is confirmed.`,
      ).catch(() => {});

    } else if (status === 'CANCELLED') {
      // Cancel scheduled reminder jobs
      await this.notificationsService.cancelReminders(bookingId);

      // Create in-app notifications for cancellation
      await this.notificationsService.createNotification(
        updatedBooking.clientId,
        'BOOKING_CANCELLED',
        `Your booking with ${updatedBooking.specialistProfile.user.name || 'Specialist'} on ${timeStr} was cancelled.`,
      ).catch(() => {});

      await this.notificationsService.createNotification(
        updatedBooking.specialistProfile.userId,
        'BOOKING_CANCELLED',
        `Booking with ${updatedBooking.client.name || updatedBooking.client.email} on ${timeStr} was cancelled.`,
      ).catch(() => {});
    }

    return updatedBooking;
  }
}
