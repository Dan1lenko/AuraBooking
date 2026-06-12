import { Controller, Get, Post, Body, Param, Req, ParseIntPipe } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Roles(Role.CLIENT)
  @Post()
  async createReview(
    @Req() req: any,
    @Body() body: CreateReviewDto,
  ) {
    return this.reviewsService.create(req.user.id, body);
  }

  @Public()
  @Get(':specialistId')
  async getSpecialistReviews(@Param('specialistId', ParseIntPipe) specialistId: number) {
    return this.reviewsService.findForSpecialist(specialistId);
  }
}

