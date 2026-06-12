import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(clientId: number, data: { bookingId: number; rating: number; comment: string }) {
    const { bookingId, rating, comment } = data;

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // 1. Fetch booking with auth and status validation
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.clientId !== clientId) {
      throw new ForbiddenException('You are not authorized to review this booking');
    }

    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Reviews can only be submitted for completed bookings');
    }

    // 2. Check if a review already exists for this booking (Prisma schema unique constraint)
    const existingReview = await this.prisma.review.findUnique({
      where: { bookingId },
    });
    if (existingReview) {
      throw new BadRequestException('A review has already been submitted for this booking');
    }

    // 3. Create review and recalculate rating in a transaction
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          bookingId,
          clientId,
          specialistProfileId: booking.specialistProfileId,
          rating,
          comment,
        },
      });

      // Recalculate average rating & count for this specialist
      const aggregates = await tx.review.aggregate({
        where: { specialistProfileId: booking.specialistProfileId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.specialistProfile.update({
        where: { id: booking.specialistProfileId },
        data: {
          rating: aggregates._avg.rating || 0.0,
          reviewsCount: aggregates._count.rating || 0,
        },
      });

      return review;
    });
  }

  async findForSpecialist(specialistProfileId: number) {
    // Expose all reviews for this specialist with client details
    return this.prisma.review.findMany({
      where: { specialistProfileId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
