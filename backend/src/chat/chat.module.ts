import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { RedisService } from './redis.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, RedisService, PrismaService],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
