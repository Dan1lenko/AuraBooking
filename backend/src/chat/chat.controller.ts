import { Controller, Get, Patch, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chats')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  async getMyChats(@Req() req: any) {
    const userId = req.user.id;
    return this.chatService.getChatsForUser(userId);
  }

  @Get(':chatId/messages')
  async getChatMessages(
    @Req() req: any,
    @Param('chatId', ParseIntPipe) chatId: number,
  ) {
    const userId = req.user.id;
    return this.chatService.getMessageHistory(chatId, userId);
  }

  @Patch(':chatId/read')
  async markAsRead(
    @Req() req: any,
    @Param('chatId', ParseIntPipe) chatId: number,
  ) {
    const userId = req.user.id;
    return this.chatService.markChatAsRead(chatId, userId);
  }
}

