import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

const mockBooking = {
  id: 1,
  clientId: 3,
  specialistProfileId: 2,
  status: 'COMPLETED',
};

const mockReview = {
  id: 10,
  bookingId: 1,
  clientId: 3,
  specialistProfileId: 2,
  rating: 5,
  comment: 'Great service!',
  createdAt: new Date(),
};

const mockPrismaService = {
  booking: {
    findUnique: jest.fn(),
  },
  review: {
    findUnique: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  specialistProfile: {
    update: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  describe('create', () => {
    it('should throw BadRequestException if rating is out of bounds', async () => {
      await expect(
        service.create(3, { bookingId: 1, rating: 6, comment: 'Too high' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(3, { bookingId: 1, rating: 0, comment: 'Too low' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.create(3, { bookingId: 99, rating: 4, comment: 'Nice' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if client does not own the booking', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        service.create(999, { bookingId: 1, rating: 4, comment: 'Not mine' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if booking is not COMPLETED', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: 'CONFIRMED',
      });

      await expect(
        service.create(3, { bookingId: 1, rating: 4, comment: 'Not done yet' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if booking already has a review', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      await expect(
        service.create(3, { bookingId: 1, rating: 4, comment: 'Duplicate' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create review, recalculate ratings, and update specialist profile successfully', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue(mockReview);
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { rating: 12 },
      });

      const result = await service.create(3, {
        bookingId: 1,
        rating: 5,
        comment: 'Great service!',
      });

      expect(result).toEqual(mockReview);
      expect(mockPrismaService.review.create).toHaveBeenCalledWith({
        data: {
          bookingId: 1,
          clientId: 3,
          specialistProfileId: 2,
          rating: 5,
          comment: 'Great service!',
        },
      });
      expect(mockPrismaService.review.aggregate).toHaveBeenCalledWith({
        where: { specialistProfileId: 2 },
        _avg: { rating: true },
        _count: { rating: true },
      });
      expect(mockPrismaService.specialistProfile.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: {
          rating: 4.5,
          reviewsCount: 12,
        },
      });
    });
  });

  describe('findForSpecialist', () => {
    it('should return all reviews for a specific specialist', async () => {
      const mockReviewsList = [
        { ...mockReview, client: { id: 3, name: 'Client Alice', email: 'alice@test.com' } },
      ];
      mockPrismaService.review.findMany.mockResolvedValue(mockReviewsList);

      const result = await service.findForSpecialist(2);

      expect(result).toEqual(mockReviewsList);
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith({
        where: { specialistProfileId: 2 },
        include: {
          client: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
