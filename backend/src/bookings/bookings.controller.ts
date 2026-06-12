import { Controller, Get, Post, Patch, Body, Param, Req, ParseIntPipe } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Roles(Role.CLIENT)
  @Post()
  async createBooking(
    @Req() req: any,
    @Body() body: CreateBookingDto,
  ) {
    return this.bookingsService.create(req.user.id, body);
  }

  @Get('me')
  async getMyBookings(@Req() req: any) {
    return this.bookingsService.findForUser(req.user.id, req.user.role);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(req.user.id, req.user.role, id, body.status);
  }
}

