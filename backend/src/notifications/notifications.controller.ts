import { Controller, Get, Put, Param, ParseIntPipe, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(@Req() req: any) {
    const userId = req.user.id;
    return this.notificationsService.getNotificationsForUser(userId);
  }

  @Put('read-all')
  async readAllMyNotifications(@Req() req: any) {
    const userId = req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Put(':id/read')
  async readNotification(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }
}
