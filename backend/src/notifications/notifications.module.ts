import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { RemindersConsumer } from './reminders.consumer';
import { PrismaService } from '../prisma.service';
import { ChatModule } from '../chat/chat.module';
import { MailModule } from '../mail/mail.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'reminders' }),
    forwardRef(() => ChatModule),
    MailModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, RemindersConsumer, PrismaService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
