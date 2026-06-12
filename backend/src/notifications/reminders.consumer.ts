import { Processor, Process } from '@nestjs/bull';
import * as Bull from 'bull';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma.service';
import { Logger } from '@nestjs/common';

@Processor('reminders')
export class RemindersConsumer {
  private readonly logger = new Logger(RemindersConsumer.name);

  constructor(
    private mailService: MailService,
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Process('send_reminder')
  async handleSendReminder(job: Bull.Job<any>) {
    const { bookingId, clientId, hoursBefore } = job.data;

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          client: true,
          specialistProfile: { include: { user: true } },
        },
      });

      if (!booking || booking.status !== 'CONFIRMED') {
        this.logger.log(`Skipped reminder for booking ${bookingId}: booking not found or not confirmed`);
        return;
      }

      const clientEmail = booking.client.email;
      const specialistName = booking.specialistProfile.user.name || 'Specialist';

      // 1. Dispatch email reminder
      await this.mailService.sendBookingReminder(
        clientEmail,
        specialistName,
        booking.startTime,
        hoursBefore,
      );

      // 2. Dispatch in-app notification
      const dateStr = new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const text = `Reminder: You have a session with ${specialistName} today at ${dateStr} (${hoursBefore}h left).`;
      await this.notificationsService.createNotification(clientId, 'REMINDER', text);

      this.logger.log(`Reminder dispatched for booking ${bookingId} (${hoursBefore}h left)`);
    } catch (err: any) {
      this.logger.error(`Error processing reminder job: ${err.message}`);
      throw err;
    }
  }
}
