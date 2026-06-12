import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const isConfigured =
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS;

    if (isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT!, 10),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      this.logger.warn(
        'SMTP connection not fully configured. Emails will be logged to console.',
      );
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;
    const subject = 'Reset your Booking Platform Password';
    const text = `Click here to reset your password: ${resetLink}`;
    const html = `<p>Click the link below to reset your password:</p><a href="${resetLink}">Reset Password</a>`;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Booking Platform" <noreply@booking.com>',
        to: email,
        subject,
        text,
        html,
      });
    } else {
      this.logger.log(`[EMAIL SEND SIMULATION] To: ${email} | Link: ${resetLink}`);
    }
  }

  async sendBookingConfirmation(
    clientEmail: string,
    specialistEmail: string,
    specialistName: string,
    startTime: Date,
  ): Promise<void> {
    const dateStr = startTime.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' });
    const subject = 'Booking Confirmation Request';
    const text = `A new booking has been requested for ${dateStr} with ${specialistName}.`;
    const html = `<p>A new booking has been requested for <strong>${dateStr}</strong> with <strong>${specialistName}</strong>.</p>`;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Booking Platform" <noreply@booking.com>',
        to: clientEmail,
        subject,
        text,
        html,
      });
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Booking Platform" <noreply@booking.com>',
        to: specialistEmail,
        subject: `New Appointment Request - ${dateStr}`,
        text: `Client (${clientEmail}) requested a booking.`,
        html: `<p>Client <strong>${clientEmail}</strong> requested a booking on <strong>${dateStr}</strong>.</p>`,
      });
    } else {
      this.logger.log(`[EMAIL SIMULATION] Booking created. Client: ${clientEmail} | Specialist: ${specialistEmail} | Time: ${dateStr}`);
    }
  }

  async sendBookingReminder(
    clientEmail: string,
    specialistName: string,
    startTime: Date,
    hoursBefore: number,
  ): Promise<void> {
    const dateStr = new Date(startTime).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
    const subject = `Upcoming Session Reminder: ${hoursBefore} hour(s) left`;
    const text = `Reminder: You have an upcoming session with ${specialistName} at ${dateStr}.`;
    const html = `<p>Reminder: You have an upcoming session with <strong>${specialistName}</strong> at <strong>${dateStr}</strong>.</p>`;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Booking Platform" <noreply@booking.com>',
        to: clientEmail,
        subject,
        text,
        html,
      });
    } else {
      this.logger.log(`[EMAIL SIMULATION] Session Reminder. Client: ${clientEmail} | Specialist: ${specialistName} | Time: ${dateStr} | In: ${hoursBefore}h`);
    }
  }
}
