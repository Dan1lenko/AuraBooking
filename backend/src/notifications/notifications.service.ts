import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { InjectQueue } from '@nestjs/bull';
import * as Bull from 'bull';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    @InjectQueue('reminders')
    private reminderQueue: Bull.Queue,
  ) {}

  async createNotification(userId: number, type: string, text: string) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        text,
        isRead: false,
      },
    });

    // Push real-time notification if recipient has active socket connection
    if (this.chatGateway.server) {
      this.chatGateway.server.to(`user_${userId}`).emit('new_notification', notification);
    }

    return notification;
  }

  async getNotificationsForUser(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async scheduleReminders(bookingId: number, startTime: Date, clientId: number, specialistId: number) {
    const now = Date.now();
    const sessionTime = new Date(startTime).getTime();

    // 1. Schedule 24h reminder
    const delay24 = sessionTime - 24 * 60 * 60 * 1000 - now;
    if (delay24 > 0) {
      await this.reminderQueue.add(
        'send_reminder',
        { bookingId, clientId, specialistId, hoursBefore: 24 },
        {
          jobId: `reminder-24h-${bookingId}`,
          delay: delay24,
          removeOnComplete: true,
          removeOnFail: true,
        },
      ).catch(() => {});
    }

    // 2. Schedule 1h reminder
    const delay1 = sessionTime - 1 * 60 * 60 * 1000 - now;
    if (delay1 > 0) {
      await this.reminderQueue.add(
        'send_reminder',
        { bookingId, clientId, specialistId, hoursBefore: 1 },
        {
          jobId: `reminder-1h-${bookingId}`,
          delay: delay1,
          removeOnComplete: true,
          removeOnFail: true,
        },
      ).catch(() => {});
    }
  }

  async cancelReminders(bookingId: number) {
    try {
      const job24 = await this.reminderQueue.getJob(`reminder-24h-${bookingId}`);
      if (job24) {
        await job24.remove().catch(() => {});
      }
      const job1 = await this.reminderQueue.getJob(`reminder-1h-${bookingId}`);
      if (job1) {
        await job1.remove().catch(() => {});
      }
    } catch {
      // Gracefully handle queue fetch issues if Redis is down
    }
  }
}
