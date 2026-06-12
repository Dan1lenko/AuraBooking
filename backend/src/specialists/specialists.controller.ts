import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Post,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpecialistsService } from './specialists.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Controller('specialists')
export class SpecialistsController {
  constructor(
    private specialistsService: SpecialistsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @Public()
  @Get()
  async getSpecialists(
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
  ) {
    return this.specialistsService.findAll({
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
    });
  }

  @Roles(Role.SPECIALIST)
  @Get('me')
  async getMyProfile(@Req() req: any) {
    const profile = await this.specialistsService.findByUserId(req.user.id);
    if (!profile) {
      return { bio: '', category: '', price: 0, experience: 0, avatarUrl: null };
    }
    return profile;
  }

  @Roles(Role.SPECIALIST)
  @Put('me')
  async updateMyProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    return this.specialistsService.updateOrCreateProfile(req.user.id, body);
  }

  @Roles(Role.SPECIALIST)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
  ) {
    const avatarUrl = await this.cloudinaryService.uploadFile(file);
    return { avatarUrl };
  }

  @Roles(Role.SPECIALIST)
  @Get('me/schedule')
  async getMySchedule(@Req() req: any) {
    return this.specialistsService.findWorkingHours(req.user.id);
  }

  @Roles(Role.SPECIALIST)
  @Put('me/schedule')
  async updateMySchedule(@Req() req: any, @Body() body: UpdateScheduleDto) {
    return this.specialistsService.updateWorkingHours(req.user.id, body.schedule);
  }

  @Public()
  @Get(':id/slots')
  async getSlots(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
  ) {
    return this.specialistsService.generateSlots(id, date);
  }

  @Public()
  @Get(':id')
  async getSpecialistById(@Param('id', ParseIntPipe) id: number) {
    return this.specialistsService.findOne(id);
  }
}


